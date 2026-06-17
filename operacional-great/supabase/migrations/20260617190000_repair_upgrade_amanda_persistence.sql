-- Repair Upgrade Amanda persistence tables in environments where the
-- client_id linkage or PostgREST schema cache did not fully catch up.
-- This migration is idempotent and safe to re-run.

do $$
begin
  if to_regclass('public.brand_profiles') is not null then
    execute 'alter table public.brand_profiles enable row level security';
    execute 'grant select, insert, update, delete on table public.brand_profiles to anon, authenticated, service_role';
    execute 'drop policy if exists "upgrade_amanda_public_select_brand_profiles" on public.brand_profiles';
    execute 'drop policy if exists "upgrade_amanda_public_insert_brand_profiles" on public.brand_profiles';
    execute 'drop policy if exists "upgrade_amanda_public_update_brand_profiles" on public.brand_profiles';
    execute 'drop policy if exists "upgrade_amanda_public_delete_brand_profiles" on public.brand_profiles';
    execute 'create policy "upgrade_amanda_public_select_brand_profiles" on public.brand_profiles for select to public using (true)';
    execute 'create policy "upgrade_amanda_public_insert_brand_profiles" on public.brand_profiles for insert to public with check (true)';
    execute 'create policy "upgrade_amanda_public_update_brand_profiles" on public.brand_profiles for update to public using (true) with check (true)';
    execute 'create policy "upgrade_amanda_public_delete_brand_profiles" on public.brand_profiles for delete to public using (true)';
  end if;

  if to_regclass('public.calendar_recordings') is not null then
    execute 'alter table public.calendar_recordings add column if not exists client_id uuid references public.operational_clients(id) on delete set null';
    execute 'alter table public.calendar_recordings alter column profile_id drop not null';
    execute 'create index if not exists calendar_recordings_client_id_idx on public.calendar_recordings(client_id)';
    execute 'alter table public.calendar_recordings enable row level security';
    execute 'grant select, insert, update, delete on table public.calendar_recordings to anon, authenticated, service_role';
    execute 'drop policy if exists "upgrade_amanda_public_select_calendar_recordings" on public.calendar_recordings';
    execute 'drop policy if exists "upgrade_amanda_public_insert_calendar_recordings" on public.calendar_recordings';
    execute 'drop policy if exists "upgrade_amanda_public_update_calendar_recordings" on public.calendar_recordings';
    execute 'drop policy if exists "upgrade_amanda_public_delete_calendar_recordings" on public.calendar_recordings';
    execute 'create policy "upgrade_amanda_public_select_calendar_recordings" on public.calendar_recordings for select to public using (true)';
    execute 'create policy "upgrade_amanda_public_insert_calendar_recordings" on public.calendar_recordings for insert to public with check (true)';
    execute 'create policy "upgrade_amanda_public_update_calendar_recordings" on public.calendar_recordings for update to public using (true) with check (true)';
    execute 'create policy "upgrade_amanda_public_delete_calendar_recordings" on public.calendar_recordings for delete to public using (true)';
  end if;

  if to_regclass('public.validated_scripts') is not null then
    execute 'alter table public.validated_scripts add column if not exists client_id uuid references public.operational_clients(id) on delete set null';
    execute 'alter table public.validated_scripts alter column profile_id drop not null';
    execute 'create index if not exists validated_scripts_client_id_idx on public.validated_scripts(client_id)';
    execute 'alter table public.validated_scripts enable row level security';
    execute 'grant select, insert, update, delete on table public.validated_scripts to anon, authenticated, service_role';
    execute 'drop policy if exists "upgrade_amanda_public_select_validated_scripts" on public.validated_scripts';
    execute 'drop policy if exists "upgrade_amanda_public_insert_validated_scripts" on public.validated_scripts';
    execute 'drop policy if exists "upgrade_amanda_public_update_validated_scripts" on public.validated_scripts';
    execute 'drop policy if exists "upgrade_amanda_public_delete_validated_scripts" on public.validated_scripts';
    execute 'create policy "upgrade_amanda_public_select_validated_scripts" on public.validated_scripts for select to public using (true)';
    execute 'create policy "upgrade_amanda_public_insert_validated_scripts" on public.validated_scripts for insert to public with check (true)';
    execute 'create policy "upgrade_amanda_public_update_validated_scripts" on public.validated_scripts for update to public using (true) with check (true)';
    execute 'create policy "upgrade_amanda_public_delete_validated_scripts" on public.validated_scripts for delete to public using (true)';
  end if;

  if to_regclass('public.performance_structures') is not null then
    execute 'alter table public.performance_structures add column if not exists client_id uuid references public.operational_clients(id) on delete set null';
    execute 'alter table public.performance_structures alter column profile_id drop not null';
    execute 'create index if not exists performance_structures_client_id_idx on public.performance_structures(client_id)';
    execute 'alter table public.performance_structures enable row level security';
    execute 'grant select, insert, update, delete on table public.performance_structures to anon, authenticated, service_role';
    execute 'drop policy if exists "upgrade_amanda_public_select_performance_structures" on public.performance_structures';
    execute 'drop policy if exists "upgrade_amanda_public_insert_performance_structures" on public.performance_structures';
    execute 'drop policy if exists "upgrade_amanda_public_update_performance_structures" on public.performance_structures';
    execute 'drop policy if exists "upgrade_amanda_public_delete_performance_structures" on public.performance_structures';
    execute 'create policy "upgrade_amanda_public_select_performance_structures" on public.performance_structures for select to public using (true)';
    execute 'create policy "upgrade_amanda_public_insert_performance_structures" on public.performance_structures for insert to public with check (true)';
    execute 'create policy "upgrade_amanda_public_update_performance_structures" on public.performance_structures for update to public using (true) with check (true)';
    execute 'create policy "upgrade_amanda_public_delete_performance_structures" on public.performance_structures for delete to public using (true)';
  end if;

  if to_regclass('public.ready_models') is not null then
    execute 'alter table public.ready_models add column if not exists client_id uuid references public.operational_clients(id) on delete set null';
    execute 'alter table public.ready_models alter column profile_id drop not null';
    execute 'create index if not exists ready_models_client_id_idx on public.ready_models(client_id)';
    execute 'alter table public.ready_models enable row level security';
    execute 'grant select, insert, update, delete on table public.ready_models to anon, authenticated, service_role';
    execute 'drop policy if exists "upgrade_amanda_public_select_ready_models" on public.ready_models';
    execute 'drop policy if exists "upgrade_amanda_public_insert_ready_models" on public.ready_models';
    execute 'drop policy if exists "upgrade_amanda_public_update_ready_models" on public.ready_models';
    execute 'drop policy if exists "upgrade_amanda_public_delete_ready_models" on public.ready_models';
    execute 'create policy "upgrade_amanda_public_select_ready_models" on public.ready_models for select to public using (true)';
    execute 'create policy "upgrade_amanda_public_insert_ready_models" on public.ready_models for insert to public with check (true)';
    execute 'create policy "upgrade_amanda_public_update_ready_models" on public.ready_models for update to public using (true) with check (true)';
    execute 'create policy "upgrade_amanda_public_delete_ready_models" on public.ready_models for delete to public using (true)';
  end if;

  perform pg_notify('pgrst', 'reload schema');
end $$;
