"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  LuSearch as Search,
  LuRefreshCw as RefreshCw,
  LuTrendingUp as TrendingUp,
  LuUsers as Users,
  LuTarget as Target,
  LuDices as Dice,
  LuPlus as Plus,
  LuDownload as Download,
  LuSmartphone as Smartphone,
  LuMonitor as Monitor,
  LuClock as Clock,
  LuCircleAlert as AlertCircle,
  LuCircleCheck as CheckCircle,
  LuCircleX as XCircle,
  LuCalendar as Calendar,
  LuActivity as Activity,
  LuChartColumn as BarChart3,
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuSlidersHorizontal as FilterIcon,
} from "react-icons/lu";

// ── Reusable spinner ─────────────────────────────────────────────────────────
function MiniSpinner({ size = 16 }) {
  return (
    <svg
      style={{ animation: "admin-spin 0.85s linear infinite", width: size, height: size, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ── Date Formatting Helpers for Recharts Charts ──────────────────────────────
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Parses date strings in formats: "YYYY-MM-DD", "YYYY-MM", "YYYY/MM/DD", "MM-DD", "MM/DD", or "DD-MM-YYYY".
 * Uses manual string regex parsing to prevent any UTC vs local timezone shifts.
 */
function parseDateParts(dateVal) {
  if (!dateVal) return null;
  const str = String(dateVal).trim();

  // 1. "YYYY-MM-DD" or "YYYY/MM/DD" (also handles ISO strings starting with YYYY-MM-DD)
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day, monthName: MONTH_NAMES_SHORT[month - 1] };
    }
  }

  // 2. "YYYY-MM" (Month grouping key)
  const ymMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ymMatch) {
    const year = parseInt(ymMatch[1], 10);
    const month = parseInt(ymMatch[2], 10);
    if (month >= 1 && month <= 12) {
      return { year, month, day: null, monthName: MONTH_NAMES_SHORT[month - 1] };
    }
  }

  // 3. "MM-DD" or "MM/DD"
  const mdMatch = str.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year: new Date().getFullYear(),
        month,
        day,
        monthName: MONTH_NAMES_SHORT[month - 1],
      };
    }
  }

  // 4. "DD-MM-YYYY" or "DD/MM/YYYY"
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day, monthName: MONTH_NAMES_SHORT[month - 1] };
    }
  }

  return null;
}

/**
 * Helper to get ISO week (Monday-Sunday) range and formatted labels for a date string.
 */
function getWeekRange(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts || !parts.day) return null;
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayOfWeek = d.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startParts = {
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth() + 1,
    day: monday.getUTCDate(),
    monthName: MONTH_NAMES_SHORT[monday.getUTCMonth()],
  };
  const endParts = {
    year: sunday.getUTCFullYear(),
    month: sunday.getUTCMonth() + 1,
    day: sunday.getUTCDate(),
    monthName: MONTH_NAMES_SHORT[sunday.getUTCMonth()],
  };

  const weekKey = `${startParts.year}-${String(startParts.month).padStart(2, "0")}-${String(startParts.day).padStart(2, "0")}`;
  const tickLabel = `${startParts.day} ${startParts.monthName}`;
  const tooltipLabel =
    startParts.year === endParts.year
      ? `Week of ${startParts.day} ${startParts.monthName} – ${endParts.day} ${endParts.monthName} ${endParts.year}`
      : `Week of ${startParts.day} ${startParts.monthName} ${startParts.year} – ${endParts.day} ${endParts.monthName} ${endParts.year}`;

  return { weekKey, tickLabel, tooltipLabel, startParts, endParts };
}

/**
 * Helper to get Month range key and formatted labels for a date string.
 */
function getMonthRange(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;
  const monthKey = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
  const tickLabel = `${parts.monthName} ${parts.year}`;
  const tooltipLabel = `${parts.monthName} ${parts.year}`;
  return { monthKey, tickLabel, tooltipLabel, parts };
}

/**
 * Converts "YYYY-MM-DD", "YYYY-MM", or "MM-DD" into readable short date label like "11 Oct" or "Oct 2026".
 */
function formatDateTick(val) {
  const parts = parseDateParts(val);
  if (!parts) return val;
  if (!parts.day) {
    return `${parts.monthName} ${parts.year}`;
  }
  return `${parts.day} ${parts.monthName}`;
}

/**
 * Formats hovered chart date clearly into full readable date, e.g. "12 Oct 2026".
 */
function formatTooltipDate(val, payload) {
  if (payload?.[0]?.payload?.tooltipLabel) {
    return payload[0].payload.tooltipLabel;
  }
  const rawDate = payload?.[0]?.payload?.fullDate || payload?.[0]?.payload?.date || val;
  const parts = parseDateParts(rawDate);
  if (parts) {
    if (!parts.day) {
      return `${parts.monthName} ${parts.year}`;
    }
    return `${parts.day} ${parts.monthName} ${parts.year}`;
  }
  return val;
}

// ── Recharts Custom Tooltip ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const displayLabel = payload[0]?.payload?.tooltipLabel
    || (labelFormatter ? labelFormatter(label, payload) : formatTooltipDate(label, payload));

  return (
    <div
      style={{
        background: "var(--sn-paper-card)",
        border: "1px solid var(--sn-paper-line)",
        borderRadius: "8px",
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        fontSize: "0.8rem",
      }}
    >
      <div style={{ margin: "0 0 4px 0", fontWeight: 600, color: "var(--sn-ink)" }}>{displayLabel}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "2px 0" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: entry.color || entry.fill }} />
          <span style={{ color: "var(--sn-text-sub)", fontSize: "0.75rem" }}>{entry.name}:</span>
          <strong style={{ color: "var(--sn-ink)", fontSize: "0.78rem", fontVariantNumeric: "tabular-nums" }}>
            {entry.value?.toLocaleString()}
          </strong>
        </div>
      ))}
    </div>
  );
}

// ── KPI Scorecard (Clean, minimal, no heavy top borders) ─────────────────────
function KpiCard({ icon: Icon, iconColor, label, value, subValue }) {
  return (
    <div
      className="admin-kpi-card"
      style={{
        background: "var(--sn-paper-card)",
        border: "1px solid var(--sn-paper-line)",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, width: "100%" }}>
        <div
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: "8px",
            background: "var(--sn-paper)",
            border: "1px solid var(--sn-paper-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor || "var(--sn-gold)",
            flexShrink: 0,
          }}
        >
          <Icon size={15} strokeWidth={1.75} />
        </div>
        <span
          className="admin-kpi-card-label"
          style={{
            fontSize: "0.8rem",
            color: "var(--sn-text-sub)",
            fontWeight: 500,
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {label}
        </span>
      </div>

      <div
        className="admin-kpi-card-value"
        style={{
          fontWeight: 700,
          color: "var(--sn-ink)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          minWidth: 0,
        }}
      >
        {value}
      </div>

      {subValue && (
        <div
          className="admin-kpi-card-sub"
          style={{
            fontSize: "0.75rem",
            color: "var(--sn-text-sub)",
            lineHeight: 1.35,
            minWidth: 0,
            overflowWrap: "break-word",
          }}
          title={typeof subValue === "string" ? subValue : undefined}
        >
          {subValue}
        </div>
      )}
    </div>
  );
}

// ── Section Container (Subtle 1px border, no heavy top strip) ────────────────
function SectionCard({ title, icon: Icon, action, children, style: extraStyle, className: extraClass }) {
  return (
    <section
      className={`admin-section-card ${extraClass || ""}`.trim()}
      style={{
        background: "var(--sn-paper-card)",
        border: "1px solid var(--sn-paper-line)",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        ...extraStyle,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "8px",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 auto" }}>
            {Icon && <Icon size={16} strokeWidth={1.75} style={{ color: "var(--sn-gold)", flexShrink: 0 }} />}
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--sn-ink)", overflowWrap: "break-word" }}>{title}</h3>
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Cohesive Editorial Color Palette ─────────────────────────────────────────
const PALETTE = {
  gold: "#c59b27",
  emerald: "#2d6a4f",
  maroon: "#6b1d2f",
  ink: "#2c1810",
  slate: "#64748b",
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN ANALYTICS DASHBOARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard({ session, onSwitchToSingleEntry }) {
  // ── States ─────────────────────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [device, setDevice] = useState("");
  const [activePreset, setActivePreset] = useState("all");

  // Chart Granularity: 'auto' | 'day' | 'week' | 'month'
  const [granularityMode, setGranularityMode] = useState("auto");

  // Sub-Navigation Segment: 'overview' | 'traffic' | 'surprise' | 'stream'
  const [activeSegment, setActiveSegment] = useState("overview");

  // Overview table pagination/limit state
  const [missingLimit, setMissingLimit] = useState(8);
  const [successfulLimit, setSuccessfulLimit] = useState(8);

  // Live Activity Stream controls
  const [streamSearch, setStreamSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all"); // 'all' | 'found' | 'notFound'
  const [streamPage, setStreamPage] = useState(1);
  const STREAM_PER_PAGE = 20;

  // ── Date Presets ───────────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    setActivePreset(preset);
    setGranularityMode("auto"); // Auto-select granularity when preset changes
    const now = new Date();
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // ── Fetch Analytics ────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(
    async (forceRefresh = false) => {
      const token = session?.access_token;
      if (!token) return;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (forceRefresh) params.set("refresh", "true");
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (device) params.set("device", device);
        params.set("topN", "50");

        const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}: Failed to load analytics`);
        }
        setAnalyticsData(json);
      } catch (err) {
        console.error("fetchAnalytics error:", err);
        setError(err.message || "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token, startDate, endDate, device]
  );

  // Initial fetch
  useEffect(() => {
    if (session?.access_token) {
      fetchAnalytics(false);
    }
  }, [session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived Data ───────────────────────────────────────────────────────────
  const searchOverview = analyticsData?.searchAnalytics?.overview;
  const searchTrends = analyticsData?.searchAnalytics?.trends;
  const queryInsights = analyticsData?.searchAnalytics?.queryInsights;
  const surprise = analyticsData?.surpriseAnalytics;

  // Daily Trends for Area Chart
  const dailyTrendData = useMemo(() => {
    if (!searchTrends?.daily) return [];
    return searchTrends.daily.map((d) => ({
      date: d.date, // "YYYY-MM-DD" e.g., "2026-10-12"
      fullDate: d.date,
      total: d.total,
      success: d.success ?? d.found,
      noResults: d.noResults ?? d.notFound,
    }));
  }, [searchTrends?.daily]);

  // Total span of days in current dataset
  const totalDays = useMemo(() => {
    if (!dailyTrendData.length) return 0;
    const dFirst = parseDateParts(dailyTrendData[0].date);
    const dLast = parseDateParts(dailyTrendData[dailyTrendData.length - 1].date);
    if (dFirst && dLast && dFirst.day && dLast.day) {
      const t1 = Date.UTC(dFirst.year, dFirst.month - 1, dFirst.day);
      const t2 = Date.UTC(dLast.year, dLast.month - 1, dLast.day);
      const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(dailyTrendData.length, diffDays);
    }
    return dailyTrendData.length;
  }, [dailyTrendData]);

  // Smart Auto-Granularity based on span:
  // <= 45 days: Day | 46 to 180 days: Week | > 180 days: Month
  const autoGranularity = useMemo(() => {
    if (totalDays <= 45) return "day";
    if (totalDays <= 180) return "week";
    return "month";
  }, [totalDays]);

  const activeGranularity = granularityMode === "auto" ? autoGranularity : granularityMode;

  // Aggregated data series according to activeGranularity (Day | Week | Month)
  const chartTrendData = useMemo(() => {
    if (!dailyTrendData || dailyTrendData.length === 0) return [];

    if (activeGranularity === "day") {
      return dailyTrendData.map((d) => {
        const parts = parseDateParts(d.date);
        return {
          date: d.date,
          fullDate: d.fullDate || d.date,
          tickLabel: parts?.day ? `${parts.day} ${parts.monthName}` : d.date,
          tooltipLabel: parts?.day ? `${parts.day} ${parts.monthName} ${parts.year}` : d.date,
          total: d.total,
          success: d.success,
          noResults: d.noResults,
        };
      });
    }

    if (activeGranularity === "week") {
      const weekMap = new Map();
      for (const d of dailyTrendData) {
        const w = getWeekRange(d.date);
        if (!w) continue;
        if (!weekMap.has(w.weekKey)) {
          weekMap.set(w.weekKey, {
            date: w.weekKey,
            fullDate: w.weekKey,
            tickLabel: w.tickLabel,
            tooltipLabel: w.tooltipLabel,
            total: 0,
            success: 0,
            noResults: 0,
          });
        }
        const item = weekMap.get(w.weekKey);
        item.total += d.total || 0;
        item.success += d.success || 0;
        item.noResults += d.noResults || 0;
      }
      return Array.from(weekMap.values());
    }

    if (activeGranularity === "month") {
      const monthMap = new Map();
      for (const d of dailyTrendData) {
        const m = getMonthRange(d.date);
        if (!m) continue;
        if (!monthMap.has(m.monthKey)) {
          monthMap.set(m.monthKey, {
            date: m.monthKey,
            fullDate: m.monthKey,
            tickLabel: m.tickLabel,
            tooltipLabel: m.tooltipLabel,
            total: 0,
            success: 0,
            noResults: 0,
          });
        }
        const item = monthMap.get(m.monthKey);
        item.total += d.total || 0;
        item.success += d.success || 0;
        item.noResults += d.noResults || 0;
      }
      return Array.from(monthMap.values());
    }

    return dailyTrendData;
  }, [dailyTrendData, activeGranularity]);

  // Hourly Distribution for Bar Chart
  const hourlyData = useMemo(() => {
    if (!searchTrends?.hourlyDistribution) return [];
    return searchTrends.hourlyDistribution.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      searches: count,
    }));
  }, [searchTrends?.hourlyDistribution]);

  // Surprise Funnel Data (Warm editorial palette: Gold, Maroon, Emerald)
  const funnelData = useMemo(() => {
    if (!surprise?.funnel) return [];
    return [
      { name: "Clicks", value: surprise.funnel.clicks, fill: PALETTE.gold },
      { name: "Rerolls", value: surprise.funnel.rerolls, fill: PALETTE.maroon },
      { name: "Downloads", value: surprise.funnel.downloads, fill: PALETTE.emerald },
    ];
  }, [surprise?.funnel]);

  // Actionable query tables
  const topMissingQueries = useMemo(() => {
    return queryInsights?.topMissingQueries || [];
  }, [queryInsights?.topMissingQueries]);

  const topSuccessfulQueries = useMemo(() => {
    return queryInsights?.topSuccessfulQueries || queryInsights?.topQueries?.filter((q) => q.found > 0) || [];
  }, [queryInsights?.topSuccessfulQueries, queryInsights?.topQueries]);

  const topSurpriseDownloads = useMemo(() => {
    return surprise?.topDownloadedSurpriseNovels || surprise?.topDownloads || [];
  }, [surprise?.topDownloadedSurpriseNovels, surprise?.topDownloads]);

  const topSurpriseRerolls = useMemo(() => {
    return surprise?.topRerolls || [];
  }, [surprise?.topRerolls]);

  // Live Activity Stream filtering & pagination
  const allRecentSearches = useMemo(() => {
    return queryInsights?.recentSearches || [];
  }, [queryInsights?.recentSearches]);

  const filteredRecentSearches = useMemo(() => {
    return allRecentSearches.filter((item) => {
      if (streamSearch) {
        const s = streamSearch.toLowerCase();
        const matchesQuery = item.query?.toLowerCase().includes(s);
        const matchesUser = item.userId?.toLowerCase().includes(s);
        if (!matchesQuery && !matchesUser) return false;
      }
      if (streamFilter === "found" && item.resultFound !== "Yes") return false;
      if (streamFilter === "notFound" && item.resultFound === "Yes") return false;
      return true;
    });
  }, [allRecentSearches, streamSearch, streamFilter]);

  const totalStreamPages = Math.ceil(filteredRecentSearches.length / STREAM_PER_PAGE) || 1;
  const paginatedRecentSearches = useMemo(() => {
    const start = (streamPage - 1) * STREAM_PER_PAGE;
    return filteredRecentSearches.slice(start, start + STREAM_PER_PAGE);
  }, [filteredRecentSearches, streamPage]);

  // Handle "Add to Catalog"
  const handleAddToCatalog = (queryText) => {
    if (onSwitchToSingleEntry) {
      onSwitchToSingleEntry(queryText);
    }
  };

  // ── Common Shared Styles ───────────────────────────────────────────────────
  const compactInputStyle = {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid var(--sn-paper-line)",
    background: "var(--sn-paper)",
    color: "var(--sn-text-main)",
    fontSize: "0.8rem",
    outline: "none",
  };

  const tableHeaderStyle = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--sn-text-sub)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--sn-paper-line)",
    background: "var(--sn-paper)",
    whiteSpace: "nowrap",
  };

  const tableCellStyle = {
    padding: "12px 14px",
    fontSize: "0.83rem",
    color: "var(--sn-text-main)",
    borderBottom: "1px solid var(--sn-paper-line)",
    verticalAlign: "middle",
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: Error State
  // ══════════════════════════════════════════════════════════════════════════════
  if (error && !analyticsData) {
    const isCredentialsError =
      error.toLowerCase().includes("google sheets") ||
      error.toLowerCase().includes("missing google sheets") ||
      error.toLowerCase().includes("credentials");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <SectionCard title="Analytics Engine Status" icon={AlertCircle}>
          <div
            style={{
              background: "var(--sn-alert-red-bg)",
              border: "1px solid var(--sn-alert-red-border)",
              borderRadius: "10px",
              padding: "20px",
              color: "var(--sn-alert-red-text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <AlertCircle size={18} strokeWidth={2} style={{ color: "var(--sn-danger)" }} />
              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600 }}>
                Unable to Load Google Sheets Analytics
              </h4>
            </div>

            <p style={{ margin: "0 0 14px 0", fontSize: "0.85rem", lineHeight: 1.45 }}>{error}</p>

            {isCredentialsError && (
              <div
                style={{
                  background: "var(--sn-paper)",
                  border: "1px solid var(--sn-paper-line)",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  color: "var(--sn-text-main)",
                }}
              >
                <div style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "0.84rem", color: "var(--sn-ink)" }}>
                  Configuration Required
                </div>
                <div style={{ margin: "0 0 8px 0", fontSize: "0.78rem", color: "var(--sn-text-sub)" }}>
                  Add the following environment variables to your <code>.env.local</code> file and restart Next.js:
                </div>
                <pre
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontFamily: "monospace",
                    margin: 0,
                    overflowX: "auto",
                  }}
                >
                  GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here{"\n"}
                  GOOGLE_SHEETS_API_KEY=your_google_api_key_here
                </pre>
              </div>
            )}

            <button
              onClick={() => fetchAnalytics(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "var(--sn-ink)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={13} strokeWidth={1.75} /> Retry
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: Main Executive SaaS Layout
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="analytics-dashboard-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* ── Recharts Focus Outline Reset ────────────────────────────────────── */}
      <style>{`
        .recharts-wrapper,
        .recharts-surface,
        .recharts-wrapper *:focus,
        .recharts-wrapper:focus,
        .recharts-surface:focus {
          outline: none !important;
        }
      `}</style>

      {/* ── 1. COMPACT SINGLE-ROW FILTER TOOLBAR ─────────────────────────────── */}
      <div
        className="admin-analytics-toolbar"
        style={{
          background: "var(--sn-paper-card)",
          border: "1px solid var(--sn-paper-line)",
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        {/* Left Side: Presets, Date inputs, Device dropdown, Apply */}
        <div className="admin-analytics-toolbar-filters" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {/* Segmented Preset Pills (Row 1 on mobile) */}
          <div className="admin-analytics-row-1" style={{ display: "inline-flex" }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--sn-paper)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "7px",
                padding: "2px",
                gap: "2px",
                width: "100%",
              }}
            >
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "7days", label: "7D" },
                { id: "30days", label: "30D" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  style={{
                    padding: "4px 9px",
                    borderRadius: "5px",
                    border: "none",
                    background: activePreset === p.id ? "var(--sn-paper-card)" : "transparent",
                    color: activePreset === p.id ? "var(--sn-ink)" : "var(--sn-text-sub)",
                    fontSize: "0.76rem",
                    fontWeight: activePreset === p.id ? 600 : 500,
                    cursor: "pointer",
                    boxShadow: activePreset === p.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.12s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Date Range Pickers (Row 2 on mobile) */}
          <div className="admin-analytics-row-2" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Calendar size={13} strokeWidth={1.75} className="admin-date-icon" style={{ color: "var(--sn-text-sub)", flexShrink: 0 }} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              style={compactInputStyle}
              className="admin-input"
              title="Start date"
            />
            <span className="admin-date-sep" style={{ color: "var(--sn-text-sub)", fontSize: "0.78rem" }}>–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              style={compactInputStyle}
              className="admin-input"
              title="End date"
            />
          </div>

          {/* Device dropdown + Apply + Refresh (Row 3 on mobile) */}
          <div className="admin-analytics-row-3" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              style={{ ...compactInputStyle, cursor: "pointer", minWidth: "105px" }}
              className="admin-input"
            >
              <option value="">All Devices</option>
              <option value="Mobile">Mobile</option>
              <option value="Desktop">Desktop</option>
            </select>

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => fetchAnalytics(false)}
              disabled={loading}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--sn-paper-line)",
                background: "var(--sn-paper)",
                color: "var(--sn-ink)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                transition: "all 0.12s ease",
              }}
            >
              <Search size={12} strokeWidth={1.75} /> Apply
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={loading}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--sn-paper-line)",
                background: "transparent",
                color: "var(--sn-text-main)",
                fontSize: "0.78rem",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.12s ease",
              }}
              title="Refresh from Google Sheets"
            >
              <RefreshCw
                size={12}
                strokeWidth={1.75}
                style={{
                  animation: loading ? "admin-spin 0.85s linear infinite" : "none",
                  color: "var(--sn-gold)",
                }}
              />
              <span>{loading ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Subtle Cached timestamp */}
        {analyticsData?.cached && analyticsData.cachedAt && (
          <div className="admin-analytics-cached" style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "0.74rem", color: "var(--sn-text-sub)", whiteSpace: "nowrap" }}>
              Cached {new Date(analyticsData.cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {/* ── 2. SUB-NAVIGATION SEGMENTS ────────────────────────────────────────── */}
      <div className="analytics-subnav-wrapper" style={{ width: "100%", overflowX: "hidden" }}>
        <div
          className="analytics-subnav-container sn-touch-scroll"
          style={{
            background: "var(--sn-paper)",
            border: "1px solid var(--sn-paper-line)",
            borderRadius: "8px",
            padding: "3px",
          }}
        >
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "traffic", label: "Traffic & Peak Hours", icon: Clock },
            { id: "surprise", label: "Surprise Me Funnel", icon: Dice },
            { id: "stream", label: `Live Search Log (${allRecentSearches.length})`, icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSegment === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSegment(tab.id)}
                className="analytics-subnav-btn"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: isActive ? "var(--sn-paper-card)" : "transparent",
                  color: isActive ? "var(--sn-ink)" : "var(--sn-text-sub)",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.12s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Icon size={14} strokeWidth={1.75} style={{ color: isActive ? "var(--sn-gold)" : "currentColor", flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap" }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LOADING SKELETON ─────────────────────────────────────────────────── */}
      {loading && !analyticsData && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "60px 20px",
            background: "var(--sn-paper-card)",
            borderRadius: "12px",
            border: "1px solid var(--sn-paper-line)",
            color: "var(--sn-text-sub)",
          }}
        >
          <MiniSpinner size={26} />
          <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--sn-ink)" }}>
            Loading analytics data...
          </span>
        </div>
      )}

      {/* ── TOP 4 KPI SCORECARDS (Always visible at top of Overview & Traffic) ── */}
      {analyticsData && searchOverview && (activeSegment === "overview" || activeSegment === "traffic") && (
        <div className="admin-kpi-grid">
          {/* Total Searches */}
          <KpiCard
            icon={Search}
            iconColor={PALETTE.gold}
            label="Total Searches"
            value={searchOverview.totalSearches.toLocaleString()}
            subValue={`${searchOverview.mobileSearches.toLocaleString()} Mobile (${searchOverview.mobilePercent}%) · ${searchOverview.desktopSearches.toLocaleString()} Desktop`}
          />

          {/* Search Success Rate */}
          <KpiCard
            icon={Target}
            iconColor={searchOverview.successRate >= 80 ? PALETTE.emerald : PALETTE.gold}
            label="Search Success Rate"
            value={`${searchOverview.successRate}%`}
            subValue={`${searchOverview.resultFound.toLocaleString()} found · ${searchOverview.resultNotFound.toLocaleString()} not found`}
          />

          {/* Unique Users */}
          <KpiCard
            icon={Users}
            iconColor={PALETTE.slate}
            label="Unique Search Users"
            value={searchOverview.uniqueUsers.toLocaleString()}
            subValue={`${searchOverview.uniqueQueries.toLocaleString()} distinct search queries`}
          />

          {/* Surprise Conversion Rate */}
          {surprise?.funnel && (
            <KpiCard
              icon={Dice}
              iconColor={PALETTE.emerald}
              label="Surprise Conversion Rate"
              value={`${surprise.funnel.conversionRate}%`}
              subValue={`${surprise.funnel.downloads.toLocaleString()} downloads from ${(
                surprise.funnel.clicks + surprise.funnel.rerolls
              ).toLocaleString()} interactions`}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 1: OVERVIEW (Default focused view)
          KPI Cards + Main Daily Trends + 2 Actionable Tables (8 rows capped)
      ═══════════════════════════════════════════════════════════════════════ */}
      {analyticsData && activeSegment === "overview" && (
        <>
          {/* Main Search Trends Area Chart with Auto-Granularity */}
          <SectionCard
            title={
              activeGranularity === "month"
                ? "Monthly Search Trends"
                : activeGranularity === "week"
                ? "Weekly Search Trends"
                : "Daily Search Trends"
            }
            icon={TrendingUp}
            action={
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sn-text-sub)", whiteSpace: "nowrap" }}>
                  {dailyTrendData.length} days recorded
                  {chartTrendData.length !== dailyTrendData.length && (
                    <span style={{ opacity: 0.8 }}> ({chartTrendData.length} {activeGranularity}s)</span>
                  )}
                </span>

                {/* Granularity Switcher: Auto | Day | Week | Month */}
                <div
                  style={{
                    display: "inline-flex",
                    background: "var(--sn-paper)",
                    border: "1px solid var(--sn-paper-line)",
                    borderRadius: "6px",
                    padding: "2px",
                    gap: "2px",
                  }}
                  role="group"
                  aria-label="Chart Granularity"
                >
                  {[
                    {
                      id: "auto",
                      label:
                        granularityMode === "auto"
                          ? `Auto (${activeGranularity.charAt(0).toUpperCase() + activeGranularity.slice(1)})`
                          : "Auto",
                    },
                    { id: "day", label: "Day" },
                    { id: "week", label: "Week" },
                    { id: "month", label: "Month" },
                  ].map((g) => {
                    const isSelected = granularityMode === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGranularityMode(g.id)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "none",
                          background: isSelected ? "var(--sn-paper-card)" : "transparent",
                          color: isSelected ? "var(--sn-ink)" : "var(--sn-text-sub)",
                          fontSize: "0.72rem",
                          fontWeight: isSelected ? 600 : 500,
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            }
          >
            {chartTrendData.length > 0 ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartTrendData} margin={{ top: 16, right: 8, left: -12, bottom: 8 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.gold} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PALETTE.gold} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradNoResults" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.maroon} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PALETTE.maroon} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sn-paper-line)" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateTick}
                      interval={chartTrendData.length <= 40 ? 0 : "preserveStartEnd"}
                      minTickGap={chartTrendData.length <= 40 ? 0 : 28}
                      angle={-35}
                      textAnchor="end"
                      height={48}
                      tick={{ fontSize: 10, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                    />
                    <YAxis
                      width={34}
                      tick={{ fontSize: 10, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                    />
                    <Tooltip content={<CustomTooltip labelFormatter={formatTooltipDate} />} cursor={false} />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      wrapperStyle={{ paddingBottom: "12px", fontSize: "11px", color: "var(--sn-text-sub)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Searches"
                      stroke={PALETTE.gold}
                      strokeWidth={2}
                      fill="url(#gradTotal)"
                      dot={chartTrendData.length <= 40 ? { r: 3 } : false}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="success"
                      name="Successful"
                      stroke={PALETTE.emerald}
                      strokeWidth={1.8}
                      fill="url(#gradSuccess)"
                      dot={chartTrendData.length <= 40 ? { r: 3 } : false}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="noResults"
                      name="No Results"
                      stroke={PALETTE.maroon}
                      strokeWidth={1.8}
                      fill="url(#gradNoResults)"
                      dot={chartTrendData.length <= 40 ? { r: 3 } : false}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.85rem" }}>
                No search trend data for the selected date range.
              </div>
            )}
          </SectionCard>

          {/* 2-Column Actionable Tables (Demand Gap & Top Successful) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
            {/* Table 1: Missing Novels (Demand Gap) */}
            <SectionCard
              title="Missing Novels (Demand Gap)"
              icon={AlertCircle}
              action={
                topMissingQueries.length > 8 ? (
                  <button
                    type="button"
                    onClick={() => setMissingLimit((prev) => (prev === 8 ? 50 : 8))}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--sn-gold)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {missingLimit === 8 ? `View All (${topMissingQueries.length})` : "Show Less"}
                  </button>
                ) : null
              }
            >
              <div style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)", marginBottom: "12px" }}>
                Searches that returned 0 results. Add missing titles directly to your catalog.
              </div>

              {topMissingQueries.length > 0 ? (
                <>
                  <div className="admin-desktop-table" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sn-paper-line)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...tableHeaderStyle, width: "32px" }}>#</th>
                          <th style={tableHeaderStyle}>Novel Name</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "80px" }}>Searches</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "105px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topMissingQueries.slice(0, missingLimit).map((item, idx) => (
                          <tr key={idx} className="admin-novel-row" style={{ transition: "background 0.12s" }}>
                            <td style={{ ...tableCellStyle, color: "var(--sn-text-sub)", fontWeight: 500, fontSize: "0.78rem" }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tableCellStyle, fontWeight: 500 }}>
                              <div style={{ color: "var(--sn-ink)", lineHeight: 1.3 }}>{item.query}</div>
                              {item.uniqueUsers && (
                                <div style={{ fontSize: "0.72rem", color: "var(--sn-text-sub)" }}>
                                  {item.uniqueUsers} reader{item.uniqueUsers > 1 ? "s" : ""}
                                </div>
                              )}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center" }}>
                              <span
                                style={{
                                  background: "rgba(107, 29, 47, 0.08)",
                                  color: PALETTE.maroon,
                                  border: "1px solid rgba(107, 29, 47, 0.2)",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.count}×
                              </span>
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleAddToCatalog(item.query)}
                                style={{
                                  padding: "4px 9px",
                                  borderRadius: "5px",
                                  border: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper)",
                                  color: "var(--sn-ink)",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.12s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "var(--sn-gold)";
                                  e.currentTarget.style.color = "var(--sn-gold)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = "var(--sn-paper-line)";
                                  e.currentTarget.style.color = "var(--sn-ink)";
                                }}
                                title={`Pre-fill "${item.query}" in Single Entry`}
                              >
                                <Plus size={12} strokeWidth={2} /> Add Novel
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Action Cards */}
                  <div className="admin-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "8px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                    {topMissingQueries.slice(0, missingLimit).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          borderRadius: "10px",
                          padding: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.76rem",
                              color: "var(--sn-text-sub)",
                              fontWeight: 600,
                              width: "22px",
                              flexShrink: 0,
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ color: "var(--sn-ink)", fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.query}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--sn-text-sub)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <span style={{ color: PALETTE.maroon, fontWeight: 600 }}>{item.count} search{item.count > 1 ? "es" : ""}</span>
                              {item.uniqueUsers && (
                                <>
                                  <span>·</span>
                                  <span>{item.uniqueUsers} reader{item.uniqueUsers > 1 ? "s" : ""}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCatalog(item.query)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--sn-gold)",
                            background: "rgba(197, 155, 39, 0.08)",
                            color: "var(--sn-gold)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            minHeight: "32px",
                          }}
                          title={`Pre-fill "${item.query}" in Single Entry`}
                        >
                          <Plus size={12} strokeWidth={2} /> Add Novel
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
                  No missing queries recorded for this period.
                </div>
              )}
            </SectionCard>

            {/* Table 2: Top Successful Searches */}
            <SectionCard
              title="Top Successful Searches"
              icon={TrendingUp}
              action={
                topSuccessfulQueries.length > 8 ? (
                  <button
                    type="button"
                    onClick={() => setSuccessfulLimit((prev) => (prev === 8 ? 50 : 8))}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--sn-gold)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {successfulLimit === 8 ? `View All (${topSuccessfulQueries.length})` : "Show Less"}
                  </button>
                ) : null
              }
            >
              <div style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)", marginBottom: "12px" }}>
                Most popular queries that successfully matched novels in your catalog.
              </div>

              {topSuccessfulQueries.length > 0 ? (
                <>
                  <div className="admin-desktop-table" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sn-paper-line)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...tableHeaderStyle, width: "32px" }}>#</th>
                          <th style={tableHeaderStyle}>Novel Query</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "70px" }}>Count</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "70px" }}>Readers</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "75px" }}>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSuccessfulQueries.slice(0, successfulLimit).map((item, idx) => (
                          <tr key={idx} className="admin-novel-row" style={{ transition: "background 0.12s" }}>
                            <td style={{ ...tableCellStyle, color: "var(--sn-text-sub)", fontWeight: 500, fontSize: "0.78rem" }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tableCellStyle, fontWeight: 500, color: "var(--sn-ink)" }}>
                              {item.query}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                              {item.count}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center", fontVariantNumeric: "tabular-nums", color: "var(--sn-text-sub)" }}>
                              {item.uniqueUsers || "—"}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center" }}>
                              <span
                                style={{
                                  background: "rgba(45, 106, 79, 0.08)",
                                  color: PALETTE.emerald,
                                  padding: "2px 7px",
                                  borderRadius: "10px",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.successRate ?? 100}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Action Cards */}
                  <div className="admin-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "8px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                    {topSuccessfulQueries.slice(0, successfulLimit).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          borderRadius: "10px",
                          padding: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.76rem",
                              color: "var(--sn-text-sub)",
                              fontWeight: 600,
                              width: "24px",
                              flexShrink: 0,
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ color: "var(--sn-ink)", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.query}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--sn-text-sub)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <span>{item.count} searches</span>
                              {item.uniqueUsers && (
                                <>
                                  <span>·</span>
                                  <span>{item.uniqueUsers} readers</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            background: "rgba(45, 106, 79, 0.08)",
                            color: PALETTE.emerald,
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.successRate ?? 100}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
                  No successful search records found.
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 2: TRAFFIC & PEAK HOURS
      ═══════════════════════════════════════════════════════════════════════ */}
      {analyticsData && activeSegment === "traffic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Peak Activity Hours (Local Time / PKT) */}
          <SectionCard title="Peak Activity Hours (Local Time / PKT)" icon={Clock}>
            <div style={{ fontSize: "0.78rem", color: "var(--sn-text-sub)", marginBottom: "14px" }}>
              Reader traffic volume across all 24 hours of the day.
            </div>

            {hourlyData.length > 0 ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={hourlyData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sn-paper-line)" opacity={0.6} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                      interval={2}
                    />
                    <YAxis
                      width={34}
                      tick={{ fontSize: 10, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="searches" name="Searches" radius={[4, 4, 0, 0]}>
                      {hourlyData.map((entry, idx) => {
                        const max = Math.max(...hourlyData.map((h) => h.searches));
                        const ratio = max > 0 ? entry.searches / max : 0;
                        return (
                          <Cell
                            key={idx}
                            fill={
                              ratio > 0.75
                                ? PALETTE.gold
                                : ratio > 0.4
                                ? "rgba(197, 155, 39, 0.7)"
                                : ratio > 0.2
                                ? "rgba(197, 155, 39, 0.35)"
                                : "var(--sn-paper-line)"
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--sn-text-sub)" }}>
                No hourly distribution data available.
              </div>
            )}
          </SectionCard>

          {/* Device Distribution Breakdown */}
          {searchOverview && (
            <SectionCard title="Device Distribution" icon={Smartphone}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "600px" }}>
                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Smartphone size={20} strokeWidth={1.75} style={{ color: PALETTE.gold }} />
                  <div>
                    <div style={{ fontSize: "0.76rem", color: "var(--sn-text-sub)" }}>Mobile Searches</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--sn-ink)" }}>
                      {searchOverview.mobileSearches.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--sn-text-sub)" }}>
                      {searchOverview.mobilePercent}% of total
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Monitor size={20} strokeWidth={1.75} style={{ color: PALETTE.slate }} />
                  <div>
                    <div style={{ fontSize: "0.76rem", color: "var(--sn-text-sub)" }}>Desktop Searches</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--sn-ink)" }}>
                      {searchOverview.desktopSearches.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--sn-text-sub)" }}>
                      {Math.round((100 - searchOverview.mobilePercent) * 100) / 100}% of total
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 3: SURPRISE ME FUNNEL
      ═══════════════════════════════════════════════════════════════════════ */}
      {analyticsData && activeSegment === "surprise" && surprise && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Funnel Chart & KPI Summary */}
          <SectionCard title="Surprise Me Feature Funnel" icon={Dice}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "20px", alignItems: "center", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={funnelData} margin={{ top: 16, right: 8, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sn-paper-line)" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                    />
                    <YAxis
                      width={34}
                      tick={{ fontSize: 10, fill: "var(--sn-text-sub)" }}
                      stroke="var(--sn-paper-line)"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="value" name="Interactions" radius={[4, 4, 0, 0]}>
                      {funnelData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats side column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)" }}>Clicks</span>
                  <strong style={{ fontSize: "0.95rem", color: "var(--sn-ink)" }}>
                    {surprise.funnel.clicks.toLocaleString()}
                  </strong>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)" }}>Rerolls</span>
                  <strong style={{ fontSize: "0.95rem", color: PALETTE.maroon }}>
                    {surprise.funnel.rerolls.toLocaleString()}
                  </strong>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--sn-paper)",
                    borderRadius: "8px",
                    border: "1px solid var(--sn-paper-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--sn-text-sub)" }}>Downloads</span>
                  <strong style={{ fontSize: "0.95rem", color: PALETTE.emerald }}>
                    {surprise.funnel.downloads.toLocaleString()}
                  </strong>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--sn-text-sub)", textAlign: "center", paddingTop: "4px" }}>
                  Conversion Rate: <strong>{surprise.funnel.conversionRate}%</strong> · Reroll Rate:{" "}
                  <strong>{surprise.funnel.rerollRate}%</strong>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 2-Column Tables: Top Downloads & Top Rerolls */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "16px" }}>
            {/* Top Surprise Downloads */}
            <SectionCard title="Top Surprise Downloads" icon={Download}>
              {topSurpriseDownloads.length > 0 ? (
                <>
                  <div className="admin-desktop-table" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sn-paper-line)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...tableHeaderStyle, width: "32px" }}>#</th>
                          <th style={tableHeaderStyle}>Novel Title</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "100px" }}>Downloads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSurpriseDownloads.slice(0, 15).map((item, idx) => (
                          <tr key={idx} className="admin-novel-row" style={{ transition: "background 0.12s" }}>
                            <td style={{ ...tableCellStyle, color: "var(--sn-text-sub)", fontSize: "0.78rem" }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tableCellStyle, fontWeight: 500, color: "var(--sn-ink)" }}>
                              {item.title}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center" }}>
                              <span
                                style={{
                                  background: "rgba(45, 106, 79, 0.08)",
                                  color: PALETTE.emerald,
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.downloads} downloads
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards */}
                  <div className="admin-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "8px" }}>
                    {topSurpriseDownloads.slice(0, 15).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          borderRadius: "10px",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0, flex: 1 }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "var(--sn-text-sub)", fontWeight: 600, width: "24px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <span style={{ color: "var(--sn-ink)", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </span>
                        </div>
                        <span
                          style={{
                            background: "rgba(45, 106, 79, 0.08)",
                            color: PALETTE.emerald,
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.downloads} dl
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
                  No surprise downloads recorded yet.
                </div>
              )}
            </SectionCard>

            {/* Top Rerolled Novels */}
            <SectionCard title="Top Rerolled Novels" icon={RefreshCw}>
              {topSurpriseRerolls.length > 0 ? (
                <>
                  <div className="admin-desktop-table" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sn-paper-line)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...tableHeaderStyle, width: "32px" }}>#</th>
                          <th style={tableHeaderStyle}>Novel Title</th>
                          <th style={{ ...tableHeaderStyle, textAlign: "center", width: "100px" }}>Rerolls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSurpriseRerolls.slice(0, 15).map((item, idx) => (
                          <tr key={idx} className="admin-novel-row" style={{ transition: "background 0.12s" }}>
                            <td style={{ ...tableCellStyle, color: "var(--sn-text-sub)", fontSize: "0.78rem" }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tableCellStyle, fontWeight: 500, color: "var(--sn-ink)" }}>
                              {item.title}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "center" }}>
                              <span
                                style={{
                                  background: "rgba(107, 29, 47, 0.08)",
                                  color: PALETTE.maroon,
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.rerolls} rerolls
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards */}
                  <div className="admin-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "8px" }}>
                    {topSurpriseRerolls.slice(0, 15).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--sn-paper)",
                          border: "1px solid var(--sn-paper-line)",
                          borderRadius: "10px",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0, flex: 1 }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "var(--sn-text-sub)", fontWeight: 600, width: "24px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <span style={{ color: "var(--sn-ink)", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </span>
                        </div>
                        <span
                          style={{
                            background: "rgba(107, 29, 47, 0.08)",
                            color: PALETTE.maroon,
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.rerolls} rerolls
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
                  No reroll records yet.
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 4: LIVE SEARCH LOG (Clean 20-row pagination)
      ═══════════════════════════════════════════════════════════════════════ */}
      {analyticsData && activeSegment === "stream" && (
        <SectionCard
          title="Live Search Activity Stream"
          icon={Activity}
          action={
            <span style={{ fontSize: "0.75rem", color: "var(--sn-text-sub)" }}>
              {filteredRecentSearches.length} matching events
            </span>
          }
        >
          {/* Controls toolbar: Query search & status filter */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <input
              type="text"
              placeholder="Search by query or User ID..."
              value={streamSearch}
              onChange={(e) => {
                setStreamSearch(e.target.value);
                setStreamPage(1);
              }}
              className="admin-input"
              style={{
                ...compactInputStyle,
                width: "100%",
                maxWidth: "280px",
                flex: "1 1 200px",
              }}
            />

            <div
              className="sn-touch-scroll"
              style={{
                display: "inline-flex",
                background: "var(--sn-paper)",
                border: "1px solid var(--sn-paper-line)",
                borderRadius: "6px",
                padding: "2px",
                gap: "2px",
              }}
            >
              {[
                { id: "all", label: "All" },
                { id: "found", label: "Found Only" },
                { id: "notFound", label: "No Result Only" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setStreamFilter(f.id);
                    setStreamPage(1);
                  }}
                  style={{
                    padding: "4px 9px",
                    borderRadius: "4px",
                    border: "none",
                    background: streamFilter === f.id ? "var(--sn-paper-card)" : "transparent",
                    color: streamFilter === f.id ? "var(--sn-ink)" : "var(--sn-text-sub)",
                    fontSize: "0.74rem",
                    fontWeight: streamFilter === f.id ? 600 : 500,
                    cursor: "pointer",
                    boxShadow: streamFilter === f.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Table */}
          {filteredRecentSearches.length > 0 ? (
            <>
              <div className="admin-desktop-table" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sn-paper-line)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: "130px" }}>Timestamp</th>
                      <th style={{ ...tableHeaderStyle, width: "120px" }}>User ID</th>
                      <th style={tableHeaderStyle}>Query</th>
                      <th style={{ ...tableHeaderStyle, width: "95px", textAlign: "center" }}>Device</th>
                      <th style={{ ...tableHeaderStyle, width: "110px", textAlign: "center" }}>Status</th>
                      <th style={{ ...tableHeaderStyle, width: "90px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecentSearches.map((item, idx) => {
                      const isFound = item.resultFound === "Yes";
                      const formattedDate = item.timestamp
                        ? new Date(item.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—";

                      return (
                        <tr key={idx} className="admin-novel-row" style={{ transition: "background 0.12s" }}>
                          <td
                            style={{
                              ...tableCellStyle,
                              fontSize: "0.76rem",
                              color: "var(--sn-text-sub)",
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                            }}
                            title={item.timestamp}
                          >
                            {formattedDate}
                          </td>
                          <td style={{ ...tableCellStyle, fontSize: "0.74rem", fontFamily: "monospace" }}>
                            <span
                              style={{
                                background: "var(--sn-paper)",
                                border: "1px solid var(--sn-paper-line)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                color: "var(--sn-text-sub)",
                              }}
                              title={item.userId}
                            >
                              {item.userId?.length > 13 ? `${item.userId.slice(0, 12)}…` : item.userId || "anon"}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, fontWeight: 500, color: "var(--sn-ink)" }}>
                            {item.query || item.search}
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                color: "var(--sn-text-sub)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.device === "Mobile" ? (
                                <>
                                  <Smartphone size={12} strokeWidth={1.75} style={{ color: PALETTE.gold }} /> Mobile
                                </>
                              ) : item.device === "Desktop" ? (
                                <>
                                  <Monitor size={12} strokeWidth={1.75} style={{ color: PALETTE.slate }} /> Desktop
                                </>
                              ) : (
                                item.device || "Unknown"
                              )}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            <span
                              style={{
                                background: isFound ? "rgba(45, 106, 79, 0.08)" : "rgba(107, 29, 47, 0.08)",
                                color: isFound ? PALETTE.emerald : PALETTE.maroon,
                                border: `1px solid ${isFound ? "rgba(45, 106, 79, 0.2)" : "rgba(107, 29, 47, 0.2)"}`,
                                padding: "2px 7px",
                                borderRadius: "10px",
                                fontSize: "0.73rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isFound ? (
                                <>
                                  <CheckCircle size={11} strokeWidth={2} /> Found
                                </>
                              ) : (
                                <>
                                  <XCircle size={11} strokeWidth={2} /> No Result
                                </>
                              )}
                            </span>
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            {!isFound && (
                              <button
                                type="button"
                                onClick={() => handleAddToCatalog(item.query || item.search)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid var(--sn-paper-line)",
                                  background: "var(--sn-paper)",
                                  color: "var(--sn-ink)",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Add "${item.query || item.search}" to catalog`}
                              >
                                <Plus size={10} strokeWidth={2} /> Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Activity Log Cards */}
              <div className="admin-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "8px" }}>
                {paginatedRecentSearches.map((item, idx) => {
                  const isFound = item.resultFound === "Yes";
                  const formattedDate = item.timestamp
                    ? new Date(item.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <div
                      key={idx}
                      style={{
                        background: "var(--sn-paper)",
                        border: "1px solid var(--sn-paper-line)",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {/* Top line: Query + Status badge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontWeight: 600, color: "var(--sn-ink)", fontSize: "0.86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {item.query || item.search}
                        </span>
                        <span
                          style={{
                            background: isFound ? "rgba(45, 106, 79, 0.08)" : "rgba(107, 29, 47, 0.08)",
                            color: isFound ? PALETTE.emerald : PALETTE.maroon,
                            border: `1px solid ${isFound ? "rgba(45, 106, 79, 0.2)" : "rgba(107, 29, 47, 0.2)"}`,
                            padding: "2px 7px",
                            borderRadius: "10px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {isFound ? (
                            <>
                              <CheckCircle size={11} strokeWidth={2} /> Found
                            </>
                          ) : (
                            <>
                              <XCircle size={11} strokeWidth={2} /> No Result
                            </>
                          )}
                        </span>
                      </div>

                      {/* Bottom line: User ID + Time + Device + + Add button */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", fontSize: "0.73rem", color: "var(--sn-text-sub)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", flexWrap: "wrap" }}>
                          <span
                            style={{
                              background: "var(--sn-paper-card)",
                              border: "1px solid var(--sn-paper-line)",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontFamily: "monospace",
                              fontSize: "0.71rem",
                            }}
                          >
                            {item.userId?.length > 10 ? `${item.userId.slice(0, 8)}…` : item.userId || "anon"}
                          </span>
                          <span>·</span>
                          <span>{formattedDate}</span>
                          <span>·</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            {item.device === "Mobile" ? (
                              <>
                                <Smartphone size={11} strokeWidth={1.75} style={{ color: PALETTE.gold }} /> Mobile
                              </>
                            ) : item.device === "Desktop" ? (
                              <>
                                <Monitor size={11} strokeWidth={1.75} style={{ color: PALETTE.slate }} /> Desktop
                              </>
                            ) : (
                              item.device || "Unknown"
                            )}
                          </span>
                        </div>

                        {!isFound && (
                          <button
                            type="button"
                            onClick={() => handleAddToCatalog(item.query || item.search)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "5px",
                              border: "1px solid var(--sn-paper-line)",
                              background: "var(--sn-paper-card)",
                              color: "var(--sn-ink)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                            title={`Add "${item.query || item.search}" to catalog`}
                          >
                            <Plus size={10} strokeWidth={2} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--sn-text-sub)", fontSize: "0.82rem" }}>
              No search logs match the current filter.
            </div>
          )}

          {/* Clean Pagination */}
          {totalStreamPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "12px",
                fontSize: "0.76rem",
                color: "var(--sn-text-sub)",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>
                Page {streamPage} of {totalStreamPages} ({filteredRecentSearches.length} total entries)
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  disabled={streamPage <= 1}
                  onClick={() => setStreamPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--sn-paper-line)",
                    background: "var(--sn-paper)",
                    color: streamPage <= 1 ? "var(--sn-text-sub)" : "var(--sn-ink)",
                    cursor: streamPage <= 1 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    minHeight: "34px",
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={1.75} /> Prev
                </button>
                <button
                  type="button"
                  disabled={streamPage >= totalStreamPages}
                  onClick={() => setStreamPage((p) => Math.min(totalStreamPages, p + 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--sn-paper-line)",
                    background: "var(--sn-paper)",
                    color: streamPage >= totalStreamPages ? "var(--sn-text-sub)" : "var(--sn-ink)",
                    cursor: streamPage >= totalStreamPages ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    minHeight: "34px",
                  }}
                >
                  Next <ChevronRight size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── 5. SUBTLE BORDERLESS FOOTER CAPTION ───────────────────────────────── */}
      {analyticsData && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 4px",
            fontSize: "0.74rem",
            color: "var(--sn-text-sub)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            Source Data: {analyticsData.rawCounts?.totalSearchRows?.toLocaleString()} search rows ·{" "}
            {analyticsData.rawCounts?.totalSurpriseRows?.toLocaleString()} surprise rows
          </div>
          <div>
            {analyticsData.cached ? "Cache Active" : "Live Data"}
            {analyticsData.filters?.startDate && ` · From ${analyticsData.filters.startDate.slice(0, 10)}`}
            {analyticsData.filters?.endDate && ` · To ${analyticsData.filters.endDate.slice(0, 10)}`}
            {analyticsData.filters?.device && ` · ${analyticsData.filters.device}`}
          </div>
        </div>
      )}
    </div>
  );
}
