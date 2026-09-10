import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "x",
  "youtube",
  "instagram",
  "facebook",
  "tiktok",
  "threads",
]);

function cleanHandle(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/\/+$/, "");
}

async function getUserAndProject(projectId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, project: null };

  // Existing projects RLS determines whether the signed-in user can access it.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  return { supabase, user, project };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = String(searchParams.get("projectId") || "").trim();

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Missing projectId" },
      { status: 400 }
    );
  }

  const { supabase, user, project } = await getUserAndProject(projectId);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found or not accessible" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select(
      "id,platform,handle,profile_url,external_id,enabled,created_at,updated_at"
    )
    .eq("project_id", projectId)
    .order("platform");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, accounts: data || [] });
}

export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const projectId = String(body?.projectId || "").trim();
  const accounts = Array.isArray(body?.accounts) ? body.accounts : [];

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Missing projectId" },
      { status: 400 }
    );
  }

  const { supabase, user, project } = await getUserAndProject(projectId);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found or not accessible" },
      { status: 404 }
    );
  }

  const normalized = accounts
    .map((item: any) => ({
      platform: String(item?.platform || "").toLowerCase(),
      handle: cleanHandle(item?.handle),
      enabled: item?.enabled !== false,
    }))
    .filter(
      (item: any) => ALLOWED.has(item.platform) && item.handle.length > 0
    );

  // One monitored account per platform per project in this first version.
  const byPlatform = new Map<string, any>();
  for (const item of normalized) byPlatform.set(item.platform, item);

  const rows = Array.from(byPlatform.values()).map((item) => ({
    user_id: user.id,
    project_id: projectId,
    platform: item.platform,
    handle: item.handle,
    enabled: item.enabled,
    updated_at: new Date().toISOString(),
  }));

  const wantedPlatforms = rows.map((row) => row.platform);

  if (wantedPlatforms.length > 0) {
    const { error: upsertError } = await supabase
      .from("social_accounts")
      .upsert(rows, { onConflict: "project_id,platform" });

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: upsertError.message },
        { status: 500 }
      );
    }
  }

  const allPlatforms = [...ALLOWED];
  const platformsToDelete = allPlatforms.filter(
    (platform) => !wantedPlatforms.includes(platform)
  );

  if (platformsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("social_accounts")
      .delete()
      .eq("project_id", projectId)
      .in("platform", platformsToDelete);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select("id,platform,handle,profile_url,external_id,enabled")
    .eq("project_id", projectId)
    .order("platform");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, accounts: data || [] });
}
