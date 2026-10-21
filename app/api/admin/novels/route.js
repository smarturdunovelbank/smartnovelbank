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

    return NextResponse.json({
      success: true,
      novels: data || [],
      count: data?.length || 0,
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
//   Single: { title: "Novel Name", link: "https://..." }
//   Bulk:   { novels: [{ title: "...", link: "..." }, ...] }
//        OR [{ title: "...", link: "..." }, ...]
// Protected: Requires Supabase Admin bearer token.
// ════════════════════════════════════════════════════════════════════════════
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
  } else if (body && typeof body === "object") {
    candidates = [body];
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error:
          "No novel data provided. Expected { title, link } or { novels: [{ title, link }, ...] }.",
      },
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

    // `urdu_novels` table schema uses columns: Titles, Links
    validatedRecords.push({
      Titles: title,
      Links: link,
    });
  }

  try {
    const supabaseAdmin = getAdminSupabase(token);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("urdu_novels")
      .insert(validatedRecords)
      .select("id, Titles, Links");

    if (insertError) {
      console.error("POST /api/admin/novels insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Invalidate caches so the new novels appear on home and search immediately
    try {
      revalidatePath("/");
      revalidatePath("/search");
    } catch (revalErr) {
      console.warn("Cache revalidation warning:", revalErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${insertedData?.length || validatedRecords.length} novel(s).`,
        count: insertedData?.length || validatedRecords.length,
        novels: insertedData || validatedRecords,
      },
      { status: 201 }
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
