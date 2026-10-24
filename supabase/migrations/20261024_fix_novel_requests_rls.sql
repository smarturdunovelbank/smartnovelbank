-- ── fix_novel_requests_rls: Fix RLS and Role Permissions for novel_requests ───
-- Public users submit and track requests via anon key; admin panel queries via
-- authenticated/anon/service_role keys.
-- Disabling RLS aligns novel_requests with novel_knowledge, site_settings, and
-- featured_novels where backend/edge security is enforced at the application tier.

-- 1. Disable Row Level Security on public.novel_requests
alter table public.novel_requests disable row level security;

-- 2. Ensure explicit grants for anon, authenticated, and service_role roles
grant select, insert, update, delete on public.novel_requests to anon, authenticated, service_role;

-- 3. Ensure sequence permissions are granted for auto-incrementing ID
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 4. Fallback permissive policy (in the event RLS is manually re-enabled in Supabase dashboard)
drop policy if exists "Allow public read access" on public.novel_requests;
drop policy if exists "Allow public insert" on public.novel_requests;
drop policy if exists "Allow authenticated admin full access" on public.novel_requests;
drop policy if exists "Allow full access to novel_requests" on public.novel_requests;

create policy "Allow full access to novel_requests"
  on public.novel_requests
  for all
  to anon, authenticated, service_role
  using (true)
  with check (true);
