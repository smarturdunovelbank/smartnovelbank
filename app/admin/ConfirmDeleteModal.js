"use client";

import { LuTriangleAlert as AlertTriangle, LuTrash2 as Trash2 } from "react-icons/lu";

function ModalSpinner({ size = 14, color = "currentColor" }) {
  return (
    <svg
      style={{
        animation: "admin-spin 0.85s linear infinite",
        width: size,
        height: size,
        flexShrink: 0,
        color,
      }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.75" opacity="0.25" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  item = null,
  type = "novel",
}) {
  if (!isOpen || !item) return null;

  const typeLabel =
    type === "request" ? "Request" : type === "knowledge" ? "Knowledge Record" : "Novel";
  const titleText = item.title || item.novel_name || item.novel_title || item.Titles || "";
  const authorText = item.writer_name || item.author || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="admin-modal-overlay"
      onClick={onClose}
    >
      <div
        className="admin-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "460px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          borderRadius: "14px",
        }}
      >
        {/* Header: Warning Icon + Heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--sn-alert-red-bg)",
              border: "1px solid var(--sn-alert-red-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} color="var(--sn-alert-red-text)" />
          </div>
          <div>
            <h3
              id="confirm-delete-title"
              style={{
                margin: 0,
                fontSize: "1.12rem",
                fontWeight: 700,
                color: "var(--sn-ink)",
                lineHeight: 1.25,
              }}
            >
              Confirm Deletion
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)" }}>
              Permanently delete this {typeLabel.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Item Details Card */}
        <div
          style={{
            background: "var(--sn-paper-card)",
            border: "1px solid var(--sn-paper-line)",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontSize: "0.86rem",
          }}
        >
          {item.id && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--sn-text-sub)", fontSize: "0.78rem", fontWeight: 600 }}>
                ID:
              </span>
              <span
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontWeight: 700,
                  color: "var(--sn-ink)",
                  background: "var(--sn-paper)",
                  border: "1px solid var(--sn-paper-line)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                }}
              >
                #{item.id}
              </span>
            </div>
          )}
          {titleText && (
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "var(--sn-text-sub)", fontSize: "0.78rem", fontWeight: 600 }}>
                Title:
              </span>
              <span style={{ fontWeight: 600, color: "var(--sn-ink)", wordBreak: "break-word" }}>
                "{titleText}"
              </span>
            </div>
          )}
          {authorText && (
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "var(--sn-text-sub)", fontSize: "0.78rem", fontWeight: 600 }}>
                Author:
              </span>
              <span style={{ color: "var(--sn-text-sub)" }}>{authorText}</span>
            </div>
          )}
        </div>

        {/* Muted Warning Text */}
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            color: "var(--sn-alert-red-text)",
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          This action cannot be undone. All associated data will be permanently removed.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginTop: "4px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              minHeight: "42px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "1px solid var(--sn-paper-line)",
              background: "var(--sn-paper-card)",
              color: "var(--sn-ink)",
              fontSize: "0.86rem",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              minHeight: "42px",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: "var(--sn-danger)",
              color: "#ffffff",
              fontSize: "0.86rem",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(179, 56, 44, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            {isDeleting ? (
              <>
                <ModalSpinner size={14} color="#ffffff" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
