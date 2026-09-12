import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Image file is required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Use PNG, JPG or WebP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image must be 2 MB or smaller" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${params.id}/avatar-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  // Remove any old project avatar first.
  const { data: existing } = await db.storage.from("project-avatars").list(`${user.id}/${params.id}`);
  if (existing?.length) {
    await db.storage.from("project-avatars").remove(
      existing.map((f) => `${user.id}/${params.id}/${f.name}`)
    );
  }

  const { error: uploadError } = await db.storage
    .from("project-avatars")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrl } = db.storage.from("project-avatars").getPublicUrl(path);
  const url = publicUrl.publicUrl;

  const { error: updateError } = await db
    .from("projects")
    .update({ avatar_url: url })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (updateError) {
    await db.storage.from("project-avatars").remove([path]);
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, url });
}
