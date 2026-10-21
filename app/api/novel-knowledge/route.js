import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// ── Groq client (same env var as novel-chat) ────────────────────────────────
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
      if (text && text.trim().length > 100) return text.trim();
    }
  } catch (_) {
    // Jina unavailable — fall through to raw fetch
  }

  // 2. Direct fetch + HTML strip
  const rawRes = await fetch(url);
  if (!rawRes.ok) throw new Error(`Failed to fetch URL (${rawRes.status}): ${url}`);
  const html = await rawRes.text();
  return stripHtml(html);
}

// ── System prompt for Groq knowledge extraction ─────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `
You are an expert Pakistani Urdu novel analyst. Your job is to read a source text
(a review, blog post, or synopsis) about a Pakistani Urdu novel and extract
structured knowledge from it.

Return a single valid JSON object with EXACTLY these keys:
{
  "novel_title":       "<Roman Urdu title (Urdu script in brackets if present in source)>",
  "author":            "<Author name in Roman Urdu>",
  "genres":            "<Comma-separated Urdu novel tropes/genres, e.g.: Suspense, Rude Hero, Cousin Marriage, Feudal System, Spiritual, Digest, Forced Marriage>",
  "characters":        "<Detailed list of main and side characters: name, role, relationships, personality traits — as much as the source provides>",
  "ending_vibe":       "<Ending type (Happy / Sad / Open ending), overall tone/vibe, and any reader reception notes from the source>",
  "detailed_summary":  "<A rich, comprehensive 200 to 400-word summary in clean Roman Urdu covering: plot setup, main conflicts, key themes, and important review points. DO NOT invent facts not in the source text.>"
}

STRICT RULES:
1. Base EVERY field ONLY on information explicitly present in the provided source text.
2. Do NOT invent character names, plot events, or publication dates not mentioned.
3. If a field cannot be determined from the source, use an empty string "" for that field.
4. The detailed_summary must be in Roman Urdu (English words are fine for proper nouns).
5. Output ONLY the JSON object — no explanation, no markdown fences.
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

    // Combine scraped text and manually pasted text, capped at 12,000 chars
    const combinedSource = [scrapedText, rawText]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 12000);

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

    // ── 4. Call Groq for structured extraction ────────────────────────────
    const groq = getGroqClient();

    let extracted;
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_object" },
        temperature: 0.2,       // low temperature = more faithful to source
        max_tokens: 1800,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
      });

      const rawJson = completion.choices?.[0]?.message?.content || "";
      extracted = JSON.parse(rawJson);
    } catch (groqErr) {
      console.error("Groq extraction error:", groqErr);
      return NextResponse.json(
        { error: `Groq extraction failed: ${groqErr.message}` },
        { status: 502 }
      );
    }

    // Validate the required field
    if (!extracted.novel_title && !manualTitle) {
      return NextResponse.json(
        { error: "Could not determine novel_title from source. Provide manualTitle." },
        { status: 422 }
      );
    }

    if (!extracted.detailed_summary) {
      return NextResponse.json(
        { error: "Groq could not produce a detailed_summary from the provided source." },
        { status: 422 }
      );
    }

    // ── 5. Insert into Supabase ───────────────────────────────────────────
    const insertPayload = {
      novel_title:      extracted.novel_title     || manualTitle  || "",
      author:           extracted.author           || manualAuthor || null,
      genres:           extracted.genres           || null,
      characters:       extracted.characters       || null,
      ending_vibe:      extracted.ending_vibe      || null,
      detailed_summary: extracted.detailed_summary,
      raw_review:       combinedSource,
      source_url:       (url && url.trim()) ? url.trim() : null,
    };

    const { data: insertedRows, error: insertError } = await supabase
      .from("novel_knowledge")
      .insert([insertPayload])
      .select();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: insertedRows?.[0] ?? insertPayload });
  } catch (err) {
    console.error("novel-knowledge POST unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
