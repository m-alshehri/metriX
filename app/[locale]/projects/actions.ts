"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function createProject(form: FormData) {
  const locale = form.get("locale") === "ar" ? "ar" : "en",
    name = String(form.get("name") || "").trim(),
    description = String(form.get("description") || "").trim();
  if (!name || name.length > 200 || description.length > 2000)
    redirect(`/${locale}/projects/new?error=invalid`);
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { error } = await db
    .from("projects")
    .insert({ user_id: user.id, name, description: description || null });
  if (error) redirect(`/${locale}/projects/new?error=create`);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard`);
}
