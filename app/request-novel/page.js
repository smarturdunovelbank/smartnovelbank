import Link from "next/link";
import RequestForm from "./RequestForm";
import Header from "../components/Header";
import PageTopActions from "../components/PageTopActions";
import { supabase } from "../../lib/supabaseClient";

export const metadata = {
  title: "ناول کی درخواست کریں",
  description: "جو ناول آپ کو اس سرچنگ سسٹم میں نہیں ملا، اس کی درخواست دیں۔",
};

// ISR: re-fetch every 30 seconds so toggling maintenance mode in Supabase
// takes effect on the live site within ~30s — no redeploy required.
export const revalidate = 30;

export default async function RequestNovelPage() {
  // Fetch maintenance toggle from Supabase single-row settings table.
  // Default to false (show form) on any fetch failure — fail open, not closed.
  let isMaintenanceMode = false;
  try {
    const { data: settings } = await supabase
      .from("site_settings")
      .select("request_form_maintenance")
      .eq("id", 1)
      .single();
    isMaintenanceMode = settings?.request_form_maintenance === true;
  } catch (_) {
    // Network/query error — fall through, show the normal form
  }

  return (
    <>
      <Header />
      <main className="app-main">
        <PageTopActions
          rightHref="/request-status"
          rightText="📋 اپنی درخواستیں دیکھیں"
        />
        <article className="article-page" style={{ paddingTop: 0 }}>
          <h1
            id="request-form-heading"
            className="text-urdu"
            style={{ textAlign: "center" }}
          >
            ناول ریکوئسٹ فارم - سمارٹ ناول بینک
          </h1>
          <div className="divider" style={{ margin: "15px auto 30px" }} />

          {isMaintenanceMode ? (
            /* ── Maintenance card ── */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "18px",
                textAlign: "center",
                background: "var(--sn-paper-card)",
                border: "2px solid var(--sn-gold)",
                borderRadius: "14px",
                padding: "40px 28px",
                maxWidth: "560px",
                margin: "0 auto",
                boxShadow: "0 4px 18px rgba(0,0,0,0.07)",
              }}
            >
              <h2 className="text-urdu" style={{ color: "var(--sn-gold)", margin: 0, fontSize: "1.6rem" }}>
                🛠️ فارم عارضی طور پر بند ہے
              </h2>

              <p
                className="text-urdu"
                style={{
                  margin: 0,
                  color: "var(--sn-text-sub)",
                  lineHeight: 1.8,
                  fontSize: "1.05rem",
                  maxWidth: "440px",
                }}
              >
                ناول ریکوئسٹ فارم فی الحال بند ہے، جسے جلد ہی دوبارہ کھول دیا جائے گا۔ اس بارے میں آپ کو ہمارے واٹس ایپ چینل پر بتا دیا جائے گا۔
              </p>

              {/* WhatsApp channel button — brand green via CSS class, hover handled by CSS */}
              <a
                href="https://whatsapp.com/channel/0029VaurdEY0wajrnyeAl50Y"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-channel-btn"
              >
                {/* Inline WhatsApp SVG icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.474 2.027 7.775L0 32l8.424-2.007A15.94 15.94 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.28 13.28 0 0 1-6.78-1.853l-.486-.29-5.003 1.193 1.22-4.87-.317-.5A13.267 13.267 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.273-9.87c-.398-.2-2.356-1.163-2.72-1.296-.365-.133-.63-.2-.895.2-.266.398-1.03 1.296-1.262 1.562-.232.266-.465.3-.863.1-.398-.2-1.682-.62-3.203-1.977-1.184-1.057-1.983-2.363-2.215-2.761-.232-.398-.025-.614.174-.812.178-.179.398-.465.597-.698.2-.232.266-.398.398-.664.133-.266.066-.498-.033-.698-.1-.2-.895-2.156-1.227-2.953-.323-.775-.65-.67-.895-.682l-.762-.013c-.266 0-.698.1-1.063.498-.365.398-1.394 1.362-1.394 3.319s1.427 3.85 1.626 4.116c.2.266 2.808 4.287 6.802 6.014.95.41 1.692.655 2.27.838.954.303 1.822.26 2.508.158.765-.114 2.356-.963 2.688-1.894.332-.93.332-1.727.232-1.894-.099-.166-.365-.266-.763-.465z" />
                </svg>
                <span className="text-urdu">📱 واٹس ایپ چینل جوائن کریں</span>
              </a>

              {/* View existing requests — styled with normal maroon btn */}
              <Link
                href="/request-status"
                scroll={false}
                className="btn-download text-urdu"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                📋 اپنی درخواستیں دیکھیں
              </Link>
            </div>
          ) : (
            <RequestForm />
          )}
        </article>
      </main>
    </>
  );
}
