import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseAdmin } from "../../../../lib/adminAuth";
import { supabaseNoCache } from "../../../../lib/supabaseClientNoCache";

export const dynamic = "force-dynamic";

/**
 * Helper to obtain the best Supabase client for database operations.
 * If SUPABASE_SERVICE_ROLE_KEY is set in environment, creates an unrestricted client.
 * Otherwise, uses supabaseNoCache (anon key) which has full read/write access to novel_requests
 * and avoids RLS role mismatches that occur when sending an 'authenticated' JWT token on tables
 * configured with anon-only RLS policies.
 */
function getRequestsDbClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        fetch: (url, opts = {}) => fetch(url, { ...opts, cache: "no-store" }),
      },
    });
  }

  return supabaseNoCache;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/admin/requests
// Fetch paginated novel requests with search & status filters, plus KPI counts.
// Protected: Supabase Admin bearer token required.
// ════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  const { user, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "all").trim();

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(isNaN(pageParam) ? 1 : pageParam, 1);

    const pageSizeParam = parseInt(searchParams.get("pageSize") || searchParams.get("limit") || "25", 10);
    const pageSize = Math.min(Math.max(isNaN(pageSizeParam) ? 25 : pageSizeParam, 1), 100);
    const offset = (page - 1) * pageSize;

    const dbClient = getRequestsDbClient();

    // 1. Build main paginated data query
    let query = dbClient
      .from("novel_requests")
      .select("id, created_at, novel_name, writer_name, message, device, status, pdf_link", { count: "exact" });

    // Status filter logic
    if (status === "Pending") {
      query = query.or("status.eq.Pending,status.is.null");
    } else if (status === "Completed") {
      query = query.eq("status", "Completed");
    } else if (status === "PDF Not Available") {
      query = query.eq("status", "PDF Not Available");
    } else if (status === "custom") {
      query = query
        .not("status", "in", '("Pending","Completed","PDF Not Available")')
        .not("status", "is", null);
    }

    // Search query logic
    if (search) {
      if (/^\d+$/.test(search)) {
        const numId = parseInt(search, 10);
        query = query.or(`id.eq.${numId},novel_name.ilike.%${search}%`);
      } else {
        query = query.or(
          `novel_name.ilike.%${search}%,writer_name.ilike.%${search}%,message.ilike.%${search}%`
        );
      }
    }

    // Order and range
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 2. Concurrently compute summary KPI counts across entire novel_requests table
    const [
      mainRes,
      totalCountRes,
      pendingCountRes,
      completedCountRes,
      unavailableCountRes,
    ] = await Promise.all([
      query,
      dbClient.from("novel_requests").select("*", { count: "exact", head: true }),
      dbClient.from("novel_requests").select("*", { count: "exact", head: true }).or("status.eq.Pending,status.is.null"),
      dbClient.from("novel_requests").select("*", { count: "exact", head: true }).eq("status", "Completed"),
      dbClient.from("novel_requests").select("*", { count: "exact", head: true }).eq("status", "PDF Not Available"),
    ]);

    if (mainRes.error) {
      console.error("GET /api/admin/requests query error:", mainRes.error);
      return NextResponse.json({ error: mainRes.error.message }, { status: 500 });
    }

    const requests = mainRes.data || [];
    const totalMatching = mainRes.count ?? requests.length;
    const totalPages = Math.ceil(totalMatching / pageSize);

    const counts = {
      totalCount: totalCountRes.count ?? 0,
      pendingCount: pendingCountRes.count ?? 0,
      completedCount: completedCountRes.count ?? 0,
      unavailableCount: unavailableCountRes.count ?? 0,
    };

    return NextResponse.json({
      success: true,
      requests,
      page,
      pageSize,
      total: totalMatching,
      totalPages,
      counts,
    });
  } catch (err) {
    console.error("GET /api/admin/requests unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while fetching requests." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/requests
// Update request status, PDF link, metadata, and optional catalog sync.
// Protected: Supabase Admin bearer token required.
// ════════════════════════════════════════════════════════════════════════════
export async function PATCH(request) {
  const { user, error: authError } = await verifySupabaseAdmin(request);
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

  const {
    id,
    novel_name,
    writer_name,
    status,
    pdf_link,
    publishToCatalog,
    markAsFeatured,
    catalogTitle,
  } = body || {};

  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Valid request id is required." }, { status: 400 });
  }

  const cleanNovelName = typeof novel_name === "string" ? novel_name.trim() : "";
  if (!cleanNovelName) {
    return NextResponse.json({ error: "Novel name cannot be empty." }, { status: 400 });
  }

  const cleanWriterName = typeof writer_name === "string" && writer_name.trim() ? writer_name.trim() : null;
  const cleanStatus = typeof status === "string" && status.trim() ? status.trim() : "Pending";
  const cleanPdfLink = typeof pdf_link === "string" && pdf_link.trim() ? pdf_link.trim() : null;

  // Validation: If status is 'Completed', pdf_link MUST be a valid URL
  if (cleanStatus === "Completed") {
    if (!cleanPdfLink || !/^https?:\/\//i.test(cleanPdfLink)) {
      return NextResponse.json(
        { error: "A valid PDF download URL (starting with http:// or https://) is required to mark a request as Completed." },
        { status: 400 }
      );
    }
  }

  const dbClient = getRequestsDbClient();

  try {
    // 1. Update the request in public.novel_requests
    const { data: updatedRequest, error: updateError } = await dbClient
      .from("novel_requests")
      .update({
        novel_name: cleanNovelName,
        writer_name: cleanWriterName,
        status: cleanStatus,
        pdf_link: cleanPdfLink,
      })
      .eq("id", numericId)
      .select()
      .single();

    if (updateError) {
      console.error("PATCH /api/admin/requests update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let catalogSyncResult = null;

    // 2. Auto-Publish to urdu_novels Catalog if requested
    if (publishToCatalog === true && cleanStatus === "Completed" && cleanPdfLink) {
      // Determine final title
      let finalCatalogTitle = "";
      if (typeof catalogTitle === "string" && catalogTitle.trim()) {
        finalCatalogTitle = catalogTitle.trim();
      } else if (/\bby\b/i.test(cleanNovelName)) {
        finalCatalogTitle = cleanNovelName;
      } else if (cleanWriterName && cleanWriterName.toLowerCase() !== "unknown") {
        finalCatalogTitle = `${cleanNovelName} By ${cleanWriterName}`;
      } else {
        finalCatalogTitle = cleanNovelName;
      }

      // Check if novel already exists in urdu_novels by link or exact title
      const { data: existingRows, error: searchErr } = await dbClient
        .from("urdu_novels")
        .select("id, Titles, Links")
        .or(`Links.eq.${cleanPdfLink},Titles.ilike.${finalCatalogTitle}`)
        .limit(1);

      if (searchErr) {
        console.warn("Catalog duplicate check warning:", searchErr);
      }

      if (existingRows && existingRows.length > 0) {
        catalogSyncResult = {
          status: "already_exists",
          existingId: existingRows[0].id,
          title: existingRows[0].Titles,
        };
      } else {
        // Insert new entry into urdu_novels
        const { data: newNovel, error: insertNovelErr } = await dbClient
          .from("urdu_novels")
          .insert({
            Titles: finalCatalogTitle,
            Links: cleanPdfLink,
          })
          .select("id, Titles, Links")
          .single();

        if (insertNovelErr) {
          console.error("Error inserting into urdu_novels:", insertNovelErr);
          catalogSyncResult = {
            status: "error",
            error: insertNovelErr.message,
          };
        } else {
          catalogSyncResult = {
            status: "inserted",
            novelId: newNovel.id,
            title: newNovel.Titles,
          };

          // If markAsFeatured is true, also add to featured_novels
          if (markAsFeatured === true) {
            try {
              const { error: featErr } = await dbClient
                .from("featured_novels")
                .insert({
                  novel_id: newNovel.id,
                  Titles: finalCatalogTitle,
                  Links: cleanPdfLink,
                });
              if (!featErr) {
                catalogSyncResult.featuredAdded = true;
              }
            } catch (featEx) {
              console.warn("Featured novel insert warning:", featEx);
            }
          }
        }
      }
    }

    // 3. Revalidate Next.js cache paths
    try {
      revalidatePath("/request-status");
      if (catalogSyncResult?.status === "inserted") {
        revalidatePath("/");
        revalidatePath("/search");
      }
    } catch (revErr) {
      console.warn("Path revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      catalogSyncResult,
    });
  } catch (err) {
    console.error("PATCH /api/admin/requests unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while updating request." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/requests
// Delete a novel request (spam / invalid submission cleanup).
// Protected: Supabase Admin bearer token required.
// ════════════════════════════════════════════════════════════════════════════
export async function DELETE(request) {
  const { user, error: authError } = await verifySupabaseAdmin(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in with your Supabase Admin account.", details: authError },
      { status: 401 }
    );
  }

  let idToDelete = null;

  // Try parsing from query param first, then from JSON body
  const { searchParams } = new URL(request.url);
  const qId = searchParams.get("id");
  if (qId) {
    idToDelete = parseInt(qId, 10);
  } else {
    try {
      const body = await request.json();
      idToDelete = parseInt(body?.id, 10);
    } catch {
      // Body not provided or not JSON
    }
  }

  if (!idToDelete || isNaN(idToDelete) || idToDelete <= 0) {
    return NextResponse.json(
      { error: "Valid request id is required to delete." },
      { status: 400 }
    );
  }

  const dbClient = getRequestsDbClient();

  try {
    const { error: delError } = await dbClient
      .from("novel_requests")
      .delete()
      .eq("id", idToDelete);

    if (delError) {
      console.error("DELETE /api/admin/requests error:", delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    try {
      revalidatePath("/request-status");
    } catch (revErr) {
      console.warn("Path revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      deletedId: idToDelete,
    });
  } catch (err) {
    console.error("DELETE /api/admin/requests unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while deleting request." },
      { status: 500 }
    );
  }
}
