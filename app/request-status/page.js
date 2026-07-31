import Header from "../components/Header";
import PageTopActions from "../components/PageTopActions";
import RequestStatusTable from "./RequestStatusTable";
import { supabaseNoCache } from "../../lib/supabaseClientNoCache";

export const metadata = {
  title: "درخواستوں کی صورتحال",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const PAGE_SIZE = 25;

async function getRequests({ search, page }) {
  let query = supabaseNoCache
    .from("novel_requests")
    .select("id, created_at, novel_name, writer_name, status, pdf_link", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  // Server-side search: numeric → exact ID match; text → ilike on name columns
  if (search) {
    if (/^\d+$/.test(search.trim())) {
      query = query.eq("id", parseInt(search.trim(), 10));
    } else {
      const term = search.trim();
      query = query.or(
        `novel_name.ilike.%${term}%,writer_name.ilike.%${term}%`
      );
    }
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("Supabase request-status error:", error);
    return { rows: null, total: 0 };
  }
  return { rows: data || [], total: count || 0 };
}

export default async function RequestStatusPage({ searchParams }) {
  const search = searchParams?.search || "";
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  const { rows, total } = await getRequests({ search, page });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Header />
      <main className="app-main">
        <PageTopActions
          rightHref="/request-novel"
          rightText="📝 نئی درخواست بھیجیں"
        />

        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 className="text-urdu" style={{ textAlign: "center", marginBottom: "30px" }}>
            آپ کی درخواستوں کی صورتحال
          </h1>

          {rows === null ? (
            <div className="request-banner alert-restricted" style={{ justifyContent: "center" }}>
              <p className="text-urdu" style={{ margin: 0, color: "var(--sn-alert-red-text)" }}>
                فی الحال ڈیٹا لوڈ نہیں ہو سکا، براہ کرم بعد میں کوشش کریں۔
              </p>
            </div>
          ) : (
            <RequestStatusTable
              requests={rows}
              totalPages={totalPages}
              currentPage={page}
              currentSearch={search}
            />
          )}
        </div>
      </main>
    </>
  );
}
