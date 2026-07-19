import Header from "../components/Header";

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with Smart Novel Bank for novel requests or general inquiries.",
};

export default function ContactPage() {
  return (
    <>
      <Header title="Contact Us" subtitle="ہم سے رابطہ کریں" />
      <main className="app-main">
        <article className="article-page">
          <h2 className="text-urdu" style={{ marginTop: 0, marginBottom: '10px' }}>ہم سے رابطہ کریں</h2>
          <div className="article-divider rtl"></div>
          <p className="text-urdu">
            اگر آپ کو سائٹ کے حوالے سے کوئی سوال ہے، یا آپ کا پسندیدہ ناول ڈیٹا بیس میں نہیں مل رہا، تو آپ ہم سے رابطہ کر سکتے ہیں۔ ہم کوشش کریں گے کہ آپ کا ناول جلد از جلد اپلوڈ کر دیں۔
          </p>
          
          <div style={{ marginTop: '30px', marginBottom: '30px' }}>
            <h3 className="text-urdu">ناول کی درخواست کریں</h3>
            <p className="text-urdu">کوئی خاص ناول چاہیے؟ نیچے دیے گئے فارم پر کلک کریں اور ہمیں بتائیں:</p>
            <a 
              href="https://forms.gle/Zj7D6HYBBu4WgPhk6" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-download"
              style={{ display: 'inline-block', marginTop: '10px' }}
            >
              📨 Request Novel
            </a>
          </div>

          <div>
            <h3 className="text-urdu">ہمیں ای میل کریں</h3>
            <p className="text-urdu">آپ ہمیں اس ای میل ایڈریس پر ڈائریکٹ میل بھی بھیج سکتے ہیں:</p>
            <a href="mailto:admin@smartnovelbank.com" style={{ color: 'var(--sn-ink)', fontWeight: 'bold' }}>
              admin@smartnovelbank.com
            </a>
          </div>
        </article>
      </main>
    </>
  );
}
