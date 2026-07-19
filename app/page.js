import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { novelPath } from "../lib/slug";
import SearchBox from "./components/SearchBox";
import NovelCard from "./components/NovelCard";
import FavoritesView from "./components/FavoritesView";
import Pagination from "./components/Pagination";

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
      <header className="app-header">
        <div className="header-ornament">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 10C19 7 12 7 7 9V36C12 34 19 34 24 37C29 34 36 34 41 36V9C36 7 29 7 24 10Z" stroke="#e9c878" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M24 10V37" stroke="#e9c878" strokeWidth="2"/>
          </svg>
        </div>
        <h1>Smart Novel Bank</h1>
        <p className="subtitle">
          Search, discover, aur apne pasandeeda Urdu novels PDF format mein free download karein.
        </p>
        <div className="header-divider"></div>
      </header>

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
