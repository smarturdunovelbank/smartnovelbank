"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LuSearch as Search,
  LuRefreshCw as RefreshCw,
  LuInbox as Inbox,
  LuCheck as Check,
  LuX as X,
  LuPencil as Pencil,
  LuTrash2 as Trash2,
  LuExternalLink as ExternalLink,
  LuDownload as Download,
  LuClock as Clock,
  LuCircleCheck as CheckCircle,
  LuCircleAlert as AlertCircle,
  LuCircleX as XCircle,
  LuSmartphone as Smartphone,
  LuMonitor as Monitor,
  LuBookOpen as BookOpen,
  LuStar as Star,
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuSlidersHorizontal as FilterIcon,
  LuFileText as FileText,
  LuMessageSquare as MessageSquare,
  LuSparkles as Sparkles,
  LuTriangleAlert as AlertTriangle,
  LuChevronDown as ChevronDown,
  LuChevronUp as ChevronUp,
} from "react-icons/lu";

// ── Reusable Spinner ────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "currentColor" }) {
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
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.75" opacity="0.2" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ── Common Urdu / Admin Reply Presets ────────────────────────────────────────
const CUSTOM_STATUS_PRESETS = [
  "یہ ناول صرف کتابی شکل میں شائع ہوا ہے (پی ڈی ایف دستیاب نہیں)",
  "ناول ابھی مکمل نہیں ہوا، مکمل ہونے پر اپلوڈ ہوگا",
  "اس نام سے مصنف کا کوئی ناول دستیاب نہیں ہو سکا",
  "جلد ہی اپلوڈ کر دیا جائے گا",
  "Not Applicable",
];

export default function NovelRequestsManager({ session, onCountsUpdate }) {
  // ── Query & Filter State ──────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'Pending' | 'Completed' | 'PDF Not Available' | 'custom'
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatching, setTotalMatching] = useState(0);

  // ── KPI Summary Counts ────────────────────────────────────────────────────
  const [counts, setCounts] = useState({
    totalCount: 0,
    pendingCount: 0,
    completedCount: 0,
    unavailableCount: 0,
  });

  // ── Inline Editor / Drawer State ──────────────────────────────────────────
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({
    novel_name: "",
    writer_name: "",
    status: "Pending",
    custom_status_note: "",
    pdf_link: "",
    publishToCatalog: true,
    catalogTitle: "",
    markAsFeatured: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [customTitleOverridden, setCustomTitleOverridden] = useState(false);

  // ── Long Message Modal / Expansion State ──────────────────────────────────
  const [viewingMessage, setViewingMessage] = useState(null);

  // ── Delete Confirmation State ────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Toast Notification State ─────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // ── Debounce Search Input ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ── Fetch Requests from Backend ───────────────────────────────────────────
  const fetchRequests = useCallback(
    async (isManualRefresh = false) => {
      const token = session?.access_token;
      if (!token) return;

      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const res = await fetch(`/api/admin/requests?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Request failed with HTTP ${res.status}`);
        }

        const data = await res.json();
        setRequests(data?.requests || []);
        setTotalPages(data?.totalPages || 1);
        setTotalMatching(data?.total || 0);

        if (data?.counts) {
          setCounts(data.counts);
          onCountsUpdate?.(data.counts);
        }
      } catch (err) {
        console.error("Failed to load requests:", err);
        showToast(err.message || "Failed to load requests.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.access_token, page, pageSize, statusFilter, debouncedSearch, showToast, onCountsUpdate]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Auto-generate Catalog Title ───────────────────────────────────────────
  const computeStandardCatalogTitle = (title, author) => {
    const cleanTitle = (title || "").trim();
    const cleanAuthor = (author || "").trim();

    if (!cleanTitle) return "";
    if (/\bby\b/i.test(cleanTitle)) {
      return cleanTitle;
    }
    if (cleanAuthor && cleanAuthor.toLowerCase() !== "unknown") {
      return `${cleanTitle} By ${cleanAuthor}`;
    }
    return cleanTitle;
  };

  // ── Open Inline Editor for a Request ──────────────────────────────────────
  const openEditor = (req) => {
    const isStandardStatus = ["Completed", "Pending", "PDF Not Available"].includes(req.status);
    const standardTitle = computeStandardCatalogTitle(req.novel_name, req.writer_name);

    setEditingRequest(req);
    setCustomTitleOverridden(false);
    setEditForm({
      novel_name: req.novel_name || "",
      writer_name: req.writer_name || "",
      status: isStandardStatus ? req.status : "custom",
      custom_status_note: isStandardStatus ? "" : req.status || "",
      pdf_link: req.pdf_link || "",
      publishToCatalog: true,
      catalogTitle: standardTitle,
      markAsFeatured: false,
    });
  };

  const closeEditor = () => {
    setEditingRequest(null);
    setSavingEdit(false);
  };

  // Update auto catalog title when novel_name or writer_name changes in editor
  const handleNameOrWriterChange = (field, val) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: val };
      if (!customTitleOverridden) {
        next.catalogTitle = computeStandardCatalogTitle(
          field === "novel_name" ? val : prev.novel_name,
          field === "writer_name" ? val : prev.writer_name
        );
      }
      return next;
    });
  };

  // ── Submit Request Update ─────────────────────────────────────────────────
  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingRequest) return;

    const token = session?.access_token;
    if (!token) {
      showToast("Session expired. Please log in again.", "error");
      return;
    }

    if (!editForm.novel_name.trim()) {
      showToast("Novel title is required.", "error");
      return;
    }

    // Resolve final status string
    let finalStatus = editForm.status;
    if (editForm.status === "custom") {
      finalStatus = editForm.custom_status_note.trim() || "PDF Not Available";
    }

    if (finalStatus === "Completed") {
      if (!editForm.pdf_link.trim() || !/^https?:\/\//i.test(editForm.pdf_link.trim())) {
        showToast("A valid PDF link (http:// or https://) is required to mark as Completed.", "error");
        return;
      }
    }

    setSavingEdit(true);

    try {
      const payload = {
        id: editingRequest.id,
        novel_name: editForm.novel_name.trim(),
        writer_name: editForm.writer_name.trim() || null,
        status: finalStatus,
        pdf_link: editForm.pdf_link.trim() || null,
        publishToCatalog: editForm.publishToCatalog && finalStatus === "Completed",
        catalogTitle: editForm.catalogTitle.trim(),
        markAsFeatured: editForm.markAsFeatured && finalStatus === "Completed",
      };

      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Failed to update request (${res.status})`);
      }

      // Optimistic state update in table
      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? { ...r, ...data.request } : r))
      );

      // Toast feedback
      let feedback = `Request #${editingRequest.id} updated successfully.`;
      if (data?.catalogSyncResult?.status === "inserted") {
        feedback = `Request #${editingRequest.id} marked Completed and added to Novel Catalog!`;
      } else if (data?.catalogSyncResult?.status === "already_exists") {
        feedback = `Request #${editingRequest.id} marked Completed (novel already exists in catalog).`;
      }
      showToast(feedback, "success");

      closeEditor();
      fetchRequests(); // Refresh KPI counts and updated table
    } catch (err) {
      console.error("Save edit error:", err);
      showToast(err.message || "Failed to save request changes.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Quick 1-Click "Mark Unavailable" ──────────────────────────────────────
  const handleQuickMarkUnavailable = async (req) => {
    const token = session?.access_token;
    if (!token) return;

    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: req.id,
          novel_name: req.novel_name,
          writer_name: req.writer_name,
          status: "PDF Not Available",
          pdf_link: null,
          publishToCatalog: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }

      showToast(`Request #${req.id} marked as "PDF Not Available".`, "success");
      fetchRequests();
    } catch (err) {
      showToast(err.message || "Action failed.", "error");
    }
  };

  // ── Delete Request ────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const token = session?.access_token;
    if (!token) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/requests?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete request");
      }

      showToast(`Request #${deleteTarget.id} permanently deleted.`, "success");
      setDeleteTarget(null);
      fetchRequests();
    } catch (err) {
      showToast(err.message || "Failed to delete request.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Format Helper for Dates ───────────────────────────────────────────────
  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // ── Status Badge Renderer ─────────────────────────────────────────────────
  const renderStatusBadge = (statusStr) => {
    const status = statusStr ? statusStr.trim() : "Pending";
    if (status === "Completed") {
      return (
        <span
          style={{
            background: "rgba(47,125,90,0.12)",
            color: "var(--sn-success)",
            border: "1px solid rgba(47,125,90,0.25)",
            padding: "3px 10px",
            borderRadius: "14px",
            fontSize: "0.76rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle size={12} strokeWidth={2} />
          <span>Completed</span>
        </span>
      );
    }
    if (status === "Pending") {
      return (
        <span
          style={{
            background: "rgba(201,149,44,0.14)",
            color: "var(--sn-ink)",
            border: "1px solid rgba(201,149,44,0.35)",
            padding: "3px 10px",
            borderRadius: "14px",
            fontSize: "0.76rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            whiteSpace: "nowrap",
          }}
        >
          <Clock size={12} strokeWidth={2} style={{ color: "var(--sn-gold)" }} />
          <span>Pending</span>
        </span>
      );
    }
    if (status === "PDF Not Available") {
      return (
        <span
          style={{
            background: "var(--sn-alert-red-bg)",
            color: "var(--sn-danger)",
            border: "1px solid rgba(179,56,44,0.25)",
            padding: "3px 10px",
            borderRadius: "14px",
            fontSize: "0.76rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            whiteSpace: "nowrap",
          }}
        >
          <XCircle size={12} strokeWidth={2} />
          <span>PDF Not Available</span>
        </span>
      );
    }
    // Custom admin response note
    return (
      <span
        style={{
          background: "var(--sn-paper-card)",
          color: "var(--sn-text-main)",
          border: "1px solid var(--sn-paper-line)",
          padding: "3px 9px",
          borderRadius: "8px",
          fontSize: "0.76rem",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          maxWidth: "240px",
          wordBreak: "break-word",
        }}
        title={status}
      >
        <FileText size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {status}
        </span>
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* ═════════════════════════════════════════════════════════════════════
          TOAST FEEDBACK BANNER
      ══════════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "12px 18px",
            borderRadius: "10px",
            background:
              toast.type === "error"
                ? "var(--sn-alert-red-bg)"
                : "rgba(47,125,90,0.12)",
            border: `1px solid ${
              toast.type === "error"
                ? "rgba(179,56,44,0.3)"
                : "rgba(47,125,90,0.3)"
            }`,
            color:
              toast.type === "error"
                ? "var(--sn-danger)"
                : "var(--sn-success)",
            fontSize: "0.9rem",
            fontWeight: 500,
            animation: "admin-fadeIn 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {toast.type === "error" ? (
              <AlertCircle size={18} strokeWidth={2} />
            ) : (
              <CheckCircle size={18} strokeWidth={2} />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss toast"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              opacity: 0.7,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TOP KPI CARDS ROW (4 Executive SaaS Metrics)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: Total Requests */}
        <div
          onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}
          style={{
            background: "var(--sn-paper)",
            border: `1px solid ${statusFilter === "all" ? "var(--sn-gold)" : "var(--sn-paper-line)"}`,
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: statusFilter === "all" ? "0 2px 10px rgba(201,149,44,0.12)" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontWeight: 600 }}>
              Total Requests
            </span>
            <span
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--sn-ink)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {counts.totalCount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(61,15,28,0.06)",
              color: "var(--sn-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Inbox size={20} strokeWidth={1.75} />
          </div>
        </div>

        {/* Card 2: Pending Action (Warm Gold Highlight) */}
        <div
          onClick={() => {
            setStatusFilter("Pending");
            setPage(1);
          }}
          style={{
            background: "var(--sn-paper)",
            border: `1px solid ${statusFilter === "Pending" ? "var(--sn-gold)" : "var(--sn-paper-line)"}`,
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: statusFilter === "Pending" ? "0 2px 10px rgba(201,149,44,0.18)" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontWeight: 600 }}>
                Pending Action
              </span>
              {counts.pendingCount > 0 && (
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--sn-gold)",
                    display: "inline-block",
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: counts.pendingCount > 0 ? "var(--sn-gold)" : "var(--sn-ink)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {counts.pendingCount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(201,149,44,0.14)",
              color: "var(--sn-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={20} strokeWidth={1.75} />
          </div>
        </div>

        {/* Card 3: Fulfilled / Completed (Emerald Accent) */}
        <div
          onClick={() => {
            setStatusFilter("Completed");
            setPage(1);
          }}
          style={{
            background: "var(--sn-paper)",
            border: `1px solid ${statusFilter === "Completed" ? "var(--sn-success)" : "var(--sn-paper-line)"}`,
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: statusFilter === "Completed" ? "0 2px 10px rgba(47,125,90,0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontWeight: 600 }}>
              Completed & Live
            </span>
            <span
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--sn-success)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {counts.completedCount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(47,125,90,0.12)",
              color: "var(--sn-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={20} strokeWidth={1.75} />
          </div>
        </div>

        {/* Card 4: Unavailable / Custom */}
        <div
          onClick={() => {
            setStatusFilter("PDF Not Available");
            setPage(1);
          }}
          style={{
            background: "var(--sn-paper)",
            border: `1px solid ${statusFilter === "PDF Not Available" ? "var(--sn-danger)" : "var(--sn-paper-line)"}`,
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: statusFilter === "PDF Not Available" ? "0 2px 10px rgba(179,56,44,0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)", fontWeight: 600 }}>
              PDF Unavailable
            </span>
            <span
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--sn-danger)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {counts.unavailableCount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--sn-alert-red-bg)",
              color: "var(--sn-danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XCircle size={20} strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          SEARCH & FILTER TOOLBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--sn-paper)",
          border: "1px solid var(--sn-paper-line)",
          borderRadius: "12px",
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
        }}
      >
        {/* Status Pills */}
        <div
          role="radiogroup"
          aria-label="Filter requests by status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--sn-paper-card)",
            padding: "3px",
            borderRadius: "10px",
            border: "1px solid var(--sn-paper-line)",
            gap: "2px",
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          {[
            { id: "all", label: "All Requests", count: counts.totalCount },
            { id: "Pending", label: "Pending", count: counts.pendingCount },
            { id: "Completed", label: "Completed", count: counts.completedCount },
            { id: "PDF Not Available", label: "Unavailable", count: counts.unavailableCount },
            { id: "custom", label: "Custom Notes", count: null },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: isSelected ? "var(--sn-paper)" : "transparent",
                  color: isSelected ? "var(--sn-ink)" : "var(--sn-text-sub)",
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    style={{
                      background: isSelected ? "rgba(201,149,44,0.14)" : "rgba(0,0,0,0.04)",
                      color: isSelected ? "var(--sn-ink)" : "var(--sn-text-sub)",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input & Refresh Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 320px", maxWidth: "480px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--sn-text-sub)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by #ID, novel title, writer, or message..."
              className="admin-input"
              style={{
                width: "100%",
                padding: "8px 32px 8px 34px",
                borderRadius: "8px",
                border: "1px solid var(--sn-paper-line)",
                background: "var(--sn-paper)",
                color: "var(--sn-ink)",
                fontSize: "0.86rem",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--sn-text-sub)",
                  cursor: "pointer",
                  display: "flex",
                  padding: "4px",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchRequests(true)}
            disabled={refreshing || loading}
            title="Refresh table"
            aria-label="Refresh requests"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--sn-paper-line)",
              background: "var(--sn-paper)",
              color: "var(--sn-ink)",
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.84rem",
              fontWeight: 500,
              flexShrink: 0,
              transition: "border-color 0.15s ease",
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? "admin-spin 0.85s linear infinite" : "none" }} />
            <span style={{ display: "none" }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          REQUESTS DATA TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--sn-paper)",
          border: "1px solid var(--sn-paper-line)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              minWidth: "860px",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--sn-paper-card)",
                  borderBottom: "1px solid var(--sn-paper-line)",
                  color: "var(--sn-text-sub)",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: "12px 16px", width: "120px" }}>ID & Date</th>
                <th style={{ padding: "12px 16px", minWidth: "200px" }}>Novel Title & Writer</th>
                <th style={{ padding: "12px 16px", minWidth: "180px" }}>Reader Message</th>
                <th style={{ padding: "12px 16px", minWidth: "160px" }}>Status & Link</th>
                <th style={{ padding: "12px 16px", width: "170px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "60px 16px", textAlign: "center", color: "var(--sn-text-sub)" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <Spinner size={24} color="var(--sn-gold)" />
                      <span>Loading requests...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "50px 16px", textAlign: "center", color: "var(--sn-text-sub)" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <Inbox size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                      <span style={{ fontWeight: 600, color: "var(--sn-ink)" }}>No requests found</span>
                      <span style={{ fontSize: "0.82rem" }}>
                        {debouncedSearch
                          ? "Try clearing your search query or switching status filters."
                          : "No novel requests submitted under this status filter yet."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPending = req.status === "Pending" || !req.status;
                  const hasMessage = Boolean(req.message && req.message.trim());
                  const hasLink = Boolean(req.pdf_link && /^https?:\/\//i.test(req.pdf_link));

                  return (
                    <tr
                      key={req.id}
                      className="admin-novel-row"
                      style={{
                        borderBottom: "1px solid var(--sn-paper-line)",
                        transition: "background 0.12s ease",
                      }}
                    >
                      {/* 1. ID & Date */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              fontFamily: "'Courier New', Courier, monospace",
                              fontWeight: 700,
                              color: "var(--sn-ink)",
                              fontSize: "0.92rem",
                            }}
                          >
                            #{req.id}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--sn-text-sub)" }}>
                            {formatDate(req.created_at)}
                          </span>
                          {req.device && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "0.7rem",
                                color: "var(--sn-text-sub)",
                                opacity: 0.85,
                              }}
                            >
                              {req.device.toLowerCase() === "mobile" ? (
                                <Smartphone size={10} />
                              ) : (
                                <Monitor size={10} />
                              )}
                              <span>{req.device}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Novel Title & Writer */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--sn-ink)",
                              fontSize: "0.95rem",
                              lineHeight: 1.35,
                            }}
                          >
                            {req.novel_name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.82rem",
                              color: req.writer_name ? "var(--sn-text-sub)" : "rgba(0,0,0,0.3)",
                              fontStyle: req.writer_name ? "normal" : "italic",
                            }}
                          >
                            {req.writer_name ? `By ${req.writer_name}` : "Author not specified"}
                          </span>
                        </div>
                      </td>

                      {/* 3. Reader Message */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        {hasMessage ? (
                          <div
                            style={{
                              background: "var(--sn-paper-card)",
                              border: "1px solid var(--sn-paper-line)",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              fontSize: "0.8rem",
                              color: "var(--sn-text-main)",
                              maxWidth: "280px",
                              lineHeight: 1.45,
                              position: "relative",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {req.message}
                            </p>
                            {req.message.length > 70 && (
                              <button
                                onClick={() => setViewingMessage(req)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--sn-gold)",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  padding: "4px 0 0 0",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <span>Read full note</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--sn-text-sub)", opacity: 0.45, fontSize: "0.82rem" }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* 4. Status & Link */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div>{renderStatusBadge(req.status)}</div>
                          {hasLink && (
                            <a
                              href={req.pdf_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={req.pdf_link}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                color: "var(--sn-gold)",
                                textDecoration: "none",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <ExternalLink size={11} flexShrink={0} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {req.pdf_link.replace(/^https?:\/\//i, "")}
                              </span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 5. Actions */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {/* Fulfill / Edit Button */}
                          <button
                            onClick={() => openEditor(req)}
                            className="admin-btn-secondary"
                            title="Fulfill / Edit Request"
                            aria-label={`Edit Request #${req.id}`}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "7px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              border: "1px solid var(--sn-paper-line)",
                              background: "var(--sn-paper-card)",
                              color: "var(--sn-ink)",
                            }}
                          >
                            <Pencil size={12} />
                            <span>{isPending ? "Fulfill" : "Edit"}</span>
                          </button>

                          {/* Quick Unavailable Button for Pending rows */}
                          {isPending && (
                            <button
                              onClick={() => handleQuickMarkUnavailable(req)}
                              title="Quick Mark Unavailable"
                              aria-label="Quick Mark Unavailable"
                              style={{
                                padding: "6px 8px",
                                borderRadius: "7px",
                                border: "1px solid var(--sn-paper-line)",
                                background: "var(--sn-paper-card)",
                                color: "var(--sn-danger)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(req)}
                            title="Delete Request"
                            aria-label={`Delete Request #${req.id}`}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "7px",
                              border: "1px solid transparent",
                              background: "transparent",
                              color: "var(--sn-text-sub)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              opacity: 0.7,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--sn-danger)";
                              e.currentTarget.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--sn-text-sub)";
                              e.currentTarget.style.opacity = "0.7";
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid var(--sn-paper-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.84rem",
              color: "var(--sn-text-sub)",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              Showing{" "}
              <strong style={{ color: "var(--sn-ink)" }}>
                {(page - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong style={{ color: "var(--sn-ink)" }}>
                {Math.min(page * pageSize, totalMatching)}
              </strong>{" "}
              of <strong style={{ color: "var(--sn-ink)" }}>{totalMatching}</strong> requests
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper-card)",
                  color: page <= 1 ? "var(--sn-text-sub)" : "var(--sn-ink)",
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ padding: "0 6px", fontVariantNumeric: "tabular-nums", fontSize: "0.82rem" }}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper-card)",
                  color: page >= totalPages ? "var(--sn-text-sub)" : "var(--sn-ink)",
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          FULFILLMENT & STATUS EDITOR MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {editingRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            animation: "admin-fadeIn 0.15s ease-out",
          }}
        >
          <div
            style={{
              background: "var(--sn-paper)",
              border: "1px solid var(--sn-paper-line)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--sn-paper-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--sn-paper-card)",
              }}
            >
              <div>
                <h3
                  id="editor-modal-title"
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--sn-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Pencil size={16} style={{ color: "var(--sn-gold)" }} />
                  <span>Fulfill & Edit Request #{editingRequest.id}</span>
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--sn-text-sub)" }}>
                  Submitted on {formatDate(editingRequest.created_at)}
                  {editingRequest.device ? ` via ${editingRequest.device}` : ""}
                </p>
              </div>

              <button
                onClick={closeEditor}
                disabled={savingEdit}
                aria-label="Close editor"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--sn-text-sub)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  borderRadius: "6px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEdit} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Novel Title & Writer Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sn-ink)" }}>
                    Novel Title <span style={{ color: "var(--sn-danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.novel_name}
                    onChange={(e) => handleNameOrWriterChange("novel_name", e.target.value)}
                    required
                    placeholder="e.g. Peer e Kamil"
                    className="admin-input"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-ink)",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sn-ink)" }}>
                    Writer / Author Name
                  </label>
                  <input
                    type="text"
                    value={editForm.writer_name}
                    onChange={(e) => handleNameOrWriterChange("writer_name", e.target.value)}
                    placeholder="e.g. Umera Ahmed"
                    className="admin-input"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-ink)",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>
              </div>

              {/* Reader message callout (if any) */}
              {editingRequest.message && (
                <div
                  style={{
                    background: "var(--sn-paper-card)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--sn-text-sub)", marginBottom: "4px", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Reader Note / Detail:
                  </div>
                  <div style={{ color: "var(--sn-text-main)", lineHeight: 1.45 }}>
                    {editingRequest.message}
                  </div>
                </div>
              )}

              {/* Status Selector Pills */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sn-ink)" }}>
                  Resolution Status
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[
                    { id: "Completed", label: "Completed", icon: CheckCircle, color: "var(--sn-success)" },
                    { id: "Pending", label: "Pending", icon: Clock, color: "var(--sn-gold)" },
                    { id: "PDF Not Available", label: "PDF Not Available", icon: XCircle, color: "var(--sn-danger)" },
                    { id: "custom", label: "Custom Reply Note", icon: FileText, color: "var(--sn-ink)" },
                  ].map((s) => {
                    const active = editForm.status === s.id;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, status: s.id }))}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          border: `1px solid ${active ? s.color : "var(--sn-paper-line)"}`,
                          background: active ? "var(--sn-paper-card)" : "var(--sn-paper)",
                          color: active ? s.color : "var(--sn-text-sub)",
                          fontWeight: active ? 600 : 500,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={14} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Status Input & Quick Chips (if 'custom' selected) */}
              {editForm.status === "custom" && (
                <div
                  style={{
                    background: "var(--sn-paper-card)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--sn-ink)" }}>
                    Custom Reply Note (Shown directly in the status column):
                  </label>
                  <input
                    type="text"
                    value={editForm.custom_status_note}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, custom_status_note: e.target.value }))}
                    placeholder="Enter custom note or click a preset below..."
                    className="admin-input"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-ink)",
                      fontSize: "0.85rem",
                    }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {CUSTOM_STATUS_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, custom_status_note: preset }))}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid var(--sn-paper-line)",
                          background: "var(--sn-paper)",
                          color: "var(--sn-text-sub)",
                          fontSize: "0.74rem",
                          cursor: "pointer",
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Download Link Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sn-ink)" }}>
                  PDF Download Link {editForm.status === "Completed" && <span style={{ color: "var(--sn-danger)" }}>*</span>}
                </label>
                <div style={{ position: "relative" }}>
                  <Download
                    size={14}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--sn-text-sub)",
                    }}
                  />
                  <input
                    type="url"
                    value={editForm.pdf_link}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pdf_link: e.target.value }))}
                    placeholder="https://drive.google.com/... or https://www.mediafire.com/..."
                    required={editForm.status === "Completed"}
                    className="admin-input"
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-ink)",
                      fontSize: "0.86rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════
                  CATALOG AUTO-SYNC BOX (Shown when Status is 'Completed')
              ══════════════════════════════════════════════════════════════ */}
              {editForm.status === "Completed" && (
                <div
                  style={{
                    background: "rgba(201,149,44,0.06)",
                    border: "1px solid rgba(201,149,44,0.3)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--sn-ink)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.publishToCatalog}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, publishToCatalog: e.target.checked }))}
                        style={{ accentColor: "var(--sn-gold)", width: "16px", height: "16px" }}
                      />
                      <BookOpen size={15} style={{ color: "var(--sn-gold)" }} />
                      <span>Also publish to Urdu Novels Catalog (urdu_novels)</span>
                    </label>
                  </div>

                  {editForm.publishToCatalog && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--sn-text-sub)" }}>
                          Catalog Entry Title:
                        </span>
                        {customTitleOverridden && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTitleOverridden(false);
                              setEditForm((prev) => ({
                                ...prev,
                                catalogTitle: computeStandardCatalogTitle(prev.novel_name, prev.writer_name),
                              }));
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--sn-gold)",
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Reset to standard title
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={editForm.catalogTitle}
                        onChange={(e) => {
                          setCustomTitleOverridden(true);
                          setEditForm((prev) => ({ ...prev, catalogTitle: e.target.value }));
                        }}
                        placeholder="Formatted Title By Writer Name"
                        className="admin-input"
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--sn-paper-line)",
                          background: "var(--sn-paper)",
                          color: "var(--sn-ink)",
                          fontSize: "0.85rem",
                        }}
                      />

                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.8rem",
                          color: "var(--sn-text-main)",
                          cursor: "pointer",
                          marginTop: "4px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.markAsFeatured}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, markAsFeatured: e.target.checked }))}
                          style={{ accentColor: "var(--sn-gold)" }}
                        />
                        <Star size={13} style={{ color: editForm.markAsFeatured ? "var(--sn-gold)" : "var(--sn-text-sub)" }} />
                        <span>Promote as Featured Novel</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--sn-paper-line)",
                }}
              >
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={savingEdit}
                  className="admin-btn-secondary"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    background: "var(--sn-paper-card)",
                    color: "var(--sn-ink)",
                    fontSize: "0.86rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="admin-btn-primary"
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--sn-ink)",
                    color: "#fff",
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    cursor: savingEdit ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {savingEdit ? (
                    <>
                      <Spinner size={14} color="#fff" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save & Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          FULL READER MESSAGE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {viewingMessage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--sn-paper)",
              border: "1px solid var(--sn-paper-line)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 16px 32px rgba(0,0,0,0.2)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={16} style={{ color: "var(--sn-gold)" }} />
                <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--sn-ink)" }}>
                  Reader Message (Request #{viewingMessage.id})
                </h4>
              </div>
              <button
                onClick={() => setViewingMessage(null)}
                aria-label="Close message view"
                style={{ background: "transparent", border: "none", color: "var(--sn-text-sub)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: "var(--sn-paper-card)",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid var(--sn-paper-line)",
                fontSize: "0.9rem",
                color: "var(--sn-text-main)",
                lineHeight: 1.6,
                maxHeight: "300px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {viewingMessage.message}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setViewingMessage(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper-card)",
                  color: "var(--sn-ink)",
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--sn-paper)",
              border: "1px solid var(--sn-paper-line)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 16px 32px rgba(0,0,0,0.2)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--sn-danger)" }}>
              <AlertTriangle size={22} strokeWidth={2} />
              <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--sn-ink)", fontWeight: 700 }}>
                Delete Request #{deleteTarget.id}?
              </h4>
            </div>

            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--sn-text-sub)", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this request for{" "}
              <strong style={{ color: "var(--sn-ink)" }}>"{deleteTarget.novel_name}"</strong>? This action cannot be undone.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: "7px 14px",
                  borderRadius: "7px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper-card)",
                  color: "var(--sn-ink)",
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "7px 16px",
                  borderRadius: "7px",
                  border: "none",
                  background: "var(--sn-danger)",
                  color: "#fff",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {deleting ? (
                  <>
                    <Spinner size={13} color="#fff" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
