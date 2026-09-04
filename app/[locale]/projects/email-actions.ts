"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendTestAlertEmail(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const projectId = String(formData.get("project_id") || "");

  if (!projectId) redirect(`/${locale}/dashboard`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: project } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) redirect(`/${locale}/dashboard`);

  const { data: settings } = await supabase
    .from("project_settings")
    .select("email_alerts_enabled,alert_email")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.email_alerts_enabled || !settings?.alert_email) {
    redirect(`/${locale}/projects/${projectId}?emailtest=disabled`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !from) {
    redirect(`/${locale}/projects/${projectId}?emailtest=config`);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [settings.alert_email],
      subject: "metriX test alert",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px">
          <h2>metriX Email Alerts are working ✅</h2>
          <p>This is a test notification for <strong>${project.name}</strong>.</p>
          <p>Your production alert channel is configured correctly.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <small>Sent automatically by metriX.</small>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    console.error("Resend test email failed:", await res.text());
    redirect(`/${locale}/projects/${projectId}?emailtest=failed`);
  }

  redirect(`/${locale}/projects/${projectId}?emailtest=sent`);
}
