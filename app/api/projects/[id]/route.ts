import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "Project name is required" }, { status: 400 });

  const { error } = await db
    .from("projects")
    .update({ name })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: project } = await db
    .from("projects")
    .select("id,avatar_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const { error } = await db
    .from("projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  // Clean up the avatar folder after the project is removed.
  const { data: files } = await db.storage.from("project-avatars").list(`${user.id}/${params.id}`);
  if (files?.length) {
    await db.storage.from("project-avatars").remove(
      files.map((f) => `${user.id}/${params.id}/${f.name}`)
    );
  }

  return NextResponse.json({ ok: true });
}
