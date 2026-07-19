import { supabase } from "../lib/supabaseClient";
import { novelPath } from "../lib/slug";

const CHUNK = 50000; // Google's per-sitemap URL limit

export async function generateSitemaps() {
  const { count } = await supabase
    .from("urdu_novels")
    .select("id", { count: "exact", head: true });

  const total = count || 0;
  const chunks = Math.max(1, Math.ceil(total / CHUNK));
  return Array.from({ length: chunks }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }) {
  const staticPages = id === 0 ? [
    { url: `${process.env.NEXT_PUBLIC_SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${process.env.NEXT_PUBLIC_SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${process.env.NEXT_PUBLIC_SITE_URL}/request-novel`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${process.env.NEXT_PUBLIC_SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${process.env.NEXT_PUBLIC_SITE_URL}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ] : [];

  const from = id * CHUNK;
  const to = from + CHUNK - 1;

  const { data } = await supabase
    .from("urdu_novels")
    .select("id, Titles")
    .order("id", { ascending: true })
    .range(from, to);

  const dynamicPages = (data || []).map((novel) => ({
    url: `${process.env.NEXT_PUBLIC_SITE_URL}${novelPath(novel)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...dynamicPages];
}
