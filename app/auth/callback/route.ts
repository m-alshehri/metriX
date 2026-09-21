import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, safeNext } from "@/lib/security";
export async function GET(request: Request) {
  const url = new URL(request.url),
    next = safeNext(url.searchParams.get("next"));
  const locale = next.startsWith("/ar/") ? "ar" : "en";
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, appOrigin()));
  }
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=confirmation`, appOrigin()),
  );
}
