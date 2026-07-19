import Link from "next/link";

export default function Pagination({ page, totalPages, buildLink }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link className="page-btn nav-btn" href={buildLink(page - 1)}>
          Prev
        </Link>
      ) : (
        <span className="page-btn nav-btn disabled">Prev</span>
      )}
      
      <span className="page-btn active">{page}</span>
      
      {page < totalPages ? (
        <Link className="page-btn nav-btn" href={buildLink(page + 1)}>
          Next
        </Link>
      ) : (
        <span className="page-btn nav-btn disabled">Next</span>
      )}
    </nav>
  );
}
