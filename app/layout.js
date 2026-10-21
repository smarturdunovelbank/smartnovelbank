import localFont from 'next/font/local';
import "./globals.css";
import PublicShell from "./components/PublicShell";

const jameelNoori = localFont({
  src: '../public/fonts/JameelNooriNastaleeq-subset.woff2',
  variable: '--font-nastaliq',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourdomain.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Smart Novel Bank — Urdu Novels PDF Download",
    template: "%s | Smart Novel Bank",
  },
  description:
    "Search and download thousands of Urdu novels in PDF format for free. Browse by title, discover new writers, and read offline.",
  icons: {
    icon: '/favicon.ico',
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Smart Novel Bank",
    locale: "ur_PK",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ur" translate="no" suppressHydrationWarning className={jameelNoori.variable}>
      <head>
        {/* Inline theme detection: prevents FOUC on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div id="novel-app-wrapper">
          {children}
          {/*
            PublicShell is a client component that uses usePathname() to
            suppress itself on /admin/* routes, giving the admin dashboard a
            fully isolated, clutter-free full-screen layout without needing
            Next.js route group restructuring.
          */}
          <PublicShell />
        </div>
      </body>
    </html>
  );
}
