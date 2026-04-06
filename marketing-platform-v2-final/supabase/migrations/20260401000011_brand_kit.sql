-- Migration 011 — Brand Kit: Assets, Colors, Fonts (workspace-scoped)

-- ── Brand Assets (logos, icons, patterns) ──
create table brand_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  name text not null,
  asset_type text not null default 'logo',
  category text,
  file_url text not null,
  file_format text,
  width integer,
  height integer,
  is_favorite boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table brand_assets enable row level security;
create policy "workspace member manages brand assets"
  on brand_assets for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = brand_assets.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_brand_assets_workspace on brand_assets (workspace_id, sort_order);

-- ── Brand Colors ──
create table brand_colors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  hex_value text not null,
  rgb_value text,
  category text default 'primary',
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table brand_colors enable row level security;
create policy "workspace member manages brand colors"
  on brand_colors for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = brand_colors.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_brand_colors_workspace on brand_colors (workspace_id, sort_order);

-- ── Brand Fonts ──
create table brand_fonts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  font_name text not null,
  font_weight text default 'Regular',
  usage text default 'body',
  font_url text,
  sample_text text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table brand_fonts enable row level security;
create policy "workspace member manages brand fonts"
  on brand_fonts for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = brand_fonts.workspace_id
      and user_id = auth.uid()
    )
  );

create index idx_brand_fonts_workspace on brand_fonts (workspace_id, sort_order);

-- ── Storage bucket for brand assets ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "workspace member uploads brand assets"
  on storage.objects for insert
  with check (bucket_id = 'brand-assets' and auth.uid() is not null);

create policy "public reads brand assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

create policy "owner deletes brand assets"
  on storage.objects for delete
  using (bucket_id = 'brand-assets' and auth.uid() = owner);
