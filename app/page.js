import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { novelPath } from "../lib/slug";
import SearchBox from "./components/SearchBox";
import NovelCard from "./components/NovelCard";
import FavoritesView from "./components/FavoritesView";
import Pagination from "./components/Pagination";
import Header from "./components/Header";

export const revalidate = 3600; // re-check homepage list every hour

const PAGE_SIZE = 24;

async function getNovels(page) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count, error } = await supabase
    .from("urdu_novels")
    .select("id, Titles", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);
    
  if (error) console.error("Supabase count error:", error);
  
  return { novels: data || [], total: count || 0 };
}

export default async function HomePage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);
  const { novels, total } = await getNovels(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Header subtitle="اپنے پسندیدہ اردو ناولز تلاش کریں، آن لائن پڑھیں یا مفت پی ڈی ایف میں ڈاؤن لوڈ کریں۔" />

      <div className="search-container">
        <SearchBox />
      </div>

      <main className="app-main">
        <FavoritesView defaultCount={total}>
          <div className="grid-container">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>

          <Pagination 
            page={page} 
            totalPages={totalPages} 
            buildLink={(pageNum) => `/?page=${pageNum}`} 
          />
        </FavoritesView>
      </main>
    </>
  );
}
