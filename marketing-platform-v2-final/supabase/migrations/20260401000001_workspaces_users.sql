-- Migration 001 — Workspaces e Usuários

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

create policy "owner manages workspace"
  on workspaces for all
  using (owner_id = auth.uid());

create policy "member sees workspace_members"
  on workspace_members for select
  using (user_id = auth.uid());

create policy "owner manages workspace_members"
  on workspace_members for all
  using (
    exists (
      select 1 from workspaces
      where id = workspace_members.workspace_id
      and owner_id = auth.uid()
    )
  );
