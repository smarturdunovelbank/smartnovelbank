export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourdomain.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/search", "/request-status"] },
    ],
    sitemap: `${siteUrl}/sitemap-index.xml`,
  };
}
