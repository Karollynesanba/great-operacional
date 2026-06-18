-- Consolidated monthly matrix for client arts.
-- One row per client/year/month, with the five weekly buckets stored in the same record.

create table if not exists public.client_artes_matrix (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.operational_clients(id) on delete cascade,
  year integer not null,
  month integer not null check (month >= 1 and month <= 12),
  week_1 integer not null default 0,
  week_2 integer not null default 0,
  week_3 integer not null default 0,
  week_4 integer not null default 0,
  week_5 integer not null default 0,
  total integer not null default 0,
  created_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, year, month)
);

alter table public.client_artes_matrix enable row level security;

drop policy if exists "Authenticated users can view arts matrix" on public.client_artes_matrix;
drop policy if exists "Authenticated users can insert arts matrix" on public.client_artes_matrix;
drop policy if exists "Authenticated users can update arts matrix" on public.client_artes_matrix;
drop policy if exists "Authenticated users can delete arts matrix" on public.client_artes_matrix;

create policy "Authenticated users can view arts matrix"
on public.client_artes_matrix
for select
to authenticated
using (true);

create policy "Authenticated users can insert arts matrix"
on public.client_artes_matrix
for insert
to authenticated
with check (true);

create policy "Authenticated users can update arts matrix"
on public.client_artes_matrix
for update
to authenticated
using (true);

create policy "Authenticated users can delete arts matrix"
on public.client_artes_matrix
for delete
to authenticated
using (true);

create trigger update_client_artes_matrix_updated_at
before update on public.client_artes_matrix
for each row
execute function public.update_updated_at_column();

create index if not exists idx_client_artes_matrix_client_id on public.client_artes_matrix(client_id);
create index if not exists idx_client_artes_matrix_year_month on public.client_artes_matrix(year, month);

insert into public.client_artes_matrix (
  client_id,
  year,
  month,
  week_1,
  week_2,
  week_3,
  week_4,
  week_5,
  total
)
select
  rollup.client_id,
  rollup.year,
  rollup.month,
  coalesce(sum(rollup.artes_count) filter (where rollup.week = 1), 0)::int as week_1,
  coalesce(sum(rollup.artes_count) filter (where rollup.week = 2), 0)::int as week_2,
  coalesce(sum(rollup.artes_count) filter (where rollup.week = 3), 0)::int as week_3,
  coalesce(sum(rollup.artes_count) filter (where rollup.week = 4), 0)::int as week_4,
  coalesce(sum(rollup.artes_count) filter (where rollup.week = 5), 0)::int as week_5,
  coalesce(sum(rollup.artes_count), 0)::int as total
from (
  select
    ac.client_id,
    extract(year from coalesce(ac.completed_at, ac.created_at))::int as year,
    extract(month from coalesce(ac.completed_at, ac.created_at))::int as month,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int as week,
    count(*)::int as artes_count
  from public.ad_creatives ac
  where ac.client_id is not null
  group by
    ac.client_id,
    extract(year from coalesce(ac.completed_at, ac.created_at))::int,
    extract(month from coalesce(ac.completed_at, ac.created_at))::int,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int
) as rollup
group by rollup.client_id, rollup.year, rollup.month
on conflict (client_id, year, month) do update
set
  week_1 = excluded.week_1,
  week_2 = excluded.week_2,
  week_3 = excluded.week_3,
  week_4 = excluded.week_4,
  week_5 = excluded.week_5,
  total = excluded.total,
  updated_at = now();
