import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let accessToken = "";
  try {
    const body = await request.json();
    accessToken = String(body?.accessToken || "").trim();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing Meta access token" },
      { status: 400 }
    );
  }

  const fields = [
    "id",
    "name",
    "instagram_business_account{id,username,name}",
  ].join(",");

  const url = new URL("https://graph.facebook.com/me/accounts");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          payload?.error?.message ||
          `Meta Graph API request failed (${response.status})`,
      },
      { status: response.status }
    );
  }

  const pages = Array.isArray(payload?.data)
    ? payload.data.map((page: any) => ({
        id: String(page.id),
        name: String(page.name || page.id),
        instagram_business_account: page.instagram_business_account
          ? {
              id: String(page.instagram_business_account.id),
              username: page.instagram_business_account.username
                ? String(page.instagram_business_account.username)
                : undefined,
              name: page.instagram_business_account.name
                ? String(page.instagram_business_account.name)
                : undefined,
            }
          : null,
      }))
    : [];

  return NextResponse.json({ ok: true, pages });
}
