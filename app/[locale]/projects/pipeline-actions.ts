"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueProject, type JobMode } from "@/lib/jobs";
import { drainJobs } from "@/lib/worker";

export async function queueProjectAction(form: FormData, mode: JobMode) {
  const locale = form.get("locale") === "ar" ? "ar" : "en",
    projectId = String(form.get("project_id") || "");
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) redirect(`/${locale}/dashboard`);
  let status = "queued";
  try {
    await enqueueProject(projectId, user.id, mode, locale);
    after(() => drainJobs(projectId));
  } catch (error) {
    console.error("Queue request failed", error);
    status = "limited";
  }
  redirect(`/${locale}/projects/${projectId}?pipeline=${status}`);
}
export async function runFullPipeline(form: FormData) {
  return queueProjectAction(form, "full");
}
export async function checkBrightDataStatus(form: FormData) {
  return queueProjectAction(form, "recover");
}
