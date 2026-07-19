import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: "center", paddingTop: 60 }}>
      <h1>404 — Novel Nahi Mila</h1>
      <p style={{ fontFamily: "Segoe UI, sans-serif" }}>
        Ye page mojood nahi hai. Shayad link ghalat hai ya novel remove ho gaya hai.
      </p>
      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <Link href="/" scroll={false} className="btn-download" style={{ display: "inline-flex" }}>
          ⬅ Back to Library
        </Link>
      </div>
    </div>
  );
}
