import Link from "next/link";

export default function PageTopActions({ rightHref, rightText }) {
  // rightText format is typically "emoji text..."
  const firstSpaceIndex = rightText.indexOf(" ");
  const rightIcon = firstSpaceIndex > -1 ? rightText.substring(0, firstSpaceIndex) : "";
  const rightLabel = firstSpaceIndex > -1 ? rightText.substring(firstSpaceIndex + 1) : rightText;

  return (
    <div className="page-top-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
      <Link href="/" scroll={false} className="btn-go-back" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span>⬅</span>
        <span>Back to Library</span>
      </Link>
      <Link href={rightHref} scroll={false} className="btn-go-back text-urdu" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span>{rightIcon}</span>
        <span>{rightLabel}</span>
      </Link>
    </div>
  );
}

