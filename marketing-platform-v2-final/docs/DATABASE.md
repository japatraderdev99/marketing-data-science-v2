# Schema do Banco de Dados (Supabase/PostgreSQL)

Execute as migrations abaixo na ordem apresentada.
Todas as tabelas têm Row Level Security (RLS) habilitado.

## Migration 001 — Workspaces e Usuários

```sql
-- Perfis de usuário (estende auth.users do Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "user sees own profile"
  on profiles for all using (auth.uid() = id);

-- Trigger: criar perfil automaticamente no signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Workspaces (multi-tenant)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) not null,
  brand_color text default '#E8603C',
  niche text,
  created_at timestamptz default now()
);

alter table workspaces enable row level security;

-- Membros do workspace
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

alter table workspace_members enable row level security;

-- Policies: usuário vê apenas workspaces em que é membro
create policy "member sees workspace"
  on workspaces for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspaces.id
      and user_id = auth.uid()
    )
  );

create policy "member sees workspace_members"
  on workspace_members for select
  using (user_id = auth.uid());
```

## Migration 002 — Estratégia de Marca

```sql
-- Documentos de conhecimento da marca
create table strategy_knowledge (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_name text not null,
  raw_content text,
  extracted_knowledge jsonb,
  -- {
  --   brandName: string,
  --   brandEssence: string,
  --   positioning: string,
  --   uniqueValueProp: string,
  --   toneOfVoice: string,
  --   targetAudience: string,
  --   keyMessages: string[],
  --   forbiddenTopics: string[],
  --   ctaStyle: string,
  --   promptContext: string   <- injeta direto nos prompts de IA
  -- }
  status text default 'processing' check (status in ('processing', 'done', 'error')),
  created_at timestamptz default now()
);

alter table strategy_knowledge enable row level security;
create policy "workspace member sees strategy"
  on strategy_knowledge for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = strategy_knowledge.workspace_id
      and user_id = auth.uid()
    )
  );

-- Playbooks de geração (regras de imagem, copy, vídeo)
create table generative_playbooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  playbook_type text not null check (playbook_type in ('image', 'copy', 'video')),
  knowledge_json jsonb not null,
  -- image playbook: { brandVisual, universalFormula, photorealismRules, formulaElements, examplePrompts }
  -- copy playbook: { angles, tones, forbiddenWords, ctaPatterns }
  updated_at timestamptz default now(),
  unique (workspace_id, playbook_type)
);

alter table generative_playbooks enable row level security;
create policy "workspace member sees playbooks"
  on generative_playbooks for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = generative_playbooks.workspace_id
      and user_id = auth.uid()
    )
  );
```

## Migration 003 — Campanhas

```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  objective text check (objective in ('awareness', 'engagement', 'conversion', 'retention')),
  channel text,
  budget numeric,
  start_date date,
  end_date date,
  context text,  -- briefing injetado nos prompts de IA
  status text default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz default now()
);

alter table campaigns enable row level security;
create policy "workspace member sees campaigns"
  on campaigns for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = campaigns.workspace_id
      and user_id = auth.uid()
    )
  );
```

## Migration 004 — Biblioteca de Mídia com Tagging por IA

```sql
create table media_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,

  -- Arquivo
  file_url text not null,
  thumbnail_url text,
  file_name text,
  file_size integer,
  mime_type text,
  width integer,
  height integer,

  -- Tagging por IA (preenchido automaticamente pelo tag-media edge function)
  ai_tags text[] default '{}',
  -- tags semânticas: ["pessoa", "trabalho externo", "ferramenta", "iluminação natural",
  --                   "estilo documentário", "laranja coral", "emoção: determinação"]

  ai_description text,
  -- descrição curta gerada pela IA: "Eletricista de 40 anos trabalhando em painel elétrico,
  --   luz natural, close nas mãos, estilo documentário"

  ai_mood text,
  -- emoção/tom geral: "determinação" | "alívio" | "orgulho" | "foco" | "antes" | "depois"

  ai_subjects text[],
  -- o que aparece: ["pessoa", "ferramenta", "ambiente externo", "close mãos"]

  ai_colors text[],
  -- cores dominantes: ["laranja", "bege", "marrom escuro"]

  ai_style text,
  -- estilo visual: "documentário" | "editorial" | "publicidade" | "casual"

  ai_fit_score_map jsonb default '{}',
  -- mapa de score por angle: { "orgulho": 0.9, "alivio": 0.7, "raiva": 0.2 }
  -- calculado na geração de tags com base no mood e subjects

  -- Metadados manuais
  manual_tags text[] default '{}',
  category text,  -- "before" | "after" | "process" | "person" | "tool" | "environment"
  is_favorite boolean default false,

  -- Status do processamento de tags
  tagging_status text default 'pending' check (tagging_status in ('pending', 'processing', 'done', 'error')),
  tagging_error text,

  created_at timestamptz default now()
);

alter table media_library enable row level security;
create policy "workspace member sees media"
  on media_library for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = media_library.workspace_id
      and user_id = auth.uid()
    )
  );

-- Index para busca por tags (GIN index para arrays)
create index idx_media_ai_tags on media_library using gin(ai_tags);
create index idx_media_manual_tags on media_library using gin(manual_tags);
create index idx_media_workspace on media_library (workspace_id, created_at desc);
create index idx_media_mood on media_library (workspace_id, ai_mood);
```

## Migration 005 — Criativos (Drafts)

```sql
create table creative_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete set null,
  user_id uuid references auth.users(id) not null,

  type text not null check (type in (
    'carousel_direct',
    'carousel_narrative',
    'static_post',
    'batch'
  )),

  title text,
  data jsonb not null,
  -- carousel_direct: { angle, persona, channel, tone, slides[], caption, bestTime, ... }
  -- carousel_narrative: { topic, arc, theme, slides[], citations[], ... }
  -- static_post: { headline, subtext, cta, imageUrl, imagePrompt, style, ... }
  -- batch: { variations[], angle, channel, objective, generatedAt }

  status text default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  thumbnail_url text,  -- preview do primeiro slide

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table creative_drafts enable row level security;
create policy "workspace member sees drafts"
  on creative_drafts for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = creative_drafts.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_drafts_workspace on creative_drafts (workspace_id, type, created_at desc);
```

## Migration 006 — Analytics: Meta Ads

```sql
create table meta_ads_performance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  ad_account_id text,
  ad_id text not null,
  ad_name text,
  adset_name text,
  campaign_name text,
  campaign_objective text,
  metric_date date not null,

  -- Métricas principais
  impressions integer default 0,
  clicks integer default 0,
  spend numeric(10,4) default 0,
  conversions integer default 0,
  reach integer default 0,

  -- Métricas calculadas (salvas para evitar recalcular)
  cpc numeric(10,4),
  cpm numeric(10,4),
  ctr numeric(6,4),   -- percentual: 2.34 = 2.34%
  roas numeric(8,4),
  cost_per_conversion numeric(10,4),

  -- Score calculado pelo sistema (0-100)
  creative_score integer,
  -- Fórmula: CTR*30% + CPC_score*20% + conversions_score*30% + efficiency*20%

  synced_at timestamptz default now(),
  unique (workspace_id, ad_id, metric_date)
);

alter table meta_ads_performance enable row level security;
create policy "workspace member sees meta ads"
  on meta_ads_performance for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = meta_ads_performance.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_meta_workspace_date on meta_ads_performance (workspace_id, metric_date desc);
create index idx_meta_campaign on meta_ads_performance (workspace_id, campaign_name, metric_date desc);
```

## Migration 007 — Analytics: GA4

```sql
create table ga4_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  metric_date date not null,

  sessions integer,
  total_users integer,
  new_users integer,
  page_views integer,
  bounce_rate numeric(6,4),
  conversions integer,
  conversion_rate numeric(6,4),
  avg_session_duration numeric(10,2),  -- segundos
  events_count integer,

  -- Dimensões
  source_medium text,
  landing_page text,
  device_category text,  -- desktop | mobile | tablet

  synced_at timestamptz default now(),
  unique (workspace_id, metric_date, source_medium, device_category)
);

alter table ga4_metrics enable row level security;
create policy "workspace member sees ga4"
  on ga4_metrics for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = ga4_metrics.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_ga4_workspace_date on ga4_metrics (workspace_id, metric_date desc);
```

## Migration 008 — Tracking de Uso de IA

```sql
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  function_name text,
  task_type text,
  model_used text,
  provider text,
  tokens_input integer,
  tokens_output integer,
  cost_estimate numeric(10,6),
  latency_ms integer,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);

-- Sem RLS — apenas service role pode inserir (edge functions)
-- Leitura pelo usuário apenas do próprio workspace via view
create view my_ai_usage as
  select * from ai_usage_log
  where workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  );
```

## Queries SQL úteis para Analytics

```sql
-- CTR médio por campanha nos últimos 30 dias
select
  campaign_name,
  round(avg(ctr), 2) as avg_ctr,
  sum(spend) as total_spend,
  sum(conversions) as total_conversions,
  round(sum(spend) / nullif(sum(conversions), 0), 2) as cost_per_conv
from meta_ads_performance
where workspace_id = $1
  and metric_date >= current_date - interval '30 days'
group by campaign_name
order by avg_ctr desc;

-- Score médio dos criativos ativos
select
  ad_name,
  campaign_name,
  round(avg(creative_score)) as avg_score,
  sum(impressions) as total_impressions,
  sum(spend) as total_spend
from meta_ads_performance
where workspace_id = $1
  and metric_date >= current_date - interval '7 days'
group by ad_id, ad_name, campaign_name
having sum(impressions) > 100
order by avg_score desc;

-- GA4: sessões por canal nos últimos 30 dias
select
  source_medium,
  sum(sessions) as total_sessions,
  sum(conversions) as total_conversions,
  round(avg(bounce_rate), 2) as avg_bounce
from ga4_metrics
where workspace_id = $1
  and metric_date >= current_date - interval '30 days'
group by source_medium
order by total_sessions desc;

-- Busca de mídia por tags (para sugestão em criativos)
select id, file_url, thumbnail_url, ai_description, ai_mood, ai_tags,
       ai_fit_score_map->$angle as fit_score
from media_library
where workspace_id = $1
  and tagging_status = 'done'
  and (
    ai_tags && $tags::text[]   -- overlap de tags
    or ai_mood = $mood
  )
order by (ai_fit_score_map->$angle)::float desc nulls last
limit 10;
```
