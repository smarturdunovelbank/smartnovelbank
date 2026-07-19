import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import SearchBox from "../components/SearchBox";
import NovelCard from "../components/NovelCard";
import Pagination from "../components/Pagination";
import Header from "../components/Header";

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
      <Header title="Search Results" subtitle={`"${q}" کے لیے ${total} ناولز ملے۔`} />

      <div className="search-container">
        <SearchBox />
      </div>

      <main className="app-main">
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <Link href="/" scroll={false} className="btn-go-back">
            ⬅ Back to Library
          </Link>
        </div>
        {isRestricted ? (
          <div className="request-banner alert-restricted">
             <div className="request-banner-text">
                <h4 className="text-urdu">⚠️ یہ الفاظ منع ہیں</h4>
                <p className="text-urdu">آپ نے جو لفظ سرچ کیا ہے وہ ہماری کمیونٹی گائیڈ لائنز کے خلاف ہے۔</p>
             </div>
             <Link href="/" scroll={false} className="btn-go-back">⬅ Back to Library</Link>
          </div>
        ) : isShort ? (
          <div className="request-banner alert-short">
             <div className="request-banner-text">
                <h4 className="text-urdu">سوال بہت چھوٹا ہے</h4>
                <p className="text-urdu">اچھی سرچ کے لیے کم از کم 3 الفاظ لکھیں (جیسے: پیرِ کامل)۔</p>
             </div>
          </div>
        ) : results.length === 0 && q.trim() !== "" ? (
          <div className="request-banner">
             <div className="request-banner-text">
                <h4 className="text-urdu">ناول نہیں ملا؟ 😔</h4>
                <p className="text-urdu">اسپیلنگ چیک کریں یا صرف ایک لفظ لکھ کر دیکھیں (جیسے: "Jannat" بجائے "Jannat k Pattay")۔</p>
             </div>
             <div style={{ textAlign: "center", width: "100%", marginTop: "10px" }}>
                <Link href="/request-novel" scroll={false} className="btn-go-back text-urdu">📬 ناول ریکوئسٹ کریں</Link>
             </div>
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
