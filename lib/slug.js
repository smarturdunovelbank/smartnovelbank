// Converts a novel title into a URL-friendly slug.
// The actual page lookup uses the numeric `id`, NOT this slug — the slug
// is purely for readability/SEO. This means titles with Urdu script,
// punctuation, duplicate names, etc. never break routing.
export function slugify(title) {
  return (title || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-") // keep Arabic/Urdu script + alphanumerics
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "novel";
}

// Builds the canonical path for a novel: /novel/123-namal
export function novelPath(novel) {
  return `/novel/${novel.id}-${slugify(novel.Titles)}`;
}

// Extracts the numeric id from a "123-namal" style param
export function idFromParam(param) {
  const match = /^(\d+)/.exec(param || "");
  return match ? parseInt(match[1], 10) : null;
}
