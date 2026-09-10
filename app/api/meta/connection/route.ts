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

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = admin();

  const { data: connection, error } = await db
    .from("meta_connections")
    .select("id,meta_user_id,status,connected_at,token_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!connection) {
    return NextResponse.json({ ok: true, connected: false, assets: [] });
  }

  const { data: assets, error: assetsError } = await db
    .from("meta_assets")
    .select(
      "id,asset_type,external_id,name,username,parent_external_id,selected,project_id"
    )
    .eq("user_id", user.id)
    .order("asset_type");

  if (assetsError) {
    return NextResponse.json(
      { ok: false, error: assetsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    connected: connection.status === "connected",
    connection,
    assets: assets || [],
  });
}

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

  const token = String(body?.accessToken || "").trim();
  const expiresIn = Number(body?.expiresIn || 0);

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing Meta access token" },
      { status: 400 }
    );
  }

  const pagesUrl = new URL("https://graph.facebook.com/me/accounts");
  pagesUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username,name}"
  );
  pagesUrl.searchParams.set("limit", "100");

  const pagesResponse = await fetch(pagesUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const pagesPayload = await pagesResponse.json();

  if (!pagesResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          pagesPayload?.error?.message ||
          `Meta Graph API failed (${pagesResponse.status})`,
      },
      { status: pagesResponse.status }
    );
  }

  const meUrl = new URL("https://graph.facebook.com/me");
  meUrl.searchParams.set("fields", "id");

  const meResponse = await fetch(meUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const me = meResponse.ok ? await meResponse.json() : {};

  const expiresAt =
    expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const db = admin();

  const { error: tokenError } = await db.rpc("store_meta_token", {
    p_user_id: user.id,
    p_access_token: token,
    p_meta_user_id: me?.id ? String(me.id) : null,
    p_expires_at: expiresAt,
  });

  if (tokenError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Secure token storage failed: ${tokenError.message}`,
      },
      { status: 500 }
    );
  }

  const { data: connection, error: connectionError } = await db
    .from("meta_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json(
      {
        ok: false,
        error: connectionError?.message || "Connection record missing",
      },
      { status: 500 }
    );
  }

  // Preserve existing assignments when reconnecting, if the same assets return.
  const { data: existingAssets } = await db
    .from("meta_assets")
    .select("asset_type,external_id,project_id,selected")
    .eq("user_id", user.id);

  const previous = new Map(
    (existingAssets || []).map((a: any) => [
      `${a.asset_type}:${a.external_id}`,
      { project_id: a.project_id, selected: a.selected },
    ])
  );

  await db.from("meta_assets").delete().eq("user_id", user.id);

  const assets: any[] = [];

  for (const page of Array.isArray(pagesPayload?.data)
    ? pagesPayload.data
    : []) {
    const pageKey = `facebook_page:${String(page.id)}`;
    const pagePrevious = previous.get(pageKey);

    assets.push({
      connection_id: connection.id,
      user_id: user.id,
      asset_type: "facebook_page",
      external_id: String(page.id),
      name: String(page.name || page.id),
      username: null,
      parent_external_id: null,
      selected: Boolean(pagePrevious?.selected),
      project_id: pagePrevious?.project_id || null,
    });

    if (page.instagram_business_account?.id) {
      const instagramId = String(page.instagram_business_account.id);
      const instagramKey = `instagram_account:${instagramId}`;
      const instagramPrevious = previous.get(instagramKey);

      assets.push({
        connection_id: connection.id,
        user_id: user.id,
        asset_type: "instagram_account",
        external_id: instagramId,
        name: page.instagram_business_account.name || null,
        username: page.instagram_business_account.username || null,
        parent_external_id: String(page.id),
        selected: Boolean(instagramPrevious?.selected),
        project_id: instagramPrevious?.project_id || null,
      });
    }
  }

  if (assets.length) {
    const { error: assetError } = await db.from("meta_assets").insert(assets);

    if (assetError) {
      return NextResponse.json(
        { ok: false, error: assetError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    assets,
  });
}
