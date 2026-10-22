import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// ── Groq client & model configuration ───────────────────────────────────────
const PRIMARY_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODEL =
  PRIMARY_MODEL === "llama-3.3-70b-versatile"
    ? "openai/gpt-oss-120b"
    : "llama-3.3-70b-versatile";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set.");
  return new Groq({ apiKey });
}

// ── Strip HTML tags from a raw HTML string ──────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Sanitize scraped markdown from Jina Reader / Blogger ─────────────────────
// Strips images, social links, navigation menus, and noisy sidebar/footer boilerplate.
function sanitizeScrapedMarkdown(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Remove linked and standalone markdown images (safely handling parens in image URLs)
  cleaned = cleaned.replace(/^\[?!\s*\[[\s\S]*?\)\s*\]?\s*$/gm, "");
  cleaned = cleaned.replace(
    /\[?\!\[[^\]]*\]\((?:https?:\/\/[^\s\)]+(?:\([^\s\)]*\)[^\s\)]*)*|[^)]+)\)\]?(?:\((?:https?:\/\/[^\s\)]+(?:\([^\s\)]*\)[^\s\)]*)*|[^)]+)\))?/g,
    ""
  );
  cleaned = cleaned.replace(/!\[[\s\S]*?\]\([^\n\r]*\)/g, "");
  cleaned = cleaned.replace(/\[\s*\]\([^\n\r]*\)/g, "");

  // 2. Strip leftover image hosting domain URLs that might have been stranded on a single line
  cleaned = cleaned.replace(
    /^[^\n]*(?:blogger\.googleusercontent\.com|\.bp\.blogspot\.com)[^\n]*$/gmi,
    ""
  );

  // 3. Convert or strip raw navigation menus, javascript links, and empty links
  cleaned = cleaned.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, "$1");
  cleaned = cleaned.replace(/\[\s*\]\([^)]*\)/gi, "");

  // 4. Cut off Blogger sidebar, footer, comments, and related post boilerplate
  const cutoffRegexes = [
    /\n#{1,4}\s*(?:You Might (?:Also )?Like|Related Posts|Post a Comment|Comments|Popular Posts|Recent Posts|Connect With Me|Search This Blog|Advertisement|Recommended Novels|Labels|Categories|Post Tags)/i,
    /\n\s*(?:Post a Comment|Powered by Blogger|Subscribe to:\s*Post Comments|All Right(?:s)? Reserved Copyright|Slow Internet\?\s*Refresh|Load Complete Library|مزید دریافت کریں|کتابیں پڑھیں)/i,
    /\n\*\s*\[(?:Newer|Older)\]/i,
  ];

  for (const regex of cutoffRegexes) {
    const match = cleaned.match(regex);
    if (match && match.index > 250) {
      cleaned = cleaned.slice(0, match.index);
    }
  }

  // 5. Clean up leading header noise while preserving Title / URL Source / Published Time metadata
  const mainTitleMatch = cleaned.match(/\n#\s+([^\n]+)/);
  if (mainTitleMatch && mainTitleMatch.index > 0) {
    const headerSlice = cleaned.slice(0, mainTitleMatch.index);
    const metaLines = headerSlice
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^(Title|URL Source|Published Time):/i.test(l));
    cleaned =
      (metaLines.length ? metaLines.join("\n") + "\n\n" : "") +
      cleaned.slice(mainTitleMatch.index);
  }

  // 6. Filter extraneous junk lines (social handles, admin tag, empty bullets, read counts)
  const lines = cleaned.split("\n");
  const filtered = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\*\s*$/i.test(trimmed)) continue; // Empty bullet point
    if (
      /^\*\s*\[(Home|About|Contact|Privacy|Disclaimer|Novel Reviews|Writers List)\]/i.test(
        trimmed
      )
    ) {
      continue;
    }
    if (/^person admin/i.test(trimmed)) continue;
    if (/^\d+\/\d+\/\d+\s+\d+\s+minute read/i.test(trimmed)) continue;
    if (/^(?:share|0)$/i.test(trimmed)) continue;
    filtered.push(line.trimEnd());
  }

  // 7. Limit to 15,000 characters of cleaned core review text
  return filtered.join("\n\n").slice(0, 15000).trim();
}

// ── Scrape clean readable text from a URL ───────────────────────────────────
// First tries Jina Reader (markdown-clean output), falls back to raw fetch + stripHtml.
async function scrapeUrl(url) {
  // 1. Jina Reader — returns clean plain text / markdown
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain" },
    });
    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text && text.trim().length > 100) {
        return sanitizeScrapedMarkdown(text.trim());
      }
    }
  } catch (_) {
    // Jina unavailable — fall through to raw fetch
  }

  // 2. Direct fetch + HTML strip
  const rawRes = await fetch(url);
  if (!rawRes.ok) throw new Error(`Failed to fetch URL (${rawRes.status}): ${url}`);
  const html = await rawRes.text();
  return sanitizeScrapedMarkdown(stripHtml(html));
}

// ── Sanitize raw unescaped newlines/control characters inside JSON strings ────
function sanitizeJsonStringNewlines(jsonStr) {
  let inString = false;
  let isEscaped = false;
  let out = "";

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        out += char;
      } else if (char === "\\") {
        isEscaped = true;
        out += char;
      } else if (char === '"') {
        inString = false;
        out += char;
      } else if (char === "\n") {
        out += "\\n";
      } else if (char === "\r") {
        out += "\\r";
      } else if (char === "\t") {
        out += "\\t";
      } else {
        out += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      out += char;
    }
  }

  return out;
}

// ── Robust JSON Extractor & Structural Repair ───────────────────────────────
function extractAndRepairJson(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty or invalid output received from AI model.");
  }

  // 1. Strip markdown fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Locate first opening brace '{'
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("No JSON object found in model output.");
  }

  let jsonCandidate = cleaned.slice(firstBrace);

  // 3. Fast path: try parsing up to the last '}'
  const lastBrace = jsonCandidate.lastIndexOf("}");
  if (lastBrace !== -1) {
    const candidate = jsonCandidate.slice(0, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      try {
        return JSON.parse(sanitizeJsonStringNewlines(candidate));
      } catch (_) {
        // Fast path failed, continue to repair
      }
    }
  }

  // 4. Try parsing full candidate directly
  try {
    return JSON.parse(jsonCandidate);
  } catch (_) {
    try {
      return JSON.parse(sanitizeJsonStringNewlines(jsonCandidate));
    } catch (_) {
      // Continue to repair
    }
  }

  // 5. Repair truncated JSON (unclosed strings, dangling commas, unclosed brackets/braces)
  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < jsonCandidate.length; i++) {
    const char = jsonCandidate[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === "}" || char === "]") {
        if (stack.length && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  let repaired = jsonCandidate;
  if (inString) {
    if (isEscaped) {
      repaired = repaired.slice(0, -1);
    }
    repaired += '"';
  }

  repaired = repaired.trimEnd();
  if (repaired.endsWith(":")) {
    repaired += ' ""';
  }
  repaired = repaired.replace(/,\s*$/, "");

  while (stack.length > 0) {
    const closer = stack.pop();
    repaired += closer;
  }

  const sanitizedRepaired = sanitizeJsonStringNewlines(repaired);
  try {
    return JSON.parse(sanitizedRepaired);
  } catch (err) {
    throw new Error(`Failed to parse repaired JSON from AI response: ${err.message}`);
  }
}

// ── System prompt for Groq knowledge extraction ─────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `
You are an expert Pakistani Urdu novel analyst and literary archivist. Your job is to read source material (a review, synopsis, reader discussion, or blog post) about a Pakistani Urdu novel and extract structured, rich, and high-quality knowledge from it so an AI novel recommendation chatbot can deliver deep, accurate, and insightful answers to readers.

Capture RICH, COMPREHENSIVE, and NUANCED details from the source text. Do NOT overly compress or truncate information.

Return a single valid JSON object with EXACTLY these keys:
{
  "novel_title": "<Roman Urdu title (include Urdu script in brackets if present in source)>",
  "author": "<Author name in Roman Urdu>",
  "genres": "<5 to 12 relevant comma-separated themes, tropes, and genres, e.g.: Suspense, Rude Hero, Cousin Marriage, Feudal System, Spiritual, Psychological Trauma, Narcissistic Lead, Strong Heroine, Revenge, Forced Marriage, Emotional Arc>",
  "characters": "<Detailed, thorough breakdown of all major and notable supporting characters mentioned in the source: character name, personality traits, emotional arc, relationships, internal flaws, psychological depth, and their role/impact in the story. Do NOT overly shorten character descriptions; preserve every nuance mentioned in the source.>",
  "ending_vibe": "<Detailed description of the ending and tone: ending type (Happy / Sad / Open / Tragic / Poetic Justice), emotional vibe, pacing, degree of romance or heartbreak, reader satisfaction/controversy, and lasting emotional impact on the reader.>",
  "detailed_summary": "<A thorough, rich, well-structured Roman Urdu summary (350 to 700+ words when source material allows) covering: the core premise, backstory, character dynamics, emotional highs and lows, central conflicts, turning points, and key plot progression without losing any nuance from the source text.>"
}

STRICT EXTRACTION RULES:
1. Base EVERY field strictly on information explicitly present or clearly analyzed in the provided source text.
2. Capture rich character arcs and narrative depth from the review. Never make vague 1-sentence summaries when the review provides richer depth.
3. Strictly ignore unrelated website sidebar links, navigation widgets, download ads, and external novel recommendations.
4. Avoid repeating identical sentences verbatim across fields.
5. All JSON string values must be properly escaped, with valid quotation marks, newlines represented as \\n, and no unescaped control characters.
6. If a specific field cannot be determined from the source, return an empty string "" (or use the provided override if supplied).
7. Output ONLY the JSON object. Do not include markdown code fences or any conversational filler.
`.trim();

// ── Supabase Admin Token Verification Helper ────────────────────────────────
async function verifySupabaseAdmin(request) {
  const authHeader =
    request?.headers?.get("authorization") ||
    request?.headers?.get("Authorization") ||
    "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return { user: null, error: "Missing authorization token" };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { user: null, error: "Invalid or expired session" };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err?.message || "Authentication error" };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/novel-knowledge
// Returns the latest 25 rows from novel_knowledge ordered by created_at desc.
// ════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  const { user } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account." },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("novel_knowledge")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("novel-knowledge GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error("novel-knowledge GET unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/novel-knowledge
// Body: { url?, rawText?, manualTitle?, manualAuthor? }
// Scrapes url (if provided), combines with rawText, calls Groq to extract
// structured fields, then inserts into novel_knowledge.
// ════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  const { user } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account." },
      { status: 401 }
    );
  }

  try {
    // ── 1. Parse request body ─────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { url, rawText, manualTitle, manualAuthor } = body || {};

    // ── 2. Gather source text ─────────────────────────────────────────────
    let scrapedText = "";

    if (url && typeof url === "string" && url.trim().length > 0) {
      try {
        scrapedText = await scrapeUrl(url.trim());
      } catch (scrapeErr) {
        console.warn("URL scrape failed:", scrapeErr.message);
        // Non-fatal — continue with rawText alone if available
      }
    }

    // Combine scraped text and manually pasted text, allowing up to 15,000 chars of core text
    const combinedSource = [scrapedText, rawText]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 15000);

    if (!combinedSource.trim()) {
      return NextResponse.json(
        { error: "No source text available. Provide a valid url and/or rawText." },
        { status: 400 }
      );
    }

    // ── 3. Build user prompt (inject manual overrides if provided) ────────
    let userPrompt = `Source text to analyse:\n\n${combinedSource}`;

    if (manualTitle && typeof manualTitle === "string" && manualTitle.trim()) {
      userPrompt += `\n\n[Override] novel_title must be: "${manualTitle.trim()}"`;
    }
    if (manualAuthor && typeof manualAuthor === "string" && manualAuthor.trim()) {
      userPrompt += `\n[Override] author must be: "${manualAuthor.trim()}"`;
    }

    // ── 4. Call Groq for structured extraction with auto-fallback ─────────
    const groq = getGroqClient();

    let modelToUse = PRIMARY_MODEL;
    let rawContent = "";
    let extracted = null;

    try {
      const completion = await groq.chat.completions.create({
        model: modelToUse,
        response_format: { type: "json_object" },
        temperature: 0.2, // Faithful extraction
        max_tokens: 6000, // High ceiling to avoid mid-JSON token truncation
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      rawContent = completion.choices?.[0]?.message?.content || "";
    } catch (primaryErr) {
      const errMsg = primaryErr?.message || "";
      const errCode = primaryErr?.error?.code || primaryErr?.code || "";
      const isJsonValidateFailed =
        primaryErr?.status === 400 &&
        (errCode === "json_validate_failed" ||
          errMsg.includes("json_validate_failed") ||
          errMsg.includes("Failed to generate JSON") ||
          errMsg.includes("max completion tokens"));
      const isModelNotFound =
        primaryErr?.status === 404 &&
        (errCode === "model_not_found" || errMsg.includes("model_not_found"));

      if (isModelNotFound) {
        modelToUse = FALLBACK_MODEL;
        console.warn(
          `Primary model ${PRIMARY_MODEL} not found. Retrying with ${FALLBACK_MODEL}...`
        );
      }

      // Retry without response_format if json_validate_failed (or 400) occurred
      if (isJsonValidateFailed || primaryErr?.status === 400 || isModelNotFound) {
        console.warn(
          `Groq JSON mode encountered an issue (${errCode || errMsg}). Retrying once without response_format json_object...`
        );

        const fallbackSystemPrompt = `${EXTRACTION_SYSTEM_PROMPT}\n\nCRITICAL INSTRUCTION: Return ONLY a raw valid JSON object starting with { and ending with }. Do NOT write any markdown fences (\`\`\`), introduction, or explanation.`;

        const fallbackCompletion = await groq.chat.completions.create({
          model: modelToUse,
          temperature: 0.2,
          max_tokens: 6000,
          messages: [
            { role: "system", content: fallbackSystemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        rawContent = fallbackCompletion.choices?.[0]?.message?.content || "";
      } else {
        console.error("Groq extraction fatal error:", primaryErr);
        return NextResponse.json(
          { error: `Groq extraction failed: ${primaryErr.message}` },
          { status: primaryErr?.status || 502 }
        );
      }
    }

    // Parse and safely repair any raw/truncated JSON
    try {
      extracted = extractAndRepairJson(rawContent);
    } catch (parseErr) {
      console.error("JSON parse/repair failed. Raw content was:\n", rawContent, parseErr);
      return NextResponse.json(
        { error: `Failed to parse extracted JSON from AI: ${parseErr.message}` },
        { status: 502 }
      );
    }

    // ── 5. Normalize & validate extracted fields ───────────────────────────
    const novelTitle =
      extracted.novel_title ||
      extracted.title ||
      manualTitle ||
      "";

    const author =
      extracted.author ||
      manualAuthor ||
      null;

    const genresRaw =
      extracted.genres ??
      extracted.tropes ??
      null;
    const genres = Array.isArray(genresRaw)
      ? genresRaw.join(", ")
      : typeof genresRaw === "string"
      ? genresRaw
      : null;

    let characters = null;
    const charactersRaw = extracted.characters;
    if (Array.isArray(charactersRaw)) {
      characters = charactersRaw
        .map((c) =>
          typeof c === "string"
            ? c
            : `${c.name || c.character || "Character"}: ${c.role || c.description || c.arc || ""}`
        )
        .join("\n\n");
    } else if (typeof charactersRaw === "object" && charactersRaw !== null) {
      characters = Object.entries(charactersRaw)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("\n\n");
    } else if (typeof charactersRaw === "string") {
      characters = charactersRaw;
    }

    const endingVibeRaw =
      extracted.ending_vibe ??
      extracted.ending_tone ??
      null;
    const endingVibe =
      typeof endingVibeRaw === "object" && endingVibeRaw !== null
        ? JSON.stringify(endingVibeRaw)
        : endingVibeRaw;

    const detailedSummaryRaw =
      extracted.detailed_summary ??
      extracted.summary ??
      "";
    const detailedSummary = Array.isArray(detailedSummaryRaw)
      ? detailedSummaryRaw.join("\n\n")
      : typeof detailedSummaryRaw === "string"
      ? detailedSummaryRaw
      : "";

    if (!novelTitle && !manualTitle) {
      return NextResponse.json(
        { error: "Could not determine novel_title from source. Provide manualTitle." },
        { status: 422 }
      );
    }

    if (!detailedSummary) {
      return NextResponse.json(
        { error: "Groq could not produce a detailed_summary from the provided source." },
        { status: 422 }
      );
    }

    // ── 6. Insert into Supabase ───────────────────────────────────────────
    const insertPayload = {
      novel_title: novelTitle,
      author: author,
      genres: genres,
      characters: characters,
      ending_vibe: endingVibe,
      detailed_summary: detailedSummary,
      raw_review: combinedSource,
      source_url: url && url.trim() ? url.trim() : null,
    };

    const { data: insertedRows, error: insertError } = await supabase
      .from("novel_knowledge")
      .insert([insertPayload])
      .select();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: insertedRows?.[0] ?? insertPayload,
    });
  } catch (err) {
    console.error("novel-knowledge POST unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

