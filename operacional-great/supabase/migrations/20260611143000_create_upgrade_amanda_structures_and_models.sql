-- Upgrade Amanda: estruturas que performam e modelos prontos

create table if not exists public.performance_structures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title text not null,
  structure_type text not null,
  category text not null,
  description text null,
  usage_count integer not null default 0,
  views_count integer not null default 0,
  engagement_rate numeric(6,2) not null default 0,
  saves_count integer not null default 0,
  reference_date date not null default current_date,
  asset_kind text null check (asset_kind in ('image', 'video', 'file')),
  asset_url text null,
  asset_path text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.performance_structures to anon, authenticated, service_role;

create table if not exists public.ready_models (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title text not null,
  model_type text not null,
  category text not null,
  description text null,
  content text not null,
  reference_date date not null default current_date,
  related_campaign text null,
  asset_kind text null check (asset_kind in ('image', 'video', 'file')),
  asset_url text null,
  asset_path text null,
  model_tags jsonb null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.ready_models to anon, authenticated, service_role;

create index if not exists performance_structures_profile_id_idx on public.performance_structures(profile_id);
create index if not exists performance_structures_type_idx on public.performance_structures(structure_type);
create index if not exists performance_structures_reference_date_idx on public.performance_structures(reference_date);
create index if not exists ready_models_profile_id_idx on public.ready_models(profile_id);
create index if not exists ready_models_type_idx on public.ready_models(model_type);
create index if not exists ready_models_category_idx on public.ready_models(category);
create index if not exists ready_models_reference_date_idx on public.ready_models(reference_date);

alter table public.performance_structures enable row level security;
alter table public.ready_models enable row level security;

drop policy if exists "Authenticated users can read performance structures" on public.performance_structures;
drop policy if exists "Anyone can read performance structures" on public.performance_structures;
create policy "Anyone can read performance structures"
  on public.performance_structures
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert performance structures" on public.performance_structures;
drop policy if exists "Anyone can insert performance structures" on public.performance_structures;
create policy "Anyone can insert performance structures"
  on public.performance_structures
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update performance structures" on public.performance_structures;
drop policy if exists "Anyone can update performance structures" on public.performance_structures;
create policy "Anyone can update performance structures"
  on public.performance_structures
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete performance structures" on public.performance_structures;
drop policy if exists "Anyone can delete performance structures" on public.performance_structures;
create policy "Anyone can delete performance structures"
  on public.performance_structures
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read ready models" on public.ready_models;
drop policy if exists "Anyone can read ready models" on public.ready_models;
create policy "Anyone can read ready models"
  on public.ready_models
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert ready models" on public.ready_models;
drop policy if exists "Anyone can insert ready models" on public.ready_models;
create policy "Anyone can insert ready models"
  on public.ready_models
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update ready models" on public.ready_models;
drop policy if exists "Anyone can update ready models" on public.ready_models;
create policy "Anyone can update ready models"
  on public.ready_models
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete ready models" on public.ready_models;
drop policy if exists "Anyone can delete ready models" on public.ready_models;
create policy "Anyone can delete ready models"
  on public.ready_models
  for delete
  to public
  using (true);

drop trigger if exists update_performance_structures_updated_at on public.performance_structures;
create trigger update_performance_structures_updated_at
  before update on public.performance_structures
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_ready_models_updated_at on public.ready_models;
create trigger update_ready_models_updated_at
  before update on public.ready_models
  for each row execute function public.update_updated_at_column();

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can view brand assets" on storage.objects;
create policy "Anyone can view brand assets"
  on storage.objects
  for select
  using (bucket_id = 'brand-assets');

drop policy if exists "Authenticated users can upload brand assets" on storage.objects;
drop policy if exists "Anyone can upload brand assets" on storage.objects;
create policy "Anyone can upload brand assets"
  on storage.objects
  for insert
  to public
  with check (bucket_id = 'brand-assets');

drop policy if exists "Authenticated users can update brand assets" on storage.objects;
drop policy if exists "Anyone can update brand assets" on storage.objects;
create policy "Anyone can update brand assets"
  on storage.objects
  for update
  to public
  using (bucket_id = 'brand-assets')
  with check (bucket_id = 'brand-assets');

drop policy if exists "Authenticated users can delete brand assets" on storage.objects;
drop policy if exists "Anyone can delete brand assets" on storage.objects;
create policy "Anyone can delete brand assets"
  on storage.objects
  for delete
  to public
  using (bucket_id = 'brand-assets');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.performance_structures';
    execute 'alter publication supabase_realtime add table public.ready_models';
  end if;
end $$;
