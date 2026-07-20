import Link from "next/link";

export default function PageTopActions({ rightHref, rightText }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
      <Link href="/" scroll={false} className="btn-go-back">
        ⬅ Back to Library
      </Link>
      <Link href={rightHref} scroll={false} className="btn-go-back text-urdu">
        {rightText}
      </Link>
    </div>
  );
}
