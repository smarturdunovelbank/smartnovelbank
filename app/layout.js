import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourdomain.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Smart Novel Bank — Urdu Novels PDF Download",
    template: "%s | Smart Novel Bank",
  },
  description:
    "Search and download thousands of Urdu novels in PDF format for free. Browse by title, discover new writers, and read offline.",
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="ur" suppressHydrationWarning>
      <head>
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
          <ThemeToggle />
          {children}
        </div>
      </body>
    </html>
  );
}
