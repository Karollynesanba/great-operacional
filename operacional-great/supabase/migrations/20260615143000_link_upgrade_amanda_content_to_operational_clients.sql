-- Link Upgrade Amanda content tables to operational clients.
-- Keeps the legacy brand_profiles relation for older records while new writes use operational_clients.

alter table public.calendar_recordings
  add column if not exists client_id uuid references public.operational_clients(id) on delete set null;

alter table public.calendar_recordings
  alter column profile_id drop not null;

update public.calendar_recordings as recording
set client_id = (
  select client.id
  from public.brand_profiles as profile
  join public.operational_clients as client
    on lower(trim(client.client_name)) = lower(trim(profile.display_name))
  where profile.id = recording.profile_id
  order by client.updated_at desc
  limit 1
)
where recording.client_id is null
  and recording.profile_id is not null;

create index if not exists calendar_recordings_client_id_idx
  on public.calendar_recordings(client_id);

alter table public.validated_scripts
  add column if not exists client_id uuid references public.operational_clients(id) on delete set null;

alter table public.validated_scripts
  alter column profile_id drop not null;

update public.validated_scripts as script
set client_id = (
  select client.id
  from public.brand_profiles as profile
  join public.operational_clients as client
    on lower(trim(client.client_name)) = lower(trim(profile.display_name))
  where profile.id = script.profile_id
  order by client.updated_at desc
  limit 1
)
where script.client_id is null
  and script.profile_id is not null;

create index if not exists validated_scripts_client_id_idx
  on public.validated_scripts(client_id);

alter table public.ready_models
  add column if not exists client_id uuid references public.operational_clients(id) on delete set null;

alter table public.ready_models
  alter column profile_id drop not null;

update public.ready_models as model
set client_id = (
  select client.id
  from public.brand_profiles as profile
  join public.operational_clients as client
    on lower(trim(client.client_name)) = lower(trim(profile.display_name))
  where profile.id = model.profile_id
  order by client.updated_at desc
  limit 1
)
where model.client_id is null
  and model.profile_id is not null;

create index if not exists ready_models_client_id_idx
  on public.ready_models(client_id);
