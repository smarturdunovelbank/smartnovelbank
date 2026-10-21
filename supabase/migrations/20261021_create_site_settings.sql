-- ── site_settings: Global site configuration and feature flags ──────────────
-- Single-row configuration table (id = 1) for controlling site features like
-- maintenance toggles, notices, and dynamic settings without redeployment.

create table if not exists public.site_settings (
  id                          bigint primary key default 1,
  request_form_maintenance    boolean not null default false,
  chatbot_enabled             boolean not null default true,
  maintenance_message         text,
  updated_at                  timestamptz default now()
);

-- Ensure chatbot_enabled column exists if table was already created
alter table public.site_settings add column if not exists chatbot_enabled boolean not null default true;

-- Ensure default configuration row exists (id = 1)
insert into public.site_settings (id, request_form_maintenance, chatbot_enabled, maintenance_message)
values (1, false, true, null)
on conflict (id) do nothing;

-- Disable RLS so backend APIs can read & update settings seamlessly
alter table public.site_settings disable row level security;
