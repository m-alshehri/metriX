import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";

  const cookieStore = cookies();
  const expectedState = cookieStore.get("metrix_tiktok_state")?.value || "";
  const projectId = cookieStore.get("metrix_tiktok_project")?.value || "";
  const locale = cookieStore.get("metrix_tiktok_locale")?.value === "ar" ? "ar" : "en";

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/projects/${projectId}?oauth=tiktok-failed&reason=${encodeURIComponent(message)}`, url.origin)
    );

  if (!code || !state || state !== expectedState || !projectId) return fail("Invalid OAuth state");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, url.origin));

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return fail("TikTok environment variables missing");

  const redirectUri = `${url.origin}/api/oauth/tiktok/callback`;
  const tokenBody = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
    cache: "no-store",
  });
  const token = await tokenResponse.json();

  if (!tokenResponse.ok || !token?.access_token) {
    return fail(token?.error_description || "TikTok token exchange failed");
  }

  const profileResponse = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    }
  );
  const profilePayload = await profileResponse.json();
  const profile = profilePayload?.data?.user || {};

  const db = createAdminClient();
  const { error } = await db.rpc("store_social_oauth_tokens", {
    p_user_id: user.id,
    p_project_id: projectId,
    p_platform: "tiktok",
    p_access_token: token.access_token,
    p_refresh_token: token.refresh_token || null,
    p_provider_user_id: token.open_id || profile.open_id || null,
    p_username: profile.display_name || null,
    p_scopes: String(token.scope || "").split(",").filter(Boolean),
    p_token_expires_at: token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null,
    p_refresh_expires_at: token.refresh_expires_in
      ? new Date(Date.now() + Number(token.refresh_expires_in) * 1000).toISOString()
      : null,
  });

  if (error) return fail(error.message);

  await db
    .from("social_accounts")
    .update({
      external_id: token.open_id || profile.open_id || null,
      last_sync_status: null,
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("platform", "tiktok")
    .eq("user_id", user.id);

  cookieStore.delete("metrix_tiktok_state");
  cookieStore.delete("metrix_tiktok_project");
  cookieStore.delete("metrix_tiktok_locale");

  return NextResponse.redirect(
    new URL(`/${locale}/projects/${projectId}?oauth=tiktok-connected`, url.origin)
  );
}
