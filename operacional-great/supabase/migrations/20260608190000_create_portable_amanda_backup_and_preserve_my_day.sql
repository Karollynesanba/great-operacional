begin;

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Tabela de backup portátil
-- -------------------------------------------------------------------
create table if not exists public.user_portable_backups (
  id uuid primary key default gen_random_uuid(),
  backup_key text not null,
  subject_email text not null,
  subject_user_id uuid not null,
  source_table text not null,
  source_record_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists user_portable_backups_backup_key_idx
  on public.user_portable_backups (backup_key);

create index if not exists user_portable_backups_subject_email_idx
  on public.user_portable_backups (lower(subject_email));

create index if not exists user_portable_backups_subject_user_id_idx
  on public.user_portable_backups (subject_user_id);

create index if not exists user_portable_backups_source_table_idx
  on public.user_portable_backups (source_table);

alter table public.user_portable_backups enable row level security;

drop policy if exists "Read own portable backups" on public.user_portable_backups;
drop policy if exists "Insert portable backups" on public.user_portable_backups;

create policy "Read own portable backups"
on public.user_portable_backups
for select
to authenticated
using (
  lower(subject_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or subject_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.email) = lower(subject_email)
  )
  or exists (
    select 1
    from public.profiles p
    where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and p.id = subject_user_id
  )
);

create policy "Insert portable backups"
on public.user_portable_backups
for insert
to authenticated
with check (auth.uid() is not null);

revoke update, delete on public.user_portable_backups from public;
revoke update, delete on public.user_portable_backups from anon;
revoke update, delete on public.user_portable_backups from authenticated;

grant select, insert on public.user_portable_backups to authenticated;

-- -------------------------------------------------------------------
-- Garantir o perfil da Amanda
-- -------------------------------------------------------------------
do $$
declare
  v_email text := lower('amandagreatsd@gmail.com');
  v_profile_id uuid;
begin
  select id
    into v_profile_id
  from public.profiles
  where lower(email) = v_email
  order by created_at desc nulls last
  limit 1;

  if v_profile_id is null then
    v_profile_id := gen_random_uuid();

    insert into public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      operational_role,
      commercial_role,
      team_id,
      is_active,
      login_password,
      is_admin,
      created_at,
      updated_at
    )
    values (
      v_profile_id,
      v_email,
      'Amanda Great',
      null,
      'EDITOR_VIDEO'::public.operational_role,
      null,
      null,
      true,
      null,
      false,
      now(),
      now()
    );
  else
    update public.profiles
    set
      email = v_email,
      full_name = 'Amanda Great',
      operational_role = 'EDITOR_VIDEO'::public.operational_role,
      commercial_role = null,
      is_active = true,
      is_admin = false,
      updated_at = now()
    where id = v_profile_id;
  end if;
end $$;

-- -------------------------------------------------------------------
-- Snapshot portátil da Amanda
-- -------------------------------------------------------------------
do $$
declare
  v_email text := lower('amandagreatsd@gmail.com');
  v_profile_id uuid;
  v_backup_key text := 'amanda-complete-' || to_char(now(), 'YYYYMMDDHH24MISS');
begin
  select id
    into v_profile_id
  from public.profiles
  where lower(email) = v_email
  order by created_at desc nulls last
  limit 1;

  if v_profile_id is null then
    raise exception 'Amanda profile not found after upsert';
  end if;

  delete from public.user_portable_backups
  where backup_key = v_backup_key;

  insert into public.user_portable_backups (
    backup_key,
    subject_email,
    subject_user_id,
    source_table,
    source_record_id,
    payload
  )
  select
    v_backup_key,
    v_email,
    p.id,
    'profiles',
    p.id,
    to_jsonb(p)
  from public.profiles p
  where p.id = v_profile_id;

  if to_regclass('public.work_items') is not null then
    insert into public.user_portable_backups (
      backup_key,
      subject_email,
      subject_user_id,
      source_table,
      source_record_id,
      payload
    )
    select
      v_backup_key,
      v_email,
      v_profile_id,
      'work_items',
      wi.id,
      to_jsonb(wi)
    from public.work_items wi
    where wi.reporter_user_id = v_profile_id
       or wi.assignee_user_id = v_profile_id
       or exists (
         select 1
         from jsonb_array_elements_text(coalesce(wi.tags->'assignee_user_ids', '[]'::jsonb)) as t(value)
         where t.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           and t.value::uuid = v_profile_id
       );
  end if;

  if to_regclass('public.my_day_items') is not null then
    insert into public.user_portable_backups (
      backup_key,
      subject_email,
      subject_user_id,
      source_table,
      source_record_id,
      payload
    )
    select
      v_backup_key,
      v_email,
      v_profile_id,
      'my_day_items',
      mdi.id,
      to_jsonb(mdi)
    from public.my_day_items mdi
    where mdi.user_id = v_profile_id
       or mdi.assigned_to_user_id = v_profile_id
       or mdi.assigned_by_user_id = v_profile_id
       or mdi.origin_reporter_user_id = v_profile_id;
  end if;

  if to_regclass('public.notifications') is not null then
    insert into public.user_portable_backups (
      backup_key,
      subject_email,
      subject_user_id,
      source_table,
      source_record_id,
      payload
    )
    select
      v_backup_key,
      v_email,
      v_profile_id,
      'notifications',
      n.id,
      to_jsonb(n)
    from public.notifications n
    where n.user_id = v_profile_id;
  end if;

  if to_regclass('public.activity_logs') is not null then
    insert into public.user_portable_backups (
      backup_key,
      subject_email,
      subject_user_id,
      source_table,
      source_record_id,
      payload
    )
    select
      v_backup_key,
      v_email,
      v_profile_id,
      'activity_logs',
      al.id,
      to_jsonb(al)
    from public.activity_logs al
    where al.user_id = v_profile_id;
  end if;
end $$;

-- -------------------------------------------------------------------
-- Não apagar Meu Dia automaticamente quando apagar a work_item
-- -------------------------------------------------------------------
create or replace function public.cleanup_on_work_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where related_entity = 'work_items'
    and related_entity_id::text = old.id::text;

  return old;
end;
$$;

drop trigger if exists work_items_cleanup_after_delete on public.work_items;

create trigger work_items_cleanup_after_delete
after delete on public.work_items
for each row
execute function public.cleanup_on_work_item_delete();

commit;
