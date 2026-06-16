-- Collapse duplicate operational clients with the same visible name so the
-- arts matrix and selector show each client once.

create or replace function public.get_artes_por_cliente_matrix(
  p_year integer,
  p_month integer,
  p_client_id uuid default null,
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
with normalized_clients as (
  select
    case
      when p_client_id is null then lower(btrim(oc.client_name))
      else oc.id::text
    end as client_key,
    (array_agg(oc.id order by oc.updated_at desc nulls last, oc.created_at desc, oc.id desc))[1] as client_id,
    (array_agg(oc.client_name order by oc.updated_at desc nulls last, oc.created_at desc, oc.id desc))[1] as client_name
  from public.operational_clients oc
  where p_search is null
    or btrim(p_search) = ''
    or lower(btrim(oc.client_name)) like '%' || lower(btrim(p_search)) || '%'
    or lower(btrim(coalesce(oc.clinic_name, ''))) like '%' || lower(btrim(p_search)) || '%'
    or lower(btrim(oc.client_name || ' ' || coalesce(oc.clinic_name, ''))) like '%' || lower(btrim(p_search)) || '%'
    or (p_client_id is not null and oc.id = p_client_id)
  group by
    case
      when p_client_id is null then lower(btrim(oc.client_name))
      else oc.id::text
    end
),
creative_rollup as (
  select
    case
      when p_client_id is null then lower(btrim(oc.client_name))
      else oc.id::text
    end as client_key,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int as week_of_month,
    count(*)::int as arts_count
  from public.ad_creatives ac
  join public.operational_clients oc on oc.id = ac.client_id
  where ac.client_id is not null
    and (p_client_id is null or ac.client_id = p_client_id)
    and extract(year from coalesce(ac.completed_at, ac.created_at))::int = p_year
    and extract(month from coalesce(ac.completed_at, ac.created_at))::int = p_month
    and (
      p_search is null
      or btrim(p_search) = ''
      or lower(btrim(oc.client_name)) like '%' || lower(btrim(p_search)) || '%'
      or lower(btrim(coalesce(oc.clinic_name, ''))) like '%' || lower(btrim(p_search)) || '%'
      or lower(btrim(oc.client_name || ' ' || coalesce(oc.clinic_name, ''))) like '%' || lower(btrim(p_search)) || '%'
      or (p_client_id is not null and oc.id = p_client_id)
    )
  group by
    case
      when p_client_id is null then lower(btrim(oc.client_name))
      else oc.id::text
    end,
    least(
      5,
      ceil(extract(day from coalesce(ac.completed_at, ac.created_at))::numeric / 7.0)
    )::int
)
select
  nc.client_id,
  nc.client_name,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 1), 0)::int as week_1,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 2), 0)::int as week_2,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 3), 0)::int as week_3,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 4), 0)::int as week_4,
  coalesce(sum(cr.arts_count) filter (where cr.week_of_month = 5), 0)::int as week_5,
  coalesce(sum(cr.arts_count), 0)::int as total
from normalized_clients nc
left join creative_rollup cr on cr.client_key = nc.client_key
group by nc.client_id, nc.client_name
order by nc.client_name asc;
$$;

grant execute on function public.get_artes_por_cliente_matrix(integer, integer, uuid, text) to anon, authenticated, service_role;
