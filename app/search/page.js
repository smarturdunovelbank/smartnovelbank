import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import SearchBox from "../components/SearchBox";
import NovelCard from "../components/NovelCard";
import Pagination from "../components/Pagination";
import Header from "../components/Header";
import SearchLogger from "./SearchLogger";

export const metadata = {
  robots: { index: false, follow: true },
  title: "Search Results",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const RESTRICTED_KEYWORDS = [
  "bold", "sexy", "sex", "18+", "adult", "dirty",
  "kiss", "ganda", "gandi", "galat","suhagrat","tharki","porn","nude","husna kanwal","husnay kanwal"
];

async function searchNovels(q, page) {
  if (!q || q.trim().length < 3) return { data: [], total: 0 };
  const lowerQ = q.toLowerCase();
  if (RESTRICTED_KEYWORDS.some(k => lowerQ.includes(k))) return { data: [], total: 0 };

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("urdu_novels")
    .select("id, Titles", { count: "exact" })
    .ilike("Titles", `%${q.trim()}%`)
    .range(from, to);

  return { data: data || [], total: count || 0 };
}

export default async function SearchPage({ searchParams }) {
  const q = searchParams?.q || "";
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);
  const lowerQ = q.toLowerCase();
  const isShort = q.trim().length > 0 && q.trim().length < 3;
  const isRestricted = RESTRICTED_KEYWORDS.some(k => lowerQ.includes(k));
  const hasUrdu = /[\u0600-\u06FF]/.test(q);
  
  const { data: results, total } = await searchNovels(q, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  let relatedNovels = [];
  if (results.length === 0 && q.trim() !== "") {
    // Attempt 1: fuzzy match — try each significant word individually
    let fuzzyData = [];
    const words = q.trim().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      if (fuzzyData.length >= 6) break;
      const { data: wordData } = await supabase
        .from("urdu_novels")
        .select("id, Titles")
        .ilike("Titles", `%${word}%`)
        .limit(6);
      if (wordData && wordData.length > 0) {
        // Merge, avoiding duplicate ids
        for (const novel of wordData) {
          if (fuzzyData.length >= 6) break;
          if (!fuzzyData.some(n => n.id === novel.id)) {
            fuzzyData.push(novel);
          }
        }
      }
    }

    // Attempt 2: random fallback — guaranteed non-empty
    if (fuzzyData.length === 0) {
      const { count: totalCount } = await supabase
        .from("urdu_novels")
        .select("*", { count: "exact", head: true });
      const safeMax = Math.max(0, (totalCount || 100) - 6);
      const randomOffset = Math.floor(Math.random() * safeMax);
      const { data: randomData } = await supabase
        .from("urdu_novels")
        .select("id, Titles")
        .range(randomOffset, randomOffset + 5)
        .limit(6);
      if (randomData && randomData.length > 0) {
        fuzzyData = randomData;
      }
    }

    relatedNovels = fuzzyData;
  }

  return (
    <>
      <Header title="Search Results" subtitle={`"${q}" کے لیے ${total} ناولز ملے۔`} />

      <div className="search-container">
        <SearchBox />
      </div>

      <main className="app-main">
        {!isRestricted && !isShort && !hasUrdu && page === 1 && q.trim() !== "" && (
          <SearchLogger query={q} resultCount={results.length} />
        )}
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
          <Link href="/" scroll={false} className="btn-go-back">
            ⬅ Back to Library
          </Link>
        </div>
        {isRestricted ? (
          <div className="request-banner alert-restricted" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
             <div className="request-banner-text" style={{ textAlign: "center", width: "100%" }}>
                <h4 className="text-urdu" style={{ textAlign: "center", fontStyle: "normal" }}>یہ الفاظ منع ہیں 🛡️</h4>
                <p className="text-urdu" style={{ textAlign: "center" }}>آپ نے جو لفظ سرچ کیا ہے وہ ہماری کمیونٹی گائیڈ لائنز کے خلاف ہے۔ براہِ کرم صرف معیاری اردو ناول تلاش کریں</p>
             </div>
             <Link href="/" scroll={false} className="btn-go-back">⬅ Back to Library</Link>
          </div>
        ) : isShort ? (
          <div className="request-banner alert-short" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
             <div className="request-banner-text" style={{ textAlign: "center", width: "100%" }}>
                <h4 style={{ textAlign: "center" }}>Sawal Bohat Chota Hai</h4>
                <p style={{ textAlign: "center" }}>Achi search ke liye kam az kam 3 alfaz likhein (Jaise: Peer e Kamil).</p>
             </div>
          </div>
        ) : results.length === 0 && q.trim() !== "" ? (
          <>
            <div className="request-banner" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div className="request-banner-text">
                  <h4 className="text-urdu" style={{ textAlign: "center", fontStyle: "normal" }}>ناول نہیں ملا؟ 😔</h4>
                  <p className="text-urdu">اسپیلنگ چیک کریں یا نیچے دیے گئے بٹن پر کلک کر کے ناول کی درخواست بھیجیں، ہم اسے جلد سسٹم میں شامل کر دیں گے۔</p>
               </div>
               <div style={{ textAlign: "center", width: "100%", marginTop: "10px" }}>
                  <Link href="/request-novel" scroll={false} className="btn-go-back text-urdu">📬 ناول ریکوئسٹ کریں</Link>
               </div>
            </div>
            {relatedNovels.length > 0 && (
              <div style={{ marginTop: "40px" }}>
                <h2 className="related-heading text-urdu">آپ کو یہ بھی پسند آ سکتے ہیں</h2>
                <div className="grid-container" style={{ marginTop: "20px" }}>
                  {relatedNovels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid-container">
              {results.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
            <Pagination 
              page={page} 
              totalPages={totalPages} 
              buildLink={(pageNum) => `/search?q=${encodeURIComponent(q)}&page=${pageNum}`} 
            />
          </>
        )}
      </main>
    </>
  );
}
