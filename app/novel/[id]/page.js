import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { novelPath, idFromParam } from "../../../lib/slug";
import { getDriveEmbedUrl, getDriveDownloadUrl } from "../../../lib/driveEmbed";
import NovelCard from "../../components/NovelCard";
import Header from "../../components/Header";

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
  const driveEmbedUrl = getDriveEmbedUrl(safeLink);
  const downloadUrl = getDriveDownloadUrl(safeLink);

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
      <Header />
      <main className="app-main">
        <nav className="breadcrumb">
          <Link href="/" scroll={false}>Home</Link> / {novel.Titles}
        </nav>

        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <Link href="/" scroll={false} className="btn-go-back" style={{ height: "38px", padding: "0 18px", fontSize: "0.85rem", marginTop: "0" }}>
            ⬅ Back to Library
          </Link>
        </div>

        <article className="detail-card">
          <h1>{novel.Titles}</h1>
          <p className="text-urdu" style={{ color: "var(--sn-text-sub)", fontSize: "0.95rem", marginBottom: "25px" }}>
            "{novel.Titles}" — اس اردو ناول کو پی ڈی ایف فارمیٹ میں نیچے دیے گئے بٹن سے مفت ڈاؤن لوڈ کریں یا آن لائن پڑھیں۔
          </p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-download">
            📥 Download PDF
          </a>
        </article>

        {driveEmbedUrl && (
          <div style={{ maxWidth: "800px", margin: "40px auto 0" }}>
            <h2 className="related-heading" style={{ textAlign: "center", marginBottom: "20px" }}>📖 Read Online — {novel.Titles}</h2>
            <div style={{ position: 'relative', width: '100%', paddingTop: '141.4%', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--sn-paper-line)', boxShadow: 'var(--sn-shadow)' }}>
              <iframe
                src={driveEmbedUrl}
                loading="lazy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="autoplay"
                title={`Read ${novel.Titles} online`}
              />
            </div>
          </div>
        )}

        {related.length > 0 && (
          <>
            <h2 className="related-heading text-urdu">آپ کو یہ بھی پسند آ سکتے ہیں</h2>
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
