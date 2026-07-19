"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestForm() {
  const [novelName, setNovelName] = useState("");
  const [writerName, setWriterName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [showValidation, setShowValidation] = useState(false);

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
        // We simulate success if not configured, or we could show error.
        setStatus("success");
        return;
      }

      const params = new URLSearchParams({
        sheet: "NovelRequests",
        novelName: novelName.trim().substring(0, 80),
        writerName: writerName.trim().substring(0, 60),
        message: message.trim().substring(0, 500),
        timestamp: new Date().toISOString(),
        device: deviceType,
      });

      // use no-cors to prevent CORS issues with Google Apps Script redirects
      await fetch(scriptUrl, { 
        method: 'POST', 
        body: params,
        mode: 'no-cors' 
      });

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--sn-paper-card)", borderRadius: "12px", border: "1px solid var(--sn-paper-line)" }}>
        <h3 className="text-urdu" style={{ color: "var(--sn-gold)", marginBottom: "24px" }}>شکریہ! آپ کی درخواست موصول ہو گئی ہے۔</h3>
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
