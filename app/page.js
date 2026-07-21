import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { novelPath } from "../lib/slug";
import SearchBox from "./components/SearchBox";
import NovelCard from "./components/NovelCard";
import FavoritesView from "./components/FavoritesView";
import Pagination from "./components/Pagination";
import Header from "./components/Header";

export const revalidate = 60;

const PAGE_SIZE = 24;

export const metadata = {
  alternates: {
    canonical: null,
  },
};

async function getNovels(page, seed) {
  // First get the exact total count
  const { count, error: countError } = await supabase
    .from("urdu_novels")
    .select("id", { count: "exact", head: true });
    
  if (countError) console.error("Supabase count error:", countError);
  const total = count || 0;
  
  if (total === 0) return { novels: [], total: 0 };

  const baseOffset = seed % Math.max(1, total);
  const start = baseOffset + (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let novels = [];

  if (start >= total) {
    // If start is past the end, wrap everything
    const wrappedStart = start % total;
    const wrappedEnd = wrappedStart + PAGE_SIZE - 1;
    
    if (wrappedEnd >= total) {
        // Double wrap edge case (unlikely but safe)
        const { data: data1 } = await supabase.from("urdu_novels").select("id, Titles").order("id", { ascending: false }).range(wrappedStart, total - 1);
        const { data: data2 } = await supabase.from("urdu_novels").select("id, Titles").order("id", { ascending: false }).range(0, wrappedEnd - total);
        novels = [...(data1 || []), ...(data2 || [])];
    } else {
        const { data } = await supabase.from("urdu_novels").select("id, Titles").order("id", { ascending: false }).range(wrappedStart, wrappedEnd);
        novels = data || [];
    }
  } else if (end >= total) {
    // Wrap around needed (fetch tail + head)
    const { data: data1 } = await supabase
      .from("urdu_novels")
      .select("id, Titles")
      .order("id", { ascending: false })
      .range(start, total - 1);
      
    const { data: data2 } = await supabase
      .from("urdu_novels")
      .select("id, Titles")
      .order("id", { ascending: false })
      .range(0, end - total);
      
    novels = [...(data1 || []), ...(data2 || [])];
  } else {
    // Normal query
    const { data, error } = await supabase
      .from("urdu_novels")
      .select("id, Titles")
      .order("id", { ascending: false })
      .range(start, end);
      
    if (error) console.error("Supabase fetch error:", error);
    novels = data || [];
  }

  return { novels, total };
}

export default async function HomePage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);
  const seedParam = searchParams?.seed;
  const seed = seedParam ? parseInt(seedParam, 10) : Math.floor(Math.random() * 1000000);
  
  const { novels, total } = await getNovels(page, seed);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.smartnovelbank.com";
  const canonicalUrl = page > 1 ? `${siteUrl}/?page=${page}` : `${siteUrl}/`;

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
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
            buildLink={(pageNum) => `/?seed=${seed}&page=${pageNum}`} 
          />
        </FavoritesView>
      </main>
    </>
  );
}
