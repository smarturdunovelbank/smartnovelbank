import Header from "../components/Header";

export const metadata = {
  title: "About Us",
  description: "Learn more about Smart Novel Bank, a free library for downloading and reading Urdu novels in PDF format.",
};

export default function AboutPage() {
  return (
    <>
      <Header title="About Us" subtitle="ہمارے بارے میں جانیے" />
      <main className="app-main">
        <article className="article-page">
          <h2 className="text-urdu" style={{ marginTop: 0, marginBottom: '10px' }}>اسمارٹ ناول بینک میں خوش آمدید</h2>
          <div className="article-divider rtl"></div>
          <p className="text-urdu">
            اسمارٹ ناول بینک ایک ایسی جگہ ہے جہاں آپ اپنے پسندیدہ اردو ناولز کو آسانی سے ڈھونڈ سکتے ہیں اور بالکل مفت پی ڈی ایف فارمیٹ میں ڈاؤن لوڈ کر سکتے ہیں۔ ہمارا مقصد اردو ادب کو فروغ دینا اور ناول پڑھنے والوں کے لیے ایک بہترین پلیٹ فارم فراہم کرنا ہے۔
          </p>
          <p className="text-urdu">
            یہاں پر ہزاروں کی تعداد میں مختلف مصنفین کے ناولز موجود ہیں۔ آپ سرچ بار کا استعمال کر کے آسانی سے کسی بھی ناول یا مصنف کو تلاش کر سکتے ہیں۔ ہماری ڈیٹا بیس روزانہ اپڈیٹ ہوتی ہے تاکہ آپ کو نئے آنے والے ناولز جلد از جلد مل سکیں۔
          </p>
          <p className="text-urdu">
            ہم امید کرتے ہیں کہ آپ کو ہماری یہ چھوٹی سی کوشش پسند آئے گی۔ اگر آپ کو کوئی خصوصی ناول چاہیے تو آپ ہم سے رابطہ کر سکتے ہیں!
          </p>
        </article>
      </main>
    </>
  );
}
