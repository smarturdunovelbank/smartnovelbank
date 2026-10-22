import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySupabaseAdmin, getAdminSupabase } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════════════════════════
// GET /api/admin/novels
// Fetch latest 50 novels from `urdu_novels` (or search by query ?q=searchTerm).
// Protected: Requires Supabase Admin bearer token.
// ════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  const { user, token, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = (
      searchParams.get("q") ||
      searchParams.get("searchTerm") ||
      searchParams.get("search") ||
      ""
    ).trim();

    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100);

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(isNaN(pageParam) ? 1 : pageParam, 1);
    const offset = (page - 1) * limit;

    const supabaseAdmin = getAdminSupabase(token);
    let query = supabaseAdmin
      .from("urdu_novels")
      .select("id, Titles, Links", { count: "exact" });

    if (searchTerm) {
      query = query.ilike("Titles", `%${searchTerm}%`);
    }

    query = query
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("GET /api/admin/novels error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Lookup featured status for returned novels from `featured_novels` table
    const novelsList = data || [];
    const novelIds = novelsList.map((n) => n.id).filter(Boolean);
    const featuredSet = new Set();

    if (novelIds.length > 0) {
      try {
        const { data: featData, error: featErr } = await supabaseAdmin
          .from("featured_novels")
          .select("novel_id, Titles, Links")
          .in("novel_id", novelIds);

        if (!featErr && Array.isArray(featData)) {
          featData.forEach((f) => {
            if (f.novel_id) featuredSet.add(f.novel_id);
            if (f.Titles) featuredSet.add(f.Titles.trim().toLowerCase());
          });
        }
      } catch (featErr) {
        // Graceful fallback if featured_novels table is still being provisioned
        console.warn("Featured lookup warning:", featErr);
      }
    }

    const novelsWithFeatured = novelsList.map((n) => ({
      ...n,
      featured: featuredSet.has(n.id) || featuredSet.has(n.Titles?.trim().toLowerCase()),
    }));

    return NextResponse.json({
      success: true,
      novels: novelsWithFeatured,
      count: novelsWithFeatured.length,
      total: count ?? null,
      page,
      limit,
    });
  } catch (err) {
    console.error("GET /api/admin/novels unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while fetching novels." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/admin/novels
// Add a single novel or bulk novels into `urdu_novels`.
// Body formats:
//   Single: { title: "Novel Name", link: "https://...", featured?: boolean }
//   Bulk:   { novels: [{ title: "...", link: "...", featured?: boolean }, ...] }
//        OR [{ title: "...", link: "...", featured?: boolean }, ...]
// Protected: Requires Supabase Admin bearer token.
// ════════════════════════════════════════════════════════════════════════════
// Helper to split array into chunks for safe Supabase .in() queries
function chunkArray(arr, size = 100) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request) {
  const { user, token, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body in request." },
      { status: 400 }
    );
  }

  // Normalize single novel or bulk array
  let candidates = [];
  if (Array.isArray(body)) {
    candidates = body;
  } else if (Array.isArray(body?.novels)) {
    candidates = body.novels;
  } else if (body && typeof body === "object" && !body.action) {
    candidates = [body];
  } else if (body && Array.isArray(body?.items)) {
    candidates = body.items;
  }

  // ── Action: "validate" (Pre-Upload Duplicate Check) ────────────────────────
  if (body?.action === "validate") {
    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        action: "validate",
        totalChecked: 0,
        existingTitles: [],
        existingLinks: [],
        existingFeaturedTitles: [],
        existingFeaturedLinks: [],
      });
    }

    if (candidates.length > 500) {
      return NextResponse.json(
        { error: "Batch size limit exceeded for pre-check. Maximum 500 rows allowed per request." },
        { status: 400 }
      );
    }

    try {
      const supabaseAdmin = getAdminSupabase(token);

      const uniqueLinks = Array.from(
        new Set(
          candidates
            .map((c) => (c.link || c.Links || c.url || c.download_link || "").toString().trim())
            .filter((l) => l.length > 0)
        )
      );

      const uniqueTitles = Array.from(
        new Set(
          candidates
            .map((c) => (c.title || c.Titles || c.name || c.novel_title || "").toString().trim())
            .filter((t) => t.length > 0)
        )
      );

      const existingLinksSet = new Set();
      const existingTitlesSet = new Set();
      const existingFeaturedTitlesSet = new Set();
      const existingFeaturedLinksSet = new Set();

      // Query urdu_novels database for matching links in batches of 100
      for (const chunk of chunkArray(uniqueLinks, 100)) {
        const { data, error } = await supabaseAdmin
          .from("urdu_novels")
          .select("Titles, Links")
          .in("Links", chunk);

        if (!error && Array.isArray(data)) {
          data.forEach((r) => {
            if (r.Links) existingLinksSet.add(r.Links.trim().toLowerCase());
            if (r.Titles) existingTitlesSet.add(r.Titles.trim().toLowerCase());
          });
        }
      }

      // Query urdu_novels database for matching titles in batches of 100
      for (const chunk of chunkArray(uniqueTitles, 100)) {
        const { data, error } = await supabaseAdmin
          .from("urdu_novels")
          .select("Titles, Links")
          .in("Titles", chunk);

        if (!error && Array.isArray(data)) {
          data.forEach((r) => {
            if (r.Links) existingLinksSet.add(r.Links.trim().toLowerCase());
            if (r.Titles) existingTitlesSet.add(r.Titles.trim().toLowerCase());
          });
        }
      }

      // Also check featured_novels table for already-featured titles/links
      try {
        for (const chunk of chunkArray(uniqueTitles, 100)) {
          const { data: featData, error: featErr } = await supabaseAdmin
            .from("featured_novels")
            .select("Titles, Links")
            .in("Titles", chunk);

          if (!featErr && Array.isArray(featData)) {
            featData.forEach((f) => {
              if (f.Titles) existingFeaturedTitlesSet.add(f.Titles.trim().toLowerCase());
              if (f.Links) existingFeaturedLinksSet.add(f.Links.trim().toLowerCase());
            });
          }
        }
      } catch (featLookupErr) {
        console.warn("Featured check warning during validate:", featLookupErr);
      }

      return NextResponse.json({
        success: true,
        action: "validate",
        totalChecked: candidates.length,
        existingTitles: Array.from(existingTitlesSet),
        existingLinks: Array.from(existingLinksSet),
        existingFeaturedTitles: Array.from(existingFeaturedTitlesSet),
        existingFeaturedLinks: Array.from(existingFeaturedLinksSet),
      });
    } catch (err) {
      console.error("POST /api/admin/novels validate error:", err);
      return NextResponse.json(
        { error: "Internal server error during duplicate pre-check." },
        { status: 500 }
      );
    }
  }

  // ── Standard Insert Action ────────────────────────────────────────────────
  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error:
          "No novel data provided. Expected { title, link } or { novels: [{ title, link }, ...] }.",
      },
      { status: 400 }
    );
  }

  if (candidates.length > 500) {
    return NextResponse.json(
      { error: "Batch size limit exceeded. Maximum 500 rows allowed per request." },
      { status: 400 }
    );
  }

  // Validate all items
  const validatedRecords = [];
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    if (!item || typeof item !== "object") {
      return NextResponse.json(
        { error: `Validation error at index ${i}: item must be a valid object.` },
        { status: 400 }
      );
    }

    const title = (
      item.title ||
      item.Titles ||
      item.name ||
      item.novel_title ||
      ""
    )
      .toString()
      .trim();

    const link = (
      item.link ||
      item.Links ||
      item.url ||
      item.download_link ||
      ""
    )
      .toString()
      .trim();

    if (!title) {
      return NextResponse.json(
        {
          error: `Validation error at item #${i + 1}: novel title is required and cannot be empty.`,
        },
        { status: 400 }
      );
    }

    if (!link) {
      return NextResponse.json(
        {
          error: `Validation error at item #${i + 1} ("${title}"): download/read link is required and cannot be empty.`,
        },
        { status: 400 }
      );
    }

    // Check featured flag on item or request body
    const isFeatured =
      item.featured === true ||
      item.is_featured === true ||
      item.Featured === true ||
      body.featured === true ||
      String(item.featured || "").toLowerCase() === "true" ||
      String(item.is_featured || "").toLowerCase() === "true";

    // `urdu_novels` table schema uses columns: Titles, Links
    validatedRecords.push({
      Titles: title,
      Links: link,
      featured: isFeatured,
    });
  }

  try {
    const supabaseAdmin = getAdminSupabase(token);
    const skipDuplicates = body.skipDuplicates !== false; // default true

    let recordsToInsert = validatedRecords;
    let skippedDuplicatesCount = 0;

    if (skipDuplicates) {
      const uniqueLinks = Array.from(
        new Set(validatedRecords.map((r) => r.Links.trim()).filter((l) => l.length > 0))
      );
      const uniqueTitles = Array.from(
        new Set(validatedRecords.map((r) => r.Titles.trim()).filter((t) => t.length > 0))
      );

      const existingLinksSet = new Set();
      const existingTitlesSet = new Set();

      for (const chunk of chunkArray(uniqueLinks, 100)) {
        const { data } = await supabaseAdmin
          .from("urdu_novels")
          .select("Titles, Links")
          .in("Links", chunk);

        if (data && Array.isArray(data)) {
          data.forEach((r) => {
            if (r.Links) existingLinksSet.add(r.Links.trim().toLowerCase());
            if (r.Titles) existingTitlesSet.add(r.Titles.trim().toLowerCase());
          });
        }
      }

      for (const chunk of chunkArray(uniqueTitles, 100)) {
        const { data } = await supabaseAdmin
          .from("urdu_novels")
          .select("Titles, Links")
          .in("Titles", chunk);

        if (data && Array.isArray(data)) {
          data.forEach((r) => {
            if (r.Links) existingLinksSet.add(r.Links.trim().toLowerCase());
            if (r.Titles) existingTitlesSet.add(r.Titles.trim().toLowerCase());
          });
        }
      }

      const seenBatchLinks = new Set();
      const seenBatchTitles = new Set();
      recordsToInsert = [];

      for (const rec of validatedRecords) {
        const normLink = rec.Links.trim().toLowerCase();
        const normTitle = rec.Titles.trim().toLowerCase();

        const isDuplicateInDb = existingLinksSet.has(normLink) || existingTitlesSet.has(normTitle);
        const isDuplicateInBatch = seenBatchLinks.has(normLink) || seenBatchTitles.has(normTitle);

        if (isDuplicateInDb || isDuplicateInBatch) {
          skippedDuplicatesCount++;
        } else {
          seenBatchLinks.add(normLink);
          seenBatchTitles.add(normTitle);
          recordsToInsert.push(rec);
        }
      }
    }

    let insertedData = [];

    // Perform urdu_novels insert if we have new rows
    if (recordsToInsert.length > 0) {
      const payloadForUrduNovels = recordsToInsert.map((r) => ({
        Titles: r.Titles,
        Links: r.Links,
      }));

      const { data, error: insertError } = await supabaseAdmin
        .from("urdu_novels")
        .insert(payloadForUrduNovels)
        .select("id, Titles, Links");

      if (insertError) {
        console.error("POST /api/admin/novels insert error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      insertedData = data || payloadForUrduNovels;
    }

    // ── Handle Featured Novels Promotion ────────────────────────────────────
    // Identify all candidates marked featured (even if already existing in urdu_novels)
    const featuredCandidates = validatedRecords.filter((r) => r.featured === true);
    let featuredAddedCount = 0;

    if (featuredCandidates.length > 0) {
      try {
        const titleToIdMap = new Map();
        insertedData.forEach((row) => {
          if (row.Titles && row.id) titleToIdMap.set(row.Titles.trim().toLowerCase(), row.id);
        });

        // For featured candidates that were already in urdu_novels, look up their IDs
        const missingIdCandidates = featuredCandidates.filter(
          (c) => !titleToIdMap.has(c.Titles.trim().toLowerCase())
        );

        if (missingIdCandidates.length > 0) {
          const titlesToQuery = Array.from(
            new Set(missingIdCandidates.map((c) => c.Titles.trim()))
          );
          for (const chunk of chunkArray(titlesToQuery, 100)) {
            const { data: existingRows } = await supabaseAdmin
              .from("urdu_novels")
              .select("id, Titles")
              .in("Titles", chunk);

            if (Array.isArray(existingRows)) {
              existingRows.forEach((er) => {
                if (er.Titles && er.id) titleToIdMap.set(er.Titles.trim().toLowerCase(), er.id);
              });
            }
          }
        }

        // Query existing entries in featured_novels to prevent duplicate featured rows
        const featTitles = featuredCandidates.map((c) => c.Titles.trim());
        const existingFeatTitlesSet = new Set();
        const existingFeatLinksSet = new Set();

        for (const chunk of chunkArray(featTitles, 100)) {
          const { data: existingFeat } = await supabaseAdmin
            .from("featured_novels")
            .select("Titles, Links")
            .in("Titles", chunk);

          if (Array.isArray(existingFeat)) {
            existingFeat.forEach((ef) => {
              if (ef.Titles) existingFeatTitlesSet.add(ef.Titles.trim().toLowerCase());
              if (ef.Links) existingFeatLinksSet.add(ef.Links.trim().toLowerCase());
            });
          }
        }

        // Prepare records to insert into featured_novels
        const featuredRecordsToInsert = [];
        const seenFeatInBatch = new Set();

        for (const fc of featuredCandidates) {
          const normTitle = fc.Titles.trim().toLowerCase();
          const normLink = fc.Links.trim().toLowerCase();

          if (
            !existingFeatTitlesSet.has(normTitle) &&
            !existingFeatLinksSet.has(normLink) &&
            !seenFeatInBatch.has(normTitle)
          ) {
            seenFeatInBatch.add(normTitle);
            featuredRecordsToInsert.push({
              novel_id: titleToIdMap.get(normTitle) || null,
              Titles: fc.Titles.trim(),
              Links: fc.Links.trim(),
            });
          }
        }

        if (featuredRecordsToInsert.length > 0) {
          const { data: featInserted, error: featErr } = await supabaseAdmin
            .from("featured_novels")
            .insert(featuredRecordsToInsert)
            .select("id");

          if (!featErr) {
            featuredAddedCount = featInserted?.length || featuredRecordsToInsert.length;
          } else {
            console.warn("featured_novels insert warning:", featErr);
          }
        }
      } catch (featProcessErr) {
        console.warn("Featured processing warning:", featProcessErr);
      }
    }

    // Invalidate caches so the new novels appear immediately
    try {
      revalidatePath("/");
      revalidatePath("/search");
    } catch (revalErr) {
      console.warn("Cache revalidation warning:", revalErr);
    }

    const finalInsertedCount = insertedData?.length || recordsToInsert.length;
    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${finalInsertedCount} novel(s)${
          skippedDuplicatesCount > 0 ? ` (${skippedDuplicatesCount} duplicates skipped)` : ""
        }${featuredAddedCount > 0 ? ` (${featuredAddedCount} added to Featured Novels)` : ""}.`,
        insertedCount: finalInsertedCount,
        skippedDuplicatesCount,
        featuredAddedCount,
        totalProcessed: validatedRecords.length,
        inserted: insertedData || recordsToInsert,
        count: finalInsertedCount,
        novels: insertedData || recordsToInsert,
      },
      { status: finalInsertedCount > 0 ? 201 : 200 }
    );
  } catch (err) {
    console.error("POST /api/admin/novels unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while inserting novel(s)." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/novels
// Supports two operations (or combined payload):
//   Mode A: Toggle featured status in `featured_novels` ({ novelId, featured: boolean })
//   Mode B: Edit novel details (Titles and Links) in `urdu_novels` ({ id, Titles, Links, oldTitle?, oldLink? })
//           Automatically syncs Titles & Links in `featured_novels` if the novel is featured!
// Protected: Requires Supabase Admin bearer token.
// ════════════════════════════════════════════════════════════════════════════
export async function PATCH(request) {
  const { user, token, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body in request." }, { status: 400 });
  }

  const novelId = parseInt(body.id || body.novelId, 10);
  const rawTitle = body.Titles !== undefined ? body.Titles : (body.newTitle !== undefined ? body.newTitle : body.title);
  const rawLink = body.Links !== undefined ? body.Links : (body.newLink !== undefined ? body.newLink : body.link);

  const title = (rawTitle || "").toString().trim();
  const link = (rawLink || "").toString().trim();
  const oldTitle = (body.oldTitle || "").toString().trim();
  const oldLink = (body.oldLink || "").toString().trim();

  const isDetailEdit =
    body.Titles !== undefined ||
    body.newTitle !== undefined ||
    (body.Links !== undefined && body.featured === undefined) ||
    body.newLink !== undefined ||
    body.action === "edit";

  const hasFeaturedToggle = body.featured !== undefined;

  // Validation if editing details
  if (isDetailEdit) {
    if (!novelId || isNaN(novelId) || novelId <= 0) {
      return NextResponse.json(
        { error: "Valid numeric novel ID is required to update novel details." },
        { status: 400 }
      );
    }

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "Novel title is required and must be at least 2 characters long." },
        { status: 400 }
      );
    }

    const isValidUrl = /^https?:\/\/.+/i.test(link);
    if (!link || !isValidUrl) {
      return NextResponse.json(
        { error: "A valid download link starting with http:// or https:// is required." },
        { status: 400 }
      );
    }
  } else if (!hasFeaturedToggle) {
    return NextResponse.json(
      { error: "Invalid request: specify novel details (Titles, Links) or featured status to update." },
      { status: 400 }
    );
  }

  if (hasFeaturedToggle && !title && (!novelId || isNaN(novelId))) {
    return NextResponse.json(
      { error: "Valid novelId or title is required to update featured status." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getAdminSupabase(token);
    let updatedNovelRecord = null;
    let featuredSynced = false;

    // ── Mode B: Update Titles and Links in `urdu_novels` ──────────────────
    if (isDetailEdit) {
      const { data: updatedNovel, error: updateError } = await supabaseAdmin
        .from("urdu_novels")
        .update({
          Titles: title,
          Links: link,
        })
        .eq("id", novelId)
        .select("id, Titles, Links")
        .single();

      if (updateError) {
        console.error("PATCH /api/admin/novels urdu_novels update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (!updatedNovel) {
        return NextResponse.json(
          { error: `Novel #${novelId} not found in database.` },
          { status: 404 }
        );
      }

      updatedNovelRecord = updatedNovel;

      // ── Sync to featured_novels if the novel is featured ─────────────────
      try {
        const { data: featByNovelId } = await supabaseAdmin
          .from("featured_novels")
          .select("id")
          .eq("novel_id", novelId);

        if (featByNovelId && featByNovelId.length > 0) {
          await supabaseAdmin
            .from("featured_novels")
            .update({ Titles: title, Links: link })
            .eq("novel_id", novelId);
          featuredSynced = true;
        } else if (oldTitle || oldLink) {
          let fallbackQuery = supabaseAdmin.from("featured_novels").select("id");
          if (oldTitle) {
            fallbackQuery = fallbackQuery.ilike("Titles", oldTitle);
          } else if (oldLink) {
            fallbackQuery = fallbackQuery.eq("Links", oldLink);
          }
          const { data: featByOld } = await fallbackQuery;
          if (featByOld && featByOld.length > 0) {
            const featIds = featByOld.map((f) => f.id);
            await supabaseAdmin
              .from("featured_novels")
              .update({ novel_id: novelId, Titles: title, Links: link })
              .in("id", featIds);
            featuredSynced = true;
          }
        }
      } catch (featSyncErr) {
        console.warn("Featured novels sync warning during novel update:", featSyncErr);
      }

      // Revalidate cache paths
      try {
        revalidatePath("/");
        revalidatePath("/search");
        revalidatePath(`/novel/${novelId}`);
      } catch (revalErr) {
        console.warn("Cache revalidation warning:", revalErr);
      }
    }

    // ── Mode A: Toggle featured status if requested ───────────────────────
    if (hasFeaturedToggle) {
      const featured = Boolean(body.featured);

      if (featured) {
        // Check if already in featured_novels
        let checkQuery = supabaseAdmin.from("featured_novels").select("id");
        if (!isNaN(novelId) && novelId > 0) {
          checkQuery = checkQuery.eq("novel_id", novelId);
        } else if (title) {
          checkQuery = checkQuery.ilike("Titles", title);
        }

        const { data: existingRows } = await checkQuery;
        if (!existingRows || existingRows.length === 0) {
          let resolvedLink = link;
          let resolvedTitle = title;
          if ((!resolvedLink || !resolvedTitle) && !isNaN(novelId) && novelId > 0) {
            const { data: novelRow } = await supabaseAdmin
              .from("urdu_novels")
              .select("Titles, Links")
              .eq("id", novelId)
              .single();
            if (novelRow) {
              resolvedTitle = resolvedTitle || novelRow.Titles;
              resolvedLink = resolvedLink || novelRow.Links;
            }
          }

          const { error: insertError } = await supabaseAdmin.from("featured_novels").insert([
            {
              novel_id: !isNaN(novelId) && novelId > 0 ? novelId : null,
              Titles: resolvedTitle,
              Links: resolvedLink || "",
            },
          ]);

          if (insertError) {
            console.error("PATCH featured_novels insert error:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
          }
        }
      } else {
        // Remove from featured_novels
        let deleteQuery = supabaseAdmin.from("featured_novels").delete();
        if (!isNaN(novelId) && novelId > 0) {
          deleteQuery = deleteQuery.eq("novel_id", novelId);
        } else if (title) {
          deleteQuery = deleteQuery.ilike("Titles", title);
        } else if (link) {
          deleteQuery = deleteQuery.eq("Links", link);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) {
          console.error("PATCH featured_novels delete error:", deleteError);
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }

      try {
        revalidatePath("/");
      } catch {
        // Ignore
      }

      return NextResponse.json({
        success: true,
        message: featured
          ? `"${title || `Novel #${novelId}`}" marked as Featured.`
          : `"${title || `Novel #${novelId}`}" removed from Featured Novels.`,
        featured,
        novelId: !isNaN(novelId) ? novelId : null,
        title,
        novel: updatedNovelRecord,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Novel #${novelId} ("${title}") updated successfully.`,
      novel: updatedNovelRecord,
      featuredSynced,
    });
  } catch (err) {
    console.error("PATCH /api/admin/novels unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while updating novel." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/novels
// Delete a specific novel row from `urdu_novels` by ID.
// Accepts: { id: 123 } in JSON body OR ?id=123 in URL query string.
// Protected: Requires Supabase Admin bearer token.
// ════════════════════════════════════════════════════════════════════════════
export async function DELETE(request) {
  const { user, token, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  // Extract ID from URL query param or request body
  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");

  if (!id) {
    try {
      const body = await request.json();
      id = body?.id;
    } catch {
      // Body may not be provided if query param was intended
    }
  }

  const numericId = parseInt(id, 10);
  if (!id || isNaN(numericId) || numericId <= 0) {
    return NextResponse.json(
      { error: "Valid numeric novel ID is required for deletion (e.g. ?id=123 or { id: 123 })." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getAdminSupabase(token);
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("urdu_novels")
      .delete()
      .eq("id", numericId)
      .select("id, Titles");

    if (deleteError) {
      console.error("DELETE /api/admin/novels error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: `Novel #${numericId} not found or was already deleted.` },
        { status: 404 }
      );
    }

    // Also remove from featured_novels if present
    try {
      await supabaseAdmin.from("featured_novels").delete().eq("novel_id", numericId);
    } catch (featDelErr) {
      console.warn("Featured novel cleanup warning on deletion:", featDelErr);
    }

    // Invalidate caches
    try {
      revalidatePath("/");
      revalidatePath("/search");
      revalidatePath(`/novel/${numericId}`);
    } catch (revalErr) {
      console.warn("Cache revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Novel #${numericId} ("${deletedRows[0]?.Titles || ""}") deleted successfully.`,
      deleted: deletedRows[0],
    });
  } catch (err) {
    console.error("DELETE /api/admin/novels unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while deleting novel." },
      { status: 500 }
    );
  }
}
