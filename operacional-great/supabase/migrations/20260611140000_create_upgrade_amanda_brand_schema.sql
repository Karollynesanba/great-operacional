-- Upgrade Amanda: calendario de gravacao, identidade/paleta e roteiros validados

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  profile_type text not null check (profile_type in ('DOCTOR', 'CLIENT')),
  specialty text null,
  city text null,
  notes text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.brand_profiles to anon, authenticated, service_role;

create table if not exists public.brand_colors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  name text not null,
  hex text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.brand_colors to anon, authenticated, service_role;

create table if not exists public.brand_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title text not null,
  description text null,
  notes text null,
  preview_url text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.brand_applications to anon, authenticated, service_role;

create table if not exists public.brand_files (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  file_type text not null,
  mime_type text null,
  file_size bigint null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.brand_files to anon, authenticated, service_role;

create table if not exists public.calendar_recordings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  recording_date date not null,
  recording_time time not null,
  location text not null,
  status text not null,
  recording_type text not null,
  observations text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.calendar_recordings to anon, authenticated, service_role;

create table if not exists public.validated_scripts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title text not null,
  script_date date not null,
  format text not null,
  category text not null,
  document_name text null,
  document_url text null,
  document_path text null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on table public.validated_scripts to anon, authenticated, service_role;

create index if not exists brand_colors_profile_id_idx on public.brand_colors(profile_id);
create index if not exists brand_applications_profile_id_idx on public.brand_applications(profile_id);
create index if not exists brand_files_profile_id_idx on public.brand_files(profile_id);
create index if not exists calendar_recordings_profile_id_idx on public.calendar_recordings(profile_id);
create index if not exists calendar_recordings_date_idx on public.calendar_recordings(recording_date);
create index if not exists validated_scripts_profile_id_idx on public.validated_scripts(profile_id);
create index if not exists validated_scripts_date_idx on public.validated_scripts(script_date);

alter table public.brand_profiles enable row level security;
alter table public.brand_colors enable row level security;
alter table public.brand_applications enable row level security;
alter table public.brand_files enable row level security;
alter table public.calendar_recordings enable row level security;
alter table public.validated_scripts enable row level security;

drop policy if exists "Authenticated users can read brand profiles" on public.brand_profiles;
drop policy if exists "Anyone can read brand profiles" on public.brand_profiles;
create policy "Anyone can read brand profiles"
  on public.brand_profiles
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert brand profiles" on public.brand_profiles;
drop policy if exists "Anyone can insert brand profiles" on public.brand_profiles;
create policy "Anyone can insert brand profiles"
  on public.brand_profiles
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update brand profiles" on public.brand_profiles;
drop policy if exists "Anyone can update brand profiles" on public.brand_profiles;
create policy "Anyone can update brand profiles"
  on public.brand_profiles
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete brand profiles" on public.brand_profiles;
drop policy if exists "Anyone can delete brand profiles" on public.brand_profiles;
create policy "Anyone can delete brand profiles"
  on public.brand_profiles
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read brand colors" on public.brand_colors;
drop policy if exists "Anyone can read brand colors" on public.brand_colors;
create policy "Anyone can read brand colors"
  on public.brand_colors
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert brand colors" on public.brand_colors;
drop policy if exists "Anyone can insert brand colors" on public.brand_colors;
create policy "Anyone can insert brand colors"
  on public.brand_colors
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update brand colors" on public.brand_colors;
drop policy if exists "Anyone can update brand colors" on public.brand_colors;
create policy "Anyone can update brand colors"
  on public.brand_colors
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete brand colors" on public.brand_colors;
drop policy if exists "Anyone can delete brand colors" on public.brand_colors;
create policy "Anyone can delete brand colors"
  on public.brand_colors
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read brand applications" on public.brand_applications;
drop policy if exists "Anyone can read brand applications" on public.brand_applications;
create policy "Anyone can read brand applications"
  on public.brand_applications
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert brand applications" on public.brand_applications;
drop policy if exists "Anyone can insert brand applications" on public.brand_applications;
create policy "Anyone can insert brand applications"
  on public.brand_applications
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update brand applications" on public.brand_applications;
drop policy if exists "Anyone can update brand applications" on public.brand_applications;
create policy "Anyone can update brand applications"
  on public.brand_applications
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete brand applications" on public.brand_applications;
drop policy if exists "Anyone can delete brand applications" on public.brand_applications;
create policy "Anyone can delete brand applications"
  on public.brand_applications
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read brand files" on public.brand_files;
drop policy if exists "Anyone can read brand files" on public.brand_files;
create policy "Anyone can read brand files"
  on public.brand_files
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert brand files" on public.brand_files;
drop policy if exists "Anyone can insert brand files" on public.brand_files;
create policy "Anyone can insert brand files"
  on public.brand_files
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update brand files" on public.brand_files;
drop policy if exists "Anyone can update brand files" on public.brand_files;
create policy "Anyone can update brand files"
  on public.brand_files
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete brand files" on public.brand_files;
drop policy if exists "Anyone can delete brand files" on public.brand_files;
create policy "Anyone can delete brand files"
  on public.brand_files
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read calendar recordings" on public.calendar_recordings;
drop policy if exists "Anyone can read calendar recordings" on public.calendar_recordings;
create policy "Anyone can read calendar recordings"
  on public.calendar_recordings
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert calendar recordings" on public.calendar_recordings;
drop policy if exists "Anyone can insert calendar recordings" on public.calendar_recordings;
create policy "Anyone can insert calendar recordings"
  on public.calendar_recordings
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update calendar recordings" on public.calendar_recordings;
drop policy if exists "Anyone can update calendar recordings" on public.calendar_recordings;
create policy "Anyone can update calendar recordings"
  on public.calendar_recordings
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete calendar recordings" on public.calendar_recordings;
drop policy if exists "Anyone can delete calendar recordings" on public.calendar_recordings;
create policy "Anyone can delete calendar recordings"
  on public.calendar_recordings
  for delete
  to public
  using (true);

drop policy if exists "Authenticated users can read validated scripts" on public.validated_scripts;
drop policy if exists "Anyone can read validated scripts" on public.validated_scripts;
create policy "Anyone can read validated scripts"
  on public.validated_scripts
  for select
  to public
  using (true);

drop policy if exists "Authenticated users can insert validated scripts" on public.validated_scripts;
drop policy if exists "Anyone can insert validated scripts" on public.validated_scripts;
create policy "Anyone can insert validated scripts"
  on public.validated_scripts
  for insert
  to public
  with check (true);

drop policy if exists "Authenticated users can update validated scripts" on public.validated_scripts;
drop policy if exists "Anyone can update validated scripts" on public.validated_scripts;
create policy "Anyone can update validated scripts"
  on public.validated_scripts
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete validated scripts" on public.validated_scripts;
drop policy if exists "Anyone can delete validated scripts" on public.validated_scripts;
create policy "Anyone can delete validated scripts"
  on public.validated_scripts
  for delete
  to public
  using (true);

drop trigger if exists update_brand_profiles_updated_at on public.brand_profiles;
create trigger update_brand_profiles_updated_at
  before update on public.brand_profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_brand_colors_updated_at on public.brand_colors;
create trigger update_brand_colors_updated_at
  before update on public.brand_colors
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_brand_applications_updated_at on public.brand_applications;
create trigger update_brand_applications_updated_at
  before update on public.brand_applications
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_brand_files_updated_at on public.brand_files;
create trigger update_brand_files_updated_at
  before update on public.brand_files
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_calendar_recordings_updated_at on public.calendar_recordings;
create trigger update_calendar_recordings_updated_at
  before update on public.calendar_recordings
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_validated_scripts_updated_at on public.validated_scripts;
create trigger update_validated_scripts_updated_at
  before update on public.validated_scripts
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
    execute 'alter publication supabase_realtime add table public.brand_profiles';
    execute 'alter publication supabase_realtime add table public.brand_colors';
    execute 'alter publication supabase_realtime add table public.brand_applications';
    execute 'alter publication supabase_realtime add table public.brand_files';
    execute 'alter publication supabase_realtime add table public.calendar_recordings';
    execute 'alter publication supabase_realtime add table public.validated_scripts';
  end if;
end $$;
