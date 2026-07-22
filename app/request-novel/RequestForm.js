"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestForm() {
  const [novelName, setNovelName] = useState("");
  const [writerName, setWriterName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [showValidation, setShowValidation] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [idCopied, setIdCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowValidation(true);
    
    if (!novelName.trim()) {
      return;
    }

    setStatus("loading");

    try {
      const deviceType = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
      const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
      
      if (!scriptUrl) {
        console.warn("Google Script URL is missing in environment variables.");
        setStatus("success");
        return;
      }

      const body = new URLSearchParams();
      body.append("sheet", "NovelRequests");
      body.append("novelName", novelName.trim().substring(0, 80));
      body.append("writerName", writerName.trim().substring(0, 60));
      body.append("message", message.trim().substring(0, 500));
      body.append("timestamp", new Date().toISOString());
      body.append("device", deviceType);

      const res = await fetch(scriptUrl, {
        method: "POST",
        body,
        // No headers — browser sets application/x-www-form-urlencoded
        // automatically for URLSearchParams, making this a CORS simple
        // request (no preflight OPTIONS sent).
      });

      // Google Apps Script returns 302 redirects which fetch follows —
      // the final response should be JSON with { status, requestId }
      const data = await res.json();
      if (data.requestId) {
        setRequestId(data.requestId);
      }
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const copyId = async () => {
    const textToCopy = String(requestId);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy ID", err);
    }
  };

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--sn-paper-card)", borderRadius: "12px", border: "1px solid var(--sn-paper-line)" }}>
        <h3 className="text-urdu" style={{ color: "var(--sn-gold)", marginBottom: "24px" }}>شکریہ! آپ کی درخواست موصول ہو گئی ہے۔</h3>

        {requestId && (
          <div style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            background: "var(--sn-paper)",
            border: "2px solid var(--sn-gold)",
            borderRadius: "12px",
            padding: "18px 28px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                fontSize: "1.05rem",
                color: "var(--sn-text-sub)",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}>
                Request ID:
              </span>
              <span style={{
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                fontSize: "1.6rem",
                fontWeight: "700",
                color: "var(--sn-ink)",
              }}>
                #{requestId}
              </span>
              <button
                onClick={copyId}
                title="Copy Request ID"
                aria-label="Copy Request ID"
                style={{
                  background: idCopied ? "var(--sn-gold-soft)" : "var(--sn-paper-card)",
                  border: "1px solid var(--sn-paper-line)",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.2s",
                  flexShrink: 0,
                }}
              >
                {idCopied ? "✅" : "📋"}
              </button>
            </div>
            <p className="text-urdu" style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "var(--sn-text-sub)",
              maxWidth: "300px",
              lineHeight: "1.6",
            }}>
              یہ آئی ڈی نوٹ کر لیں یا کاپی کریں — بعد میں اپنی درخواست کا اسٹیٹس دیکھنے کے لیے یہ ضروری ہوگی۔
            </p>
          </div>
        )}

        <Link href="/request-status" scroll={false} className="btn-download text-urdu" style={{ display: "inline-block", textDecoration: "none" }}>
          📋 اپنی درخواست کا اسٹیٹس دیکھیں
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-urdu" style={{ marginBottom: "30px", textAlign: "center" }}>
        جو ناول آپ کو اس سرچنگ سسٹم میں نہیں ملا، اس کی تفصیلات یہاں لکھیں۔ اگر وہ پی ڈی ایف میں دستیاب ہوا تو جلد ہی اسے سسٹم میں ایڈ کر دیا جائے گا!
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px", margin: "0 auto" }}>
      
      {status === "error" && (
        <div className="request-banner alert-restricted" style={{ padding: "12px", borderRadius: "8px", borderLeft: "4px solid #ef4444", marginBottom: "10px" }}>
          <p className="text-urdu" style={{ color: "#ef4444", margin: 0 }}>کوئی مسئلہ پیش آیا۔ براہ کرم دوبارہ کوشش کریں۔</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label htmlFor="novelName" className="text-urdu" style={{ fontSize: "1.2rem" }}>
          ناول کا نام کیا ہے؟ <span style={{ color: "red" }}>*</span>
        </label>
        <input
          id="novelName"
          type="text"
          value={novelName}
          onChange={(e) => { setNovelName(e.target.value); setShowValidation(false); }}
          required
          maxLength={80}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--sn-paper-line)", fontSize: "1rem", fontFamily: "inherit" }}
          placeholder="Enter novel title..."
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "-4px" }}>
          <span>
            {showValidation && !novelName.trim() && (
              <span className="text-urdu" style={{ color: "red", fontSize: "0.9rem" }}>یہ فیلڈ ضروری ہے</span>
            )}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontFamily: "Segoe UI, sans-serif" }}>
            {novelName.length} / 80
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label htmlFor="writerName" className="text-urdu" style={{ fontSize: "1.2rem" }}>
          رائٹر کا نام؟
        </label>
        <input
          id="writerName"
          type="text"
          value={writerName}
          onChange={(e) => setWriterName(e.target.value)}
          maxLength={60}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--sn-paper-line)", fontSize: "1rem", fontFamily: "inherit" }}
          placeholder="Enter writer's name (optional)"
        />
        <div style={{ textAlign: "right", marginTop: "-4px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontFamily: "Segoe UI, sans-serif" }}>
            {writerName.length} / 60
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label htmlFor="message" className="text-urdu" style={{ fontSize: "1.2rem" }}>
          کوئی اور تفصیل یا پیغام؟
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--sn-paper-line)", fontSize: "1rem", fontFamily: "inherit", resize: "vertical" }}
          placeholder="Any other details (optional)"
        />
        <div style={{ textAlign: "right", marginTop: "-4px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontFamily: "Segoe UI, sans-serif" }}>
            {message.length} / 500
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-download text-urdu"
          style={{ 
            opacity: status === "loading" ? 0.7 : 1, 
            cursor: status === "loading" ? "not-allowed" : "pointer",
            border: "none",
            width: "100%",
            fontSize: "1.3rem",
            padding: "10px 20px"
          }}
        >
          {status === "loading" ? "بھیجا جا رہا ہے..." : "درخواست بھیجیں"}
        </button>
      </div>
    </form>
    </>
  );
}
