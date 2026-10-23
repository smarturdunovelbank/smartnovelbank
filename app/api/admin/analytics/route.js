import { NextResponse } from "next/server";
import { verifySupabaseAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════════════════════════
// CONFIG: Google Sheets Data Source
// ════════════════════════════════════════════════════════════════════════════
// The Google Apps Script that logs search & surprise events writes to a
// spreadsheet. We read it back via the Sheets API v4 (public read with API key).
//
// Set these in .env.local:
//   GOOGLE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
//   GOOGLE_SHEETS_API_KEY=<your-api-key>
//
// Fallback: If env vars are missing, the route will try to pull overrides
// from Supabase `site_settings` or return a config-missing error.
// ════════════════════════════════════════════════════════════════════════════

const SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "";

// Sheet tab names (must match exactly what's in the spreadsheet)
const SEARCH_TAB = "Searches";
const SURPRISE_TAB = "Surprise Analytics";

// ── In-Memory Cache ─────────────────────────────────────────────────────────
// Caches raw sheet data for 5 minutes to avoid hammering Google's API.
// Use ?refresh=true query param to force a fresh fetch.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let sheetsCache = {
  data: null,       // { searches: [], surprise: [] }
  fetchedAt: 0,     // epoch ms
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Fetch both sheet tabs in a single batchGet request
// ════════════════════════════════════════════════════════════════════════════
async function fetchSheetData(spreadsheetId, apiKey) {
  const ranges = [
    `${SEARCH_TAB}!A:E`,
    `${SURPRISE_TAB}!A:E`,
  ];
  const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangeParams}&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Google Sheets API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const valueRanges = json.valueRanges || [];

  // Parse Searches tab (skip header row)
  const searchRows = (valueRanges[0]?.values || []).slice(1);
  const searches = searchRows.map((row) => ({
    timestamp: row[0] || "",
    search: row[1] || "",
    device: row[2] || "",
    userId: row[3] || "",
    resultFound: row[4] || "",
  }));

  // Parse Surprise Analytics tab (skip header row)
  const surpriseRows = (valueRanges[1]?.values || []).slice(1);
  const surprise = surpriseRows.map((row) => ({
    timestamp: row[0] || "",
    userId: row[1] || "",
    device: row[2] || "",
    eventType: row[3] || "",
    novelTitle: row[4] || "",
  }));

  return { searches, surprise };
}

// ── Get cached or fresh data ────────────────────────────────────────────────
async function getSheetData(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    sheetsCache.data &&
    now - sheetsCache.fetchedAt < CACHE_TTL_MS
  ) {
    return { ...sheetsCache.data, cached: true, cachedAt: new Date(sheetsCache.fetchedAt).toISOString() };
  }

  const spreadsheetId = SHEETS_SPREADSHEET_ID;
  const apiKey = SHEETS_API_KEY;

  if (!spreadsheetId || !apiKey) {
    throw new Error(
      "Missing Google Sheets configuration. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY in .env.local."
    );
  }

  const data = await fetchSheetData(spreadsheetId, apiKey);
  sheetsCache = { data, fetchedAt: now };
  return { ...data, cached: false, cachedAt: new Date(now).toISOString() };
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS COMPUTATION ENGINE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parse an ISO timestamp string to a Date, returning null if invalid.
 */
function parseTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filter records by date range and device.
 */
function filterRecords(records, { startDate, endDate, device }) {
  return records.filter((r) => {
    const d = parseTimestamp(r.timestamp);
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    if (device && r.device && r.device.toLowerCase() !== device.toLowerCase()) return false;
    return true;
  });
}

/**
 * Compute overview KPIs from filtered search records.
 */
function computeSearchOverview(searches) {
  const total = searches.length;
  const found = searches.filter((s) => s.resultFound === "Yes").length;
  const notFound = searches.filter((s) => s.resultFound === "No").length;
  const uniqueUsers = new Set(searches.map((s) => s.userId).filter(Boolean)).size;
  const uniqueQueries = new Set(searches.map((s) => s.search.toLowerCase().trim()).filter(Boolean)).size;
  const mobileCount = searches.filter((s) => s.device === "Mobile").length;
  const desktopCount = searches.filter((s) => s.device === "Desktop").length;

  return {
    totalSearches: total,
    resultFound: found,
    resultNotFound: notFound,
    successRate: total > 0 ? Math.round((found / total) * 10000) / 100 : 0,
    uniqueUsers,
    uniqueQueries,
    mobileSearches: mobileCount,
    desktopSearches: desktopCount,
    mobilePercent: total > 0 ? Math.round((mobileCount / total) * 10000) / 100 : 0,
  };
}

/**
 * Compute daily and hourly trend data.
 */
function computeSearchTrends(searches) {
  const dailyMap = {};   // "YYYY-MM-DD" => { total, found, notFound, success, noResults }
  const hourlyDist = Array.from({ length: 24 }, () => 0);

  for (const s of searches) {
    const d = parseTimestamp(s.timestamp);
    if (!d) continue;

    // Daily
    const dayKey = d.toISOString().slice(0, 10);
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { date: dayKey, total: 0, found: 0, notFound: 0, success: 0, noResults: 0 };
    }
    dailyMap[dayKey].total++;
    if (s.resultFound === "Yes") {
      dailyMap[dayKey].found++;
      dailyMap[dayKey].success++;
    }
    if (s.resultFound === "No") {
      dailyMap[dayKey].notFound++;
      dailyMap[dayKey].noResults++;
    }

    // Hourly
    hourlyDist[d.getUTCHours()]++;
  }

  // Sort daily by date ascending
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return { daily, hourlyDistribution: hourlyDist };
}

/**
 * Compute query insights: top queries, top successful queries, top missing queries (content gaps), and recent activity.
 */
function computeQueryInsights(searches, topN = 20) {
  const queryCount = {};      // normalized query => { query, total, found, notFound, users: Set }
  const missingQueryCount = {}; // normalized query => count (only for notFound)

  for (const s of searches) {
    const q = s.search.toLowerCase().trim();
    if (!q) continue;

    if (!queryCount[q]) {
      queryCount[q] = { query: s.search, total: 0, found: 0, notFound: 0, users: new Set() };
    }
    queryCount[q].total++;
    if (s.userId) queryCount[q].users.add(s.userId);

    if (s.resultFound === "Yes") {
      queryCount[q].found++;
    }
    if (s.resultFound === "No") {
      queryCount[q].notFound++;
      missingQueryCount[q] = (missingQueryCount[q] || 0) + 1;
    }
  }

  // Top queries overall by frequency
  const topQueries = Object.values(queryCount)
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map((q) => ({
      query: q.query,
      count: q.total,
      found: q.found,
      notFound: q.notFound,
      uniqueUsers: q.users.size,
      successRate: q.total > 0 ? Math.round((q.found / q.total) * 10000) / 100 : 0,
    }));

  // Top SUCCESSFUL queries (result = "Yes"), sorted by found count
  const topSuccessfulQueries = Object.values(queryCount)
    .filter((q) => q.found > 0)
    .sort((a, b) => b.found - a.found)
    .slice(0, topN)
    .map((q) => ({
      query: q.query,
      count: q.found,
      totalSearches: q.total,
      uniqueUsers: q.users.size,
      successRate: Math.round((q.found / q.total) * 10000) / 100,
    }));

  // Top MISSING queries (content gaps) — queries with result = "No", sorted by frequency
  const topMissingQueries = Object.entries(missingQueryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([normalized, count]) => ({
      query: queryCount[normalized]?.query || normalized,
      count,
      totalSearches: queryCount[normalized]?.total || count,
      uniqueUsers: queryCount[normalized]?.users?.size || 1,
    }));

  // Recent live search activity stream (last 100, newest first)
  const recentSearches = searches
    .filter((s) => s.timestamp)
    .slice(-100)
    .reverse()
    .map((s) => ({
      timestamp: s.timestamp,
      query: s.search,
      search: s.search,
      device: s.device || "Unknown",
      userId: s.userId || "anonymous",
      resultFound: s.resultFound || "No",
    }));

  return {
    topQueries,
    topSuccessfulQueries,
    topMissingQueries,
    recentSearches,
    totalUniqueQueries: Object.keys(queryCount).length,
  };
}

/**
 * Compute surprise analytics: funnel (click → reroll → download), top novels.
 */
function computeSurpriseAnalytics(surpriseRecords, topN = 20) {
  const total = surpriseRecords.length;
  const clicks = surpriseRecords.filter((r) => r.eventType === "click").length;
  const rerolls = surpriseRecords.filter((r) => r.eventType === "reroll").length;
  const downloads = surpriseRecords.filter((r) => r.eventType === "download").length;
  const uniqueUsers = new Set(surpriseRecords.map((r) => r.userId).filter(Boolean)).size;

  // Device breakdown
  const mobileCount = surpriseRecords.filter((r) => r.device === "Mobile").length;
  const desktopCount = surpriseRecords.filter((r) => r.device === "Desktop").length;

  // Daily trend
  const dailyMap = {};
  const hourlyDist = Array.from({ length: 24 }, () => 0);
  for (const r of surpriseRecords) {
    const d = parseTimestamp(r.timestamp);
    if (!d) continue;
    const dayKey = d.toISOString().slice(0, 10);
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { date: dayKey, clicks: 0, rerolls: 0, downloads: 0, total: 0 };
    }
    dailyMap[dayKey].total++;
    if (r.eventType === "click") dailyMap[dayKey].clicks++;
    if (r.eventType === "reroll") dailyMap[dayKey].rerolls++;
    if (r.eventType === "download") dailyMap[dayKey].downloads++;
    hourlyDist[d.getUTCHours()]++;
  }
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Top downloaded novels
  const downloadCounts = {};
  const rerollCounts = {};
  for (const r of surpriseRecords) {
    const title = (r.novelTitle || "").trim();
    if (!title) continue;
    if (r.eventType === "download") {
      downloadCounts[title] = (downloadCounts[title] || 0) + 1;
    }
    if (r.eventType === "reroll") {
      rerollCounts[title] = (rerollCounts[title] || 0) + 1;
    }
  }

  const topDownloads = Object.entries(downloadCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([title, count]) => ({ title, downloads: count }));

  const topRerolls = Object.entries(rerollCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([title, count]) => ({ title, rerolls: count }));

  const totalInteractions = clicks + rerolls;
  const conversionRate = totalInteractions > 0
    ? Math.round((downloads / totalInteractions) * 10000) / 100
    : (clicks > 0 ? Math.round((downloads / clicks) * 10000) / 100 : 0);

  return {
    funnel: {
      totalEvents: total,
      clicks,
      rerolls,
      downloads,
      conversionRate,
      rerollRate: clicks > 0 ? Math.round((rerolls / clicks) * 10000) / 100 : 0,
    },
    uniqueUsers,
    deviceBreakdown: {
      mobile: mobileCount,
      desktop: desktopCount,
      mobilePercent: total > 0 ? Math.round((mobileCount / total) * 10000) / 100 : 0,
    },
    trends: { daily, hourlyDistribution: hourlyDist },
    topDownloads,
    topDownloadedSurpriseNovels: topDownloads,
    topRerolls,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/admin/analytics
// Protected: Requires Supabase Admin bearer token.
//
// Query Parameters:
//   ?refresh=true          Force cache refresh
//   ?startDate=YYYY-MM-DD  Filter from date (inclusive)
//   ?endDate=YYYY-MM-DD    Filter to date (inclusive, end of day)
//   ?device=Mobile|Desktop Filter by device type
//   ?tab=searches|surprise Only return analytics for one tab
//   ?topN=20               Number of top items to return (default 20)
// ════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { user, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const tab = searchParams.get("tab") || "all"; // "searches" | "surprise" | "all"
    const deviceFilter = searchParams.get("device") || "";
    const topN = Math.min(Math.max(parseInt(searchParams.get("topN") || "20", 10) || 20, 5), 100);

    // Parse date filters
    let startDate = null;
    let endDate = null;
    const startDateStr = searchParams.get("startDate") || searchParams.get("from") || "";
    const endDateStr = searchParams.get("endDate") || searchParams.get("to") || "";
    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) startDate = null;
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        // Set to end of day
        endDate.setUTCHours(23, 59, 59, 999);
      } else {
        endDate = null;
      }
    }

    // ── Fetch Data ──────────────────────────────────────────────────────
    const rawData = await getSheetData(forceRefresh);

    const filters = { startDate, endDate, device: deviceFilter };
    const response = {
      success: true,
      cached: rawData.cached,
      cachedAt: rawData.cachedAt,
      filters: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        device: deviceFilter || null,
        tab,
        topN,
      },
      rawCounts: {
        totalSearchRows: rawData.searches.length,
        totalSurpriseRows: rawData.surprise.length,
      },
    };

    // ── Search Analytics ────────────────────────────────────────────────
    if (tab === "all" || tab === "searches") {
      const filteredSearches = filterRecords(rawData.searches, filters);
      response.searchAnalytics = {
        overview: computeSearchOverview(filteredSearches),
        trends: computeSearchTrends(filteredSearches),
        queryInsights: computeQueryInsights(filteredSearches, topN),
        filteredCount: filteredSearches.length,
      };
    }

    // ── Surprise Analytics ──────────────────────────────────────────────
    if (tab === "all" || tab === "surprise") {
      const filteredSurprise = filterRecords(rawData.surprise, filters);
      response.surpriseAnalytics = computeSurpriseAnalytics(filteredSurprise, topN);
      response.surpriseAnalytics.filteredCount = filteredSurprise.length;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/admin/analytics error:", err);

    // Distinguish config errors from runtime errors
    if (err.message?.includes("Missing Google Sheets configuration")) {
      return NextResponse.json(
        {
          error: err.message,
          hint: "Add GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY to your .env.local file.",
          configMissing: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch analytics data.", details: err.message },
      { status: 500 }
    );
  }
}
