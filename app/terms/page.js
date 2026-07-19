import Link from "next/link";
import Header from "../components/Header";

export const metadata = {
  title: "Terms & Disclaimer",
  description: "Terms of Service and Disclaimer for Smart Novel Bank.",
};

export default function TermsPage() {
  return (
    <>
      <Header title="Terms & Disclaimer" subtitle="قواعد و ضوابط" />
      <main className="app-main">
        <article className="article-page">
          <h2 className="text-urdu" style={{ marginTop: 0, marginBottom: '10px' }}>ڈس کلیمر</h2>
          <div className="article-divider rtl"></div>
          <p className="text-urdu">
            اسمارٹ ناول بینک صرف ایک انڈیکسنگ پلیٹ فارم ہے۔ ہم اپنے سرورز پر کوئی پی ڈی ایف فائل ہوسٹ نہیں کرتے۔ تمام ڈاؤن لوڈ لنکس انٹرنیٹ پر موجود پبلک تھرڈ پارٹی ذرائع سے لیے گئے ہیں۔
          </p>
          <p className="text-urdu">
            ہم اس ویب سائٹ پر موجود کسی بھی ناول کی ملکیت یا کاپی رائٹ کا دعویٰ نہیں کرتے۔ تمام کاپی رائٹس ان کے متعلقہ مصنفین اور پبلشرز کی ملکیت ہیں۔
          </p>

          <h3>DMCA / Takedown Requests</h3>
          <p className="text-urdu">
            اگر آپ مصنف یا کاپی رائٹ کے مالک ہیں اور آپ کو لگتا ہے کہ آپ کا کام ہماری سائٹ پر بغیر اجازت کے انڈیکس کیا گیا ہے، تو براہ کرم ہم سے فوری رابطہ کریں۔ ہم کاپی رائٹ کے قوانین کا احترام کرتے ہیں اور درست درخواست موصول ہونے پر آپ کے مواد کے لنکس کو فوری ہٹا دیں گے۔
          </p>
          <p className="text-urdu">
            ٹیک ڈاؤن کی درخواست جمع کرانے کے لیے، براہ کرم ہمارے <Link href="/contact" scroll={false} style={{ color: 'var(--sn-ink)', fontWeight: 'bold' }}>رابطہ صفحہ</Link> پر جائیں اور ہمیں متعلقہ صفحے کے یو آر ایل کے ساتھ ای میل کریں۔
          </p>
        </article>
      </main>
    </>
  );
}
