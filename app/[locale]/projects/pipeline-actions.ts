"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runProjectPipeline } from "@/lib/pipeline";

export async function runFullPipeline(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const projectId = String(formData.get("project_id") || "");

  if (!projectId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    redirect(`/${locale}/dashboard`);
  }

  try {
    await runProjectPipeline(projectId, user.id);
    revalidatePath(`/${locale}/projects/${projectId}`);
    redirect(`/${locale}/projects/${projectId}?pipeline=complete`);
  } catch (error) {
    console.error("Full pipeline failed:", error);
    redirect(`/${locale}/projects/${projectId}?pipeline=failed`);
  }
}
