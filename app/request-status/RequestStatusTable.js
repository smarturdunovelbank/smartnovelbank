"use client";

import { useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// Search is now server-side via URL params — debounced router.push.
// Pagination is also URL-driven (page param) for correct server rendering.

export default function RequestStatusTable({
  requests,       // current page rows from Supabase (snake_case fields)
  totalPages,
  currentPage,
  currentSearch,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Build URL with updated params, resetting page to 1 on new search
  const buildUrl = useCallback(
    ({ search = currentSearch, page = 1 } = {}) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, currentSearch]
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: val, page: 1 }));
    }, 350); // 350ms debounce — feels instant, avoids a request per keystroke
  };

  const handleClearSearch = () => {
    clearTimeout(debounceRef.current);
    if (searchInputRef.current) searchInputRef.current.value = "";
    router.push(buildUrl({ search: "", page: 1 }));
  };

  const handlePageChange = (newPage) => {
    router.push(buildUrl({ search: currentSearch, page: newPage }));
    // Scroll the search input into view after navigation settles
    setTimeout(() => {
      searchInputRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, 100);
  };

  const getStatusBadge = (statusStr) => {
    const status = statusStr ? statusStr.trim() : "Pending";
    if (status === "Completed") return <span className="badge-completed">{status}</span>;
    if (status === "Pending") return <span className="badge-pending">{status}</span>;
    if (status === "PDF Not Available") return <span className="badge-failed">{status}</span>;
    return <span className="badge-custom">{status}</span>;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const range = [];
    const siblings = 2;
    const startPage = Math.max(2, currentPage - siblings);
    const endPage = Math.min(totalPages - 1, currentPage + siblings);
    range.push(1);
    if (startPage > 2) range.push("...");
    for (let i = startPage; i <= endPage; i++) range.push(i);
    if (endPage < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return (
      <nav className="pagination" aria-label="Pagination" style={{ marginTop: "20px" }}>
        {currentPage > 1 ? (
          <button className="page-btn nav-btn" onClick={() => handlePageChange(currentPage - 1)}>
            Prev
          </button>
        ) : (
          <span className="page-btn nav-btn disabled">Prev</span>
        )}
        {range.map((num, idx) => {
          if (num === "...")
            return (
              <span
                key={`dots-${idx}`}
                className="page-btn"
                style={{ background: "transparent", border: "none", padding: "10px 4px", cursor: "default" }}
              >
                ...
              </span>
            );
          if (num === currentPage)
            return <span key={num} className="page-btn active">{num}</span>;
          return (
            <button key={num} className="page-btn" onClick={() => handlePageChange(num)}>
              {num}
            </button>
          );
        })}
        {currentPage < totalPages ? (
          <button className="page-btn nav-btn" onClick={() => handlePageChange(currentPage + 1)}>
            Next
          </button>
        ) : (
          <span className="page-btn nav-btn disabled">Next</span>
        )}
      </nav>
    );
  };

  const hasSearch = !!currentSearch;

  return (
    <div className="status-tracker-container">
      {/* Search bar — controlled by URL params, debounced push */}
      <div
        style={{ marginBottom: "20px", scrollMarginTop: "90px", position: "relative" }}
        ref={searchInputRef}
      >
        {hasSearch && (
          <button
            onClick={handleClearSearch}
            aria-label="Clear search"
            title="Clear search"
            style={{
              position: "absolute",
              left: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "var(--sn-paper-line)",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--sn-ink)",
              lineHeight: 1,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--sn-ink)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--sn-paper-line)";
              e.currentTarget.style.color = "var(--sn-ink)";
            }}
          >
            ✕
          </button>
        )}
        <input
          type="text"
          placeholder="ناول، رائٹر کا نام یا Request ID تلاش کریں..."
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          className="text-urdu"
          style={{
            width: "100%",
            padding: "12px 12px 12px",
            paddingLeft: hasSearch ? "48px" : "12px",
            borderRadius: "8px",
            border: "1px solid var(--sn-paper-line)",
            fontSize: "1rem",
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "padding-left 0.15s",
          }}
        />
      </div>

      {requests.length === 0 ? (
        <div className="request-banner" style={{ justifyContent: "center" }}>
          <p className="text-urdu" style={{ margin: 0 }}>
            کوئی مماثل درخواست نہیں ملی۔
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="status-table" style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Novel Name</th>
                  <th>Writer Name</th>
                  <th>Status</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td
                      data-label="ID"
                      style={{
                        fontFamily: "'Segoe UI', sans-serif",
                        fontWeight: 700,
                        color: "var(--sn-text-sub)",
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {req.id ? `#${req.id}` : "—"}
                    </td>
                    <td data-label="Date" style={{ whiteSpace: "nowrap" }}>
                      {formatDate(req.created_at)}
                    </td>
                    <td
                      data-label="Novel Name"
                      className="cell-novel-name"
                      style={{ fontWeight: "bold" }}
                      title={req.novel_name || "Unknown Novel"}
                    >
                      {req.novel_name || "Unknown Novel"}
                    </td>
                    <td
                      data-label="Writer Name"
                      className="cell-writer-name"
                      style={{ color: "var(--sn-text-sub)" }}
                      title={req.writer_name || "—"}
                    >
                      {req.writer_name || "—"}
                    </td>
                    <td data-label="Status" className="cell-status">
                      {getStatusBadge(req.status)}
                    </td>
                    <td data-label="PDF" className="cell-pdf">
                      {req.status === "Completed" &&
                      req.pdf_link &&
                      /^https?:\/\//i.test(req.pdf_link) ? (
                        <a
                          href={req.pdf_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-download btn-download-sm"
                        >
                          📥 Download
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
