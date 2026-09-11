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
  return String(value || "").trim().replace(/\/+$/, "");
}

async function context(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, project: null };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  return { supabase, user, project };
}

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId") || "";
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Missing projectId" }, { status: 400 });
  }

  const { supabase, user, project } = await context(projectId);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("social_accounts")
    .select("id,platform,handle,profile_url,external_id,enabled,last_synced_at,last_sync_status,last_sync_error")
    .eq("project_id", projectId)
    .order("platform");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, accounts: data || [] });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 }); }

  const projectId = String(body?.projectId || "").trim();
  const accounts = Array.isArray(body?.accounts) ? body.accounts : [];
  if (!projectId) return NextResponse.json({ ok: false, error: "Missing projectId" }, { status: 400 });

  const { supabase, user, project } = await context(projectId);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const byPlatform = new Map<string, any>();

  for (const raw of accounts) {
    const platform = String(raw?.platform || "").toLowerCase();
    const handle = cleanHandle(raw?.handle);
    if (ALLOWED.has(platform) && handle) {
      byPlatform.set(platform, { platform, handle, enabled: raw?.enabled !== false });
    }
  }

  const rows = Array.from(byPlatform.values()).map((x) => ({
    user_id: user.id,
    project_id: projectId,
    platform: x.platform,
    handle: x.handle,
    enabled: x.enabled,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await supabase
      .from("social_accounts")
      .upsert(rows, { onConflict: "project_id,platform" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const wanted = rows.map((x) => x.platform);
  const remove = Array.from(ALLOWED).filter((p) => !wanted.includes(p));

  if (remove.length) {
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("project_id", projectId)
      .in("platform", remove);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
