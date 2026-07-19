import RequestForm from "./RequestForm";
import Header from "../components/Header";
import Link from "next/link";

export const metadata = {
  title: "ناول کی درخواست کریں",
  description: "جو ناول آپ کو اس سرچنگ سسٹم میں نہیں ملا، اس کی درخواست دیں۔",
};

export default function RequestNovelPage() {
  return (
    <>
      <Header />
      <main className="app-main">
        <article className="article-page">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <Link href="/" scroll={false} className="btn-go-back">
              ⬅ Back to Library
            </Link>
            <Link href="/request-status" scroll={false} className="btn-go-back text-urdu">
              📋 اپنی درخواستیں دیکھیں
            </Link>
          </div>
          <h1 className="text-urdu" style={{ textAlign: "center" }}>ناول ریکوئسٹ فارم - سمارٹ ناول بینک</h1>
          <div className="divider" style={{ margin: "15px auto 30px" }}></div>
          <RequestForm />
        </article>
      </main>
    </>
  );
}
