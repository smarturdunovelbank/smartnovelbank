import Link from "next/link";

export default function Pagination({ page, totalPages, buildLink }) {
  if (totalPages <= 1) return null;

  const range = [];
  const siblings = 2;

  const startPage = Math.max(2, page - siblings);
  const endPage = Math.min(totalPages - 1, page + siblings);

  range.push(1);

  if (startPage > 2) {
    range.push("...");
  }

  for (let i = startPage; i <= endPage; i++) {
    range.push(i);
  }

  if (endPage < totalPages - 1) {
    range.push("...");
  }

  if (totalPages > 1) {
    range.push(totalPages);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link className="page-btn nav-btn" href={buildLink(page - 1)} scroll={false}>
          Prev
        </Link>
      ) : (
        <span className="page-btn nav-btn disabled">Prev</span>
      )}
      
      {range.map((num, idx) => {
        if (num === "...") {
          return (
            <span key={`dots-${idx}`} className="page-btn" style={{ background: 'transparent', border: 'none', padding: '10px 4px', cursor: 'default' }}>
              ...
            </span>
          );
        }
        if (num === page) {
          return (
            <span key={num} className="page-btn active">
              {num}
            </span>
          );
        }
        return (
          <Link key={num} className="page-btn" href={buildLink(num)} scroll={false}>
            {num}
          </Link>
        );
      })}
      
      {page < totalPages ? (
        <Link className="page-btn nav-btn" href={buildLink(page + 1)} scroll={false}>
          Next
        </Link>
      ) : (
        <span className="page-btn nav-btn disabled">Next</span>
      )}
    </nav>
  );
}
