import { createClient } from "@/lib/supabase/server";

type Props = {
  projectId: string;
  locale: string;
};

function severityClasses(severity: string) {
  if (severity === "critical") return "bg-red-50 text-red-700 border-red-200";
  if (severity === "high") return "bg-orange-50 text-orange-700 border-orange-200";
  if (severity === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

function typeLabel(type: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    negative_sentiment: ["Negative sentiment", "ارتفاع السلبية"],
    conversation_spike: ["Conversation spike", "ارتفاع مفاجئ في المحادثات"],
    keyword_crisis: ["Keyword crisis", "أزمة مرتبطة بكلمة مفتاحية"],
    high_engagement_negative: [
      "High-engagement negative mention",
      "منشور سلبي عالي التفاعل",
    ],
  };
  const pair = labels[type];
  return pair ? (ar ? pair[1] : pair[0]) : type.replaceAll("_", " ");
}

function evidence(metadata: any, ar: boolean) {
  if (!metadata) return null;

  if (metadata.multiplier) {
    return ar
      ? `الحجم الحالي ${metadata.multiplier}× من خط الأساس · ${metadata.baseline_mentions ?? "—"} إشارة تاريخية عبر ${metadata.baseline_days ?? "—"} أيام`
      : `Current volume is ${metadata.multiplier}× baseline · ${metadata.baseline_mentions ?? "—"} historical mentions across ${metadata.baseline_days ?? "—"} days`;
  }

  if (metadata.percent) {
    return ar
      ? `النسبة ${metadata.percent}% · ${metadata.negative_mentions ?? "—"} سلبية من ${metadata.analyzed_mentions ?? "—"} إشارة محللة`
      : `${metadata.percent}% · ${metadata.negative_mentions ?? "—"} negative of ${metadata.analyzed_mentions ?? "—"} analyzed mentions`;
  }

  if (metadata.engagement) {
    return ar
      ? `${metadata.engagement} تفاعل · الحد المكتشف ${metadata.adaptive_threshold ?? "—"}`
      : `${metadata.engagement} engagements · adaptive threshold ${metadata.adaptive_threshold ?? "—"}`;
  }

  return null;
}

export default async function AlertsCenter({ projectId, locale }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: alerts } = await supabase
    .from("project_alerts")
    .select(
      "id,alert_type,severity,title,description,metadata,is_active,detected_at,email_sent_at"
    )
    .eq("project_id", projectId)
    .order("detected_at", { ascending: false })
    .limit(10);

  const rows = alerts ?? [];
  const ar = locale === "ar";

  return (
    <section id="alerts-center" className="mt-10 rounded-[2rem] border bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-metrix-700">
            {ar ? "مركز التنبيهات" : "Alerts Center"}
          </div>
          <h2 className="mt-2 text-2xl font-black">
            {ar ? "تنبيهات المخاطر والأزمات" : "Risk & Crisis Alerts"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            {ar
              ? "يعرض آخر التنبيهات التي اكتشفها metriX مع سبب إصدار كل تنبيه والأدلة الرقمية المرتبطة به."
              : "The latest alerts detected by metriX, including why each alert was triggered and the supporting evidence."}
          </p>
        </div>
        <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-700">
          {ar ? `${rows.length} تنبيه` : `${rows.length} alerts`}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-500">
          {ar
            ? "لا توجد تنبيهات حتى الآن. سيظهر أي تنبيه جديد هنا تلقائيًا بعد تشغيل الـ Pipeline."
            : "No alerts yet. New alerts will appear here automatically after the pipeline runs."}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((alert: any) => {
            const ev = evidence(alert.metadata, ar);
            const url = alert.metadata?.post_url;

            return (
              <article key={alert.id} className="rounded-2xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${severityClasses(
                          String(alert.severity)
                        )}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="rounded-full bg-metrix-50 px-3 py-1 text-xs font-black text-metrix-900">
                        {typeLabel(String(alert.alert_type), ar)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          alert.is_active
                            ? "bg-red-50 text-red-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {alert.is_active
                          ? ar
                            ? "نشط"
                            : "Active"
                          : ar
                          ? "منتهي"
                          : "Resolved"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-black">{alert.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {alert.description}
                    </p>
                  </div>

                  <time className="shrink-0 text-xs font-semibold text-zinc-400">
                    {alert.detected_at
                      ? new Date(alert.detected_at).toLocaleString(
                          ar ? "ar-SA" : "en-US"
                        )
                      : ""}
                  </time>
                </div>

                {ev && (
                  <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                    {ev}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-500">
                  <span>
                    {alert.email_sent_at
                      ? ar
                        ? "تم إرسال إشعار بالبريد"
                        : "Email notification sent"
                      : ar
                      ? "لم يتم تسجيل إرسال بريد"
                      : "No email send recorded"}
                  </span>

                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-black text-metrix-900"
                    >
                      {ar ? "عرض المنشور" : "View mention"}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
