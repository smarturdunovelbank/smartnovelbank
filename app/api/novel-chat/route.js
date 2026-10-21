import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// ── Google Drive direct-download URL converter ──────────────────────
// Reuses the same FILE_ID extraction logic from lib/driveEmbed.js
function toDirectDownloadUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "#";

  // Pattern 1: /file/d/ID/...
  const matchFileD = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchFileD[1]}`;
  }

  // Pattern 2: ?id=ID or &id=ID
  const matchId = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchId[1]}`;
  }

  return rawUrl;
}

// ── Blocked NSFW words list (Task 2 & 3) ─────────────────────────────
const BLOCKED_WORDS = [
  "sex",
  "sexy",
  "bold",
  "hot",
  "nsfw",
  "18+",
  "adult",
  "erotic",
  "porn",
  "xxx",
  "nude",
  "lust",
  "fahash",
  "fahaash",
  "chudai",
  "jism",
  "sax",
];

function isBlockedNsfw(text) {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();

  // Check 18+ variations (18+, 18 +, +18, 18plus, 18 plus)
  if (/(?:\b18\s*\+|\+18\b|\b18\s*plus\b)/i.test(lower) || lower.includes("18+")) {
    return true;
  }

  // Check word boundary matches for blocked terms to avoid false positives (e.g. "hota" vs "hot")
  for (const word of BLOCKED_WORDS) {
    if (word === "18+") continue;
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      return true;
    }
  }

  return false;
}

// ── Tool declaration for Groq function calling (OpenAI-compatible) ───
const searchNovelsTool = {
  type: "function",
  function: {
    name: "search_novels",
    description:
      "Searches the Supabase database for Urdu novel download links by title or author.",
    parameters: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description:
            "List of clean novel titles or author names in English/Roman Urdu (correcting any user typos, e.g. ['Peer e Kamil', 'Jannat ke Pattay', 'Namal']).",
        },
        author: {
          type: "string",
          description:
            "Identified author or writer name if mentioned (e.g. 'Nimra Ahmed', 'Umera Ahmed', 'Farhat Ishtiaq').",
        },
        novel_title: {
          type: "string",
          description:
            "Specific novel title requested by the user, if any (e.g. 'Haalim', 'Peer e Kamil').",
        },
      },
      required: ["queries"],
    },
  },
};

// ── Generic words NEVER allowed in Supabase .ilike searches ─────────
// These must be stripped BEFORE building the orFilter — never searched stand-alone.
const GENERIC_SEARCH_WORDS_REGEX =
  /\b(?:novels?|books?|kitab|kutub|pdf|downloads?|complete|online|reading|hai|hain|tha|thi|thay|ho|hota|hoti|kon|kaun|kya|kis|kaisi|kaisa|kaise|aur|ya|koi|wala|wali|walay|batao|bataye|bataiye|ending|summary|kirdar|characters?|heroines?|heroes|hero)\b/gi;

// Hard-blocked stand-alone search terms (case-insensitive).
// If ALL cleaned queries resolve to only these after stripping, return [] immediately.
const DB_BLOCKED_TERMS = new Set([
  // Generic novel/pdf terms
  "novel", "novels", "book", "books", "kitab", "kutub",
  "pdf", "download", "downloads", "complete", "online", "reading",
  // Helper verbs & question words blocked from DB search
  "hai", "hain", "tha", "thi", "thay", "ho", "hota", "hoti",
  "kon", "kaun", "kya", "kis", "kaisi", "kaisa", "kaise",
  "aur", "ya", "koi", "wala", "wali", "walay",
  "batao", "bataye", "bataiye", "ending", "summary",
  "kirdar", "character", "characters", "hero", "heroine", "heroines",
]);

function stripGenericWords(q) {
  if (!q || typeof q !== "string") return "";
  return q
    .replace(GENERIC_SEARCH_WORDS_REGEX, " ")
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Filler words to strip when building a direct keyword fallback ────
const FILLER_WORDS = new Set([
  // Novel / link intent words — never send these as DB search tokens
  "novel", "novels", "book", "books", "kitab", "kutub",
  "pdf", "download", "downloads", "complete", "online", "reading",
  "ka", "ki", "ke", "link", "links", "do", "chahiye", "de", "dein",
  "tamam", "episodes", "episode", "batao", "bata", "bataiye", "bataye",
  "hai", "agai", "ha", "aur", "or", "ya", "koi", "sa", "se",
  "wala", "wali", "walay",
  "summary", "synopsis", "story", "kahani", "detail", "details", "tafseel", "bare", "baray", "mein", "main",
  "ending", "kirdar", "character", "characters", "hero", "heroine", "heroines",
  "vibe", "trope", "tropes", "plot", "climax",

  // Conversational words & pronouns (never search DB for these!)
  "name", "naam", "tum", "tumhara", "tumarah", "tumhari", "ap", "aap", "apka",
  "aapka", "apna", "mera", "meri", "mujhe", "mujh", "mujhy", "ko",
  "par", "pe", "bhi", "to", "toh", "hi", "hello", "salam", "kon", "kaun", "kya",
  "kia", "kaisay", "kaise", "kaisa", "kaisi", "kese", "kahan", "kab", "kyun", "kyu", "kis", "ho", "hain",
  "hoon", "hun", "tha", "thi", "the", "thay", "hota", "hoti", "raha", "rahi", "rahe", "kar", "kr", "plz",
  "please", "yar", "bhai", "bro", "sis",
]);

/**
 * Strip filler/stop words and return remaining meaningful tokens.
 * Used as a last-resort keyword query when the AI is unavailable.
 * Generic novel/book/pdf/download words and blocked terms are always excluded.
 */
function extractKeywords(message) {
  return message
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !FILLER_WORDS.has(w) && !DB_BLOCKED_TERMS.has(w));
}

// ── Fast-path for common chit-chat (0ms response, 0 quota used) ─────
function getFastPathReply(message) {
  if (!message || typeof message !== "string") return null;

  // Clean message: lowercase, remove punctuation, trim whitespace
  const clean = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  // If message contains any novel search intent or episode query, do NOT intercept!
  const hasSearchIntent = /\b(novel|novels|link|links|download|pdf|episode|episodes|ep|part|qist|author|writer|kitab|book|romantic|suspense|horror|digest)\b/i.test(clean);
  if (hasSearchIntent) {
    return null;
  }

  const isMatch = (patterns) => {
    return patterns.some((p) => clean === p || clean.startsWith(p + " ") || clean.endsWith(" " + p) || clean.includes(" " + p + " "));
  };

  // 1. Identity & Bot Name (flexible regex + common variations)
  const isAskingNameOrIdentity =
    /\b(name\s+k[iy]a|naam\s+k[iy]a|k[iy]a\s+naam|k[iy]a\s+name|your\s+name|tumhara\s+naam|tumarah\s+name|tumhara\s+name|tumarah\s+naam|apka\s+naam|aapka\s+naam|apka\s+name|aapka\s+name|apna\s+naam|apna\s+name|who\s+are\s+you|k[iy]a\s+k[ar]te\s+ho|kya\s+krte\s+ho)\b/i.test(clean) ||
    isMatch([
      "tum kon ho", "tum kaun ho", "kaun ho", "kon ho", "who are you",
      "ap kon ho", "ap kaun ho", "aap kon ho", "aap kaun ho",
      "kia karte ho", "kya karte ho", "kya krte ho", "kia krte ho",
      "tumarah name kia ha", "tumhara naam kya hai", "tumhara name kya hai",
      "apka naam kya hai", "aapka naam kya hai", "your name"
    ]);

  if (isAskingNameOrIdentity) {
    return "Main Smart Novel Bank ka AI Assistant hun! 🤖 Mera kaam aap ko aap ke pasandida Urdu novels ke direct PDF download links dhoond kar dena hai.";
  }

  // 2. How are you
  const howAreYouPatterns = [
    "tum kaisay ho", "tum kaise ho", "kaise ho", "kese ho", "kaisay ho",
    "kia haal hai", "kya haal hai", "kia hal hai", "kya hal hai",
    "how are you", "ap kaise ho", "ap kaisay ho", "aap kaise ho", "aap kaisay ho"
  ];
  if (isMatch(howAreYouPatterns)) {
    return "Alhamdulillah, main bilkul theek aur aap ki madad ke liye tayyar hun! 📚 Bataiye, aaj konsa Urdu novel parhna chahenge?";
  }

  // 3. What's up / Casual
  const whatsUpPatterns = [
    "kya ho raha hai", "kia ho raha ha", "kia ho raha hai", "kya ho raha ha",
    "kya kar rahe ho", "kia kar rahe ho", "kya kr rahe ho", "kia kr rahe ho",
    "aur sunao", "or sunao", "kia chal raha ha", "kya chal raha hai", "kia chal raha hai"
  ];
  if (isMatch(whatsUpPatterns)) {
    return "Bas aap ke liye behtareen Urdu novels dhoond raha hun! 📚 Bataiye, aaj konsa novel parhne ka irada hai?";
  }

  // 4. Goodbye / Ok
  const goodbyePatterns = [
    "ok", "okay", "theek hai", "thik hai", "bye", "allah hafiz", "khuda hafiz", "good night", "tc"
  ];
  if (isMatch(goodbyePatterns)) {
    return "Allah Hafiz! 😊 Jab bhi koi naya Urdu novel parhna ho, Smart Novel AI hazir hai. Khush rahein!";
  }

  // 5. Thanks
  const thanksPatterns = [
    "shukriya", "thanks", "thank you", "thank u", "jazakallah",
    "love you", "nice", "zabardast", "bohot shukriya", "bahut shukriya"
  ];
  if (isMatch(thanksPatterns)) {
    return "Bohat shukriya! ❤️ Khushi hui ke main aap ke kaam aa saka. Koi aur novel chahiye ho to zaroor batayein!";
  }

  // 6. Greetings
  const greetingsPatterns = [
    "salam", "assalam o alaikum", "assalam u alaikum", "assalam alaikum",
    "assalamu alaikum", "asalam alaikum", "asalam o alaikum", "aoa",
    "slam", "hi", "hello", "hey"
  ];
  if (isMatch(greetingsPatterns)) {
    return "Walaikum Assalam! 😊 Main bilkul theek hun. Aap kis novel ki talash mein hain? Naam likhein ya kahain 'Koi acha novel batao'!";
  }

  return null;
}

// ── Send with 25-second timeout wrapper ─────────────────────────────
async function sendWithTimeout(apiPromise, timeoutMs = 25000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error("AI request timed out after 25 seconds");
      err.status = 504;
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([apiPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// ── Retry helper: sends a Groq chat request, retries once on 503/429 ──
async function sendWithRetry(groqClient, messages, tools) {
  const isRetryable = (err) => {
    const msg = (err?.message || "").toLowerCase();
    const status = err?.status ?? err?.statusCode ?? 0;
    return (
      status === 503 ||
      status === 429 ||
      status === 504 ||
      msg.includes("503") ||
      msg.includes("429") ||
      msg.includes("timed out") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("quota") ||
      msg.includes("rate_limit")
    );
  };

  const makeRequest = () => {
    const payload = {
      model: "openai/gpt-oss-120b",
      messages,
    };
    // Only add tools/tool_choice when tools are actually provided.
    // Sending tool_choice: "auto" with tools: undefined causes an API error.
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }
    return groqClient.chat.completions.create(payload);
  };

  try {
    return await sendWithTimeout(makeRequest(), 25000);
  } catch (firstErr) {
    if (!isRetryable(firstErr)) throw firstErr; // non-retryable — bubble up immediately

    // If it was already a 25-second timeout, don't wait another 25s; trigger fallback immediately
    if (firstErr?.status === 504 || (firstErr?.message || "").includes("timed out")) {
      throw firstErr;
    }

    // Wait 800 ms then try once more with timeout
    await new Promise((res) => setTimeout(res, 800));
    return await sendWithTimeout(makeRequest(), 25000); // throws if it fails again — caught by caller
  }
}

// ── Build an ilike OR-filter clause for one query term ───────────────
// • Multi-word query  →  join words with % so intervening words are tolerated
//     "DNA Episode 4"  →  Titles.ilike.%DNA%Episode%4%
// • Short (≤3 chars) single-word query  →  word-boundary matching to avoid
//   substring hits inside longer words ("DNA" must not match "Adnan")
//     "DNA"  →  Titles.ilike.DNA %,Titles.ilike.% DNA %,Titles.ilike.% DNA
// • Normal single-word query  →  standard %word% substring
function buildIlikeFilters(q) {
  const words = q.trim().split(/\s+/);

  if (words.length > 1) {
    // Multi-word: tolerate extra words in between
    return [`Titles.ilike.%${words.join("%")}%`];
  }

  if (q.length <= 3) {
    // Short acronym: word-boundary guards
    return [
      `Titles.ilike.${q} %`,      // starts the title
      `Titles.ilike.% ${q} %`,    // in the middle
      `Titles.ilike.% ${q}`,      // ends the title
    ];
  }

  // Standard substring match
  return [`Titles.ilike.%${q}%`];
}

// ── Shared Supabase search (used by both normal and fallback paths) ───
// Strips generic words before querying. If only generic words remain, returns [].
async function searchSupabase(queries) {
  if (!Array.isArray(queries) || queries.length === 0) return [];

  // Strip generic words (novel, book, pdf, download, etc.) from every query term
  const cleanedQueries = queries
    .map(stripGenericWords)
    .filter((q) => q.length > 0 && !DB_BLOCKED_TERMS.has(q.toLowerCase().trim()));

  // If ALL queries stripped to nothing, or only DB-blocked generic terms remain, bail out.
  // This prevents "hinavay novel" from falling back to searching just "%novel%".
  if (cleanedQueries.length === 0) {
    return [];
  }

  // Additional guard: if every cleaned query is STILL a blocked generic word, return [].
  const hasRealTerm = cleanedQueries.some(
    (q) => !DB_BLOCKED_TERMS.has(q.toLowerCase().trim())
  );
  if (!hasRealTerm) {
    return [];
  }

  const orFilter = cleanedQueries.flatMap(buildIlikeFilters).join(",");
  if (!orFilter) return [];

  const { data: ilikeData, error: ilikeError } = await supabase
    .from("urdu_novels")
    .select("Titles, Links")
    .or(orFilter)
    .limit(10);

  if (!ilikeError && ilikeData && ilikeData.length > 0) {
    return ilikeData;
  }

  // Fuzzy RPC fallback — only on the FIRST meaningful (non-generic) query term
  const firstReal = cleanedQueries.find(
    (q) => !DB_BLOCKED_TERMS.has(q.toLowerCase().trim()) && q.length >= 3
  );
  if (firstReal) {
    const { data: fuseData, error: fuseError } = await supabase.rpc(
      "search_novels_fuse",
      { search_term: firstReal }
    );
    if (!fuseError && fuseData && fuseData.length > 0) {
      return fuseData.slice(0, 8);
    }
  }

  return [];
}

// ── RAG: Search novel_knowledge table for matching knowledge entries ───
// Accepts an array of cleaned keywords; queries novel_title, author,
// genres, and characters with ilike OR across all keywords.
// Returns up to 5 rows. Silently returns [] on any error (table may not exist yet).
async function searchNovelKnowledge(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return [];

  // Filter out very short words and common filler so we only search meaningful terms
  const RAG_FILLER = new Set([
    "ka", "ki", "ke", "hai", "hain", "ha", "aur", "or", "ya", "koi", "sa", "se", "ko",
    "to", "toh", "hi", "ye", "yeh", "woh", "wo", "ab", "bhi", "is",
    "mein", "main", "par", "pe", "tak", "the", "tha", "thi", "thay",
    "ho", "hota", "hoti", "kon", "kaun", "kya", "kis", "kaisi", "kaisa", "kaise",
    "wala", "wali", "walay", "batao", "bataye", "bataiye",
    "novel", "novels", "book", "books", "pdf", "download",
    "summary", "synopsis", "story", "kahani", "kirdar", "character",
    "characters", "hero", "heroine", "heroines", "ending", "review", "reviews", "detail", "details",
    "about", "kis", "bare", "baray", "relationship", "rishta", "villain",
  ]);

  const validKeywords = keywords
    .map((w) => (typeof w === "string" ? w.replace(/[,%()]/g, "").trim() : ""))
    .filter((w) => w.length >= 2 && !RAG_FILLER.has(w.toLowerCase()));

  if (validKeywords.length === 0) return [];

  try {
    // Build OR filter across all four searchable text columns for every keyword
    const orParts = validKeywords.flatMap((kw) => [
      `novel_title.ilike.%${kw}%`,
      `author.ilike.%${kw}%`,
      `genres.ilike.%${kw}%`,
      `characters.ilike.%${kw}%`,
    ]);

    const { data, error } = await supabase
      .from("novel_knowledge")
      .select(
        "id, novel_title, author, genres, characters, ending_vibe, detailed_summary, source_url"
      )
      .or(orParts.join(","))
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      // Table may not exist yet — non-fatal
      if (
        error.message?.includes("novel_knowledge") ||
        error.message?.includes("relation") ||
        error.code === "42P01" // PostgreSQL undefined_table
      ) {
        return [];
      }
      console.warn("searchNovelKnowledge error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    // Never crash the chat due to a missing/unavailable knowledge table
    console.warn("searchNovelKnowledge caught error:", err?.message);
    return [];
  }
}

// ── Format RAG knowledge items into a clean text block for the system prompt ──
function formatKnowledgeBlock(items) {
  if (!items || items.length === 0) return "";

  const lines = items.map((item, i) => {
    const parts = [];
    parts.push(`[${i + 1}] Novel: ${item.novel_title || "Unknown"}`);
    if (item.author)        parts.push(`    Author: ${item.author}`);
    if (item.genres)        parts.push(`    Genres/Tropes: ${item.genres}`);
    if (item.characters)    parts.push(`    Characters: ${item.characters}`);
    if (item.ending_vibe)   parts.push(`    Ending Vibe: ${item.ending_vibe}`);
    if (item.detailed_summary) {
      // Trim summary to ~600 chars to keep prompt size manageable
      const summary = item.detailed_summary.length > 600
        ? item.detailed_summary.slice(0, 600) + "..."
        : item.detailed_summary;
      parts.push(`    Summary: ${summary}`);
    }
    return parts.join("\n");
  });

  return "\n\n[VERIFIED NOVEL KNOWLEDGE BASE]\n" + lines.join("\n\n");
}

// ── Popular Urdu Novel Authors List ──────────────────────────────────
const POPULAR_AUTHORS = [
  "Nimra Ahmed",
  "Nemrah Ahmed",
  "Umera Ahmed",
  "Umaira Ahmed",
  "Farhat Ishtiaq",
  "Sumaira Hameed",
  "Hashim Nadeem",
  "Bano Qudsia",
  "Ashfaq Ahmed",
  "Qaisra Hayat",
  "Nighat Abdullah",
  "Riffat Siraj",
  "Tariq Ismail Sagar",
  "M A Rahat",
  "MA Rahat",
  "Naseem Hijazi",
  "Saadat Hasan Manto",
  "Manto",
  "Razia Butt",
  "Bushra Rehman",
  "Amjad Javed",
  "Areej Shah",
  "Tanzeela Riaz",
  "Zeenia Sharjeel",
  "Ana Ilyas",
  "Effat Seher Tahir",
  "Sundas Jabeen",
  "Rabia Khan",
  "Aleem Ul Haq Haqqi",
  "Mustansar Hussain Tarar",
  "Mohiuddin Nawab",
  "Ilyas Sitapuri",
];

// Helper to detect author and requested novel title from message, args, and queries
function detectAuthorAndRequestedNovel(userMessage, callArgs = {}, queries = []) {
  let author = callArgs.author ? callArgs.author.trim() : null;
  let novelTitle = callArgs.novel_title ? callArgs.novel_title.trim() : null;
  let hasAuthorIntent = Boolean(author);

  const rawMsg = (userMessage || "").trim();

  // Check if query contains author-indicator keywords
  const hasBy         = /\bby\b/i.test(rawMsg);
  const hasOf         = /\b(?:of|all\s+novels?\s+of|all\s+books?\s+of)\b/i.test(rawMsg);
  const hasKe         = /\b(?:ke|ki)\s+(?:novels?|books?|tamam|sab|saari|sabhi)\b/i.test(rawMsg);
  const hasWrittenBy  = /\b(?:written\s+by|writer)\b/i.test(rawMsg);
  const hasUrduMusannif = rawMsg.includes("مصنف");
  const hasRomanMusannif = /\bmusann?if\b/i.test(rawMsg);

  if (hasBy || hasOf || hasKe || hasWrittenBy || hasUrduMusannif || hasRomanMusannif) {
    hasAuthorIntent = true;
  }

  // 1. If author not yet extracted, check "by <Author>" / "written by <Author>" / "writer <Author>"
  if (!author && (hasBy || hasWrittenBy)) {
    const byMatch = rawMsg.match(/\b(?:written\s+by|writer|by)\s+([A-Za-z\u0600-\u06FF][\w\s\u0600-\u06FF]*?)(?:\s+novel|\s+book|\s+ka|\s+ki|\s+ke|\s+links?|\s+pdf|$)/i);
    if (byMatch) {
      const candidateAuthor = byMatch[1].trim();
      const cleanAuthor = candidateAuthor
        .replace(/\b(?:novels?|books?|kitab|kutub|links?|pdf|download|chahiye|ka|ki|ke|do|de|batao|bataiye|please|plz|all|episodes?|part)\b/gi, " ")
        .replace(/[^\w\s\u0600-\u06FF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanAuthor.length >= 2) {
        author = cleanAuthor;
      }
    }

    // Also try <title> by <author> pattern for title extraction
    if (!novelTitle) {
      const titleByMatch = rawMsg.match(/^(.+?)\s+\b(?:written\s+by|by)\b/i);
      if (titleByMatch) {
        const cleanTitle = stripGenericWords(titleByMatch[1].trim())
          .replace(/\b(?:read|parhna|mujhe|chahiye|do|de|download|link|links)\b/gi, " ")
          .trim();
        if (cleanTitle.length >= 2) {
          novelTitle = cleanTitle;
        }
      }
    }
  }

  // 1b. Check "all novels of <Author>" / "novels of <Author>"
  if (!author && hasOf) {
    const ofMatch = rawMsg.match(/\b(?:all\s+novels?\s+of|novels?\s+of|books?\s+of|all\s+books?\s+of)\s+([A-Za-z\u0600-\u06FF][\w\s\u0600-\u06FF]+)/i);
    if (ofMatch) {
      const cleanAuthor = ofMatch[1]
        .replace(/\b(?:novels?|books?|kitab|kutub|links?|pdf|download|chahiye|do|de)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanAuthor.length >= 2) {
        author = cleanAuthor;
      }
    }
  }

  // 1c. Check "<Author> ke novels" / "<Author> ki novels" patterns
  if (!author && hasKe) {
    const keMatch = rawMsg.match(/^(.+?)\s+\b(?:ke|ki)\s+(?:novels?|books?|tamam|sab|saari|sabhi)/i);
    if (keMatch) {
      const cleanAuthor = keMatch[1]
        .replace(/\b(?:mujhe|chahiye|please|plz)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanAuthor.length >= 2) {
        author = cleanAuthor;
      }
    }
  }

  // 2. If author not yet extracted, check Urdu "مصنف" or Roman "musannif"
  if (!author && (hasUrduMusannif || hasRomanMusannif)) {
    const mMatch = hasUrduMusannif
      ? rawMsg.match(/^(.*?)(?:مصنف|کی\s+مصنفہ|کا\s+مصنف)\s+(.*)$/)
      : rawMsg.match(/^(.*?)\bmusann?if\b\s+(.*)$/i);

    if (mMatch) {
      const candidateTitle = mMatch[1].trim();
      const candidateAuthor = mMatch[2].trim();

      const cleanAuthor = candidateAuthor
        .replace(/\b(?:novels?|books?|kitab|kutub|links?|pdf|download|chahiye|ka|ki|ke|do|de|batao|bataiye|please|plz)\b/gi, " ")
        .replace(/(?:ناول|کتاب|لنک|ڈاؤن لوڈ|پی ڈی ایف|چاہیے|دو|دے|کا|کی|کے)/g, " ")
        .replace(/[^\w\s\u0600-\u06FF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanAuthor.length >= 2) {
        author = cleanAuthor;
      }

      if (!novelTitle && candidateTitle) {
        const cleanTitle = stripGenericWords(candidateTitle).trim();
        if (cleanTitle.length >= 2) {
          novelTitle = cleanTitle;
        }
      }
    }
  }

  // 3. Check popular authors if author is still not found
  if (!author) {
    const lowerMsg = rawMsg.toLowerCase();
    for (const a of POPULAR_AUTHORS) {
      if (lowerMsg.includes(a.toLowerCase())) {
        author = a;
        hasAuthorIntent = true;
        break;
      }
    }
  }

  // 4. If author is identified but novelTitle was not passed, detect from user message or queries
  if (!novelTitle && author) {
    const authorEscaped = author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern1 = new RegExp(
      `${authorEscaped}\\s+(?:ka|ki|ke)\\s+([A-Za-z0-9\\u0600-\\u06FF\\s]+?)(?:\\s+novel|\\s+book|\\s+links?|\\s+pdf|\\s+chahiye|$)`,
      "i"
    );
    const m1 = rawMsg.match(pattern1);
    if (m1 && m1[1] && m1[1].trim().length > 1) {
      const candidate = m1[1].trim();
      if (!/^(tamam|sab|koi|har|ache|acche|baqi|all|best)$/i.test(candidate)) {
        novelTitle = candidate;
      }
    }

    if (!novelTitle) {
      const pattern2 = new RegExp(`([A-Za-z0-9\\u0600-\\u06FF\\s]+?)\\s+by\\s+${authorEscaped}`, "i");
      const m2 = rawMsg.match(pattern2);
      if (m2 && m2[1] && m2[1].trim().length > 1) {
        novelTitle = m2[1].trim();
      }
    }

    if (!novelTitle && queries.length > 0) {
      for (const q of queries) {
        const cleanQ = stripGenericWords(q).trim();
        if (
          cleanQ &&
          !cleanQ.toLowerCase().includes(author.toLowerCase()) &&
          !author.toLowerCase().includes(cleanQ.toLowerCase())
        ) {
          novelTitle = cleanQ;
          break;
        }
      }
    }
  }

  return { author, novelTitle, hasAuthorIntent };
}

// Helper to check if a title actually contains the requested author's name
function titleMatchesAuthor(title, author) {
  if (!title || !author) return false;
  const tLower = title.toLowerCase();
  const aLower = author.toLowerCase().trim();

  // Direct substring match
  if (tLower.includes(aLower)) return true;

  // Handle common author name aliases (e.g. Nemrah / Nimra, Umaira / Umera)
  const normalizedA = aLower.replace(/\bnemrah\b/g, "nimra").replace(/\bumaira\b/g, "umera");
  const normalizedT = tLower.replace(/\bnemrah\b/g, "nimra").replace(/\bumaira\b/g, "umera");
  if (normalizedT.includes(normalizedA)) return true;

  // Word-by-word match: all non-generic words in author name must appear in title
  const words = aLower.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length > 0 && words.every((w) => tLower.includes(w))) {
    return true;
  }

  return false;
}

// Helper to check whether any returned novel matches the requested novel title
function matchesRequestedNovel(novels, requestedNovel) {
  if (!requestedNovel) return false;
  const cleanReq = requestedNovel
    .toLowerCase()
    .replace(/\b(novels?|books?|pdf)\b/gi, "")
    .trim();
  if (!cleanReq || cleanReq.length < 2) return false;

  const reqWords = cleanReq.split(/\s+/).filter((w) => w.length >= 2);
  if (reqWords.length === 0) return false;

  return novels.some((n) => {
    const title = (n.Titles || "").toLowerCase();
    if (title.includes(cleanReq)) return true;
    return reqWords.every((w) => title.includes(w));
  });
}

// ── Episode number detection ────────────────────────────────────────
// Looks at both the raw user message and query strings for
// patterns like "episode 4", "ep 12", "part 3", "qist 7".
const EPISODE_RE = /\b(?:ep(?:isode)?|part|qist)\s*(\d+)\b/i;

function detectRequestedEpisode(userMessage, queries = []) {
  // Check user message first (most reliable signal)
  const msgMatch = userMessage.match(EPISODE_RE);
  if (msgMatch) return parseInt(msgMatch[1], 10);

  // Then check extracted queries
  for (const q of queries) {
    const qMatch = q.match(EPISODE_RE);
    if (qMatch) return parseInt(qMatch[1], 10);
  }

  return null; // no specific episode requested
}

// Helper to test if a word or phrase appears with word boundaries (\b / unicode boundaries)
function hasWordBoundaryMatch(text, word) {
  if (!text || !word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const unicodeBoundary = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu");
  const asciiBoundary = new RegExp(`\\b${escaped}\\b`, "i");
  return unicodeBoundary.test(text) || asciiBoundary.test(text);
}

// ── Relevance scoring & sorting ─────────────────────────────────────
// Scores each novel title by how many words from each query it matches,
// with a massive score boost for standalone word-boundary matches (\b).
function scoreAndSort(novels, queries) {
  if (!novels || novels.length === 0) return [];
  const cleanQueries = queries
    .map(stripGenericWords)
    .filter((q) => q.length > 0);
  const effectiveQueries = cleanQueries.length > 0 ? cleanQueries : queries;

  // Sort queries longest-first so the most specific ones score highest
  const sorted = [...effectiveQueries].sort((a, b) => b.length - a.length);

  const sortedNovels = [...novels].sort((a, b) => {
    const scoreA = relevanceScore(a.Titles, sorted);
    const scoreB = relevanceScore(b.Titles, sorted);
    return scoreB - scoreA; // higher score first
  });

  // Check if we have exact standalone word matches (e.g. "Namal" vs "Namaloom")
  const exactMatches = sortedNovels.filter((n) =>
    sorted.some((q) => {
      const cleanQ = q.toLowerCase().trim();
      if (!cleanQ) return false;
      const words = cleanQ.split(/\s+/).filter((w) => w.length >= 2);
      return (
        hasWordBoundaryMatch((n.Titles || "").toLowerCase(), cleanQ) ||
        words.some((w) => hasWordBoundaryMatch((n.Titles || "").toLowerCase(), w))
      );
    })
  );

  // If plenty of exact word matches exist (>= 2), filter out partial/prefix-only matches (like "Namaloom")
  if (exactMatches.length >= 2) {
    return exactMatches;
  }

  return sortedNovels;
}

function relevanceScore(title, sortedQueries) {
  const tLower = (title || "").toLowerCase();
  let score = 0;

  for (const q of sortedQueries) {
    const cleanQ = q.toLowerCase().trim();
    if (!cleanQ) continue;

    // Full query standalone match boost
    if (hasWordBoundaryMatch(tLower, cleanQ)) {
      score += cleanQ.length * 50;
    }

    const words = cleanQ.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      if (hasWordBoundaryMatch(tLower, w)) {
        // High score boost for exact standalone word match (\bword\b)
        score += w.length * 20;
      } else if (tLower.includes(w)) {
        // Substring / partial prefix match (e.g. "namal" inside "namaloom") gets low score
        score += w.length * 1;
      }
    }
  }

  return score;
}

// ── Episode & Author-aware response builder ────────────────────────
// Returns { reply, text, items } with the accurate message phrasing.
function buildEpisodeAwareResponse(novels, requestedEp, authorInfo = {}, userMessage = "") {
  const { author, novelTitle, hasAuthorIntent } = authorInfo;
  const items = novels.slice(0, 8).map((n) => ({
    title: n.Titles,
    url: toDirectDownloadUrl(n.Links),
  }));

  // ── Episode check ────────────────────────────────────────────────
  if (requestedEp !== null) {
    const epRegex = new RegExp(`\\b0*${requestedEp}\\b`);
    const hasExactEp = novels.some((n) => epRegex.test(n.Titles || ""));

    if (hasExactEp) {
      items.sort((a, b) => {
        const aMatch = epRegex.test(a.title) ? 1 : 0;
        const bMatch = epRegex.test(b.title) ? 1 : 0;
        return bMatch - aMatch;
      });
      return {
        reply: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
        text: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
        items,
      };
    }

    const replyMsg = `Episode ${requestedEp} abhi hamare database mein upload nahi hui, lekin is novel ke ye links maujood hain:`;
    return { reply: replyMsg, text: replyMsg, items };
  }

  // ── Author query handling ────────────────────────────────────────
  // Detect all author-indicator keywords (mirrors detectAuthorAndRequestedNovel)
  const msg = userMessage || "";
  const isAuthorQuery = Boolean(
    hasAuthorIntent ||
    author ||
    /\bby\b/i.test(msg) ||
    /\b(?:written\s+by|writer)\b/i.test(msg) ||
    /\b(?:of|all\s+novels?\s+of|all\s+books?\s+of)\b/i.test(msg) ||
    /\b(?:ke|ki)\s+(?:novels?|books?|tamam|sab|saari|sabhi)\b/i.test(msg) ||
    msg.includes("مصنف") ||
    /\bmusann?if\b/i.test(msg)
  );

  if (isAuthorQuery && author) {
    const hasMatchingAuthor = novels.some((n) => titleMatchesAuthor(n.Titles, author));

    // Detect if user requested a specific novel title (not just an author's full collection)
    // A collection query looks like: "all novels of X", "X ke novels", "X ki tamam novels"
    const isCollectionQuery = Boolean(
      !novelTitle ||
      /\b(?:all|tamam|sab|saari|sabhi)\b/i.test(msg) ||
      /\b(?:of|all\s+novels?\s+of|all\s+books?\s+of)\b/i.test(msg) ||
      /\b(?:ke|ki)\s+(?:novels?|books?|tamam|sab|saari|sabhi)\b/i.test(msg)
    );

    // Only show mismatch greeting if: a specific title was requested AND author does not match
    if (!isCollectionQuery && !hasMatchingAuthor) {
      const mismatchMsg =
        "Maazrat, mujhe is waqt yeh exact novel nahi mila, lekin is naam se milte julte kuch aur novels ye rahe:";
      return { reply: mismatchMsg, text: mismatchMsg, items };
    }

    // Author matched in titles but the exact requested novel wasn't among them
    if (!isCollectionQuery && hasMatchingAuthor && novelTitle) {
      const hasExactNovel = matchesRequestedNovel(novels, novelTitle);
      if (!hasExactNovel) {
        const canonicalAuthor =
          POPULAR_AUTHORS.find((p) => p.toLowerCase() === author.toLowerCase()) || author;
        const replyMsg = `Mujhe yeh exact novel nahi mila, lekin ${canonicalAuthor} ke baqi novels ye rahe:`;
        return { reply: replyMsg, text: replyMsg, items };
      }
    }

    // Author collection query or exact match found → standard greeting
    return {
      reply: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
      text: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
      items,
    };
  }

  // Standard reply
  return {
    reply: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
    text: "Ji bilkul! Ye rahe aap ke novels ke direct download links:",
    items,
  };
}

// ── POST handler ────────────────────────────────────────────────────
export async function POST(req) {
  try {
    // ── Global Site Setting Check: Novel Chatbot Visibility ───────────────
    try {
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("chatbot_enabled")
        .eq("id", 1)
        .maybeSingle();

      if (settingsData && settingsData.chatbot_enabled === false) {
        return NextResponse.json(
          { error: "Novel Chatbot Assistant is temporarily disabled by administrator." },
          { status: 403 }
        );
      }
    } catch (settingErr) {
      // If table doesn't exist yet, proceed with normal chatbot operation
    }

    const body = await req.json().catch(() => ({}));

    // ── Parse request: accept { messages } (array) or { message } / { userMessage } (string) ──
    let currentMessage = "";
    let historyMessages = [];

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      // Find the last user message in the array
      let lastUserIdx = -1;
      for (let i = body.messages.length - 1; i >= 0; i--) {
        const m = body.messages[i];
        if (m && (m.role || "").toLowerCase() === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx === -1) {
        lastUserIdx = body.messages.length - 1;
      }

      const lastMsg = body.messages[lastUserIdx];
      currentMessage = (
        typeof lastMsg === "string"
          ? lastMsg
          : (lastMsg?.content || lastMsg?.text || "")
      ).trim();

      // If currentMessage is empty, fallback to body.message / body.userMessage
      if (!currentMessage) {
        currentMessage = (body.userMessage || body.message || "").trim();
      }

      // History messages: previous 4 to 6 messages, excluding the current message
      const rawHistory = body.messages.filter((_, idx) => idx !== lastUserIdx).slice(-6);
      historyMessages = rawHistory
        .map((m) => {
          const role = (m.role === "bot" || m.role === "assistant") ? "assistant" : "user";
          const content = typeof m === "string" ? m : (m.content || m.text || "");
          return { role, content: content.trim() };
        })
        .filter((m) => m.content.length > 0);
    } else {
      currentMessage = (body.userMessage || body.message || "").trim();
    }

    const userMessage = currentMessage;

    // ── Strict NSFW filter (Task 2 & 3: checked before ANY AI or Supabase calls) ──
    if (isBlockedNsfw(userMessage)) {
      const nsfwReply =
        "Maazrat, hum yahan sirf saaf suthre aur family-friendly Urdu novels faraham karte hain. Barae meharbani kisi aur novel ka naam likhein.";
      return NextResponse.json({
        text: nsfwReply,
        reply: nsfwReply,
        items: [],
      });
    }

    // Validate input
    if (!userMessage || userMessage.length === 0) {
      return NextResponse.json(
        { reply: "Kuch to likhein! 😊", text: "Kuch to likhein! 😊", items: [] },
        { status: 400 }
      );
    }

    if (userMessage.length > 300) {
      return NextResponse.json(
        { reply: "Message bohat lamba hai, 300 characters se kam rakhein.", text: "Message bohat lamba hai, 300 characters se kam rakhein.", items: [] },
        { status: 400 }
      );
    }

    // ── Instant fast-path for common chit-chat (0ms response + saves API quota) ──
    const fastReply = getFastPathReply(userMessage);
    if (fastReply) {
      return NextResponse.json({
        reply: fastReply,
        text: fastReply,
        items: [],
      });
    }

    // ── Fast-path direct database search before AI ──────────────────
    // Skip this fast-path for: recommendation queries AND conversational/summary queries
    // so that those route to the AI for a proper text response.
    const isRecommendationQuery =
      /\b(koi\s+ach[ha]|best|top|recommend|suggest|list|famous|mashhoor|achay|kuch\s+novel)\b/i.test(
        userMessage
      );

    const isConversationalQuery =
      /\b(summary|synopsis|kahani|story|kis\s+baray|kis\s+bare|kya\s+hai|story\s+kya|about|detail|details|review|reviews|tafseel|mukhtalif|matlab|kirdar|character|characters|hero|heroine|ending|happy\s+ending|sad\s+ending|kaisa\s+hai|kaisi\s+hai|kaise\s+hai|kaisa\s+novel|kon|kaun|kon\s+hai|kon\s+hain|kaun\s+hai|kaun\s+hain|characters\s+kaun|relationship|rishta|rishtay|villain|recommend|suggest|batao|cousin\s+marriage|rude\s+hero|forced\s+marriage|suspense|thriller|romantic|trope|tropes|vibe|plot|climax|genre|genres)\b/i.test(
        userMessage.toLowerCase()
      );

    if (!isRecommendationQuery && !isConversationalQuery) {
      const authorInfo = detectAuthorAndRequestedNovel(userMessage);
      const searchTerms = [];

      if (authorInfo.novelTitle) {
        searchTerms.push(authorInfo.novelTitle);
      }
      if (authorInfo.author) {
        searchTerms.push(authorInfo.author);
      }

      // Safe keyword fallback: if no title/author found, extract keywords
      // but only use them if they produce non-empty results after stripping generics
      const rawKeywords = searchTerms.length > 0 ? searchTerms : extractKeywords(userMessage);
      const safeKeywords = rawKeywords.filter((k) => {
        // Keep keyword if stripping generic words leaves something meaningful,
        // OR keep the original if stripping leaves nothing (safe fallback)
        return k.length >= 2;
      });

      if (safeKeywords.length > 0) {
        let directNovels = await searchSupabase(safeKeywords);

        if (directNovels && directNovels.length > 0) {
          directNovels = scoreAndSort(directNovels, safeKeywords);
          const requestedEp = detectRequestedEpisode(userMessage, safeKeywords);
          const { reply, text, items } = buildEpisodeAwareResponse(
            directNovels,
            requestedEp,
            authorInfo,
            userMessage
          );
          return NextResponse.json({ reply, text, items });
        }
      }
    }

    // Verify API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "AI service abhi configure nahi hai.", text: "AI service abhi configure nahi hai.", items: [] },
        { status: 500 }
      );
    }

    // Initialize Groq
    const groq = new Groq({ apiKey });

    // ── Build messages and tools — varies by query type ──────────────
    // For conversational/summary queries: no tool calls allowed.
    // For search/download queries: full tool-calling enabled.
    let chatMessages;
    let toolsToUse;
    // convDbItems carries DB-matched items for conversational queries so we can
    // attach download links alongside the AI's text reply.
    let convDbItems = [];

    if (isConversationalQuery) {
      // ── Step 1: Strip conversational/summary filler words and extract keywords ───
      const SUMMARY_FILLER = new Set([
        "summary", "synopsis", "kahani", "story", "detail", "details", "tafseel",
        "kis", "baray", "bare", "ma", "ha", "mein", "main", "ki", "ka", "ke",
        "do", "mujhy", "mujhe", "about", "review", "reviews", "mukhtalif", "matlab",
        "kya", "kia", "hai", "hain", "tha", "thi", "thay", "ho", "hota", "hoti",
        "kon", "kaun", "kaisi", "kaisa", "kaise", "aur", "ya", "koi", "wala", "wali", "walay",
        "batao", "bataye", "bataiye", "bata", "de", "dein",
        "novel", "novels", "book", "books", "pdf", "download",
        // RAG-specific filler
        "kirdar", "character", "characters", "hero", "heroine", "ending", "vibe", "trope", "tropes",
        "recommend", "suggest", "genre", "genres", "plot", "climax",
        "relationship", "rishta", "villain",
      ]);

      // Strip punctuation (e.g. '?' or '.') so trailing punctuation doesn't prevent filler matching
      const cleanConvMessage = userMessage
        .toLowerCase()
        .replace(/[^\w\s\u0600-\u06FF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const convSearchKeywords = cleanConvMessage
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 2 &&
            !SUMMARY_FILLER.has(w) &&
            !DB_BLOCKED_TERMS.has(w)
        );

      // ── Step 2: Run urdu_novels DB search + novel_knowledge RAG search in parallel ──
      let dbTitleContext = "";
      let knowledgeContext = "";
      let knowledgeItems = [];

      await Promise.all([
        // --- Branch A: Standard urdu_novels PDF title search ---
        (async () => {
          if (convSearchKeywords.length > 0) {
            try {
              let dbMatches = await searchSupabase(convSearchKeywords);
              if (dbMatches && dbMatches.length > 0) {
                dbMatches = scoreAndSort(dbMatches, convSearchKeywords);
                convDbItems = dbMatches.slice(0, 6).map((n) => ({
                  title: n.Titles,
                  url: toDirectDownloadUrl(n.Links),
                }));
                dbTitleContext =
                  "\n\nDATABASE MATCH (ye hamare database ke real titles hain):\n" +
                  convDbItems.map((it) => `- ${it.title}`).join("\n");
              }
            } catch (_) {
              // Non-fatal: proceed without DB context
            }
          }
        })(),

        // --- Branch B: novel_knowledge RAG search ---
        (async () => {
          try {
            knowledgeItems = await searchNovelKnowledge(convSearchKeywords);
          } catch (_) {
            knowledgeItems = [];
          }
        })(),
      ]);

      // ── Step 3: Always Prioritize RAG-Matched Novel Titles for PDF Links ───
      // Whenever verified knowledge exists, ALWAYS search urdu_novels for the exact
      // novel titles from knowledgeItems and place those PDFs at the VERY TOP of convDbItems
      // (replacing any generic keyword matches like "Suspense Digest" or random "Hai" novels).
      if (knowledgeItems.length > 0) {
        try {
          const ragTitles = [
            ...new Set(
              knowledgeItems.map((k) => k.novel_title?.trim()).filter(Boolean)
            ),
          ];

          if (ragTitles.length > 0) {
            let ragPdfMatches = [];
            for (const title of ragTitles) {
              const matched = await searchSupabase([title]);
              if (matched && matched.length > 0) {
                const sorted = scoreAndSort(matched, [title]);
                ragPdfMatches.push(...sorted);
              }
            }

            if (ragPdfMatches.length > 0) {
              const seenUrls = new Set();
              const ragDbItems = [];
              for (const n of ragPdfMatches) {
                const url = toDirectDownloadUrl(n.Links);
                if (!seenUrls.has(url)) {
                  seenUrls.add(url);
                  ragDbItems.push({
                    title: n.Titles,
                    url,
                  });
                }
              }

              // Place verified RAG novel PDFs at the very top (replacing generic matches)
              convDbItems = ragDbItems.slice(0, 6);

              dbTitleContext =
                "\n\nDATABASE MATCH (Verified RAG novel download links):\n" +
                convDbItems.map((it) => `- ${it.title}`).join("\n");
            }
          }
        } catch (_) {
          // Non-fatal
        }
      }

      // Format RAG knowledge block
      knowledgeContext = formatKnowledgeBlock(knowledgeItems);

      // ── Step 4: Build strict anti-hallucination conversational system prompt ───
      const hasVerifiedKnowledge = knowledgeContext.length > 0;

      const convSystemPrompt =
        "Tum Smart Novel Bank ke AI assistant ho — ek warm, knowledgeable aur enthusiastic Urdu novel expert friend." +
        dbTitleContext +
        knowledgeContext +
        "\n\nSAKHT QAWAID (in ka iltizam karna ZARURI hai):\n" +

        (hasVerifiedKnowledge
          ? (
            // ── CASE A: Verified RAG knowledge exists — use it richly ───────────────────
            "1. [VERIFIED NOVEL KNOWLEDGE BASE] mein jo information hai SIRF wahi use karo. " +
            "Character names, plot events, ending type ya tropes WAHI batao jo [VERIFIED NOVEL KNOWLEDGE BASE] mein LIKHA HUA hai. " +
            "Khud se koi detail invent ya imagine mat karo.\n" +
            "2. User ke question ka jawab ek warm, friendly, engaging tone mein do jaise koi dost bata raha ho — " +
            "Sirf 4 se 6 sentences mein, clean Roman Urdu mein. " +
            "Ending type, characters, genres/tropes, ya summary — jo bhi user ne poocha — [VERIFIED NOVEL KNOWLEDGE BASE] se accurately bayan karo.\n" +
            "3. Jawab ke end mein ek line add karo jo user ko PDF download karne ki taraf guide kare: " +
            "'Aap isay neeche diye gaye links se download kar sakte hain!'\n" +
            "4. Writer Names: SIRF woh writer ka naam use karo jo [VERIFIED NOVEL KNOWLEDGE BASE] ya DATABASE MATCH mein diya gaya ho. " +
            "Khud se koi aur writer mat banana.\n" +
            "5. Spell-Check: Always spell the novel title and character names exactly as written in [VERIFIED NOVEL KNOWLEDGE BASE] (e.g., write 'Namal', never 'Namla' or 'Nam al').\n"
          )
          : (
            // ── CASE B: No verified RAG knowledge — safe fallback only ────────────────
            "1. Writer Names: Agar DATABASE MATCH mein novel ka naam aur writer ka naam diya gaya hai, " +
            "to sirf wahi writer ka naam use karo. Khud se koi aur writer mat banana.\n" +
            "2. Multiple Authors: Agar DATABASE MATCH mein ek hi title ke mukhtalif writers mojood hon, " +
            "to mukhtasir tor par matching writers ka zikr karo.\n" +
            "3. Safe Fallback: Single writer novel ke liye yeh template use karo: " +
            "'[Novel] [Author] ka likha hua mashhoor Urdu novel hai. Aap isay neeche diye gaye links se download kar ke parh sakte hain!'\n" +
            "4. SAKHT MANA — Character names, plot details, ya fake ending type BILKUL mat batao. " +
            "Sirf real genre ya theme bata sakte ho agar 100% pakka pata ho (e.g. Peer-e-Kamil ek spiritual novel hai).\n" +
            "5. Agar DATABASE MATCH bhi empty hai: " +
            "'Maazrat, mujhe is novel ke baray mein pakki malumat nahi. Hamare database mein search karein ya Request Novel page use karein.'\n"
          )
        ) +

        "6. Jawab SIRF 2 se 6 sentences mein do (Case A mein thoda zyada theek hai). Bohat lamba jawab mat likho.\n" +
        "7. MARKDOWN BILKUL NAHI: ** ya * ya ### ya bullet/numbered lists mat use karo. Sirf sada plain Roman Urdu text likhna hai.\n" +
        "8. Download links khud mat dena — UI neeche card mein khud links dikhayegi. Koi tool call mat karna. Sirf text mein jawab do.";

      chatMessages = [
        { role: "system", content: convSystemPrompt },
        ...historyMessages,
        {
          role: "user",
          content:
            currentMessage +
            "\n\n[Note: Sirf sada Roman Urdu text jawab chahiye. Koi markdown nahi, koi download link nahi.]",
        },
      ];
      toolsToUse = undefined; // disables tool calling
    } else {
      const systemPrompt =
        "Tum Smart Novel Bank ke friendly AI assistant ho. Hamesha polite Roman Urdu mein mukhtasir (short) jawab do. " +
        "1) Agar user kisi specific novel ya writer ka naam maange, to 'search_novels' tool call karo (spelling theek kar ke). " +
        "Agar user ne kisi author ka specific novel maanga ho (jaise 'Nemrah Ahmed ka XYZ novel'), to tool arguments mein 'author' (writer ka naam), 'novel_title' (requested novel ka naam), aur 'queries' mein novel title aur author dono shamil karo. " +
        "2) Agar user kahe 'koi acha sa novel batao' ya kisi genre (Romantic, Rude Hero, Suspense, Digest, Spiritual) ki recommendation maange, to apni knowledge se 3 famous Urdu novels chuno aur 'search_novels' tool call karo. " +
        "3) Kabhi khud se fake link mat banana. " +
        "4) Agar author identify ho jaye lekin exact requested novel database mein na mile aur author ke doosre novels mil jayein, to jawab is tarah phrase karo: 'Mujhe yeh exact novel nahi mila, lekin [Author] ke baqi novels ye rahe:' (Author ki jagah writer ka actual naam likhein). " +
        "5) Agar user ne kisi author ka novel maanga ho (jaise 'XYZ by ABC') lekin database mein us author ka novel na mile aur milte julte doosre novels milein, to jawab is tarah phrase karo: 'Maazrat, mujhe is waqt yeh exact novel nahi mila, lekin is naam se milte julte kuch aur novels ye rahe:'.";

      chatMessages = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: currentMessage },
      ];
      toolsToUse = [searchNovelsTool];
    }

    // Send message (with auto-retry on 503/429/timeout)
    let result;
    let aiUnavailable = false;

    try {
      result = await sendWithRetry(groq, chatMessages, toolsToUse);
    } catch (aiErr) {
      const msg = (aiErr?.message || "").toLowerCase();
      const status = aiErr?.status ?? aiErr?.statusCode ?? 0;
      const isServiceError =
        status === 503 ||
        status === 429 ||
        status === 504 ||
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("timed out") ||
        msg.includes("high demand") ||
        msg.includes("overloaded") ||
        msg.includes("quota") ||
        msg.includes("rate_limit");

      if (!isServiceError) throw aiErr; // unexpected error — let outer catch handle it

      // AI is unavailable after retry / timeout — attempt direct keyword search
      console.warn("Groq unavailable or timed out, attempting direct keyword fallback:", aiErr.message);
      aiUnavailable = true;

      const keywords = extractKeywords(userMessage);
      if (keywords.length === 0) {
        return NextResponse.json({
          reply: "AI abhi busy hai aur search term samajh nahi aaya. Thori der baad dobara try karein! 🙏",
          text: "AI abhi busy hai aur search term samajh nahi aaya. Thori der baad dobara try karein! 🙏",
          items: [],
        });
      }

      const authorInfo = detectAuthorAndRequestedNovel(userMessage, {}, keywords);
      let novels = await searchSupabase(keywords);
      if (novels.length > 0) {
        // Score/sort and apply episode & author awareness even in fallback
        novels = scoreAndSort(novels, keywords);
        const requestedEp = detectRequestedEpisode(userMessage);
        const { reply, text, items } = buildEpisodeAwareResponse(
          novels,
          requestedEp,
          authorInfo,
          userMessage
        );
        return NextResponse.json({ reply, text, items });
      }

      return NextResponse.json({
        reply: "AI abhi bohat busy hai aur database mein bhi nahi mila. Thori der baad dobara try karein! 🙏",
        text: "AI abhi bohat busy hai aur database mein bhi nahi mila. Thori der baad dobara try karein! 🙏",
        items: [],
      });
    }

    // Check for function call (Groq OpenAI-compatible format)
    const responseMsg = result.choices[0]?.message;
    const toolCalls = responseMsg?.tool_calls;
    const firstToolCall = toolCalls?.[0];

    if (firstToolCall && firstToolCall.function?.name === "search_novels") {
      // Extract queries (cap at 4)
      let callArgs;
      try {
        callArgs = JSON.parse(firstToolCall.function.arguments);
      } catch {
        callArgs = {};
      }
      let queries = callArgs.queries || [];
      queries = queries.slice(0, 4);

      const authorInfo = detectAuthorAndRequestedNovel(userMessage, callArgs, queries);

      if (queries.length === 0) {
        return NextResponse.json({
          reply: "Koi novel ka naam samajh nahi aaya, dobara try karein!",
          text: "Koi novel ka naam samajh nahi aaya, dobara try karein!",
          items: [],
        });
      }

      // ── Query Supabase with improved filters (generic words stripped) ──
      let novels = await searchSupabase(queries);

      // ── Score, sort & format response (SINGLE-CALL — no second AI call)
      if (novels.length > 0) {
        novels = scoreAndSort(novels, queries);
        const requestedEp = detectRequestedEpisode(userMessage, queries);
        const { reply, text, items } = buildEpisodeAwareResponse(
          novels,
          requestedEp,
          authorInfo,
          userMessage
        );
        return NextResponse.json({ reply, text, items });
      }

      // No novels found via tool call — return standard not-found message
      const missingTerms = queries.map(stripGenericWords).filter((q) => q.length > 0);
      const displayTerms = missingTerms.length > 0 ? missingTerms.join(", ") : queries.join(", ");
      return NextResponse.json({
        reply: `Maazrat, "${displayTerms}" abhi hamare database mein nahi mila. Aap spelling check kar ke dobara try karein ya 'Request Novel' page se request bhej dein!`,
        text: `Maazrat, "${displayTerms}" abhi hamare database mein nahi mila. Aap spelling check kar ke dobara try karein ya 'Request Novel' page se request bhej dein!`,
        items: [],
      });
    }

    // ── No function call: general chat / greeting / conversational ───
    const replyText = (responseMsg?.content || "").trim();

    if (replyText) {
      // For conversational/summary queries, attach DB-matched items so the user
      // gets real download links right below the short AI text reply.
      return NextResponse.json({
        reply: replyText,
        text: replyText,
        items: convDbItems,
      });
    }

    // Only if response content is empty/whitespace AND no function was called:
    // fall back to extractKeywords(userMessage) -> searchSupabase
    const fallbackKeywords = extractKeywords(userMessage);
    if (fallbackKeywords.length > 0) {
      const authorInfo = detectAuthorAndRequestedNovel(userMessage, {}, fallbackKeywords);
      let novels = await searchSupabase(fallbackKeywords);
      if (novels.length > 0) {
        novels = scoreAndSort(novels, fallbackKeywords);
        const requestedEp = detectRequestedEpisode(userMessage);
        const { reply, text, items } = buildEpisodeAwareResponse(
          novels,
          requestedEp,
          authorInfo,
          userMessage
        );
        return NextResponse.json({ reply, text, items });
      }

      // ── Fix: 0-result fallback for non-conversational search queries ──
      // If NOT a conversational/summary/recommendation query and both fast-path DB
      // and AI tool/fallback returned 0 items, return the deterministic not-found
      // message instead of letting the AI ask "Aap kis novel ki talaash kar rahe hain?".
      if (!isConversationalQuery && !isRecommendationQuery) {
        const cleanedQueryTitle =
          fallbackKeywords
            .filter((k) => !DB_BLOCKED_TERMS.has(k.toLowerCase()))
            .join(" ") || fallbackKeywords.join(" ");

        if (cleanedQueryTitle.length > 0) {
          const notFoundMsg = `Maazrat, "${cleanedQueryTitle}" abhi hamare database mein nahi mila. Aap spelling check kar ke dobara try karein ya 'Request Novel' page se request bhej dein!`;
          return NextResponse.json({
            reply: notFoundMsg,
            text: notFoundMsg,
            items: [],
          });
        }
      }
    }

    return NextResponse.json({
      reply: "Main aap ki baat samajh nahi saca. Kis novel ya writer ki talash hai? Naam batayein ya kahain 'Koi acha novel batao'!",
      text: "Main aap ki baat samajh nahi saca. Kis novel ya writer ki talash hai? Naam batayein ya kahain 'Koi acha novel batao'!",
      items: [],
    });
  } catch (err) {
    console.error("Novel Chat API Error:", err);
    return NextResponse.json(
      { reply: "Kuch error aa gaya hai, thori der baad try karein.", text: "Kuch error aa gaya hai, thori der baad try karein.", items: [] },
      { status: 500 }
    );
  }
}
