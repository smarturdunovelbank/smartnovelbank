-- ── novel_knowledge: RAG knowledge store for Pakistani Urdu novels ──────────
-- Each row represents deeply-extracted structured knowledge from a single
-- review / blog post / scrape — used to power accurate, grounded AI replies.

create table if not exists public.novel_knowledge (
  id             bigint generated always as identity primary key,
  novel_title    text        not null,
  author         text,
  genres         text,                      -- comma-separated tropes/genres
  characters     text,                      -- main & side characters with roles
  ending_vibe    text,                      -- ending type + tone + reception
  detailed_summary text      not null,      -- 200-400 word Roman Urdu summary
  raw_review     text,                      -- original scraped/pasted source text
  source_url     text,                      -- originating URL (nullable)
  created_at     timestamptz default now()
);

-- Disable RLS so the service-role/anon key used by the API can read & insert freely.
-- Re-enable and add policies here if you ever add user-level auth.
alter table public.novel_knowledge disable row level security;

-- Full-text GIN index over the columns most likely to be searched
create index if not exists idx_novel_knowledge_search
  on public.novel_knowledge
  using gin (
    to_tsvector(
      'simple',
      coalesce(novel_title, '') || ' ' ||
      coalesce(author,      '') || ' ' ||
      coalesce(genres,      '') || ' ' ||
      coalesce(characters,  '')
    )
  );
