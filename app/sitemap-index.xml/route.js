import { supabase } from "../../lib/supabaseClient";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourdomain.com";

  const { count } = await supabase
    .from("urdu_novels")
    .select("id", { count: "exact", head: true });

  const total = count || 0;
  const CHUNK = 50000;
  const chunks = Math.max(1, Math.ceil(total / CHUNK));

  const sitemapNodes = Array.from({ length: chunks }, (_, i) => `
    <sitemap>
      <loc>${siteUrl}/sitemap/${i}.xml</loc>
    </sitemap>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapNodes}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate",
    },
  });
}
