-- Remove the legacy Tráfego Pago gestor boards from exec_boards.
-- Their columns/cards cascade via FK constraints.
delete from public.exec_boards
where id in (
  'd2b9f967-32dc-4665-9317-92b51da9f444',
  'cd5b9644-f7fa-4ae4-ba1d-8837db1d0759',
  'c29d8440-afdd-4939-b611-6b73ea91f33c',
  'cd34304a-bfb2-4ebd-9223-1a277807212e',
  'c282e0a3-aa4b-4e24-8c96-f20d6c904570'
)
or (sector = 'TRAFEGO' and lower(name) like '%gestor de tráfego%');
