-- Reopen client activity tracking writes for authenticated users.
-- The arts-per-client spreadsheet is used operationally by more than just the Amanda/Matheus pair,
-- so saving values should not be blocked by the restrictive creative-upload policy.

alter table if exists public.client_activity_tracking enable row level security;

drop policy if exists "Amanda and Matheus can view activity tracking" on public.client_activity_tracking;
drop policy if exists "Amanda and Matheus can insert activity tracking" on public.client_activity_tracking;
drop policy if exists "Amanda and Matheus can update activity tracking" on public.client_activity_tracking;
drop policy if exists "Amanda and Matheus can delete activity tracking" on public.client_activity_tracking;
drop policy if exists "Authenticated users can view all activity tracking" on public.client_activity_tracking;
drop policy if exists "Authenticated users can insert activity tracking" on public.client_activity_tracking;
drop policy if exists "Authenticated users can update activity tracking" on public.client_activity_tracking;
drop policy if exists "Authenticated users can delete activity tracking" on public.client_activity_tracking;
drop policy if exists "Anyone can view activity tracking" on public.client_activity_tracking;
drop policy if exists "Anyone can insert activity tracking" on public.client_activity_tracking;
drop policy if exists "Anyone can update activity tracking" on public.client_activity_tracking;
drop policy if exists "Anyone can delete activity tracking" on public.client_activity_tracking;

create policy "Anyone can view activity tracking"
on public.client_activity_tracking
for select
to public
using (true);

create policy "Authenticated users can insert activity tracking"
on public.client_activity_tracking
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update activity tracking"
on public.client_activity_tracking
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete activity tracking"
on public.client_activity_tracking
for delete
to authenticated
using (auth.uid() is not null);
