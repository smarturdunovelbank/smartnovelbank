export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourdomain.com";
  return {
    rules: [
      // ── Legitimate search engines: full access ─────────────────────────
      { userAgent: "Googlebot",           allow: "/" },
      { userAgent: "Bingbot",             allow: "/" },
      { userAgent: "Slurp",              allow: "/" },
      { userAgent: "DuckDuckBot",        allow: "/" },
      { userAgent: "YandexBot",          allow: "/" },
      { userAgent: "Baiduspider",        allow: "/" },
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "Twitterbot",         allow: "/" },
      { userAgent: "LinkedInBot",        allow: "/" },

      // ── AI-training & aggressive content scrapers: block all ─────────
      // (These provide zero SEO/discovery value — they only harvest content)
      { userAgent: "GPTBot",              disallow: "/" },
      { userAgent: "ChatGPT-User",        disallow: "/" },
      { userAgent: "OAI-SearchBot",       disallow: "/" },
      { userAgent: "CCBot",              disallow: "/" },
      { userAgent: "Bytespider",         disallow: "/" },
      { userAgent: "anthropic-ai",       disallow: "/" },
      { userAgent: "ClaudeBot",          disallow: "/" },
      { userAgent: "Claude-Web",         disallow: "/" },
      { userAgent: "PerplexityBot",      disallow: "/" },
      { userAgent: "Amazonbot",          disallow: "/" },
      { userAgent: "Applebot-Extended",  disallow: "/" },
      { userAgent: "Meta-ExternalAgent", disallow: "/" },
      { userAgent: "Meta-ExternalFetcher", disallow: "/" },
      { userAgent: "Google-Extended",    disallow: "/" }, // opts out of Google AI training only
      { userAgent: "DataForSeoBot",      disallow: "/" },
      { userAgent: "PetalBot",           disallow: "/" },
      { userAgent: "SemrushBot",         disallow: "/" },
      { userAgent: "AhrefsBot",          disallow: "/" },
      { userAgent: "MJ12bot",            disallow: "/" },
      { userAgent: "DotBot",             disallow: "/" },
      { userAgent: "SeznamBot",          disallow: "/" },
      { userAgent: "Diffbot",            disallow: "/" },
      { userAgent: "Exabot",             disallow: "/" },
      { userAgent: "ia_archiver",        disallow: "/" }, // Alexa/Internet Archive crawler
      { userAgent: "omgili",             disallow: "/" },
      { userAgent: "omgilibot",          disallow: "/" },

      // ── All other bots: allow with /search and /request-status blocked ─
      { userAgent: "*", allow: "/", disallow: ["/search", "/request-status"] },
    ],
    sitemap: `${siteUrl}/sitemap-index.xml`,
  };
}
