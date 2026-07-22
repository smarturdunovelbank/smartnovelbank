"use client";

import { useState, useRef } from "react";

const PAGE_SIZE = 25;

export default function RequestStatusTable({ requests }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef(null);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (searchInputRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      searchInputRef.current.scrollIntoView({ 
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start" 
      });
    }
  };

  const filteredRequests = requests.filter((req) => {
    const query = searchQuery.trim();
    if (!query) return true;

    // Numeric-only query → exact match against Request ID
    if (/^\d+$/.test(query)) {
      const rowId = String(req["Request ID"] || "").trim();
      return rowId === query;
    }

    // Text query → Novel Name or Writer Name substring match
    const lq = query.toLowerCase();
    const novelName = (req["Novel Name"] || "").toLowerCase();
    const writerName = (req["Writer Name"] || "").toLowerCase();
    return novelName.includes(lq) || writerName.includes(lq);
  });

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const currentData = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
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
      const date = new Date(isoString);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch(e) {
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
          <button className="page-btn nav-btn" onClick={() => handlePageChange(currentPage - 1)}>Prev</button>
        ) : (
          <span className="page-btn nav-btn disabled">Prev</span>
        )}
        {range.map((num, idx) => {
          if (num === "...") return <span key={`dots-${idx}`} className="page-btn" style={{ background: 'transparent', border: 'none', padding: '10px 4px', cursor: 'default' }}>...</span>;
          if (num === currentPage) return <span key={num} className="page-btn active">{num}</span>;
          return <button key={num} className="page-btn" onClick={() => handlePageChange(num)}>{num}</button>;
        })}
        {currentPage < totalPages ? (
          <button className="page-btn nav-btn" onClick={() => handlePageChange(currentPage + 1)}>Next</button>
        ) : (
          <span className="page-btn nav-btn disabled">Next</span>
        )}
      </nav>
    );
  };

  return (
    <div className="status-tracker-container">
      <div style={{ marginBottom: "20px", scrollMarginTop: "90px" }} ref={searchInputRef}>
        <input
          type="text"
          placeholder="ناول، رائٹر کا نام یا Request ID تلاش کریں..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="text-urdu"
          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--sn-paper-line)", fontSize: "1rem", fontFamily: "inherit" }}
        />
      </div>

      {filteredRequests.length === 0 ? (
        <div className="request-banner" style={{ justifyContent: "center" }}>
          <p className="text-urdu" style={{ margin: 0 }}>کوئی مماثل درخواست نہیں ملی۔</p>
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
                {currentData.map((req, i) => (
                  <tr key={i}>
                    <td data-label="ID" style={{ fontFamily: "'Segoe UI', sans-serif", fontWeight: 700, color: "var(--sn-text-sub)", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {req["Request ID"] ? `#${req["Request ID"]}` : "—"}
                    </td>
                    <td data-label="Date" style={{ whiteSpace: "nowrap" }}>{formatDate(req["Timestamp"])}</td>
                    <td data-label="Novel Name" className="cell-novel-name" style={{ fontWeight: "bold" }} title={req["Novel Name"] || "Unknown Novel"}>
                      {req["Novel Name"] || "Unknown Novel"}
                    </td>
                    <td data-label="Writer Name" className="cell-writer-name" style={{ color: "var(--sn-text-sub)" }} title={req["Writer Name"] || "—"}>
                      {req["Writer Name"] || "—"}
                    </td>
                    <td data-label="Status" className="cell-status">{getStatusBadge(req["Status"])}</td>
                    <td data-label="PDF" className="cell-pdf">
                      {req["Status"] === "Completed" && req["PDF Link"] && /^https?:\/\//i.test(req["PDF Link"]) ? (
                        <a href={req["PDF Link"]} target="_blank" rel="noopener noreferrer" className="btn-download btn-download-sm">
                          📥 Download
                        </a>
                      ) : "—"}
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
