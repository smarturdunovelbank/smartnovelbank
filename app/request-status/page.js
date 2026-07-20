import Link from "next/link";
import Header from "../components/Header";
import PageTopActions from "../components/PageTopActions";
import RequestStatusTable from "./RequestStatusTable";

export const metadata = {
  title: "درخواستوں کی صورتحال",
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

async function getRequests() {
  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return [];

  try {
    const res = await fetch(`${scriptUrl}?sheet=NovelRequests`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Failed to fetch requests:", err);
    return null; // Indicates error
  }
}

export default async function RequestStatusPage() {
  const requests = await getRequests();

  return (
    <>
      <Header />
      <main className="app-main">
        <PageTopActions 
          rightHref="/request-novel" 
          rightText="📝 نئی درخواست بھیجیں" 
        />
        
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 className="text-urdu" style={{ textAlign: "center", marginBottom: "30px" }}>آپ کی درخواستوں کی صورتحال</h1>
          
          {requests === null ? (
            <div className="request-banner alert-restricted" style={{ justifyContent: "center" }}>
              <p className="text-urdu" style={{ margin: 0, color: "var(--sn-alert-red-text)" }}>
                فی الحال ڈیٹا لوڈ نہیں ہو سکا، براہ کرم بعد میں کوشش کریں۔
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="request-banner" style={{ justifyContent: "center" }}>
              <p className="text-urdu" style={{ margin: 0 }}>
                ابھی تک کوئی درخواست موصول نہیں ہوئی۔
              </p>
            </div>
          ) : (
            <RequestStatusTable requests={requests} />
          )}
        </div>
      </main>
    </>
  );
}
