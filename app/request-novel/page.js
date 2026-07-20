import RequestForm from "./RequestForm";
import Header from "../components/Header";
import PageTopActions from "../components/PageTopActions";

export const metadata = {
  title: "ناول کی درخواست کریں",
  description: "جو ناول آپ کو اس سرچنگ سسٹم میں نہیں ملا، اس کی درخواست دیں۔",
};

export default function RequestNovelPage() {
  return (
    <>
      <Header />
      <main className="app-main">
        <PageTopActions 
          rightHref="/request-status" 
          rightText="📋 اپنی درخواستیں دیکھیں" 
        />
        <article className="article-page" style={{ paddingTop: 0 }}>
          <h1 className="text-urdu" style={{ textAlign: "center" }}>ناول ریکوئسٹ فارم - سمارٹ ناول بینک</h1>
          <div className="divider" style={{ margin: "15px auto 30px" }}></div>
          <RequestForm />
        </article>
      </main>
    </>
  );
}
