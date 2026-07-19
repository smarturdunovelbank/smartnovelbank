import Header from "../components/Header";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Smart Novel Bank.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header title="Privacy Policy" subtitle="ہماری پرائیویسی پالیسی" />
      <main className="app-main">
        <article className="article-page">
          <h2 className="text-urdu" style={{ marginTop: 0, marginBottom: '10px' }}>پرائیویسی پالیسی</h2>
          <div className="article-divider rtl"></div>
          <p style={{ color: "var(--sn-text-sub)", marginBottom: "35px" }}>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h3>1. Information We Collect</h3>
          <p className="text-urdu">
            اسمارٹ ناول بینک آپ کی پرائیویسی کا احترام کرتا ہے۔ ہم کوئی بھی ذاتی معلومات اکٹھا نہیں کرتے جب تک کہ آپ خود ہمیں فراہم نہ کریں (مثال کے طور پر، رابطہ فارم یا ناول کی درخواست کے ذریعے)۔
          </p>

          <h3>2. Cookies and Local Storage</h3>
          <p className="text-urdu">
            ہم آپ کے براؤزر کی لوکل اسٹوریج کا استعمال کرتے ہیں تاکہ آپ کی ترجیحات (جیسے کہ "پسندیدہ" فہرست اور ڈارک/لائٹ موڈ) کو محفوظ کیا جا سکے۔ یہ ڈیٹا آپ کی ڈیوائس پر ہی رہتا ہے اور ہمارے سرورز پر منتقل نہیں ہوتا۔
          </p>

          <h3>3. Backend Services</h3>
          <p className="text-urdu">
            ہمارا ناول ڈیٹا بیس Supabase پر مبنی ہے۔ ہم اپنی خدمات کو بہتر بنانے کے لیے سائٹ کے عام استعمال اور سرچ کوئریز کو ٹریک کرتے ہیں، لیکن یہ آپ کی ذاتی شناخت سے منسلک نہیں ہوتیں۔
          </p>

          <h3>4. Third-Party Links</h3>
          <p className="text-urdu">
            اسمارٹ ناول بینک میں تھرڈ پارٹی پی ڈی ایف ہوسٹنگ سروسز کے لنکس شامل ہیں۔ جب آپ کسی ڈاؤن لوڈ لنک پر کلک کرتے ہیں اور ہماری سائٹ سے باہر جاتے ہیں، تو ہماری پرائیویسی پالیسی لاگو نہیں ہوتی۔ ہم ان بیرونی ویب سائٹس کی پرائیویسی کے ذمہ دار نہیں ہیں۔
          </p>
        </article>
      </main>
    </>
  );
}
