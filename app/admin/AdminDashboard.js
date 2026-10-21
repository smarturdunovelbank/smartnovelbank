"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "../components/ThemeToggle";
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
} from "react-icons/lu";

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
    if (queryTab && ["catalog", "train-bot", "settings"].includes(queryTab)) {
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
  const [addingSingle, setAddingSingle] = useState(false);
  const [singleStatus, setSingleStatus] = useState(null); // { type: 'success'|'error', msg: '' }

  const [bulkText, setBulkText] = useState("");
  const [addingBulk, setAddingBulk] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null);

  const [novels, setNovels] = useState([]);
  const [novelsLoading, setNovelsLoading] = useState(false);
  const [novelsError, setNovelsError] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTotal, setCatalogTotal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState(null);

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

  // Trigger data fetching when session becomes available
  useEffect(() => {
    if (session?.access_token) {
      fetchNovels("", session.access_token);
      fetchKnowledgeBase(session.access_token);
      fetchSettings();
    }
  }, [session?.access_token, fetchNovels, fetchKnowledgeBase, fetchSettings]);

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

  // Parse bulk text into array of { title, link }
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
        valid.push({ title: parts[0], link: parts[1] });
      }
    }
    return valid;
  }, [bulkText]);

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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add novel.");
      }

      setSingleStatus({
        type: "success",
        msg: `Novel "${singleTitle.trim()}" added successfully to catalog.`,
      });
      setSingleTitle("");
      setSingleLink("");

      // Refresh catalog
      fetchNovels(catalogSearch, token);
    } catch (err) {
      setSingleStatus({ type: "error", msg: err.message || "Failed to add novel." });
    } finally {
      setAddingSingle(false);
    }
  };

  // Add Bulk Novels
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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Bulk insert failed.");
      }

      setBulkStatus({
        type: "success",
        msg: `Successfully added ${json.count || parsedBulkNovels.length} novels to the catalog.`,
      });
      setBulkText("");

      // Refresh catalog
      fetchNovels(catalogSearch, token);
    } catch (err) {
      setBulkStatus({ type: "error", msg: err.message || "Failed to bulk add novels." });
    } finally {
      setAddingBulk(false);
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
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 48px", width: "100%" }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid var(--sn-paper-line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
              }}
            >
              <ShieldCheck size={18} style={{ color: "var(--sn-gold)" }} />
              <span>Admin Control Center</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
              }}
              title={session?.user?.email}
            >
              <User size={13} style={{ color: "var(--sn-gold)" }} />
              <span style={{ maxWidth: "190px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            borderBottom: "1px solid var(--sn-paper-line)",
            overflowX: "auto",
            scrollbarWidth: "none",
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

          {/* Tab 2: AI Knowledge Base */}
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

                  <div>
                    <button
                      type="submit"
                      disabled={addingSingle}
                      className="admin-btn-primary"
                      style={{
                        background: "var(--sn-ink)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 20px",
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

              {/* Mode 2: Bulk Add */}
              {catalogMode === "bulk" && (
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
                        Paste Novels (One per line format: <code style={{ color: "var(--sn-gold)" }}>Novel Title | https://url...</code>)
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
                      placeholder={`Jannat Ke Pattay by Nemrah Ahmed | https://drive.google.com/file/d/1abc...
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

                  <div>
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
                  style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
                >
                  <div style={{ position: "relative" }}>
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
                        width: "220px",
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
                <div style={{ overflowX: "auto" }}>
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
                        <th style={{ padding: "8px 12px", width: "110px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {novels.map((novel) => (
                        <tr
                          key={novel.id}
                          className="admin-novel-row"
                          style={{
                            background: "var(--sn-paper)",
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
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--sn-text-main)" }}>
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
                          </td>

                          {/* Link */}
                          <td style={{ padding: "10px 12px" }}>
                            {novel.Links ? (
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
                              <span style={{ color: "var(--sn-text-sub)", fontStyle: "italic", fontSize: "0.82rem" }}>No link provided</span>
                            )}
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
                            <button
                              onClick={() => handleDeleteNovel(novel.id, novel.Titles)}
                              disabled={deletingId === novel.id}
                              style={{
                                background: "var(--sn-alert-red-bg)",
                                border: "1px solid var(--sn-alert-red-border)",
                                color: "var(--sn-danger)",
                                padding: "4px 10px",
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
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
