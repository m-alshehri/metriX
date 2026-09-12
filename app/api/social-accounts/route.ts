import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = [
  "x",
  "youtube",
  "instagram",
  "tiktok",
  "threads",
  "facebook",
  "linkedin",
  "google_maps",
  "reddit",
  "snapchat",
] as const;

const ALLOWED_SET = new Set<string>(ALLOWED);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "projectId required" },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select(
      "id,project_id,platform,handle,profile_url,external_id,enabled,last_synced_at,last_sync_status,last_sync_error"
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    accounts: data || [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const projectId = String(body?.projectId || "");
  const accounts = Array.isArray(body?.accounts) ? body.accounts : [];

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "projectId required" },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found" },
      { status: 404 }
    );
  }

  const cleaned = accounts
    .map((a: any) => ({
      platform: String(a?.platform || "").toLowerCase(),
      handle: String(a?.handle || "").trim(),
      enabled: a?.enabled !== false,
    }))
    .filter(
      (a: any) => ALLOWED_SET.has(a.platform) && a.handle
    );

  for (const account of cleaned) {
    const { error } = await supabase
      .from("social_accounts")
      .upsert(
        {
          user_id: user.id,
          project_id: projectId,
          platform: account.platform,
          handle: account.handle,
          enabled: account.enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "project_id,platform",
        }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
  }

  const kept = new Set(
    cleaned.map((a: any) => a.platform)
  );

  for (const platform of ALLOWED) {
    if (!kept.has(platform)) {
      await supabase
        .from("social_accounts")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .eq("platform", platform);
    }
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select(
      "id,project_id,platform,handle,profile_url,external_id,enabled,last_synced_at,last_sync_status,last_sync_error"
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    accounts: data || [],
  });
}
