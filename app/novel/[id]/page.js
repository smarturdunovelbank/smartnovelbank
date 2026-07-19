import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { novelPath, idFromParam } from "../../../lib/slug";
import NovelCard from "../../components/NovelCard";

// ISR: page is generated on first visit/crawl, then cached and
// re-checked once a day. This keeps build times sane for 100k+ rows
// while still giving Google fully-rendered HTML.
export const revalidate = 86400;
export const dynamicParams = true;

async function getNovel(id) {
  const { data } = await supabase
    .from("urdu_novels")
    .select("id, Titles, Links")
    .eq("id", id)
    .single();
  return data;
}

async function getRelated(title, excludeId) {
  const firstWord = (title || "").split(" ")[0];
  if (!firstWord || firstWord.length < 3) return [];
  const { data } = await supabase
    .from("urdu_novels")
    .select("id, Titles")
    .ilike("Titles", `%${firstWord}%`)
    .neq("id", excludeId)
    .limit(6);
  return data || [];
}

export async function generateMetadata({ params }) {
  const id = idFromParam(params.id);
  if (!id) return {};
  const novel = await getNovel(id);
  if (!novel) return {};

  const title = `${novel.Titles} — Free PDF Download`;
  const description = `${novel.Titles} Urdu novel free PDF download aur online parhne ke liye Smart Novel Bank par mojood hai.`;

  return {
    title,
    description,
    alternates: { canonical: novelPath(novel) },
    openGraph: { title, description, type: "book" },
  };
}

export default async function NovelPage({ params }) {
  const id = idFromParam(params.id);
  if (!id) notFound();

  const novel = await getNovel(id);
  if (!novel) notFound();

  const related = await getRelated(novel.Titles, novel.id);
  const safeLink = /^https?:\/\//i.test(novel.Links || "") ? novel.Links : "#";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: novel.Titles,
    inLanguage: "ur",
    bookFormat: "https://schema.org/EBook",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}${novelPath(novel)}`,
  };

  return (
    <>
      <header className="app-header">
        <div className="header-ornament">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 10C19 7 12 7 7 9V36C12 34 19 34 24 37C29 34 36 34 41 36V9C36 7 29 7 24 10Z" stroke="#e9c878" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M24 10V37" stroke="#e9c878" strokeWidth="2"/>
          </svg>
        </div>
        <h1>Smart Novel Bank</h1>
        <div className="header-divider"></div>
      </header>
      <main className="app-main">
        <nav className="breadcrumb">
          <Link href="/">Home</Link> / {novel.Titles}
        </nav>

        <article className="detail-card">
          <h1>{novel.Titles}</h1>
          <p style={{ fontFamily: "Segoe UI, sans-serif", color: "var(--sn-text-sub)" }}>
            {novel.Titles} — is Urdu novel ko PDF format mein neeche diye gaye button se free download karein
            ya online parhein.
          </p>
          <a href={safeLink} target="_blank" rel="noopener noreferrer" className="btn-download">
            📥 Download PDF
          </a>
        </article>

        <Link href="/" className="btn-go-back">
          ⬅ Back to Library
        </Link>

        {related.length > 0 && (
          <>
            <h2 className="related-heading">Aap ko ye bhi pasand aa sakte hain</h2>
            <div className="grid-container">
              {related.map((r) => (
                <NovelCard key={r.id} novel={r} />
              ))}
            </div>
          </>
        )}
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
