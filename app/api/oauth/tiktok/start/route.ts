import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || "";
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.json({ error: "TIKTOK_CLIENT_KEY missing" }, { status: 500 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, url.origin));

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.redirect(new URL(`/${locale}/dashboard`, url.origin));

  const state = crypto.randomUUID();
  const cookieStore = cookies();
  cookieStore.set("metrix_tiktok_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  cookieStore.set("metrix_tiktok_project", projectId, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  cookieStore.set("metrix_tiktok_locale", locale, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  const redirectUri = `${url.origin}/api/oauth/tiktok/callback`;
  const auth = new URL("https://www.tiktok.com/v2/auth/authorize/");
  auth.searchParams.set("client_key", clientKey);
  auth.searchParams.set("scope", "user.info.basic,video.list");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  return NextResponse.redirect(auth);
}
