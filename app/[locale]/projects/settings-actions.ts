"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function asBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function clampNumber(value: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function saveAlertSettings(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const projectId = String(formData.get("project_id") || "");

  if (!projectId) redirect(`/${locale}/dashboard`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: project } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) redirect(`/${locale}/dashboard`);

  const automationEnabled = asBool(formData.get("automation_enabled"));
  const emailAlertsEnabled = asBool(formData.get("email_alerts_enabled"));
  const alertEmailRaw = String(formData.get("alert_email") || "").trim();
  const negativeThreshold = Math.round(
    clampNumber(formData.get("negative_threshold"), 1, 100, 40)
  );
  const spikeMultiplier = clampNumber(formData.get("spike_multiplier"), 1, 10, 1.5);

  const alertEmail =
    emailAlertsEnabled && alertEmailRaw.length > 0 ? alertEmailRaw : null;

  const { error } = await supabase
    .from("project_settings")
    .upsert(
      {
        project_id: projectId,
        user_id: user.id,
        automation_enabled: automationEnabled,
        email_alerts_enabled: emailAlertsEnabled,
        alert_email: alertEmail,
        negative_threshold: negativeThreshold,
        spike_multiplier: spikeMultiplier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

  if (error) {
    console.error("Failed to save project settings:", error);
    redirect(`/${locale}/projects/${projectId}?settings=failed#alert-settings`);
  }

  revalidatePath(`/${locale}/projects/${projectId}`);
  redirect(`/${locale}/projects/${projectId}?settings=saved#alert-settings`);
}
