import { createClient } from "@/lib/supabase/server";
import { saveAlertSettings } from "@/app/[locale]/projects/settings-actions";

export default async function AlertSettings({
  projectId,
  locale,
  status,
}: {
  projectId: string;
  locale: string;
  status?: string;
}) {
  const ar = locale === "ar";
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("project_settings")
    .select(
      "automation_enabled,email_alerts_enabled,alert_email,negative_threshold,spike_multiplier"
    )
    .eq("project_id", projectId)
    .maybeSingle();

  const automationEnabled = settings?.automation_enabled ?? true;
  const emailAlertsEnabled = settings?.email_alerts_enabled ?? false;
  const negativeThreshold = settings?.negative_threshold ?? 40;
  const spikeMultiplier = settings?.spike_multiplier ?? 1.5;

  return (
    <section id="alert-settings" className="mt-10">
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
            {ar ? "إعدادات المشروع" : "PROJECT SETTINGS"}
          </div>
          <h2 className="mt-2 text-2xl font-black">
            {ar ? "الأتمتة والتنبيهات" : "Automation & Alerts"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            {ar
              ? "تحكم في التشغيل التلقائي، تنبيهات البريد الإلكتروني، وحدود اكتشاف السلبية والارتفاع المفاجئ."
              : "Control automation, email notifications, and the thresholds used for negative sentiment and spike detection."}
          </p>
        </div>

        {status === "saved" && (
          <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {ar ? "تم حفظ الإعدادات بنجاح." : "Settings saved successfully."}
          </div>
        )}

        {status === "failed" && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {ar ? "تعذر حفظ الإعدادات. حاول مرة أخرى." : "Could not save settings. Please try again."}
          </div>
        )}

        <form action={saveAlertSettings} className="mt-6 space-y-6">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="project_id" value={projectId} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
              <input
                type="checkbox"
                name="automation_enabled"
                defaultChecked={automationEnabled}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block font-black">
                  {ar ? "التشغيل التلقائي" : "Automation"}
                </span>
                <span className="mt-1 block text-sm leading-6 text-zinc-500">
                  {ar
                    ? "السماح للـCron بتشغيل الـPipeline لهذا المشروع."
                    : "Allow the scheduled cron job to run the pipeline for this project."}
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
              <input
                type="checkbox"
                name="email_alerts_enabled"
                defaultChecked={emailAlertsEnabled}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block font-black">
                  {ar ? "تنبيهات البريد" : "Email Alerts"}
                </span>
                <span className="mt-1 block text-sm leading-6 text-zinc-500">
                  {ar
                    ? "إرسال التنبيهات الحرجة والعالية إلى البريد المحدد."
                    : "Send high and critical alerts to the configured recipient."}
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="block md:col-span-1">
              <span className="text-sm font-black">
                {ar ? "بريد استقبال التنبيهات" : "Alert recipient email"}
              </span>
              <input
                type="email"
                name="alert_email"
                defaultValue={settings?.alert_email || ""}
                placeholder="name@example.com"
                className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-metrix-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black">
                {ar ? "حد السلبية (%)" : "Negative threshold (%)"}
              </span>
              <input
                type="number"
                name="negative_threshold"
                min="1"
                max="100"
                step="1"
                defaultValue={negativeThreshold}
                className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-metrix-200"
              />
              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                {ar
                  ? "ينشئ تنبيهًا عندما تصل نسبة الإشارات السلبية لهذا الحد."
                  : "Creates an alert when negative mentions reach this percentage."}
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-black">
                {ar ? "معامل الارتفاع المفاجئ" : "Spike multiplier"}
              </span>
              <input
                type="number"
                name="spike_multiplier"
                min="1"
                max="10"
                step="0.1"
                defaultValue={spikeMultiplier}
                className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-metrix-200"
              />
              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                {ar
                  ? "سيستخدمه محرك التنبيهات عند تفعيل كشف الارتفاعات المفاجئة."
                  : "Used by the alert engine when spike detection is enabled."}
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white transition hover:opacity-90"
            >
              {ar ? "حفظ الإعدادات" : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
