"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "../components/ThemeToggle";
import * as XLSX from "xlsx";
import {
  LuBookOpen as BookOpen,
  LuBot as Bot,
  LuSettings as Settings,
  LuLogOut as LogOut,
  LuUser as User,
  LuPlus as Plus,
  LuSearch as Search,
  LuTrash2 as Trash2,
  LuRefreshCw as RefreshCw,
  LuExternalLink as ExternalLink,
  LuCopy as Copy,
  LuCheck as Check,
  LuTriangleAlert as AlertTriangle,
  LuChevronDown as ChevronDown,
  LuChevronUp as ChevronUp,
  LuLock as Lock,
  LuArrowLeft as ArrowLeft,
  LuLayers as Layers,
  LuSparkles as Sparkles,
  LuSave as Save,
  LuEye as Eye,
  LuZap as Zap,
  LuTag as Tag,
  LuX as X,
  LuPower as Power,
  LuCircleCheck as CheckCircle2,
  LuFileText as FileText,
  LuShieldCheck as ShieldCheck,
  LuUpload as Upload,
  LuFileSpreadsheet as FileSpreadsheet,
  LuCircleX as XCircle,
  LuDownload as Download,
  LuStar as Star,
  LuPencil as Pencil,
  LuChartColumn as BarChart3,
  LuInbox as Inbox,
} from "react-icons/lu";
import AnalyticsDashboard from "./AnalyticsDashboard";
import NovelRequestsManager from "./NovelRequestsManager";

// ── SVG Spinner ──────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = "currentColor" }) {
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
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ── Genre Badge ──────────────────────────────────────────────────────────────
function GenreBadge({ label }) {
  return (
    <span
      style={{
        background: "var(--sn-paper)",
        border: "1px solid var(--sn-paper-line)",
        color: "var(--sn-text-main)",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "0.74rem",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <Tag size={11} style={{ color: "var(--sn-gold)", opacity: 0.85 }} />
      <span>{label.trim()}</span>
    </span>
  );
}

export default function AdminDashboard({ defaultTab = "catalog" }) {
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get("tab");

  // ── Tab Navigation State ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(queryTab || defaultTab);

  // Sync tab with URL if param changes
  useEffect(() => {
    if (queryTab && ["catalog", "requests", "train-bot", "settings", "analytics"].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // ── Supabase Auth State ──────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // ── Tab 1: Novel Catalog State ───────────────────────────────────────────
  const [catalogMode, setCatalogMode] = useState("single"); // 'single' | 'bulk'
  const [singleTitle, setSingleTitle] = useState("");
  const [singleLink, setSingleLink] = useState("");
  const [singleFeatured, setSingleFeatured] = useState(false);
  const [addingSingle, setAddingSingle] = useState(false);
  const [singleStatus, setSingleStatus] = useState(null); // { type: 'success'|'error', msg: '' }

  const [bulkText, setBulkText] = useState("");
  const [bulkPasteFeatured, setBulkPasteFeatured] = useState(false);
  const [addingBulk, setAddingBulk] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null);

  // ── Spreadsheet Bulk File Upload State ───────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null); // { name, size }
  const [fileParsing, setFileParsing] = useState(false);
  const [parsedFileRows, setParsedFileRows] = useState([]);
  const [headerError, setHeaderError] = useState(null);
  const [headerWarning, setHeaderWarning] = useState(null);
  const [validatingDb, setValidatingDb] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [previewFilter, setPreviewFilter] = useState("all"); // 'all' | 'valid' | 'duplicate' | 'error' | 'featured'
  const [previewPage, setPreviewPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { currentBatch, totalBatches, importedCount, totalToImport, percent, error }
  const [importSuccessResult, setImportSuccessResult] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [bulkInputMethod, setBulkInputMethod] = useState("file"); // 'file' | 'paste'

  const [novels, setNovels] = useState([]);
  const [novelsLoading, setNovelsLoading] = useState(false);
  const [novelsError, setNovelsError] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTotal, setCatalogTotal] = useState(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState(null);

  // ── Novel Inline Editing State ───────────────────────────────────────────
  const [editingNovelId, setEditingNovelId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [savingEditId, setSavingEditId] = useState(null);

  // ── Tab 2: Train AI Bot (RAG) State ──────────────────────────────────────
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState(null);
  const [latestTrained, setLatestTrained] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState(null);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  // ── Tab 3: Site Settings State ───────────────────────────────────────────
  const [requestFormMaintenance, setRequestFormMaintenance] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [customMaintenanceMessage, setCustomMaintenanceMessage] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [schemaNotice, setSchemaNotice] = useState(null); // { command: string }
  const [schemaCopied, setSchemaCopied] = useState(false);

  const copySchemaCommand = async (cmd) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd);
      }
      setSchemaCopied(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "SQL command copied to clipboard." },
          })
        );
      }
      setTimeout(() => setSchemaCopied(false), 2500);
    } catch (err) {
      console.error("Copy schema command error:", err);
    }
  };

  // ── Auth Lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mounted) return;
      if (error) console.error("Session check error:", error);
      setSession(initialSession || null);
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession || null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  // ── API Fetchers ─────────────────────────────────────────────────────────

  // 1. Fetch Novels Catalog
  const fetchNovels = useCallback(
    async (searchTerm = "", tokenOverride) => {
      const token = tokenOverride || session?.access_token;
      if (!token) return;

      setNovelsLoading(true);
      setNovelsError(null);
      try {
        const queryParam = searchTerm.trim() ? `?q=${encodeURIComponent(searchTerm.trim())}` : "";
        const res = await fetch(`/api/admin/novels${queryParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        setNovels(json.novels || []);
        setCatalogTotal(json.total ?? json.novels?.length ?? 0);
      } catch (err) {
        console.error("fetchNovels error:", err);
        setNovelsError(err.message || "Failed to load novels catalog.");
      } finally {
        setNovelsLoading(false);
      }
    },
    [session?.access_token]
  );

  // 2. Fetch Knowledge Base Items
  const fetchKnowledgeBase = useCallback(
    async (tokenOverride) => {
      const token = tokenOverride || session?.access_token;
      if (!token) return;

      setKnowledgeLoading(true);
      setKnowledgeError(null);
      try {
        const res = await fetch("/api/novel-knowledge", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        setKnowledgeItems(json.items || []);
      } catch (err) {
        console.error("fetchKnowledgeBase error:", err);
        setKnowledgeError(err.message || "Failed to load trained novels.");
      } finally {
        setKnowledgeLoading(false);
      }
    },
    [session?.access_token]
  );

  // 3. Fetch Site Settings
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json.error || `HTTP ${res.status}`;
        const isSchema =
          json.isSchemaCacheError ||
          errMsg.toLowerCase().includes("schema cache") ||
          errMsg.toLowerCase().includes("could not find");

        if (isSchema) {
          setSchemaNotice({ command: json.hint || "NOTIFY pgrst, 'reload schema';" });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("showToast", {
                detail: { message: "Supabase schema reload needed" },
              })
            );
          }
        }
        return;
      }
      if (json.settings) {
        setRequestFormMaintenance(json.settings.request_form_maintenance === true);
        setChatbotEnabled(json.settings.chatbot_enabled !== false);
        setCustomMaintenanceMessage(json.settings.maintenance_message || "");
        setSettingsUpdatedAt(json.settings.updated_at || null);
      }
      if (json.isSchemaCacheError || json.settings?.schema_cache_stale) {
        setSchemaNotice({ command: json.hint || "NOTIFY pgrst, 'reload schema';" });
      }
    } catch (err) {
      console.error("fetchSettings error:", err);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find")) {
        setSchemaNotice({ command: "NOTIFY pgrst, 'reload schema';" });
      }
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // ── Novel Requests Summary State ─────────────────────────────────────────
  const [pendingRequestsCount, setPendingRequestsCount] = useState(null);

  const fetchRequestsSummary = useCallback(async (tokenOverride) => {
    let token = tokenOverride || session?.access_token;
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token;
      } catch (e) {
        console.warn("Session retrieval fallback failed:", e);
      }
    }
    if (!token) return;
    try {
      const res = await fetch("/api/admin/requests?pageSize=1", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.counts?.pendingCount === "number") {
          setPendingRequestsCount(data.counts.pendingCount);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch requests summary:", err);
    }
  }, [session?.access_token]);

  // Trigger data fetching when session becomes available
  useEffect(() => {
    if (session?.access_token) {
      fetchNovels("", session.access_token);
      fetchKnowledgeBase(session.access_token);
      fetchSettings();
      fetchRequestsSummary(session.access_token);
    }
  }, [session?.access_token, fetchNovels, fetchKnowledgeBase, fetchSettings, fetchRequestsSummary]);

  // ── Auth Handlers ────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError(error.message || "Invalid login credentials.");
      } else if (data?.session) {
        setSession(data.session);
        setAuthError("");
      }
    } catch (err) {
      setAuthError(err?.message || "Sign-in error occurred.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setSession(null);
      setNovels([]);
      setKnowledgeItems([]);
      setPassword("");
    }
  };

  // ── Tab 1 Handlers: Novel Catalog ────────────────────────────────────────

  // Parse bulk text into array of { title, link, featured }
  const parsedBulkNovels = useMemo(() => {
    if (!bulkText.trim()) return [];
    const lines = bulkText.split("\n");
    const valid = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Split by pipe |
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        let isFeatured = bulkPasteFeatured;
        if (parts[2]) {
          const p2 = parts[2].toLowerCase();
          if (["featured", "feature", "star", "true", "yes", "1"].includes(p2)) {
            isFeatured = true;
          }
        }
        valid.push({ title: parts[0], link: parts[1], featured: isFeatured });
      }
    }
    return valid;
  }, [bulkText, bulkPasteFeatured]);

  // Add Single Novel
  const handleAddSingleNovel = async (e) => {
    e.preventDefault();
    setSingleStatus(null);

    const token = session?.access_token;
    if (!token) return;

    if (!singleTitle.trim() || !singleLink.trim()) {
      setSingleStatus({ type: "error", msg: "Please enter both novel title and download URL." });
      return;
    }

    setAddingSingle(true);
    try {
      const res = await fetch("/api/admin/novels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: singleTitle.trim(),
          link: singleLink.trim(),
          featured: singleFeatured,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add novel.");
      }

      if (json.insertedCount === 0 && json.skippedDuplicatesCount > 0 && (!json.featuredAddedCount || json.featuredAddedCount === 0)) {
        setSingleStatus({
          type: "error",
          msg: `Novel "${singleTitle.trim()}" already exists in the catalog (duplicate title or link).`,
        });
        return;
      }

      const featuredNotice = json.featuredAddedCount > 0 ? " (Also added to Featured Novels)" : "";
      setSingleStatus({
        type: "success",
        msg: `Novel "${singleTitle.trim()}" added successfully to catalog${featuredNotice}.`,
      });
      setSingleTitle("");
      setSingleLink("");
      setSingleFeatured(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: `Novel "${singleTitle.trim()}" added to catalog${featuredNotice}!` },
          })
        );
      }

      // Refresh catalog
      fetchNovels(catalogSearch, token);
    } catch (err) {
      setSingleStatus({ type: "error", msg: err.message || "Failed to add novel." });
    } finally {
      setAddingSingle(false);
    }
  };

  // Add Bulk Novels (Legacy Textarea Format)
  const handleAddBulkNovels = async (e) => {
    e.preventDefault();
    setBulkStatus(null);

    const token = session?.access_token;
    if (!token) return;

    if (parsedBulkNovels.length === 0) {
      setBulkStatus({
        type: "error",
        msg: "No valid novels found. Format must be: Novel Title | https://url... (one per line)",
      });
      return;
    }

    setAddingBulk(true);
    try {
      const res = await fetch("/api/admin/novels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          novels: parsedBulkNovels,
          skipDuplicates: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Bulk insert failed.");
      }

      const featNotice = json.featuredAddedCount > 0 ? ` (${json.featuredAddedCount} added to Featured Novels)` : "";
      setBulkStatus({
        type: "success",
        msg: `Successfully added ${json.insertedCount ?? json.count ?? parsedBulkNovels.length} novel(s)${json.skippedDuplicatesCount > 0 ? ` (${json.skippedDuplicatesCount} duplicates skipped)` : ""}${featNotice}.`,
      });
      setBulkText("");
      setBulkPasteFeatured(false);

      // Refresh catalog
      fetchNovels(catalogSearch, token);
    } catch (err) {
      setBulkStatus({ type: "error", msg: err.message || "Failed to bulk add novels." });
    } finally {
      setAddingBulk(false);
    }
  };

  // ── Spreadsheet File Upload & Validation Pipeline ────────────────────────
  const PREVIEW_PAGE_SIZE = 50;

  // Process and parse uploaded spreadsheet file (.csv, .xlsx, .xls)
  const processUploadedFile = async (file) => {
    if (!file) return;
    const fileName = file.name || "";
    const validExts = [".csv", ".xlsx", ".xls"];
    const hasValidExt = validExts.some((ext) => fileName.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "Invalid file format. Please upload a .csv, .xlsx, or .xls file." },
          })
        );
      }
      return;
    }

    setUploadFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
    });
    setFileParsing(true);
    setHeaderError(null);
    setHeaderWarning(null);
    setParsedFileRows([]);
    setValidationDone(false);
    setImportSuccessResult(null);
    setImportProgress(null);
    setPreviewPage(1);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("Spreadsheet contains no worksheets.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!rawRows || rawRows.length === 0) {
        throw new Error("The uploaded spreadsheet is empty.");
      }

      // Check row 0 for headers
      const row0 = (rawRows[0] || []).map((c) => String(c || "").trim().toLowerCase());

      let titleColIdx = row0.findIndex((h) =>
        ["titles", "title", "novel title", "novel_title", "novel", "name"].includes(h)
      );
      let linkColIdx = row0.findIndex((h) =>
        ["links", "link", "url", "download", "download link", "download_link", "read link", "pdf"].includes(h)
      );
      let featColIdx = row0.findIndex((h) =>
        ["featured", "is_featured", "feature", "isfeatured", "highlight", "starred", "star"].includes(h)
      );

      let startRowIdx = 1;

      // If headers not found, check fallback (Row 0 is data)
      if (titleColIdx === -1 || linkColIdx === -1) {
        const col0Val = String(rawRows[0]?.[0] || "").trim();
        const col1Val = String(rawRows[0]?.[1] || "").trim();

        if (col0Val.length > 0 && /^https?:\/\//i.test(col1Val)) {
          titleColIdx = 0;
          linkColIdx = 1;
          startRowIdx = 0;
          setHeaderWarning(
            "Column headers not detected. Auto-assigned Column A as Title and Column B as Link."
          );
        } else {
          setHeaderError(
            "Could not find required 'Titles' and 'Links' headers in the spreadsheet. Please ensure your file has columns named 'Titles' and 'Links' (or 'Title' and 'Link')."
          );
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("showToast", {
                detail: { message: "Invalid column headers in spreadsheet." },
              })
            );
          }
          setFileParsing(false);
          return;
        }
      }

      // Parse data rows
      const rows = [];
      const seenFileTitles = new Map();
      const seenFileLinks = new Map();

      for (let r = startRowIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !Array.isArray(row)) continue;

        const rawTitle = String(row[titleColIdx] ?? "").trim();
        const rawLink = String(row[linkColIdx] ?? "").trim();

        // Check optional 3rd column for featured flag
        let isRowFeatured = false;
        if (featColIdx !== -1 && row[featColIdx] !== undefined) {
          const rawFeatVal = String(row[featColIdx] || "").trim().toLowerCase();
          isRowFeatured = ["true", "yes", "1", "y", "star", "featured"].includes(rawFeatVal);
        }

        // Skip completely blank rows
        if (!rawTitle && !rawLink) continue;

        const rowNumber = r + 1;
        const id = `row-${rowNumber}-${Math.random().toString(36).substring(2, 7)}`;

        const isTitleMissing = !rawTitle || rawTitle.length < 2;
        const isLinkMissingOrBad = !rawLink || !/^https?:\/\//i.test(rawLink);

        let status = "ready";
        let statusMsg = "Ready to import";

        if (isTitleMissing && isLinkMissingOrBad) {
          status = "invalid_both";
          statusMsg = "Missing title & invalid URL";
        } else if (isTitleMissing) {
          status = "invalid_title";
          statusMsg = "Title must be at least 2 characters";
        } else if (isLinkMissingOrBad) {
          status = "invalid_link";
          statusMsg = "Invalid URL (must start with http:// or https://)";
        } else {
          // Check in-file duplicates
          const normTitle = rawTitle.toLowerCase();
          const normLink = rawLink.toLowerCase();

          if (seenFileTitles.has(normTitle)) {
            status = "duplicate_file";
            statusMsg = `Duplicate title in file (matches row #${seenFileTitles.get(normTitle)})`;
          } else if (seenFileLinks.has(normLink)) {
            status = "duplicate_file";
            statusMsg = `Duplicate URL in file (matches row #${seenFileLinks.get(normLink)})`;
          } else {
            seenFileTitles.set(normTitle, rowNumber);
            seenFileLinks.set(normLink, rowNumber);
          }
        }

        rows.push({
          id,
          rowNumber,
          title: rawTitle,
          link: rawLink,
          status,
          statusMsg,
          featured: isRowFeatured,
        });
      }

      if (rows.length === 0) {
        setHeaderError("No novel data rows found in the uploaded file.");
        setFileParsing(false);
        return;
      }

      setParsedFileRows(rows);
      setFileParsing(false);

      // Check database duplicates asynchronously
      const token = session?.access_token;
      if (token) {
        await runDatabaseDuplicateCheck(rows, token);
      }
    } catch (err) {
      console.error("Error parsing spreadsheet file:", err);
      setHeaderError(err.message || "Failed to parse file. Ensure it is a valid spreadsheet.");
      setFileParsing(false);
    }
  };

  // Run database duplicate pre-check in chunks of 250
  const runDatabaseDuplicateCheck = async (rows, token) => {
    setValidatingDb(true);
    try {
      const readyRows = rows.filter((r) => r.status === "ready");
      if (readyRows.length === 0) {
        setValidationDone(true);
        return;
      }

      const CHUNK_SIZE = 250;
      const chunks = [];
      for (let i = 0; i < readyRows.length; i += CHUNK_SIZE) {
        chunks.push(readyRows.slice(i, i + CHUNK_SIZE));
      }

      const dbExistingTitles = new Set();
      const dbExistingLinks = new Set();
      const dbExistingFeaturedTitles = new Set();

      for (const chunk of chunks) {
        const res = await fetch("/api/admin/novels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "validate",
            novels: chunk.map((r) => ({ title: r.title, link: r.link })),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.existingTitles) {
            json.existingTitles.forEach((t) => dbExistingTitles.add(t.toLowerCase().trim()));
          }
          if (json.existingLinks) {
            json.existingLinks.forEach((l) => dbExistingLinks.add(l.toLowerCase().trim()));
          }
          if (json.existingFeaturedTitles) {
            json.existingFeaturedTitles.forEach((ft) => dbExistingFeaturedTitles.add(ft.toLowerCase().trim()));
          }
        }
      }

      setParsedFileRows((prev) =>
        prev.map((r) => {
          if (r.status !== "ready") return r;
          const normTitle = r.title.toLowerCase().trim();
          const normLink = r.link.toLowerCase().trim();

          const isAlreadyInDb = dbExistingTitles.has(normTitle) || dbExistingLinks.has(normLink);
          const isAlreadyFeatured = dbExistingFeaturedTitles.has(normTitle);

          if (isAlreadyInDb) {
            const reason = dbExistingTitles.has(normTitle)
              ? "Already exists in database (duplicate title)"
              : "Already exists in database (duplicate URL)";
            return {
              ...r,
              status: "duplicate_db",
              statusMsg: reason,
              featured: isAlreadyFeatured ? true : r.featured,
            };
          }
          return {
            ...r,
            featured: isAlreadyFeatured ? true : r.featured,
          };
        })
      );
    } catch (err) {
      console.warn("DB duplicate pre-check error:", err);
    } finally {
      setValidatingDb(false);
      setValidationDone(true);
    }
  };

  // Remove individual row from parsed preview
  const handleRemoveRow = (id) => {
    setParsedFileRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Toggle Featured status for a single row in parsed preview
  const handleToggleRowFeatured = (id) => {
    setParsedFileRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, featured: !r.featured } : r))
    );
  };

  // Star all ready rows in preview
  const handleStarAllReadyRows = () => {
    setParsedFileRows((prev) =>
      prev.map((r) =>
        r.status === "ready" || r.status === "duplicate_db" ? { ...r, featured: true } : r
      )
    );
  };

  // Clear all stars in preview
  const handleClearAllStars = () => {
    setParsedFileRows((prev) => prev.map((r) => ({ ...r, featured: false })));
  };

  // Reset file upload
  const handleResetUpload = () => {
    setUploadFile(null);
    setParsedFileRows([]);
    setHeaderError(null);
    setHeaderWarning(null);
    setValidationDone(false);
    setImportSuccessResult(null);
    setImportProgress(null);
    setPreviewPage(1);
  };

  // Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    const sampleCsv = `Titles,Links,Featured
Jannat Ke Pattay by Nemrah Ahmed,https://drive.google.com/file/d/sample-link-1/view,yes
Peer e Kamil by Umera Ahmed,https://drive.google.com/file/d/sample-link-2/view,yes
Namal by Nemrah Ahmed,https://drive.google.com/file/d/sample-link-3/view,no
Haalim by Nemrah Ahmed,https://drive.google.com/file/d/sample-link-4/view,no`;
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "novel_bulk_upload_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Execute Chunked Bulk Upload (200 rows per request)
  const handleExecuteBulkUpload = async () => {
    const token = session?.access_token;
    if (!token) return;

    // Upload valid new rows, as well as existing DB rows that the admin specifically starred as featured
    const validRowsToUpload = parsedFileRows.filter(
      (r) => r.status === "ready" || (r.status === "duplicate_db" && r.featured)
    );
    if (validRowsToUpload.length === 0) return;

    setIsImporting(true);
    const CHUNK_SIZE = 200;
    const totalBatches = Math.ceil(validRowsToUpload.length / CHUNK_SIZE);

    setImportProgress({
      currentBatch: 0,
      totalBatches,
      importedCount: 0,
      totalToImport: validRowsToUpload.length,
      percent: 0,
      error: null,
    });

    const chunks = [];
    for (let i = 0; i < validRowsToUpload.length; i += CHUNK_SIZE) {
      chunks.push(validRowsToUpload.slice(i, i + CHUNK_SIZE));
    }

    let totalImported = 0;
    let totalFeaturedAdded = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setImportProgress({
          currentBatch: i + 1,
          totalBatches,
          importedCount: totalImported,
          totalToImport: validRowsToUpload.length,
          percent: Math.round((totalImported / validRowsToUpload.length) * 100),
          error: null,
        });

        const res = await fetch("/api/admin/novels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novels: chunk.map((r) => ({
              title: r.title,
              link: r.link,
              featured: Boolean(r.featured),
            })),
            skipDuplicates: true,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            `Batch ${i + 1} of ${chunks.length} failed: ${json.error || res.statusText || "Database insert error"}`
          );
        }

        totalImported += json.insertedCount ?? chunk.length;
        totalFeaturedAdded += json.featuredAddedCount ?? 0;

        setImportProgress({
          currentBatch: i + 1,
          totalBatches,
          importedCount: totalImported,
          totalToImport: validRowsToUpload.length,
          percent: Math.round((totalImported / validRowsToUpload.length) * 100),
          error: null,
        });
      }

      // Success summary
      const duplicateCount = parsedFileRows.filter(
        (r) => r.status === "duplicate_db" || r.status === "duplicate_file"
      ).length;
      const invalidCount = parsedFileRows.filter((r) => r.status.startsWith("invalid_")).length;

      setImportSuccessResult({
        importedCount: totalImported,
        featuredAddedCount: totalFeaturedAdded,
        duplicateCount,
        invalidCount,
        totalRead: parsedFileRows.length,
      });

      const featNotice = totalFeaturedAdded > 0 ? ` (${totalFeaturedAdded} added to Featured Novels)` : "";
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: {
              message: `Successfully imported ${totalImported} novels! (${duplicateCount} duplicates skipped, ${invalidCount} invalid blocked${featNotice})`,
            },
          })
        );
      }

      // Refresh catalog list and count
      fetchNovels(catalogSearch, token);
    } catch (err) {
      console.error("Bulk upload error:", err);
      setImportProgress((prev) => ({
        ...(prev || {}),
        error: err.message || "Bulk upload encountered an error.",
      }));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: {
              message: `Upload halted: ${err.message || "Batch failure"}`,
            },
          })
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Summary counts for spreadsheet preview
  const previewCounts = useMemo(() => {
    let total = parsedFileRows.length;
    let ready = 0;
    let duplicates = 0;
    let errors = 0;
    let featured = 0;
    for (const r of parsedFileRows) {
      if (r.status === "ready") ready++;
      else if (r.status === "duplicate_db" || r.status === "duplicate_file") duplicates++;
      else if (r.status.startsWith("invalid_")) errors++;
      if (r.featured) featured++;
    }
    return { total, ready, duplicates, errors, featured };
  }, [parsedFileRows]);

  // Filtered rows based on preview filter
  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === "valid") {
      return parsedFileRows.filter((r) => r.status === "ready");
    }
    if (previewFilter === "duplicate") {
      return parsedFileRows.filter(
        (r) => r.status === "duplicate_db" || r.status === "duplicate_file"
      );
    }
    if (previewFilter === "error") {
      return parsedFileRows.filter((r) => r.status.startsWith("invalid_"));
    }
    if (previewFilter === "featured") {
      return parsedFileRows.filter((r) => r.featured);
    }
    return parsedFileRows;
  }, [parsedFileRows, previewFilter]);

  // Pagination for preview table
  const totalPreviewPages = Math.max(1, Math.ceil(filteredPreviewRows.length / PREVIEW_PAGE_SIZE));
  const pagedPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return filteredPreviewRows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [filteredPreviewRows, previewPage]);

  // Toggle Featured status in main Catalog table
  const handleToggleCatalogFeatured = async (novel) => {
    const token = session?.access_token;
    if (!token || !novel) return;

    const newFeaturedState = !novel.featured;
    setTogglingFeaturedId(novel.id);

    // Optimistically update catalog list
    setNovels((prev) =>
      prev.map((n) => (n.id === novel.id ? { ...n, featured: newFeaturedState } : n))
    );

    try {
      const res = await fetch("/api/admin/novels", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          novelId: novel.id,
          title: novel.Titles,
          link: novel.Links,
          featured: newFeaturedState,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update featured status.");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: {
              message: newFeaturedState
                ? `"${novel.Titles}" added to Featured Novels.`
                : `"${novel.Titles}" removed from Featured Novels.`,
            },
          })
        );
      }
    } catch (err) {
      console.error("Toggle featured error:", err);
      // Revert optimistic update
      setNovels((prev) =>
        prev.map((n) => (n.id === novel.id ? { ...n, featured: !newFeaturedState } : n))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: `Error: ${err.message || "Could not update featured status"}` },
          })
        );
      }
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  // Delete Novel
  const handleDeleteNovel = async (id, title) => {
    const token = session?.access_token;
    if (!token) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete this novel from the catalog?\n\nID: #${id}\nTitle: "${title}"\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setDeleteMsg(null);
    try {
      const res = await fetch(`/api/admin/novels?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete novel.");
      }

      // Optimistically remove from list
      setNovels((prev) => prev.filter((n) => n.id !== id));
      setCatalogTotal((prev) => (prev ? prev - 1 : 0));
      setDeleteMsg({ type: "success", msg: `Novel #${id} ("${title}") deleted successfully.` });
      setTimeout(() => setDeleteMsg(null), 4000);
    } catch (err) {
      setDeleteMsg({ type: "error", msg: err.message || "Failed to delete novel." });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Novel Inline Edit Handlers ───────────────────────────────────────────
  const handleStartEdit = (novel) => {
    if (!novel) return;
    setEditingNovelId(novel.id);
    setEditTitle(novel.Titles || "");
    setEditLink(novel.Links || "");
  };

  const handleCancelEdit = () => {
    setEditingNovelId(null);
    setEditTitle("");
    setEditLink("");
    setSavingEditId(null);
  };

  const handleSaveEdit = async (novel) => {
    if (!novel) return;
    const token = session?.access_token;
    if (!token) return;

    const trimmedTitle = editTitle.trim();
    const trimmedLink = editLink.trim();

    // 1. Validation checks
    if (!trimmedTitle || trimmedTitle.length < 2) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "Error: Novel title must be at least 2 characters long." },
          })
        );
      }
      return;
    }

    if (!trimmedLink || !/^https?:\/\/.+/i.test(trimmedLink)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "Error: Link must be a valid URL starting with http:// or https://" },
          })
        );
      }
      return;
    }

    // 2. No changes made check
    if (trimmedTitle === novel.Titles && trimmedLink === novel.Links) {
      handleCancelEdit();
      return;
    }

    setSavingEditId(novel.id);
    try {
      const res = await fetch("/api/admin/novels", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: novel.id,
          Titles: trimmedTitle,
          Links: trimmedLink,
          oldTitle: novel.Titles,
          oldLink: novel.Links,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update novel details.");
      }

      // Optimistically update catalog list
      setNovels((prev) =>
        prev.map((n) =>
          n.id === novel.id ? { ...n, Titles: trimmedTitle, Links: trimmedLink } : n
        )
      );

      handleCancelEdit();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: `Updated #${novel.id} successfully!` },
          })
        );
      }
    } catch (err) {
      console.error("Save edit novel error:", err);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: `Error: ${err.message || "Could not update novel"}` },
          })
        );
      }
    } finally {
      setSavingEditId(null);
    }
  };

  // ── Tab 2 Handlers: Train AI Bot (RAG) ───────────────────────────────────
  const handleExtractAndTrain = async (e) => {
    e.preventDefault();
    setTrainingError(null);

    const token = session?.access_token;
    if (!token) return;

    const hasUrl = Boolean(url && url.trim());
    const hasRaw = Boolean(rawText && rawText.trim());

    if (!hasUrl && !hasRaw) {
      setTrainingError("Please provide either a Review URL, Raw Review Text, or both.");
      return;
    }

    setTrainingLoading(true);
    try {
      const res = await fetch("/api/novel-knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: url.trim() || undefined,
          rawText: rawText.trim() || undefined,
          manualTitle: manualTitle.trim() || undefined,
          manualAuthor: manualAuthor.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Server error (${res.status})`);
      }

      if (json.success && json.data) {
        setLatestTrained(json.data);
        if (json.data.id) {
          setExpandedIds((prev) => new Set(prev).add(json.data.id));
        }

        setUrl("");
        setRawText("");
        setManualTitle("");
        setManualAuthor("");

        fetchKnowledgeBase(token);

        setTimeout(() => {
          document.getElementById("latest-preview-card")?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }, 150);
      } else {
        throw new Error(json.error || "Unexpected response format.");
      }
    } catch (err) {
      console.error("Training error:", err);
      setTrainingError(err.message || "Failed to extract knowledge.");
    } finally {
      setTrainingLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copySummary = async (text, id) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Filtered knowledge items
  const filteredKnowledge = useMemo(() => {
    if (!knowledgeSearch.trim()) return knowledgeItems;
    const q = knowledgeSearch.toLowerCase().trim();
    return knowledgeItems.filter((item) => {
      return (
        (item.novel_title || "").toLowerCase().includes(q) ||
        (item.author || "").toLowerCase().includes(q) ||
        (item.genres || "").toLowerCase().includes(q) ||
        (item.detailed_summary || "").toLowerCase().includes(q)
      );
    });
  }, [knowledgeItems, knowledgeSearch]);

  // ── Tab 3 Handlers: Site Settings ────────────────────────────────────────
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSaveError(null);

    const token = session?.access_token;
    if (!token) return;

    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_form_maintenance: requestFormMaintenance,
          chatbot_enabled: chatbotEnabled,
          maintenance_message: customMaintenanceMessage.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const errMsg = json.error || "Failed to update settings.";
        const isSchema =
          json.isSchemaCacheError ||
          errMsg.toLowerCase().includes("schema cache") ||
          errMsg.toLowerCase().includes("could not find");

        if (isSchema) {
          setSchemaNotice({ command: json.hint || "NOTIFY pgrst, 'reload schema';" });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("showToast", {
                detail: { message: "Supabase schema reload required" },
              })
            );
          }
        } else {
          setSaveError(errMsg);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("showToast", {
                detail: { message: errMsg },
              })
            );
          }
        }
        return;
      }

      // Success
      if (json.settings?.updated_at) {
        setSettingsUpdatedAt(json.settings.updated_at);
      }
      setSchemaNotice(null);
      setSaveError(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message: "Site settings updated successfully." },
          })
        );
      }
    } catch (err) {
      console.error("Save settings error:", err);
      const msg = err.message || "Failed to save settings.";
      const isSchema = msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find");
      if (isSchema) {
        setSchemaNotice({ command: "NOTIFY pgrst, 'reload schema';" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("showToast", {
              detail: { message: "Supabase schema reload needed" },
            })
          );
        }
      } else {
        setSaveError(msg);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("showToast", {
              detail: { message: msg },
            })
          );
        }
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Render: Checking Authorization ───────────────────────────────────────
  if (authChecking) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          color: "var(--sn-text-sub)",
        }}
      >
        <Spinner size={32} color="var(--sn-gold)" />
        <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 500 }}>
          Checking admin authorization...
        </p>
      </div>
    );
  }

  // ── Render: Unauthenticated Login Card ───────────────────────────────────
  if (!session) {
    return (
      <main style={{ maxWidth: "440px", margin: "70px auto 40px", padding: "16px" }}>
        {/* Back link and Theme Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <Link
            href="/"
            style={{
              color: "var(--sn-gold)",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "opacity 0.15s ease",
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Library</span>
          </Link>
          <ThemeToggle inline />
        </div>

        {/* Login Card */}
        <div
          style={{
            background: "var(--sn-paper-card)",
            border: "1px solid var(--sn-paper-line)",
            borderRadius: "14px",
            padding: "32px 28px",
            boxShadow: "var(--sn-shadow)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                background: "rgba(201,149,44,0.1)",
                border: "1px solid var(--sn-gold-soft)",
                color: "var(--sn-gold)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <Lock size={20} />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.35rem",
                color: "var(--sn-ink)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Admin Sign In
            </h1>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "0.86rem",
                color: "var(--sn-text-sub)",
                lineHeight: 1.5,
              }}
            >
              Sign in with your administrator credentials to access catalog management, site settings, and knowledge base.
            </p>
          </div>

          {authError && (
            <div
              style={{
                background: "var(--sn-alert-red-bg)",
                border: "1px solid var(--sn-alert-red-border)",
                color: "var(--sn-alert-red-text)",
                padding: "11px 13px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                htmlFor="admin-email"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--sn-text-main)",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartnovelbank.com"
                disabled={loggingIn}
                className="admin-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper)",
                  color: "var(--sn-text-main)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--sn-text-main)",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loggingIn}
                className="admin-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sn-paper-line)",
                  background: "var(--sn-paper)",
                  color: "var(--sn-text-main)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="admin-btn-primary"
              style={{
                background: "var(--sn-ink)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "11px 18px",
                fontSize: "0.92rem",
                fontWeight: 600,
                cursor: loggingIn ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "4px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {loggingIn ? (
                <>
                  <Spinner size={16} color="#fff" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Render: Authenticated Control Center ──────────────────────────────────
  return (
    <>
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 48px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {/* Top Header Bar */}
        <div className="admin-header-row">
          <div className="admin-header-row-1" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/"
              style={{
                color: "var(--sn-gold)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Library</span>
            </Link>
            <span style={{ color: "var(--sn-text-sub)", opacity: 0.5 }}>/</span>
            <span
              style={{
                color: "var(--sn-ink)",
                fontWeight: 700,
                fontSize: "1.05rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              <ShieldCheck size={18} style={{ color: "var(--sn-gold)", flexShrink: 0 }} />
              <span>Admin Control Center</span>
            </span>
          </div>

          <div className="admin-header-row-2" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Admin Badge */}
            <span
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                padding: "5px 11px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "var(--sn-text-main)",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
                maxWidth: "160px",
                flexShrink: 1,
              }}
              title={session?.user?.email}
            >
              <User size={13} style={{ color: "var(--sn-gold)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.email || "Admin"}
              </span>
            </span>

            {/* Theme Toggle (Inline SaaS button) */}
            <ThemeToggle inline />

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="admin-signout-btn"
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "var(--sn-text-sub)",
                cursor: "pointer",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tab Bar — Modern SaaS Tab Strip */}
        <div
          role="tablist"
          className="sn-touch-scroll"
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            borderBottom: "1px solid var(--sn-paper-line)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Tab 1: Novel Catalog */}
          <button
            role="tab"
            aria-selected={activeTab === "catalog"}
            onClick={() => switchTab("catalog")}
            className={`admin-nav-tab ${activeTab === "catalog" ? "active" : ""}`}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "catalog" ? "2px solid var(--sn-gold)" : "2px solid transparent",
              color: activeTab === "catalog" ? "var(--sn-ink)" : "var(--sn-text-sub)",
              fontWeight: activeTab === "catalog" ? 600 : 500,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            <BookOpen
              size={16}
              style={{
                color: activeTab === "catalog" ? "var(--sn-gold)" : "currentColor",
                opacity: activeTab === "catalog" ? 1 : 0.7,
              }}
            />
            <span>Novel Catalog</span>
            {catalogTotal !== null && (
              <span
                style={{
                  background: activeTab === "catalog" ? "rgba(201,149,44,0.12)" : "var(--sn-paper)",
                  border: "1px solid var(--sn-paper-line)",
                  color: activeTab === "catalog" ? "var(--sn-ink)" : "var(--sn-text-sub)",
                  fontSize: "0.72rem",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {catalogTotal.toLocaleString()}
              </span>
            )}
          </button>

          {/* Tab 2: Novel Requests */}
          <button
            role="tab"
            aria-selected={activeTab === "requests"}
            onClick={() => switchTab("requests")}
            className={`admin-nav-tab ${activeTab === "requests" ? "active" : ""}`}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "requests" ? "2px solid var(--sn-gold)" : "2px solid transparent",
              color: activeTab === "requests" ? "var(--sn-ink)" : "var(--sn-text-sub)",
              fontWeight: activeTab === "requests" ? 600 : 500,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            <Inbox
              size={16}
              style={{
                color: activeTab === "requests" ? "var(--sn-gold)" : "currentColor",
                opacity: activeTab === "requests" ? 1 : 0.7,
              }}
            />
            <span>Novel Requests</span>
            {pendingRequestsCount !== null && (
              <span
                style={{
                  background:
                    pendingRequestsCount > 0
                      ? "rgba(201,149,44,0.18)"
                      : activeTab === "requests"
                      ? "rgba(201,149,44,0.12)"
                      : "var(--sn-paper)",
                  border: `1px solid ${
                    pendingRequestsCount > 0 ? "rgba(201,149,44,0.4)" : "var(--sn-paper-line)"
                  }`,
                  color: pendingRequestsCount > 0 ? "var(--sn-ink)" : "var(--sn-text-sub)",
                  fontSize: "0.72rem",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontWeight: pendingRequestsCount > 0 ? 700 : 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {pendingRequestsCount.toLocaleString()}
              </span>
            )}
          </button>

          {/* Tab 3: AI Knowledge Base */}
          <button
            role="tab"
            aria-selected={activeTab === "train-bot"}
            onClick={() => switchTab("train-bot")}
            className={`admin-nav-tab ${activeTab === "train-bot" ? "active" : ""}`}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "train-bot" ? "2px solid var(--sn-gold)" : "2px solid transparent",
              color: activeTab === "train-bot" ? "var(--sn-ink)" : "var(--sn-text-sub)",
              fontWeight: activeTab === "train-bot" ? 600 : 500,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            <Bot
              size={16}
              style={{
                color: activeTab === "train-bot" ? "var(--sn-gold)" : "currentColor",
                opacity: activeTab === "train-bot" ? 1 : 0.7,
              }}
            />
            <span>AI Knowledge Base</span>
            {knowledgeItems.length > 0 && (
              <span
                style={{
                  background: activeTab === "train-bot" ? "rgba(201,149,44,0.12)" : "var(--sn-paper)",
                  border: "1px solid var(--sn-paper-line)",
                  color: activeTab === "train-bot" ? "var(--sn-ink)" : "var(--sn-text-sub)",
                  fontSize: "0.72rem",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {knowledgeItems.length.toLocaleString()}
              </span>
            )}
          </button>

          {/* Tab 3: Site Settings */}
          <button
            role="tab"
            aria-selected={activeTab === "settings"}
            onClick={() => switchTab("settings")}
            className={`admin-nav-tab ${activeTab === "settings" ? "active" : ""}`}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "settings" ? "2px solid var(--sn-gold)" : "2px solid transparent",
              color: activeTab === "settings" ? "var(--sn-ink)" : "var(--sn-text-sub)",
              fontWeight: activeTab === "settings" ? 600 : 500,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            <Settings
              size={16}
              style={{
                color: activeTab === "settings" ? "var(--sn-gold)" : "currentColor",
                opacity: activeTab === "settings" ? 1 : 0.7,
              }}
            />
            <span>Site Settings</span>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: requestFormMaintenance || !chatbotEnabled ? "var(--sn-danger)" : "var(--sn-success)",
                display: "inline-block",
                boxShadow: requestFormMaintenance || !chatbotEnabled
                  ? "0 0 0 2px rgba(179,56,44,0.2)"
                  : "0 0 0 2px rgba(47,125,90,0.2)",
              }}
              title={
                requestFormMaintenance && !chatbotEnabled
                  ? "Maintenance Mode Active & Chatbot Disabled"
                  : requestFormMaintenance
                  ? "Maintenance Mode Active"
                  : !chatbotEnabled
                  ? "Chatbot Disabled"
                  : "All Systems Active"
              }
            />
          </button>

          {/* Tab 4: Visual Analytics Dashboard */}
          <button
            role="tab"
            aria-selected={activeTab === "analytics"}
            onClick={() => switchTab("analytics")}
            className={`admin-nav-tab ${activeTab === "analytics" ? "active" : ""}`}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "analytics" ? "2px solid var(--sn-gold)" : "2px solid transparent",
              color: activeTab === "analytics" ? "var(--sn-ink)" : "var(--sn-text-sub)",
              fontWeight: activeTab === "analytics" ? 600 : 500,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            <BarChart3
              size={16}
              style={{
                color: activeTab === "analytics" ? "var(--sn-gold)" : "currentColor",
                opacity: activeTab === "analytics" ? 1 : 0.7,
              }}
            />
            <span>Analytics</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: NOVEL CATALOG MANAGEMENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Add Novel Card */}
            <section
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "var(--sn-shadow)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.15rem",
                      color: "var(--sn-ink)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Plus size={18} style={{ color: "var(--sn-gold)" }} />
                    <span>Add New Novel</span>
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.84rem",
                      color: "var(--sn-text-sub)",
                    }}
                  >
                    Add a single entry or paste multiple novels at once to batch insert.
                  </p>
                </div>

                {/* Mode Switcher */}
                <div
                  style={{
                    display: "flex",
                    background: "var(--sn-paper)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "8px",
                    padding: "3px",
                    gap: "2px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCatalogMode("single")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: catalogMode === "single" ? "var(--sn-ink)" : "transparent",
                      color: catalogMode === "single" ? "#fff" : "var(--sn-text-main)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Single Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogMode("bulk")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: catalogMode === "bulk" ? "var(--sn-ink)" : "transparent",
                      color: catalogMode === "bulk" ? "#fff" : "var(--sn-text-main)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Batch Import
                  </button>
                </div>
              </div>

              {/* Mode 1: Single Add */}
              {catalogMode === "single" && (
                <form onSubmit={handleAddSingleNovel} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {singleStatus && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "0.86rem",
                        background: singleStatus.type === "success" ? "rgba(47,125,90,0.1)" : "var(--sn-alert-red-bg)",
                        color: singleStatus.type === "success" ? "var(--sn-success)" : "var(--sn-alert-red-text)",
                        border: `1px solid ${singleStatus.type === "success" ? "rgba(47,125,90,0.3)" : "var(--sn-alert-red-border)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {singleStatus.type === "success" ? (
                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      ) : (
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      )}
                      <span>{singleStatus.msg}</span>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--sn-text-main)",
                          marginBottom: "6px",
                        }}
                      >
                        Novel Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={singleTitle}
                        onChange={(e) => setSingleTitle(e.target.value)}
                        placeholder="e.g. Peer e Kamil by Umera Ahmed"
                        className="admin-input"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--sn-paper-line)",
                          background: "var(--sn-paper)",
                          color: "var(--sn-text-main)",
                          fontSize: "0.9rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--sn-text-main)",
                          marginBottom: "6px",
                        }}
                      >
                        Download / Read URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={singleLink}
                        onChange={(e) => setSingleLink(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... or archive.org"
                        className="admin-input"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--sn-paper-line)",
                          background: "var(--sn-paper)",
                          color: "var(--sn-text-main)",
                          fontSize: "0.9rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      paddingTop: "2px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSingleFeatured((prev) => !prev)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: singleFeatured
                          ? "1px solid var(--sn-gold)"
                          : "1px solid var(--sn-paper-line)",
                        background: singleFeatured
                          ? "rgba(180, 140, 60, 0.12)"
                          : "var(--sn-paper)",
                        color: singleFeatured ? "var(--sn-gold)" : "var(--sn-text-main)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Star
                        size={16}
                        fill={singleFeatured ? "currentColor" : "none"}
                        style={{ color: singleFeatured ? "var(--sn-gold)" : "var(--sn-text-sub)" }}
                      />
                      <span>
                        {singleFeatured
                          ? "Featured Novel (Will be highlighted)"
                          : "Also add to Featured Novels"}
                      </span>
                    </button>

                    <button
                      type="submit"
                      disabled={addingSingle}
                      className="admin-btn-primary"
                      style={{
                        background: "var(--sn-ink)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 22px",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        cursor: addingSingle ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      {addingSingle ? (
                        <>
                          <Spinner size={15} color="#fff" />
                          <span>Adding Novel...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={15} />
                          <span>Add Novel</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Mode 2: Bulk Import (Spreadsheet File or Legacy Paste) */}
              {catalogMode === "bulk" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Top Bar: Input Mode Switcher & Sample Template Download */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid var(--sn-paper-line)",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        background: "var(--sn-paper)",
                        padding: "3px",
                        borderRadius: "8px",
                        border: "1px solid var(--sn-paper-line)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setBulkInputMethod("file")}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: "none",
                          background: bulkInputMethod === "file" ? "var(--sn-ink)" : "transparent",
                          color: bulkInputMethod === "file" ? "#fff" : "var(--sn-text-main)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <FileSpreadsheet size={15} />
                        <span>Spreadsheet (.csv, .xlsx, .xls)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkInputMethod("paste")}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: "none",
                          background: bulkInputMethod === "paste" ? "var(--sn-ink)" : "transparent",
                          color: bulkInputMethod === "paste" ? "#fff" : "var(--sn-text-main)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Layers size={15} />
                        <span>Raw Text Paste</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      className="admin-btn-secondary"
                      style={{
                        padding: "6px 13px",
                        borderRadius: "6px",
                        border: "1px solid var(--sn-paper-line)",
                        background: "var(--sn-paper)",
                        color: "var(--sn-text-main)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Download size={13} style={{ color: "var(--sn-gold)" }} />
                      <span>Download Sample CSV Template</span>
                    </button>
                  </div>

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* OPTION A: Spreadsheet File Upload Mode                     */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {bulkInputMethod === "file" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Step 1: Drop Zone (When no file parsed yet) */}
                      {parsedFileRows.length === 0 && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(false);
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              processUploadedFile(files[0]);
                            }
                          }}
                          onClick={() => {
                            const fileInput = document.getElementById("admin-bulk-file-input");
                            if (fileInput) fileInput.click();
                          }}
                          style={{
                            border: `2px dashed ${isDraggingFile ? "var(--sn-gold)" : "var(--sn-paper-line)"}`,
                            borderRadius: "12px",
                            background: isDraggingFile ? "rgba(180, 140, 60, 0.05)" : "var(--sn-paper)",
                            padding: "40px 24px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <input
                            id="admin-bulk-file-input"
                            type="file"
                            accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                processUploadedFile(files[0]);
                              }
                            }}
                          />

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                background: "rgba(180, 140, 60, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--sn-gold)",
                              }}
                            >
                              {fileParsing ? <Spinner size={24} color="var(--sn-gold)" /> : <Upload size={24} />}
                            </div>

                            <div>
                              <h3 style={{ margin: "0 0 5px 0", fontSize: "1.05rem", fontWeight: 700, color: "var(--sn-ink)" }}>
                                {fileParsing ? "Parsing & Validating Spreadsheet..." : "Click or drag & drop CSV or Excel file"}
                              </h3>
                              <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--sn-text-sub)" }}>
                                Supports <strong>.csv</strong>, <strong>.xlsx</strong>, and <strong>.xls</strong> up to 1,000+ rows. Must include <code style={{ color: "var(--sn-gold)", fontWeight: 600 }}>Titles</code> and <code style={{ color: "var(--sn-gold)", fontWeight: 600 }}>Links</code> columns.
                              </p>
                            </div>

                            <div style={{ marginTop: "6px" }}>
                              <span
                                className="admin-btn-secondary"
                                style={{
                                  padding: "7px 16px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper-card)",
                                  color: "var(--sn-ink)",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <FileSpreadsheet size={14} style={{ color: "var(--sn-gold)" }} />
                                <span>Choose File from Computer</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Header Error Banner */}
                      {headerError && (
                        <div
                          style={{
                            padding: "12px 16px",
                            borderRadius: "8px",
                            fontSize: "0.86rem",
                            background: "var(--sn-alert-red-bg)",
                            color: "var(--sn-alert-red-text)",
                            border: "1px solid var(--sn-alert-red-border)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          <XCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: "2px" }}>File Structure Error</div>
                            <div>{headerError}</div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Spreadsheet Parsed - Interactive Preview & Validation Summary */}
                      {parsedFileRows.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {/* File Meta Header Bar */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "12px",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              background: "var(--sn-paper)",
                              border: "1px solid var(--sn-paper-line)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "8px",
                                  background: "rgba(180, 140, 60, 0.12)",
                                  color: "var(--sn-gold)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <FileSpreadsheet size={18} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--sn-ink)" }}>
                                  {uploadFile?.name || "Uploaded Spreadsheet"}
                                </div>
                                <div style={{ fontSize: "0.76rem", color: "var(--sn-text-sub)" }}>
                                  File size: {uploadFile?.size || "Unknown"} &bull; {parsedFileRows.length} total rows parsed
                                </div>
                              </div>
                            </div>

                            {/* Database Check Status */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {validatingDb && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "0.8rem",
                                    color: "var(--sn-gold)",
                                    fontWeight: 500,
                                  }}
                                >
                                  <Spinner size={14} color="var(--sn-gold)" />
                                  <span>Checking database duplicates...</span>
                                </div>
                              )}
                              {!validatingDb && validationDone && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "0.8rem",
                                    color: "var(--sn-success)",
                                    fontWeight: 500,
                                  }}
                                >
                                  <ShieldCheck size={16} />
                                  <span>Database verified</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={handleResetUpload}
                                disabled={isImporting}
                                className="admin-btn-secondary"
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper-card)",
                                  color: "var(--sn-text-sub)",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: isImporting ? "not-allowed" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <X size={13} />
                                <span>Upload Different File</span>
                              </button>
                            </div>
                          </div>

                          {/* Header Warning Banner (e.g. Header fallback) */}
                          {headerWarning && (
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "0.84rem",
                                background: "rgba(180, 140, 60, 0.1)",
                                color: "var(--sn-gold)",
                                border: "1px solid rgba(180, 140, 60, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                              <span>{headerWarning}</span>
                            </div>
                          )}

                          {/* 4 Summary Counters */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                              gap: "12px",
                            }}
                          >
                            {/* Counter 1: Total */}
                            <div
                              onClick={() => {
                                setPreviewFilter("all");
                                setPreviewPage(1);
                              }}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                background: "var(--sn-paper)",
                                border: `1px solid ${previewFilter === "all" ? "var(--sn-ink)" : "var(--sn-paper-line)"}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--sn-text-sub)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Total Rows Read
                              </div>
                              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--sn-ink)", marginTop: "4px" }}>
                                {previewCounts.total}
                              </div>
                            </div>

                            {/* Counter 2: Valid & Ready */}
                            <div
                              onClick={() => {
                                setPreviewFilter("valid");
                                setPreviewPage(1);
                              }}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                background: "rgba(47, 125, 90, 0.04)",
                                border: `1px solid ${previewFilter === "valid" ? "var(--sn-success)" : "rgba(47, 125, 90, 0.25)"}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--sn-success)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Ready to Import
                              </div>
                              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--sn-success)", marginTop: "4px" }}>
                                {previewCounts.ready}
                              </div>
                            </div>

                            {/* Counter 3: Duplicates */}
                            <div
                              onClick={() => {
                                setPreviewFilter("duplicate");
                                setPreviewPage(1);
                              }}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                background: "rgba(180, 140, 60, 0.05)",
                                border: `1px solid ${previewFilter === "duplicate" ? "var(--sn-gold)" : "rgba(180, 140, 60, 0.25)"}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--sn-gold)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Duplicates (Auto-Skipped)
                              </div>
                              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--sn-gold)", marginTop: "4px" }}>
                                {previewCounts.duplicates}
                              </div>
                            </div>

                            {/* Counter 4: Invalid */}
                            <div
                              onClick={() => {
                                setPreviewFilter("error");
                                setPreviewPage(1);
                              }}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                background: "var(--sn-alert-red-bg)",
                                border: `1px solid ${previewFilter === "error" ? "var(--sn-alert-red-border)" : "rgba(220, 53, 69, 0.2)"}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--sn-alert-red-text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Invalid Rows (Blocked)
                              </div>
                              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--sn-alert-red-text)", marginTop: "4px" }}>
                                {previewCounts.errors}
                              </div>
                            </div>
                          </div>

                          {/* Filter Tabs and Row Count Bar */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                              {[
                                { id: "all", label: "All Rows", count: previewCounts.total },
                                { id: "valid", label: "Ready Only", count: previewCounts.ready },
                                { id: "duplicate", label: "Duplicates", count: previewCounts.duplicates },
                                { id: "error", label: "Errors Only", count: previewCounts.errors },
                                ...(previewCounts.featured > 0
                                  ? [{ id: "featured", label: "Featured", count: previewCounts.featured, isStar: true }]
                                  : []),
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setPreviewFilter(f.id);
                                    setPreviewPage(1);
                                  }}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--sn-paper-line)",
                                    background: previewFilter === f.id ? "var(--sn-ink)" : "var(--sn-paper)",
                                    color: previewFilter === f.id ? "#fff" : "var(--sn-text-main)",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {f.isStar && <Star size={12} fill="currentColor" style={{ color: "var(--sn-gold)" }} />}
                                  <span>{f.label}</span>
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      padding: "1px 5px",
                                      borderRadius: "10px",
                                      background: previewFilter === f.id ? "rgba(255,255,255,0.2)" : "var(--sn-paper-card)",
                                    }}
                                  >
                                    {f.count}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Bulk Star Controls & Row Count */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              {previewCounts.featured > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span
                                    style={{
                                      background: "rgba(180, 140, 60, 0.12)",
                                      color: "var(--sn-gold)",
                                      border: "1px solid rgba(180, 140, 60, 0.25)",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Star size={12} fill="currentColor" />
                                    <span>{previewCounts.featured} Marked as Featured</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleClearAllStars}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--sn-text-sub)",
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    Clear Stars
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={handleStarAllReadyRows}
                                style={{
                                  background: "var(--sn-paper)",
                                  border: "1px dashed var(--sn-paper-line)",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  color: "var(--sn-text-main)",
                                  fontSize: "0.74rem",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Star size={11} style={{ color: "var(--sn-gold)" }} />
                                <span>Star All Ready</span>
                              </button>

                              <div style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)" }}>
                                Showing {filteredPreviewRows.length === 0 ? 0 : (previewPage - 1) * PREVIEW_PAGE_SIZE + 1}–{Math.min(previewPage * PREVIEW_PAGE_SIZE, filteredPreviewRows.length)} of {filteredPreviewRows.length} row{filteredPreviewRows.length === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>

                          {/* Preview Table */}
                          <div
                            style={{
                              border: "1px solid var(--sn-paper-line)",
                              borderRadius: "8px",
                              overflow: "hidden",
                              background: "var(--sn-paper)",
                            }}
                          >
                            <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                                <thead>
                                  <tr
                                    style={{
                                      background: "var(--sn-paper-card)",
                                      borderBottom: "1px solid var(--sn-paper-line)",
                                      position: "sticky",
                                      top: 0,
                                      zIndex: 1,
                                    }}
                                  >
                                    <th style={{ padding: "9px 12px", width: "65px", color: "var(--sn-text-sub)", fontWeight: 600 }}>Row</th>
                                    <th style={{ padding: "9px 12px", color: "var(--sn-text-sub)", fontWeight: 600 }}>Novel Title</th>
                                    <th style={{ padding: "9px 12px", color: "var(--sn-text-sub)", fontWeight: 600 }}>Download / Read URL</th>
                                    <th style={{ padding: "9px 12px", width: "80px", textAlign: "center", color: "var(--sn-text-sub)", fontWeight: 600 }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <Star size={12} style={{ color: "var(--sn-gold)" }} />
                                        <span>Featured</span>
                                      </span>
                                    </th>
                                    <th style={{ padding: "9px 12px", width: "190px", color: "var(--sn-text-sub)", fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: "9px 12px", width: "50px", textAlign: "center", color: "var(--sn-text-sub)", fontWeight: 600 }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagedPreviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} style={{ padding: "28px 16px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.85rem" }}>
                                        No rows match the selected filter.
                                      </td>
                                    </tr>
                                  ) : (
                                    pagedPreviewRows.map((r) => {
                                      const isReady = r.status === "ready";
                                      const isDuplicate = r.status === "duplicate_db" || r.status === "duplicate_file";
                                      const isError = r.status.startsWith("invalid_");

                                      return (
                                        <tr
                                          key={r.id}
                                          style={{
                                            borderBottom: "1px solid var(--sn-paper-line)",
                                            background: isError
                                              ? "rgba(220, 53, 69, 0.03)"
                                              : isDuplicate
                                              ? "rgba(180, 140, 60, 0.02)"
                                              : "transparent",
                                          }}
                                        >
                                          {/* Row Number */}
                                          <td style={{ padding: "8px 12px", color: "var(--sn-text-sub)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                                            #{r.rowNumber}
                                          </td>

                                          {/* Novel Title */}
                                          <td style={{ padding: "8px 12px", color: "var(--sn-text-main)", fontWeight: 600 }}>
                                            {r.title ? (
                                              r.title
                                            ) : (
                                              <span style={{ color: "var(--sn-alert-red-text)", fontStyle: "italic", fontWeight: 400 }}>
                                                [Missing Title]
                                              </span>
                                            )}
                                          </td>

                                          {/* URL */}
                                          <td style={{ padding: "8px 12px", maxWidth: "260px" }}>
                                            {r.link ? (
                                              <span
                                                title={r.link}
                                                style={{
                                                  display: "inline-block",
                                                  maxWidth: "240px",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                  whiteSpace: "nowrap",
                                                  color: isError && !r.link.startsWith("http") ? "var(--sn-alert-red-text)" : "var(--sn-text-sub)",
                                                  fontSize: "0.8rem",
                                                  fontFamily: "monospace",
                                                }}
                                              >
                                                {r.link}
                                              </span>
                                            ) : (
                                              <span style={{ color: "var(--sn-alert-red-text)", fontStyle: "italic", fontSize: "0.8rem" }}>
                                                [Missing URL]
                                              </span>
                                            )}
                                          </td>

                                          {/* Featured Star Toggle Button */}
                                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                            <button
                                              type="button"
                                              onClick={() => handleToggleRowFeatured(r.id)}
                                              disabled={isError}
                                              title={
                                                isError
                                                  ? "Invalid rows cannot be featured"
                                                  : r.featured
                                                  ? "Featured Novel (Click to unstar)"
                                                  : "Click to mark as Featured Novel"
                                              }
                                              style={{
                                                background: r.featured ? "rgba(180, 140, 60, 0.12)" : "transparent",
                                                border: r.featured ? "1px solid rgba(180, 140, 60, 0.3)" : "1px solid transparent",
                                                borderRadius: "6px",
                                                padding: "4px 8px",
                                                cursor: isError ? "not-allowed" : "pointer",
                                                color: r.featured ? "var(--sn-gold)" : "var(--sn-text-sub)",
                                                opacity: isError ? 0.25 : 1,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                fontSize: "0.74rem",
                                                fontWeight: 600,
                                                transition: "all 0.15s ease",
                                              }}
                                            >
                                              <Star size={15} fill={r.featured ? "currentColor" : "none"} />
                                              {r.featured && <span>Star</span>}
                                            </button>
                                          </td>

                                          {/* Status Badge */}
                                          <td style={{ padding: "8px 12px" }}>
                                            {isReady && (
                                              <span
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: "4px",
                                                  padding: "3px 8px",
                                                  borderRadius: "6px",
                                                  fontSize: "0.74rem",
                                                  fontWeight: 600,
                                                  background: "rgba(47, 125, 90, 0.1)",
                                                  color: "var(--sn-success)",
                                                }}
                                              >
                                                <CheckCircle2 size={12} />
                                                <span>Ready to Import</span>
                                              </span>
                                            )}

                                            {isDuplicate && (
                                              <span
                                                title={r.statusMsg}
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: "4px",
                                                  padding: "3px 8px",
                                                  borderRadius: "6px",
                                                  fontSize: "0.74rem",
                                                  fontWeight: 600,
                                                  background: "rgba(180, 140, 60, 0.12)",
                                                  color: "var(--sn-gold)",
                                                }}
                                              >
                                                <AlertTriangle size={12} />
                                                <span>{r.status === "duplicate_db" ? "Already in DB (Skip)" : "In-File Duplicate"}</span>
                                              </span>
                                            )}

                                            {isError && (
                                              <span
                                                title={r.statusMsg}
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: "4px",
                                                  padding: "3px 8px",
                                                  borderRadius: "6px",
                                                  fontSize: "0.74rem",
                                                  fontWeight: 600,
                                                  background: "var(--sn-alert-red-bg)",
                                                  color: "var(--sn-alert-red-text)",
                                                }}
                                              >
                                                <XCircle size={12} />
                                                <span>{r.statusMsg}</span>
                                              </span>
                                            )}
                                          </td>

                                          {/* Action Remove */}
                                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveRow(r.id)}
                                              title="Remove row from import"
                                              style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--sn-text-sub)",
                                                cursor: "pointer",
                                                padding: "4px",
                                                borderRadius: "4px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                              }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            {totalPreviewPages > 1 && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 14px",
                                  borderTop: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper-card)",
                                  fontSize: "0.78rem",
                                }}
                              >
                                <span style={{ color: "var(--sn-text-sub)" }}>
                                  Page {previewPage} of {totalPreviewPages}
                                </span>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                                    disabled={previewPage <= 1}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "4px",
                                      border: "1px solid var(--sn-paper-line)",
                                      background: "var(--sn-paper)",
                                      color: previewPage <= 1 ? "var(--sn-text-sub)" : "var(--sn-text-main)",
                                      cursor: previewPage <= 1 ? "not-allowed" : "pointer",
                                      fontSize: "0.76rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                                    disabled={previewPage >= totalPreviewPages}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "4px",
                                      border: "1px solid var(--sn-paper-line)",
                                      background: "var(--sn-paper)",
                                      color: previewPage >= totalPreviewPages ? "var(--sn-text-sub)" : "var(--sn-text-main)",
                                      cursor: previewPage >= totalPreviewPages ? "not-allowed" : "pointer",
                                      fontSize: "0.76rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Live Import Progress Bar */}
                          {isImporting && importProgress && (
                            <div
                              style={{
                                padding: "14px 16px",
                                borderRadius: "8px",
                                background: "var(--sn-paper)",
                                border: "1px solid var(--sn-paper-line)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  color: "var(--sn-ink)",
                                  marginBottom: "8px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Spinner size={14} color="var(--sn-ink)" />
                                  <span>
                                    Uploading batch {importProgress.currentBatch} of {importProgress.totalBatches}... ({importProgress.importedCount} / {importProgress.totalToImport} novels imported)
                                  </span>
                                </div>
                                <span style={{ color: "var(--sn-gold)" }}>{importProgress.percent}%</span>
                              </div>
                              <div
                                style={{
                                  height: "8px",
                                  borderRadius: "4px",
                                  background: "var(--sn-paper-line)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${importProgress.percent}%`,
                                    background: "var(--sn-ink)",
                                    transition: "width 0.25s ease",
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Import Failure Error */}
                          {importProgress?.error && (
                            <div
                              style={{
                                padding: "12px 16px",
                                borderRadius: "8px",
                                fontSize: "0.86rem",
                                background: "var(--sn-alert-red-bg)",
                                color: "var(--sn-alert-red-text)",
                                border: "1px solid var(--sn-alert-red-border)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <XCircle size={16} style={{ flexShrink: 0 }} />
                              <span>{importProgress.error}</span>
                            </div>
                          )}

                          {/* Import Success Banner */}
                          {importSuccessResult && (
                            <div
                              style={{
                                padding: "12px 16px",
                                borderRadius: "8px",
                                fontSize: "0.86rem",
                                background: "rgba(47, 125, 90, 0.1)",
                                color: "var(--sn-success)",
                                border: "1px solid rgba(47, 125, 90, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                              <span>
                                <strong>Import Complete!</strong> Successfully inserted {importSuccessResult.importedCount} novel(s) into catalog{importSuccessResult.featuredAddedCount > 0 ? ` (${importSuccessResult.featuredAddedCount} added to Featured Novels)` : ""} ({importSuccessResult.duplicateCount} duplicate rows skipped, {importSuccessResult.invalidCount} invalid rows blocked).
                              </span>
                            </div>
                          )}

                          {/* Action Buttons Bar */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "12px",
                              paddingTop: "6px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <button
                                type="button"
                                onClick={handleExecuteBulkUpload}
                                disabled={isImporting || (previewCounts.ready === 0 && previewCounts.featured === 0) || validatingDb}
                                className="admin-btn-primary"
                                style={{
                                  background: (previewCounts.ready > 0 || previewCounts.featured > 0) && !isImporting && !validatingDb ? "var(--sn-ink)" : "var(--sn-paper-line)",
                                  color: (previewCounts.ready > 0 || previewCounts.featured > 0) && !isImporting && !validatingDb ? "#fff" : "var(--sn-text-sub)",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "10px 22px",
                                  fontSize: "0.88rem",
                                  fontWeight: 600,
                                  cursor: (previewCounts.ready > 0 || previewCounts.featured > 0) && !isImporting && !validatingDb ? "pointer" : "not-allowed",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "7px",
                                  boxShadow: previewCounts.ready > 0 || previewCounts.featured > 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                }}
                              >
                                {isImporting ? (
                                  <>
                                    <Spinner size={15} color="#fff" />
                                    <span>Importing Novels to Catalog...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload size={15} />
                                    <span>
                                      {previewCounts.ready > 0
                                        ? `Import ${previewCounts.ready} Valid Novel${previewCounts.ready === 1 ? "" : "s"}${previewCounts.featured > 0 ? ` (${previewCounts.featured} Featured)` : ""} to Database`
                                        : `Add ${previewCounts.featured} Starred Novel${previewCounts.featured === 1 ? "" : "s"} to Featured Novels`}
                                    </span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleResetUpload}
                                disabled={isImporting}
                                className="admin-btn-secondary"
                                style={{
                                  padding: "10px 16px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper)",
                                  color: "var(--sn-text-main)",
                                  fontSize: "0.86rem",
                                  fontWeight: 600,
                                  cursor: isImporting ? "not-allowed" : "pointer",
                                }}
                              >
                                Clear File
                              </button>
                            </div>

                            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--sn-text-sub)" }}>
                              Only the <strong>{previewCounts.ready}</strong> valid row(s){previewCounts.featured > 0 ? ` and ${previewCounts.featured} starred featured novel(s)` : ""} will be processed. Invalid entries are automatically blocked.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* OPTION B: Legacy Raw Text Paste Mode                       */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {bulkInputMethod === "paste" && (
                    <form onSubmit={handleAddBulkNovels} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {bulkStatus && (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            fontSize: "0.86rem",
                            background: bulkStatus.type === "success" ? "rgba(47,125,90,0.1)" : "var(--sn-alert-red-bg)",
                            color: bulkStatus.type === "success" ? "var(--sn-success)" : "var(--sn-alert-red-text)",
                            border: `1px solid ${bulkStatus.type === "success" ? "rgba(47,125,90,0.3)" : "var(--sn-alert-red-border)"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {bulkStatus.type === "success" ? (
                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                          ) : (
                            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                          )}
                          <span>{bulkStatus.msg}</span>
                        </div>
                      )}

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <label
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: "var(--sn-text-main)",
                            }}
                          >
                            Paste Novels (One per line format: <code style={{ color: "var(--sn-gold)" }}>Title | URL</code> or <code style={{ color: "var(--sn-gold)" }}>Title | URL | featured</code>)
                          </label>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              color: parsedBulkNovels.length > 0 ? "var(--sn-success)" : "var(--sn-text-sub)",
                            }}
                          >
                            {parsedBulkNovels.length} valid novel{parsedBulkNovels.length === 1 ? "" : "s"} detected
                          </span>
                        </div>

                        <textarea
                          rows={6}
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          placeholder={`Jannat Ke Pattay by Nemrah Ahmed | https://drive.google.com/file/d/1abc... | featured
Aab e Hayat by Umera Ahmed | https://drive.google.com/file/d/2xyz...
Mushaf by Nemrah Ahmed | https://archive.org/details/mushaf...`}
                          className="admin-input"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid var(--sn-paper-line)",
                            background: "var(--sn-paper)",
                            color: "var(--sn-text-main)",
                            fontSize: "0.86rem",
                            fontFamily: "monospace",
                            lineHeight: 1.6,
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                          paddingTop: "2px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setBulkPasteFeatured((prev) => !prev)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border: bulkPasteFeatured
                              ? "1px solid var(--sn-gold)"
                              : "1px solid var(--sn-paper-line)",
                            background: bulkPasteFeatured
                              ? "rgba(180, 140, 60, 0.12)"
                              : "var(--sn-paper)",
                            color: bulkPasteFeatured ? "var(--sn-gold)" : "var(--sn-text-main)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Star
                            size={16}
                            fill={bulkPasteFeatured ? "currentColor" : "none"}
                            style={{ color: bulkPasteFeatured ? "var(--sn-gold)" : "var(--sn-text-sub)" }}
                          />
                          <span>
                            {bulkPasteFeatured
                              ? "All Pasted Marked as Featured"
                              : "Mark all pasted novels as Featured"}
                          </span>
                        </button>

                        <button
                          type="submit"
                          disabled={addingBulk || parsedBulkNovels.length === 0}
                          className="admin-btn-primary"
                          style={{
                            background: parsedBulkNovels.length > 0 ? "var(--sn-ink)" : "var(--sn-paper-line)",
                            color: parsedBulkNovels.length > 0 ? "#fff" : "var(--sn-text-sub)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            cursor: addingBulk || parsedBulkNovels.length === 0 ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            boxShadow: parsedBulkNovels.length > 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                          }}
                        >
                          {addingBulk ? (
                            <>
                              <Spinner size={15} color="#fff" />
                              <span>Batch Importing {parsedBulkNovels.length} Novels...</span>
                            </>
                          ) : (
                            <>
                              <Layers size={15} />
                              <span>Batch Add {parsedBulkNovels.length} Novels</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>

            {/* Catalog Search & List Card */}
            <section
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "var(--sn-shadow)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.15rem",
                      color: "var(--sn-ink)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <BookOpen size={18} style={{ color: "var(--sn-gold)" }} />
                    <span>Novel Catalog</span>
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.84rem",
                      color: "var(--sn-text-sub)",
                    }}
                  >
                    Search, inspect, and manage active novel entries.
                  </p>
                </div>

                {/* Search Bar + Controls */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchNovels(catalogSearch);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", width: "100%", maxWidth: "460px" }}
                >
                  <div style={{ position: "relative", flex: "1 1 180px", minWidth: 0 }}>
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search catalog titles..."
                      className="admin-input"
                      style={{
                        padding: "7px 30px 7px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sn-paper-line)",
                        background: "var(--sn-paper)",
                        color: "var(--sn-text-main)",
                        fontSize: "0.86rem",
                        width: "100%",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogSearch("");
                          fetchNovels("");
                        }}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--sn-text-sub)",
                          display: "flex",
                          alignItems: "center",
                          padding: 0,
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={novelsLoading}
                    className="admin-btn-secondary"
                    style={{
                      padding: "7px 13px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-ink)",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Search size={14} />
                    <span>Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchNovels(catalogSearch)}
                    disabled={novelsLoading}
                    className="admin-btn-secondary"
                    style={{
                      padding: "7px 11px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-sub)",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    title="Refresh List"
                  >
                    {novelsLoading ? <Spinner size={14} /> : <RefreshCw size={14} />}
                  </button>
                </form>
              </div>

              {deleteMsg && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "0.86rem",
                    marginBottom: "16px",
                    background: deleteMsg.type === "success" ? "rgba(47,125,90,0.1)" : "var(--sn-alert-red-bg)",
                    color: deleteMsg.type === "success" ? "var(--sn-success)" : "var(--sn-alert-red-text)",
                    border: `1px solid ${deleteMsg.type === "success" ? "rgba(47,125,90,0.3)" : "var(--sn-alert-red-border)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{deleteMsg.msg}</span>
                </div>
              )}

              {novelsError && (
                <div
                  style={{
                    padding: "11px 14px",
                    borderRadius: "8px",
                    background: "var(--sn-alert-red-bg)",
                    color: "var(--sn-alert-red-text)",
                    border: "1px solid var(--sn-alert-red-border)",
                    marginBottom: "16px",
                    fontSize: "0.86rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{novelsError}</span>
                </div>
              )}

              {novelsLoading && novels.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Spinner size={30} color="var(--sn-gold)" />
                  <p style={{ marginTop: "12px", color: "var(--sn-text-sub)", fontSize: "0.88rem" }}>
                    Loading novel catalog...
                  </p>
                </div>
              ) : novels.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 16px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px dashed var(--sn-paper-line)",
                  }}
                >
                  <p style={{ margin: 0, color: "var(--sn-text-sub)", fontSize: "0.9rem" }}>
                    No novels found matching your query.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table (> 768px) */}
                  <div className="admin-desktop-table" style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: "0 6px",
                        fontSize: "0.86rem",
                      }}
                    >
                      <thead>
                        <tr style={{ color: "var(--sn-text-sub)", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          <th style={{ padding: "8px 12px", width: "80px" }}>ID</th>
                          <th style={{ padding: "8px 12px" }}>Novel Title</th>
                          <th style={{ padding: "8px 12px" }}>Download / Read URL</th>
                          <th style={{ padding: "8px 12px", width: "100px", textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Star size={12} style={{ color: "var(--sn-gold)" }} />
                              <span>Featured</span>
                            </span>
                          </th>
                          <th style={{ padding: "8px 12px", width: "160px", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {novels.map((novel) => {
                          const isEditing = editingNovelId === novel.id;
                          return (
                            <tr
                              key={novel.id}
                              className="admin-novel-row"
                              style={{
                                background: isEditing
                                  ? "rgba(180, 140, 60, 0.08)"
                                  : "var(--sn-paper)",
                                border: isEditing
                                  ? "1px solid rgba(180, 140, 60, 0.35)"
                                  : "1px solid transparent",
                                borderRadius: "8px",
                                transition: "background 0.15s ease",
                              }}
                            >
                              {/* ID */}
                              <td
                                style={{
                                  padding: "10px 12px",
                                  borderTopLeftRadius: "8px",
                                  borderBottomLeftRadius: "8px",
                                  fontWeight: 600,
                                  color: "var(--sn-gold)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                #{novel.id}
                              </td>

                              {/* Title */}
                              <td
                                style={{
                                  padding: isEditing ? "6px 10px" : "10px 12px",
                                  fontWeight: 600,
                                  color: "var(--sn-text-main)",
                                  cursor: isEditing ? "default" : "pointer",
                                }}
                                onDoubleClick={() => !isEditing && handleStartEdit(novel)}
                                title={!isEditing ? "Double-click to edit title" : undefined}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveEdit(novel);
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        handleCancelEdit();
                                      }
                                    }}
                                    placeholder="Novel Title"
                                    autoFocus
                                    disabled={savingEditId === novel.id}
                                    style={{
                                      width: "100%",
                                      boxSizing: "border-box",
                                      background: "var(--sn-paper-card, #ffffff)",
                                      border: "1.5px solid var(--sn-gold, #c89d47)",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontSize: "0.86rem",
                                      fontWeight: 600,
                                      color: "var(--sn-text-main)",
                                      outline: "none",
                                      boxShadow: "0 0 0 2px rgba(180, 140, 60, 0.2)",
                                    }}
                                  />
                                ) : (
                                  <Link
                                    href={`/novel/${novel.id}`}
                                    target="_blank"
                                    style={{
                                      color: "var(--sn-ink)",
                                      textDecoration: "none",
                                    }}
                                    className="admin-novel-link"
                                  >
                                    {novel.Titles}
                                  </Link>
                                )}
                              </td>

                              {/* Link */}
                              <td
                                style={{
                                  padding: isEditing ? "6px 10px" : "10px 12px",
                                  cursor: isEditing ? "default" : "pointer",
                                }}
                                onDoubleClick={() => !isEditing && handleStartEdit(novel)}
                                title={!isEditing ? "Double-click to edit link" : undefined}
                              >
                                {isEditing ? (
                                  <input
                                    type="url"
                                    value={editLink}
                                    onChange={(e) => setEditLink(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveEdit(novel);
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        handleCancelEdit();
                                      }
                                    }}
                                    placeholder="https://..."
                                    disabled={savingEditId === novel.id}
                                    style={{
                                      width: "100%",
                                      boxSizing: "border-box",
                                      background: "var(--sn-paper-card, #ffffff)",
                                      border: "1.5px solid var(--sn-gold, #c89d47)",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontSize: "0.82rem",
                                      color: "var(--sn-text-main)",
                                      outline: "none",
                                      boxShadow: "0 0 0 2px rgba(180, 140, 60, 0.2)",
                                    }}
                                  />
                                ) : novel.Links ? (
                                  <a
                                    href={novel.Links}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "var(--sn-text-sub)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      maxWidth: "340px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      fontSize: "0.82rem",
                                    }}
                                    title={novel.Links}
                                  >
                                    <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                                    <span>{novel.Links}</span>
                                  </a>
                                ) : (
                                  <span style={{ color: "var(--sn-text-sub)", fontStyle: "italic", fontSize: "0.82rem" }}>
                                    No link provided
                                  </span>
                                )}
                              </td>

                              {/* Featured Toggle Action */}
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCatalogFeatured(novel)}
                                  disabled={togglingFeaturedId === novel.id || isEditing || savingEditId === novel.id}
                                  style={{
                                    background: novel.featured ? "rgba(180, 140, 60, 0.12)" : "transparent",
                                    border: `1px solid ${novel.featured ? "rgba(180, 140, 60, 0.4)" : "var(--sn-paper-line)"}`,
                                    color: novel.featured ? "var(--sn-gold)" : "var(--sn-text-sub)",
                                    borderRadius: "6px",
                                    padding: "4px 9px",
                                    cursor: togglingFeaturedId === novel.id || isEditing ? "not-allowed" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                    transition: "all 0.15s ease",
                                    opacity: isEditing ? 0.6 : 1,
                                  }}
                                  title={novel.featured ? "Remove from Featured Novels" : "Add to Featured Novels"}
                                >
                                  {togglingFeaturedId === novel.id ? (
                                    <Spinner size={12} color="var(--sn-gold)" />
                                  ) : (
                                    <Star
                                      size={13}
                                      fill={novel.featured ? "currentColor" : "none"}
                                      style={{ color: novel.featured ? "var(--sn-gold)" : "inherit" }}
                                    />
                                  )}
                                  <span>{novel.featured ? "Featured" : "Regular"}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td
                                style={{
                                  padding: "10px 12px",
                                  borderTopRightRadius: "8px",
                                  borderBottomRightRadius: "8px",
                                  textAlign: "right",
                                }}
                              >
                                {isEditing ? (
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(novel)}
                                      disabled={savingEditId === novel.id}
                                      style={{
                                        background: "var(--sn-maroon, #6b1d2f)",
                                        border: "1px solid var(--sn-maroon, #6b1d2f)",
                                        color: "#ffffff",
                                        padding: "4px 9px",
                                        borderRadius: "6px",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        cursor: savingEditId === novel.id ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.15s ease",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                      }}
                                      title="Save changes (Enter)"
                                    >
                                      {savingEditId === novel.id ? (
                                        <Spinner size={12} color="#ffffff" />
                                      ) : (
                                        <Check size={12} />
                                      )}
                                      <span>Save</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      disabled={savingEditId === novel.id}
                                      style={{
                                        background: "var(--sn-paper)",
                                        border: "1px solid var(--sn-paper-line)",
                                        color: "var(--sn-text-sub)",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        cursor: savingEditId === novel.id ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        transition: "all 0.15s ease",
                                      }}
                                      title="Cancel editing (Esc)"
                                    >
                                      <X size={12} />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(novel)}
                                      style={{
                                        background: "var(--sn-paper)",
                                        border: "1px solid var(--sn-paper-line)",
                                        color: "var(--sn-text-main)",
                                        padding: "4px 9px",
                                        borderRadius: "6px",
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.15s ease",
                                      }}
                                      title="Edit novel title & link"
                                    >
                                      <Pencil size={12} style={{ color: "var(--sn-gold)" }} />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNovel(novel.id, novel.Titles)}
                                      disabled={deletingId === novel.id}
                                      style={{
                                        background: "var(--sn-alert-red-bg)",
                                        border: "1px solid var(--sn-alert-red-border)",
                                        color: "var(--sn-danger)",
                                        padding: "4px 9px",
                                        borderRadius: "6px",
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        cursor: deletingId === novel.id ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.15s ease",
                                      }}
                                      title="Delete novel"
                                    >
                                      {deletingId === novel.id ? (
                                        <Spinner size={12} color="var(--sn-danger)" />
                                      ) : (
                                        <Trash2 size={12} />
                                      )}
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Action Cards (<= 768px) */}
                  <div className="admin-mobile-cards">
                    {novels.map((novel) => {
                      const isEditing = editingNovelId === novel.id;
                      return (
                        <div
                          key={`mobile-catalog-card-${novel.id}`}
                          style={{
                            background: isEditing
                              ? "rgba(180, 140, 60, 0.08)"
                              : "var(--sn-paper)",
                            border: isEditing
                              ? "1.5px solid var(--sn-gold)"
                              : "1px solid var(--sn-paper-line)",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          {isEditing ? (
                            /* Mobile Editing Mode */
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--sn-gold)" }}>
                                  Editing #{novel.id}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Novel Title"
                                autoFocus
                                disabled={savingEditId === novel.id}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "var(--sn-paper-card)",
                                  border: "1.5px solid var(--sn-gold)",
                                  borderRadius: "6px",
                                  padding: "8px 10px",
                                  fontSize: "0.86rem",
                                  fontWeight: 600,
                                  color: "var(--sn-text-main)",
                                  outline: "none",
                                }}
                              />
                              <input
                                type="url"
                                value={editLink}
                                onChange={(e) => setEditLink(e.target.value)}
                                placeholder="https://..."
                                disabled={savingEditId === novel.id}
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  background: "var(--sn-paper-card)",
                                  border: "1px solid var(--sn-paper-line)",
                                  borderRadius: "6px",
                                  padding: "8px 10px",
                                  fontSize: "0.82rem",
                                  color: "var(--sn-text-main)",
                                  outline: "none",
                                }}
                              />
                              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(novel)}
                                  disabled={savingEditId === novel.id}
                                  style={{
                                    flex: 1,
                                    minHeight: "40px",
                                    background: "var(--sn-ink)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.84rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                  }}
                                >
                                  {savingEditId === novel.id ? <Spinner size={13} color="#fff" /> : <Check size={14} />}
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  disabled={savingEditId === novel.id}
                                  style={{
                                    flex: 1,
                                    minHeight: "40px",
                                    background: "var(--sn-paper)",
                                    border: "1px solid var(--sn-paper-line)",
                                    color: "var(--sn-text-sub)",
                                    borderRadius: "6px",
                                    fontSize: "0.84rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <X size={14} />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Row 1: #ID badge + full wrapped Titles text + Featured button */}
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "7px", flex: 1, minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      fontWeight: 700,
                                      color: "var(--sn-gold)",
                                      fontSize: "0.8rem",
                                      background: "rgba(201,149,44,0.1)",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{novel.id}
                                  </span>
                                  <Link
                                    href={`/novel/${novel.id}`}
                                    target="_blank"
                                    style={{
                                      color: "var(--sn-ink)",
                                      fontWeight: 600,
                                      fontSize: "0.92rem",
                                      lineHeight: 1.35,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {novel.Titles}
                                  </Link>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCatalogFeatured(novel)}
                                  disabled={togglingFeaturedId === novel.id}
                                  style={{
                                    background: novel.featured ? "rgba(180, 140, 60, 0.12)" : "transparent",
                                    border: `1px solid ${novel.featured ? "rgba(180, 140, 60, 0.4)" : "var(--sn-paper-line)"}`,
                                    color: novel.featured ? "var(--sn-gold)" : "var(--sn-text-sub)",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                  title={novel.featured ? "Featured Novel" : "Regular Novel"}
                                >
                                  {togglingFeaturedId === novel.id ? (
                                    <Spinner size={11} color="var(--sn-gold)" />
                                  ) : (
                                    <Star
                                      size={12}
                                      fill={novel.featured ? "currentColor" : "none"}
                                      style={{ color: novel.featured ? "var(--sn-gold)" : "inherit" }}
                                    />
                                  )}
                                </button>
                              </div>

                              {/* Row 2: Truncated clickable Link (flex: 1) + right-aligned Edit and Delete */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  borderTop: "1px solid var(--sn-paper-line)",
                                  paddingTop: "8px",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {novel.Links ? (
                                    <a
                                      href={novel.Links}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "var(--sn-text-sub)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "0.76rem",
                                        maxWidth: "100%",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={novel.Links}
                                    >
                                      <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {novel.Links.replace(/^https?:\/\//i, "")}
                                      </span>
                                    </a>
                                  ) : (
                                    <span style={{ color: "var(--sn-text-sub)", fontSize: "0.76rem", fontStyle: "italic", opacity: 0.6 }}>
                                      No link
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(novel)}
                                    style={{
                                      background: "var(--sn-paper-card)",
                                      border: "1px solid var(--sn-paper-line)",
                                      color: "var(--sn-text-main)",
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      minHeight: "34px",
                                    }}
                                  >
                                    <Pencil size={12} style={{ color: "var(--sn-gold)" }} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNovel(novel.id, novel.Titles)}
                                    disabled={deletingId === novel.id}
                                    style={{
                                      background: "var(--sn-alert-red-bg)",
                                      border: "1px solid var(--sn-alert-red-border)",
                                      color: "var(--sn-danger)",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      cursor: deletingId === novel.id ? "not-allowed" : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      minHeight: "34px",
                                    }}
                                  >
                                    {deletingId === novel.id ? (
                                      <Spinner size={12} color="var(--sn-danger)" />
                                    ) : (
                                      <Trash2 size={12} />
                                    )}
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: NOVEL REQUESTS MANAGEMENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "requests" && (
          <NovelRequestsManager
            session={session}
            onCountsUpdate={(counts) => {
              if (typeof counts?.pendingCount === "number") {
                setPendingRequestsCount(counts.pendingCount);
              }
            }}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: TRAIN AI BOT (RAG KNOWLEDGE BASE)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "train-bot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Feeder Form Card */}
            <section
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "var(--sn-shadow)",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.15rem",
                    color: "var(--sn-ink)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Bot size={18} style={{ color: "var(--sn-gold)" }} />
                  <span>AI Knowledge Feeder</span>
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--sn-text-sub)" }}>
                  Extract deep plot summaries, character relationships, and themes from review URLs or text pastes to power the novel chatbot.
                </p>
              </div>

              {trainingError && (
                <div
                  style={{
                    background: "var(--sn-alert-red-bg)",
                    border: "1px solid var(--sn-alert-red-border)",
                    color: "var(--sn-alert-red-text)",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    fontSize: "0.86rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{trainingError}</span>
                </div>
              )}

              <form onSubmit={handleExtractAndTrain} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Manual overrides */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--sn-text-main)",
                        marginBottom: "6px",
                      }}
                    >
                      Novel Title (Optional Manual Override)
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Namal (Urdu: نمل)"
                      className="admin-input"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sn-paper-line)",
                        background: "var(--sn-paper)",
                        color: "var(--sn-text-main)",
                        fontSize: "0.9rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--sn-text-main)",
                        marginBottom: "6px",
                      }}
                    >
                      Author Name (Optional Manual Override)
                    </label>
                    <input
                      type="text"
                      value={manualAuthor}
                      onChange={(e) => setManualAuthor(e.target.value)}
                      placeholder="e.g. Nemrah Ahmed"
                      className="admin-input"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sn-paper-line)",
                        background: "var(--sn-paper)",
                        color: "var(--sn-text-main)",
                        fontSize: "0.9rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Review URL */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--sn-text-main)",
                      marginBottom: "6px",
                    }}
                  >
                    Review / Blog URL (Cleaned via Jina Reader)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://urdu-novel-reviews.blogspot.com/2023/10/peer-e-kamil-review.html"
                    className="admin-input"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-main)",
                      fontSize: "0.9rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Raw Text */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--sn-text-main)",
                      }}
                    >
                      Raw Review / Synopsis Text (Pasted from Facebook, Goodreads, or PDF)
                    </label>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: rawText.length > 11500 ? "var(--sn-danger)" : "var(--sn-text-sub)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {rawText.length.toLocaleString()} / 12,000 chars
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    maxLength={12000}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste novel summary, character details, reader review, or plot analysis here..."
                    className="admin-input"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-main)",
                      fontSize: "0.86rem",
                      lineHeight: 1.55,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={trainingLoading}
                    className="admin-btn-primary"
                    style={{
                      background: "var(--sn-ink)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "11px 22px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: trainingLoading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {trainingLoading ? (
                      <>
                        <Spinner size={15} color="#fff" />
                        <span>Extracting Structured Knowledge with Groq...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Extract Knowledge &amp; Train Bot</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Latest Extracted Preview */}
            {latestTrained && (
              <section
                id="latest-preview-card"
                style={{
                  background: "var(--sn-paper-card)",
                  border: "1.5px solid var(--sn-gold)",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 10px rgba(201,149,44,0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={18} style={{ color: "var(--sn-success)" }} />
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--sn-ink)", fontWeight: 700 }}>
                      Successfully Saved to Knowledge Base
                    </h3>
                  </div>
                  <span
                    style={{
                      background: "rgba(47,125,90,0.1)",
                      border: "1px solid var(--sn-success)",
                      color: "var(--sn-success)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                    }}
                  >
                    RAG Live
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <BookOpen size={14} style={{ color: "var(--sn-gold)" }} />
                    <span style={{ fontWeight: 600, color: "var(--sn-ink)" }}>{latestTrained.novel_title}</span>
                    {latestTrained.author && (
                      <span style={{ color: "var(--sn-text-sub)" }}>
                        by {latestTrained.author}
                      </span>
                    )}
                  </div>

                  {latestTrained.genres && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                      <span style={{ color: "var(--sn-text-sub)", fontSize: "0.82rem", fontWeight: 600 }}>Tropes:</span>
                      {latestTrained.genres.split(",").map((g, i) => (
                        <GenreBadge key={i} label={g} />
                      ))}
                    </div>
                  )}

                  {latestTrained.characters && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <User size={13} style={{ color: "var(--sn-gold)" }} />
                      <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>Characters:</strong>
                      <span style={{ color: "var(--sn-text-main)" }}>{latestTrained.characters}</span>
                    </div>
                  )}

                  {latestTrained.ending_vibe && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={13} style={{ color: "var(--sn-gold)" }} />
                      <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>Ending / Tone:</strong>
                      <span style={{ color: "var(--sn-text-main)" }}>{latestTrained.ending_vibe}</span>
                    </div>
                  )}

                  {latestTrained.detailed_summary && (
                    <div
                      style={{
                        background: "var(--sn-paper)",
                        border: "1px solid var(--sn-paper-line)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginTop: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <FileText size={13} style={{ color: "var(--sn-gold)" }} />
                        <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>
                          Roman Urdu Summary:
                        </strong>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-line", fontSize: "0.86rem" }}>
                        {latestTrained.detailed_summary}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Trained Novels Accordion List */}
            <section
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "var(--sn-shadow)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.15rem",
                      color: "var(--sn-ink)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Layers size={18} style={{ color: "var(--sn-gold)" }} />
                    <span>Trained Knowledge Base</span>
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--sn-text-sub)" }}>
                    {knowledgeItems.length} novel knowledge records powering RAG recommendations in the chatbot.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    placeholder="Search trained knowledge..."
                    className="admin-input"
                    style={{
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-main)",
                      fontSize: "0.86rem",
                      width: "220px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => fetchKnowledgeBase()}
                    disabled={knowledgeLoading}
                    className="admin-btn-secondary"
                    style={{
                      padding: "7px 11px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-sub)",
                      cursor: "pointer",
                    }}
                    title="Refresh knowledge base"
                  >
                    {knowledgeLoading ? <Spinner size={14} /> : <RefreshCw size={14} />}
                  </button>
                </div>
              </div>

              {knowledgeError && (
                <div
                  style={{
                    padding: "11px 14px",
                    borderRadius: "8px",
                    background: "var(--sn-alert-red-bg)",
                    color: "var(--sn-alert-red-text)",
                    border: "1px solid var(--sn-alert-red-border)",
                    marginBottom: "16px",
                    fontSize: "0.86rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{knowledgeError}</span>
                </div>
              )}

              {knowledgeLoading && knowledgeItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Spinner size={30} color="var(--sn-gold)" />
                  <p style={{ marginTop: "12px", color: "var(--sn-text-sub)", fontSize: "0.88rem" }}>
                    Loading trained novels...
                  </p>
                </div>
              ) : filteredKnowledge.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px dashed var(--sn-paper-line)",
                  }}
                >
                  <p style={{ margin: 0, color: "var(--sn-text-sub)", fontSize: "0.9rem" }}>
                    No trained knowledge records found.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredKnowledge.map((item) => {
                    const isExpanded = expandedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        {/* Header bar */}
                        <div
                          onClick={() => toggleExpand(item.id)}
                          style={{
                            padding: "11px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ color: "var(--sn-gold)", fontWeight: 600, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                              #{item.id}
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--sn-ink)", fontSize: "0.92rem" }}>
                              {item.novel_title}
                            </span>
                            {item.author && (
                              <span style={{ color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
                                by {item.author}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--sn-text-sub)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={14} />
                                <span>Collapse</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                <span>Details</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: "14px 16px",
                              borderTop: "1px solid var(--sn-paper-line)",
                              background: "var(--sn-paper-card)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              fontSize: "0.86rem",
                            }}
                          >
                            {item.genres && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>Tropes:</strong>
                                {item.genres.split(",").map((g, i) => (
                                  <GenreBadge key={i} label={g} />
                                ))}
                              </div>
                            )}

                            {item.characters && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <User size={13} style={{ color: "var(--sn-gold)" }} />
                                <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>Characters:</strong>
                                <span>{item.characters}</span>
                              </div>
                            )}

                            {item.ending_vibe && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Sparkles size={13} style={{ color: "var(--sn-gold)" }} />
                                <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>Ending / Tone:</strong>
                                <span>{item.ending_vibe}</span>
                              </div>
                            )}

                            {item.detailed_summary && (
                              <div
                                style={{
                                  background: "var(--sn-paper)",
                                  border: "1px solid var(--sn-paper-line)",
                                  borderRadius: "8px",
                                  padding: "10px 12px",
                                  position: "relative",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <FileText size={13} style={{ color: "var(--sn-gold)" }} />
                                    <strong style={{ color: "var(--sn-ink)", fontSize: "0.82rem" }}>
                                      Detailed Summary:
                                    </strong>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copySummary(item.detailed_summary, item.id);
                                    }}
                                    style={{
                                      background: copiedId === item.id ? "var(--sn-success)" : "var(--sn-paper-card)",
                                      color: copiedId === item.id ? "#fff" : "var(--sn-text-main)",
                                      border: "1px solid var(--sn-paper-line)",
                                      borderRadius: "4px",
                                      fontSize: "0.74rem",
                                      padding: "3px 8px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    {copiedId === item.id ? (
                                      <>
                                        <Check size={12} />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p style={{ margin: 0, lineHeight: 1.55, whiteSpace: "pre-line", fontSize: "0.84rem" }}>
                                  {item.detailed_summary}
                                </p>
                              </div>
                            )}

                            {item.source_url && (
                              <div style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)", display: "flex", alignItems: "center", gap: "5px" }}>
                                <ExternalLink size={12} />
                                <span>Source:</span>
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--sn-gold)", textDecoration: "underline" }}
                                >
                                  {item.source_url}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: SITE SETTINGS CONTROL
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section
              style={{
                background: "var(--sn-paper-card)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "14px",
                padding: "32px 36px",
                boxShadow: "var(--sn-shadow)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Top Accent Strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, var(--sn-gold-soft) 0%, var(--sn-gold) 45%, var(--sn-ink) 100%)",
                }}
              />

              {/* Card Header */}
              <div style={{ marginBottom: "26px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background: "rgba(201,149,44,0.08)",
                    border: "1px solid var(--sn-gold-soft)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--sn-gold)",
                    marginBottom: "10px",
                  }}
                >
                  <Settings size={12} />
                  <span>Live Platform Controls</span>
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.35rem",
                    color: "var(--sn-ink)",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Site Settings &amp; Novel Request Form Toggle
                </h2>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "0.88rem",
                    color: "var(--sn-text-sub)",
                    lineHeight: 1.5,
                  }}
                >
                  Dynamically toggle maintenance mode, manage reader request availability, and customize announcements without rebuilding or redeploying code.
                </p>
              </div>

              {/* Schema Cache Warning Notice (subtle, clean, and copyable) */}
              {schemaNotice && (
                <div
                  style={{
                    marginBottom: "22px",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "rgba(201, 149, 44, 0.06)",
                    border: "1px solid var(--sn-gold-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: "1 1 320px" }}>
                    <Zap size={16} style={{ color: "var(--sn-gold)", flexShrink: 0 }} />
                    <div style={{ fontSize: "0.82rem", color: "var(--sn-text-main)", lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 600 }}>Supabase schema reload advised:</span>{" "}
                      <span style={{ color: "var(--sn-text-sub)" }}>If columns were recently added, run in your Supabase SQL Editor:</span>{" "}
                      <code
                        style={{
                          display: "inline-block",
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "var(--sn-ink)",
                          marginLeft: "4px",
                        }}
                      >
                        {schemaNotice.command || "NOTIFY pgrst, 'reload schema';"}
                      </code>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => copySchemaCommand(schemaNotice.command || "NOTIFY pgrst, 'reload schema';")}
                      style={{
                        background: "var(--sn-paper-card)",
                        border: "1px solid var(--sn-gold)",
                        color: "var(--sn-ink)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {schemaCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{schemaCopied ? "Copied" : "Copy SQL"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchemaNotice(null)}
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--sn-text-sub)",
                        cursor: "pointer",
                        padding: "4px 6px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                {/* Status Box & Toggle */}
                <div
                  style={{
                    background: "var(--sn-paper)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.02rem",
                            fontWeight: 700,
                            color: "var(--sn-text-main)",
                          }}
                        >
                          Novel Request Form
                        </h3>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            color: "var(--sn-gold)",
                            background: "rgba(201, 149, 44, 0.08)",
                            border: "1px solid var(--sn-paper-line)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          /request-novel
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "0.84rem",
                          color: "var(--sn-text-sub)",
                          lineHeight: 1.5,
                        }}
                      >
                        Direct readers to your WhatsApp Channel when requests are temporarily closed.
                      </p>

                      {/* Status indicator badge */}
                      <div>
                        {requestFormMaintenance ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(179, 56, 44, 0.08)",
                              border: "1px solid rgba(179, 56, 44, 0.25)",
                              color: "var(--sn-danger)",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "var(--sn-danger)",
                              }}
                            />
                            <span>Maintenance Mode (Form Closed)</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(47, 125, 90, 0.08)",
                              border: "1px solid rgba(47, 125, 90, 0.25)",
                              color: "var(--sn-success)",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "var(--sn-success)",
                              }}
                            />
                            <span>Form Active (Open for Readers)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setRequestFormMaintenance((prev) => !prev)}
                      style={{
                        background: requestFormMaintenance ? "rgba(47, 125, 90, 0.08)" : "rgba(179, 56, 44, 0.08)",
                        border: `1px solid ${requestFormMaintenance ? "var(--sn-success)" : "var(--sn-danger)"}`,
                        color: requestFormMaintenance ? "var(--sn-success)" : "var(--sn-danger)",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Power size={14} />
                      <span>{requestFormMaintenance ? "Re-open Form for Readers" : "Put Form in Maintenance Mode"}</span>
                    </button>
                  </div>
                </div>

                {/* AI Chatbot Assistant Control */}
                <div
                  style={{
                    background: "var(--sn-paper)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <Bot size={18} style={{ color: "var(--sn-gold)" }} />
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.02rem",
                            fontWeight: 700,
                            color: "var(--sn-text-main)",
                          }}
                        >
                          AI Chatbot Assistant
                        </h3>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--sn-gold)",
                            background: "rgba(201, 149, 44, 0.08)",
                            border: "1px solid var(--sn-paper-line)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          Public Widget
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "0.84rem",
                          color: "var(--sn-text-sub)",
                          lineHeight: 1.5,
                        }}
                      >
                        Controls the floating &quot;Ask AI Assistant&quot; widget visible to readers across the public website.
                      </p>

                      {/* Status indicator pill with glowing dot */}
                      <div>
                        {chatbotEnabled ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(47, 125, 90, 0.08)",
                              border: "1px solid rgba(47, 125, 90, 0.25)",
                              color: "var(--sn-success)",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "var(--sn-success)",
                                boxShadow: "0 0 0 2px rgba(47, 125, 90, 0.25)",
                              }}
                            />
                            <span>Visible on Website (Active)</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(179, 56, 44, 0.08)",
                              border: "1px solid rgba(179, 56, 44, 0.25)",
                              color: "var(--sn-danger)",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "var(--sn-danger)",
                                boxShadow: "0 0 0 2px rgba(179, 56, 44, 0.25)",
                              }}
                            />
                            <span>Hidden from Visitors (Disabled)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1-Click Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setChatbotEnabled((prev) => !prev)}
                      style={{
                        background: chatbotEnabled ? "rgba(179, 56, 44, 0.08)" : "rgba(47, 125, 90, 0.08)",
                        border: `1px solid ${chatbotEnabled ? "var(--sn-danger)" : "var(--sn-success)"}`,
                        color: chatbotEnabled ? "var(--sn-danger)" : "var(--sn-success)",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Power size={14} />
                      <span>{chatbotEnabled ? "Disable / Hide Chatbot" : "Enable / Show Chatbot"}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Maintenance Message */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <label
                      htmlFor="maintenance-message"
                      style={{
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        color: "var(--sn-text-main)",
                      }}
                    >
                      Custom Maintenance Message
                    </label>
                    <span
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--sn-text-sub)",
                      }}
                    >
                      Shown on <code>/request-novel</code> when form is closed
                    </span>
                  </div>

                  <textarea
                    id="maintenance-message"
                    rows={4}
                    value={customMaintenanceMessage}
                    onChange={(e) => setCustomMaintenanceMessage(e.target.value)}
                    placeholder="ناول ریکوئسٹ فارم فی الحال بند ہے، جسے جلد ہی دوبارہ کھول دیا جائے گا۔ اس بارے میں آپ کو ہمارے واٹس ایپ چینل پر بتا دیا جائے گا۔"
                    className="admin-input"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--sn-paper-line)",
                      background: "var(--sn-paper)",
                      color: "var(--sn-text-main)",
                      fontSize: "0.9rem",
                      lineHeight: 1.7,
                      boxSizing: "border-box",
                      outline: "none",
                      direction: "rtl",
                      textAlign: "right",
                    }}
                  />
                  <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "var(--sn-text-sub)", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Sparkles size={12} style={{ color: "var(--sn-gold)" }} />
                    <span><strong style={{ fontWeight: 600 }}>Tip:</strong> Leave empty to automatically use the standard default Urdu notice.</span>
                  </div>
                </div>

                {/* Save Button & Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "6px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--sn-paper-line)",
                  }}
                >
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="admin-btn-primary"
                    style={{
                      background: "var(--sn-ink)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 22px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: settingsSaving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {settingsSaving ? (
                      <>
                        <Spinner size={15} color="#fff" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>

                  <Link
                    href="/request-novel"
                    target="_blank"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--sn-gold)",
                      fontSize: "0.84rem",
                      fontWeight: 500,
                      textDecoration: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(201, 149, 44, 0.08)",
                      border: "1px solid rgba(201, 149, 44, 0.2)",
                    }}
                  >
                    <Eye size={14} />
                    <span>Preview Live Form</span>
                    <ExternalLink size={12} />
                  </Link>

                  {saveError && (
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--sn-danger)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>{saveError}</span>
                    </span>
                  )}

                  {settingsUpdatedAt && (
                    <span style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)", marginLeft: "auto" }}>
                      Last updated: {new Date(settingsUpdatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: VISUAL ANALYTICS DASHBOARD
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard
            session={session}
            onSwitchToSingleEntry={(prefillTitle) => {
              setCatalogMode("single");
              setSingleTitle(prefillTitle || "");
              switchTab("catalog");
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          />
        )}
      </main>

      <style>{`
        @keyframes admin-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .admin-input:focus {
          border-color: var(--sn-gold) !important;
          box-shadow: 0 0 0 3px rgba(201,149,44,0.12) !important;
          outline: none;
        }
        .admin-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(61,15,28,0.2) !important;
        }
        .admin-btn-secondary:hover:not(:disabled) {
          border-color: var(--sn-gold) !important;
          color: var(--sn-ink) !important;
        }
        .admin-signout-btn:hover {
          background: var(--sn-alert-red-bg) !important;
          border-color: var(--sn-alert-red-border) !important;
          color: var(--sn-danger) !important;
        }
        .admin-nav-tab {
          flex-shrink: 0 !important;
          white-space: nowrap !important;
        }
        .admin-nav-tab:hover:not(.active) {
          color: var(--sn-ink) !important;
        }
        .admin-novel-row:hover {
          background: rgba(201,149,44,0.06) !important;
        }
        .admin-novel-link:hover {
          text-decoration: underline !important;
          color: var(--sn-gold) !important;
        }
      `}</style>
    </>
  );
}
