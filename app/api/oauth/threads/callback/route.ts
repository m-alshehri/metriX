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
  const expectedState = cookieStore.get("metrix_threads_state")?.value || "";
  const projectId = cookieStore.get("metrix_threads_project")?.value || "";
  const locale = cookieStore.get("metrix_threads_locale")?.value === "ar" ? "ar" : "en";

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/projects/${projectId}?oauth=threads-failed&reason=${encodeURIComponent(message)}`, url.origin)
    );

  if (!code || !state || state !== expectedState || !projectId) return fail("Invalid OAuth state");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, url.origin));

  const appId = process.env.THREADS_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  if (!appId || !appSecret) return fail("Threads environment variables missing");

  const redirectUri = `${url.origin}/api/oauth/threads/callback`;

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const tokenResponse = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const shortToken = await tokenResponse.json();

  if (!tokenResponse.ok || !shortToken?.access_token) {
    return fail(shortToken?.error?.message || "Threads token exchange failed");
  }

  let accessToken = shortToken.access_token;
  let expiresIn = Number(shortToken.expires_in || 0);

  const longUrl = new URL("https://graph.threads.net/access_token");
  longUrl.searchParams.set("grant_type", "th_exchange_token");
  longUrl.searchParams.set("client_secret", appSecret);
  longUrl.searchParams.set("access_token", accessToken);

  const longResponse = await fetch(longUrl, { cache: "no-store" });
  if (longResponse.ok) {
    const longToken = await longResponse.json();
    if (longToken?.access_token) {
      accessToken = longToken.access_token;
      expiresIn = Number(longToken.expires_in || expiresIn);
    }
  }

  const profileUrl = new URL("https://graph.threads.net/v1.0/me");
  profileUrl.searchParams.set("fields", "id,username");
  profileUrl.searchParams.set("access_token", accessToken);

  const profileResponse = await fetch(profileUrl, { cache: "no-store" });
  const profile = profileResponse.ok ? await profileResponse.json() : {};

  const db = createAdminClient();
  const { error } = await db.rpc("store_social_oauth_tokens", {
    p_user_id: user.id,
    p_project_id: projectId,
    p_platform: "threads",
    p_access_token: accessToken,
    p_refresh_token: null,
    p_provider_user_id: profile?.id ? String(profile.id) : String(shortToken.user_id || ""),
    p_username: profile?.username || null,
    p_scopes: ["threads_basic"],
    p_token_expires_at: expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null,
    p_refresh_expires_at: null,
  });

  if (error) return fail(error.message);

  await db
    .from("social_accounts")
    .update({
      external_id: profile?.id ? String(profile.id) : String(shortToken.user_id || ""),
      last_sync_status: null,
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("platform", "threads")
    .eq("user_id", user.id);

  cookieStore.delete("metrix_threads_state");
  cookieStore.delete("metrix_threads_project");
  cookieStore.delete("metrix_threads_locale");

  return NextResponse.redirect(
    new URL(`/${locale}/projects/${projectId}?oauth=threads-connected`, url.origin)
  );
}
