import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import SearchBox from "../components/SearchBox";
import NovelCard from "../components/NovelCard";
import Pagination from "../components/Pagination";

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
  
  const { data: results, total } = await searchNovels(q, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <header className="app-header">
        <div className="header-ornament">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 10C19 7 12 7 7 9V36C12 34 19 34 24 37C29 34 36 34 41 36V9C36 7 29 7 24 10Z" stroke="#e9c878" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M24 10V37" stroke="#e9c878" strokeWidth="2"/>
          </svg>
        </div>
        <h1>Search Results</h1>
        <p className="subtitle">"{q}" ke liye {total} novels mile.</p>
        <div className="header-divider"></div>
      </header>

      <div className="search-container">
        <SearchBox />
      </div>

      <main className="app-main">
        <div style={{ marginBottom: "24px" }}>
          <Link href="/" className="btn-go-back">
            ⬅ Back to Library
          </Link>
        </div>
        {isRestricted ? (
          <div className="request-banner alert-restricted">
             <div className="request-banner-text">
                <h4>⚠️ Ye Alfaz Allowed Nahi Hain</h4>
                <p>Aapne jo word search kiya hai wo humari community guidelines ke khilaf hai.</p>
             </div>
             <Link href="/" className="btn-go-back">⬅ Wapas Jayein</Link>
          </div>
        ) : isShort ? (
          <div className="request-banner alert-short">
             <div className="request-banner-text">
                <h4>Sawal Bohat Chota Hai</h4>
                <p>Achi search ke liye kam az kam 3 alfaz likhein (Jaise: Peer e Kamil).</p>
             </div>
          </div>
        ) : results.length === 0 && q.trim() !== "" ? (
          <div className="request-banner">
             <div className="request-banner-text">
                <h4>Novel Nahi Mila? 😔</h4>
                <p>Spelling check karein ya sirf ek word likh kar dekhein (Jaise: "Jannat" bajaye "Jannat k Pattay").</p>
             </div>
             <Link href="/" className="btn-go-back">⬅ Library par wapas jayein</Link>
          </div>
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
