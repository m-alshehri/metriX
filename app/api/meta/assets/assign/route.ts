import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const admin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const assetId = String(body?.assetId || "").trim();
  const projectId = body?.projectId ? String(body.projectId).trim() : null;

  if (!assetId) {
    return NextResponse.json(
      { ok: false, error: "Missing Meta asset" },
      { status: 400 }
    );
  }

  // Verify the selected project is accessible by this user through normal RLS.
  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { ok: false, error: "Project not found or not accessible" },
        { status: 403 }
      );
    }
  }

  const db = admin();

  const { data: asset, error: assetError } = await db
    .from("meta_assets")
    .select("id,asset_type,external_id")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assetError || !asset) {
    return NextResponse.json(
      { ok: false, error: "Meta asset not found" },
      { status: 404 }
    );
  }

  const selected = Boolean(projectId);

  const { error: updateError } = await db
    .from("meta_assets")
    .update({
      project_id: projectId,
      selected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  // If this is a Facebook Page, automatically assign its linked Instagram
  // Professional account to the same metriX project.
  if (asset.asset_type === "facebook_page") {
    const { error: instagramError } = await db
      .from("meta_assets")
      .update({
        project_id: projectId,
        selected,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("asset_type", "instagram_account")
      .eq("parent_external_id", asset.external_id);

    if (instagramError) {
      return NextResponse.json(
        { ok: false, error: instagramError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
