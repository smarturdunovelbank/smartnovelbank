/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    // Disable client-side router cache for force-dynamic pages (Next.js 14.2+).
    // Without this, <Link> navigations to /request-status can serve a stale
    // RSC payload for up to 30s even though the page is force-dynamic —
    // newly submitted requests wouldn't appear until a hard reload.
    // staleTimes.dynamic = 0 fixes this. Does NOT affect ISR/revalidate
    // on the homepage (revalidate: 60) or novel detail pages (revalidate: 86400)
    // — those are server-side Data Cache entries, not the client router cache.
    staleTimes: {
      dynamic: 0,
    },
  },
};

module.exports = nextConfig;

