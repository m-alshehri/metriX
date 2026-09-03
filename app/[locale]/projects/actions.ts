"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

function safeLocale(value: FormDataEntryValue | null) {
  const locale = typeof value === "string" ? value : "en";
  return isLocale(locale) ? locale : "en";
}

export async function createProject(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) redirect(`/${locale}/projects/new?error=invalid`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    description: description || null
  });

  if (error) redirect(`/${locale}/projects/new?error=create`);

  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard?message=project-created`);
}
