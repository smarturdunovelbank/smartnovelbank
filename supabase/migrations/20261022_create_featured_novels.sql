-- ── featured_novels: Highlighted & Featured Urdu Novels ────────────────────
-- Dedicated table for featured novels displayed prominently on the site.
-- Novels can be added here during Single Entry, Bulk Spreadsheet Import (.csv, .xlsx, .xls),
-- or toggled directly from the admin Novel Catalog table.

create table if not exists public.featured_novels (
  id bigint generated always as identity primary key,
  novel_id bigint,
  "Titles" text not null,
  "Links" text not null,
  created_at timestamptz default now()
);

-- Case-insensitive unique index on Titles to prevent duplicate featured entries
create unique index if not exists idx_featured_novels_titles_unique 
  on public.featured_novels (lower(trim("Titles")));

-- Case-insensitive unique index on Links to prevent duplicate URLs
create unique index if not exists idx_featured_novels_links_unique 
  on public.featured_novels (lower(trim("Links")));

-- Index on novel_id for quick lookups and joins
create index if not exists idx_featured_novels_novel_id
  on public.featured_novels (novel_id);

-- Disable RLS so backend APIs with admin authorization can read, insert, and delete freely
alter table public.featured_novels disable row level security;
