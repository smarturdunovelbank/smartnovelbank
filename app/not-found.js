import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: "center", paddingTop: 60 }}>
      <h1>404 — Novel Nahi Mila</h1>
      <p style={{ fontFamily: "Segoe UI, sans-serif" }}>
        Ye page mojood nahi hai. Shayad link ghalat hai ya novel remove ho gaya hai.
      </p>
      <Link href="/" className="btn-download" style={{ display: "inline-flex", marginTop: 16 }}>
        ⬅ Home par jayein
      </Link>
    </div>
  );
}
