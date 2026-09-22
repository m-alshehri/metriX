import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
async function context(projectId: string) {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user) return null;
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  return project ? { db, user } : null;
}
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || "",
    c = await context(projectId);
  if (!c)
    return NextResponse.json(
      { ok: false, error: "Unauthorized or project not found" },
      { status: 403 },
    );
  const { data, error } = await c.db
    .from("social_accounts")
    .select("id,platform,handle,enabled,last_sync_status,last_sync_error")
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("created_at");
  return NextResponse.json(
    error
      ? { ok: false, error: "Could not load sources" }
      : { ok: true, accounts: data },
    { status: error ? 500 : 200 },
  );
}
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null),
    projectId = String(body?.projectId || ""),
    c = await context(projectId);
  if (!c)
    return NextResponse.json(
      { ok: false, error: "Unauthorized or project not found" },
      { status: 403 },
    );
  if (!Array.isArray(body?.accounts))
    return NextResponse.json(
      { ok: false, error: "Invalid accounts" },
      { status: 400 },
    );
  const { error } = await createAdminClient().rpc("metrix_save_accounts", {
    p_project: projectId,
    p_user: c.user.id,
    p_accounts: body.accounts,
  });
  if (error)
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not save sources. Check inputs and wait for any active run to finish.",
      },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
