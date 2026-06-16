-- Returns the monthly arts matrix by client and week.
-- Uses the creative publication date when available, falling back to the creation date.

create or replace function public.get_artes_por_cliente_matrix(
  p_year integer,
  p_month integer,
  p_search text default null
)
returns table (
  client_id uuid,
  client_name text,
  week_1 integer,
  week_2 integer,
  week_3 integer,
  week_4 integer,
  week_5 integer,
  total integer
)
language sql
stable
as $$
with filtered_clients as (
  select
    oc.id,
    oc.client_name
  from public.operational_clients oc
  where p_search is null
    or btrim(p_search) = ''
    or oc.client_name ilike '%' || btrim(p_search) || '%'
),
creative_rollup as (
  select
    ac.client_id,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int as week_of_month,
    count(*)::int as arts_count
  from public.ad_creatives ac
  join public.operational_clients oc on oc.id = ac.client_id
  where ac.client_id is not null
    and extract(year from coalesce(ac.completed_at, ac.created_at))::int = p_year
    and extract(month from coalesce(ac.completed_at, ac.created_at))::int = p_month
    and (
      p_search is null
      or btrim(p_search) = ''
      or oc.client_name ilike '%' || btrim(p_search) || '%'
    )
  group by
    ac.client_id,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int
)
select
  fc.id as client_id,
  fc.client_name,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 1), 0)::int as week_1,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 2), 0)::int as week_2,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 3), 0)::int as week_3,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 4), 0)::int as week_4,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 5), 0)::int as week_5,
  coalesce(sum(cr.arts_count), 0)::int as total
from filtered_clients fc
left join creative_rollup cr on cr.client_id = fc.id
group by fc.id, fc.client_name
order by fc.client_name asc;
$$;

grant execute on function public.get_artes_por_cliente_matrix(integer, integer, text) to anon, authenticated, service_role;
