import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "../../../../lib/supabaseClient";
import { verifySupabaseAdmin, getAdminSupabase } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════════════════════════
// GET /api/admin/settings
// Fetch current site settings from Supabase (id = 1).
// Returns request_form_maintenance, request_form_enabled, maintenance_message.
// Fail-safe: Returns defaults if table is not yet created.
// ════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, request_form_maintenance, chatbot_enabled, maintenance_message, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      const isMissingTable =
        error.code === "42P01" ||
        error.message?.includes("relation") ||
        error.message?.includes("does not exist");

      const isSchemaCache =
        error.code === "PGRST204" ||
        error.code === "PGRST200" ||
        error.message?.toLowerCase().includes("schema cache") ||
        error.message?.toLowerCase().includes("could not find");

      if (isMissingTable || isSchemaCache) {
        return NextResponse.json({
          success: true,
          settings: {
            id: 1,
            request_form_maintenance: false,
            request_form_enabled: true,
            chatbot_enabled: true,
            maintenance_message: null,
            updated_at: null,
            table_exists: !isMissingTable,
            schema_cache_stale: isSchemaCache,
          },
          isSchemaCacheError: isSchemaCache,
          isMissingTable,
          hint: isSchemaCache ? "NOTIFY pgrst, 'reload schema';" : null,
          warning: isMissingTable
            ? "The `site_settings` table was not found in Supabase. Run supabase/migrations/20261021_create_site_settings.sql in your Supabase SQL editor."
            : "Supabase schema cache is out of date. Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor.",
        });
      }

      console.error("GET /api/admin/settings query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isMaintenance = data?.request_form_maintenance === true;
    const isChatbotEnabled = data?.chatbot_enabled !== false;

    return NextResponse.json({
      success: true,
      settings: {
        id: 1,
        request_form_maintenance: isMaintenance,
        request_form_enabled: !isMaintenance,
        chatbot_enabled: isChatbotEnabled,
        maintenance_message: data?.maintenance_message || null,
        updated_at: data?.updated_at || null,
        table_exists: true,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/settings unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while fetching site settings." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST & PATCH /api/admin/settings
// Update site settings in Supabase (id = 1).
// Protected: Requires Supabase Admin bearer token.
// Body:
//   - request_form_maintenance: boolean (true = maintenance on/form disabled)
//   - OR request_form_enabled:  boolean (true = form active/maintenance off)
//   - maintenance_message:      string | null (custom notice shown to users)
// ════════════════════════════════════════════════════════════════════════════
async function handleUpdateSettings(request) {
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

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body must be a valid JSON object." },
      { status: 400 }
    );
  }

  // Derive request_form_maintenance value from either maintenance or enabled flag
  let maintenanceValue;
  if (typeof body.request_form_maintenance === "boolean") {
    maintenanceValue = body.request_form_maintenance;
  } else if (typeof body.request_form_enabled === "boolean") {
    maintenanceValue = !body.request_form_enabled;
  } else if (typeof body.form_enabled === "boolean") {
    maintenanceValue = !body.form_enabled;
  }

  let chatbotEnabled;
  if (typeof body.chatbot_enabled === "boolean") {
    chatbotEnabled = body.chatbot_enabled;
  }

  let maintenanceMessage;
  if ("maintenance_message" in body) {
    maintenanceMessage =
      typeof body.maintenance_message === "string"
        ? body.maintenance_message.trim()
        : null;
  }

  if (maintenanceValue === undefined && maintenanceMessage === undefined && chatbotEnabled === undefined) {
    return NextResponse.json(
      {
        error:
          "No valid settings field provided. Please provide `request_form_maintenance` (boolean), `request_form_enabled` (boolean), `chatbot_enabled` (boolean), or `maintenance_message` (string).",
      },
      { status: 400 }
    );
  }

  const updatePayload = {
    id: 1,
    updated_at: new Date().toISOString(),
  };

  if (maintenanceValue !== undefined) {
    updatePayload.request_form_maintenance = maintenanceValue;
  }
  if (chatbotEnabled !== undefined) {
    updatePayload.chatbot_enabled = chatbotEnabled;
  }
  if (maintenanceMessage !== undefined) {
    updatePayload.maintenance_message = maintenanceMessage;
  }

  try {
    const supabaseAdmin = getAdminSupabase(token);
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .upsert(updatePayload)
      .select("id, request_form_maintenance, chatbot_enabled, maintenance_message, updated_at")
      .single();

    if (error) {
      console.error("POST/PATCH /api/admin/settings error:", error);
      const isMissingTable =
        error.code === "42P01" ||
        error.message?.includes("relation") ||
        error.message?.includes("does not exist");

      const isSchemaCache =
        error.code === "PGRST204" ||
        error.code === "PGRST200" ||
        error.message?.toLowerCase().includes("schema cache") ||
        error.message?.toLowerCase().includes("could not find");

      if (isSchemaCache) {
        return NextResponse.json(
          {
            error: "Supabase schema cache is out of date.",
            isSchemaCacheError: true,
            hint: "NOTIFY pgrst, 'reload schema';",
            rawMessage: error.message,
          },
          { status: 400 }
        );
      }

      if (isMissingTable) {
        return NextResponse.json(
          {
            error:
              "The `site_settings` table does not exist in Supabase yet. Please run supabase/migrations/20261021_create_site_settings.sql in your Supabase SQL editor first.",
            isMissingTable: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate ISR page cache so changes take effect immediately on live site
    try {
      revalidatePath("/request-novel");
      revalidatePath("/");
    } catch (revalErr) {
      console.warn("Cache revalidation warning:", revalErr);
    }

    const isMaintenance = data?.request_form_maintenance === true;
    const isChatbotEnabled = data?.chatbot_enabled !== false;

    return NextResponse.json({
      success: true,
      message: "Site settings updated successfully.",
      settings: {
        id: data.id,
        request_form_maintenance: isMaintenance,
        request_form_enabled: !isMaintenance,
        chatbot_enabled: isChatbotEnabled,
        maintenance_message: data.maintenance_message || null,
        updated_at: data.updated_at,
        table_exists: true,
      },
    });
  } catch (err) {
    console.error("POST/PATCH /api/admin/settings unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while updating site settings." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return handleUpdateSettings(request);
}

export async function PATCH(request) {
  return handleUpdateSettings(request);
}
