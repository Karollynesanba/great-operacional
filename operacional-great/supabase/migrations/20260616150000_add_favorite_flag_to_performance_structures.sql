-- Mark performance structures as favorite without affecting existing rows

alter table public.performance_structures
  add column if not exists is_favorite boolean not null default false;

create index if not exists performance_structures_is_favorite_idx
  on public.performance_structures(is_favorite);

