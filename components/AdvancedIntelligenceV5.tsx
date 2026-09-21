import { createClient } from "@/lib/supabase/server";
import { safePublicUrl } from "@/lib/security";
import { checked } from "@/lib/db-result";
import { comparePeriods, percentChange } from "@/lib/analytics";
export default async function AdvancedIntelligenceV5({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const db = await createClient(),
    ar = locale === "ar";
  const settings = checked(
      await db
        .from("project_settings")
        .select("comparison_window_days")
        .eq("project_id", projectId)
        .maybeSingle(),
    ),
    days = settings?.comparison_window_days || 7;
  const [d, s, a] = await Promise.all([
    db.rpc("metrix_daily_metrics", { p_project: projectId, p_days: days * 2 }),
    db
      .from("daily_project_summaries")
      .select("executive_summary,summary_date")
      .eq("project_id", projectId)
      .order("summary_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("social_accounts")
      .select("id,platform,handle,last_sync_status,last_successful_sync")
      .eq("project_id", projectId)
      .eq("enabled", true),
  ]);
  const extra = checked(
    await db.rpc("metrix_intelligence", { p_project: projectId }),
  );
  const { current, previous } = comparePeriods(checked(d) || [], days),
    summary = checked(s),
    accounts = checked(a) || [];
  return (
    <section className="space-y-5">
      <p className="text-sm text-zinc-500">
        {ar
          ? `مقارنة آخر ${days} يومًا مكتملًا بالفترة السابقة، بتوقيت UTC. الأيام دون سجلات تُحسب صفرًا.`
          : `Comparing the last ${days} complete UTC days with the preceding period. Missing days count as zero.`}
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {(["mentions", "engagement", "views", "negative"] as const).map(
          (k, i) => {
            const delta = percentChange(current[k], previous[k]);
            return (
              <div className="rounded-xl border bg-white p-5" key={k}>
                <h3>
                  {
                    (ar
                      ? ["الإشارات", "التفاعل", "المشاهدات", "السلبية"]
                      : ["Mentions", "Engagement", "Views", "Negative"])[i]
                  }
                </h3>
                <p className="mt-2 text-3xl">{current[k].toLocaleString()}</p>
                <p className="text-sm">
                  {delta === null
                    ? ar
                      ? "لا يوجد خط أساس"
                      : "No baseline"
                    : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                </p>
              </div>
            );
          },
        )}
      </div>
      {summary && (
        <article className="rounded-xl border bg-white p-5">
          <h2>
            {ar ? "الملخص اليومي" : "Daily summary"} · {summary.summary_date}
          </h2>
          <p className="mt-3">{summary.executive_summary}</p>
        </article>
      )}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="text-xl">{ar ? "حالة المصادر" : "Source status"}</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {ar
            ? "الجمع الحالي محدود حتى 100 سجل لكل مصدر في الطلب الواحد؛ لا يعني اكتمال الأرشيف التاريخي."
            : "Collection is capped at 100 records per source per request; this does not guarantee complete historical coverage."}
        </p>
        <ul className="mt-4 space-y-3">
          {accounts.map((x) => (
            <li key={x.id}>
              {x.platform} · {x.handle} · {x.last_sync_status || "—"} ·{" "}
              {x.last_successful_sync
                ? new Date(x.last_successful_sync).toISOString()
                : "—"}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border bg-white p-5">
          <h2>
            {ar ? "الموضوعات خلال 30 يومًا" : "Topics in the last 30 days"}
          </h2>
          <ul className="mt-3 space-y-2">
            {extra.topics.map((t: { topic: string; mentions: number }) => (
              <li key={t.topic}>
                {t.topic} · {t.mentions}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border bg-white p-5">
          <h2>
            {ar ? "استهلاك 30 يومًا حسب العملية" : "30-day usage by operation"}
          </h2>
          <ul className="mt-3 space-y-2">
            {extra.usage.map(
              (u: {
                event_type: string;
                provider: string;
                quantity: number;
              }) => (
                <li key={`${u.event_type}:${u.provider}`}>
                  {u.provider} · {u.event_type} ·{" "}
                  {Number(u.quantity).toLocaleString()}
                </li>
              ),
            )}
          </ul>
        </article>
      </div>
      <article className="rounded-xl border bg-white p-5">
        <h2>{ar ? "أحدث مؤشرات المؤلفين" : "Latest author signals"}</h2>
        <ul className="mt-3 space-y-2">
          {extra.authors.map(
            (a: {
              platform: string;
              author_username: string;
              followers: number;
            }) => (
              <li key={`${a.platform}:${a.author_username}`}>
                {a.platform} · {a.author_username} ·{" "}
                {Number(a.followers).toLocaleString()}{" "}
                {ar ? "متابع" : "followers"}
              </li>
            ),
          )}
        </ul>
      </article>
      {(["top", "viral"] as const).map((kind) => (
        <article className="rounded-xl border bg-white p-5" key={kind}>
          <h2>
            {kind === "top"
              ? ar
                ? "أعلى المحتوى تفاعلًا"
                : "Top engaging content"
              : ar
                ? "مؤشر الانتشار التقديري"
                : "Estimated virality score"}
          </h2>
          {kind === "viral" && (
            <p className="text-sm text-zinc-500">
              {ar
                ? "التفاعل مقسومًا على الجذر التربيعي لعمر المنشور بالساعات؛ ليس قياسًا فعليًا لتغير التفاعل."
                : "Engagement divided by the square root of post age in hours; not a measured engagement delta."}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {extra[kind].map(
              (m: {
                id: string;
                content: string;
                post_url: string;
                engagement?: number;
                virality_score?: number;
              }) => (
                <li key={m.id}>
                  <a
                    href={safePublicUrl(m.post_url) || undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(m.content || "").slice(0, 250)}
                  </a>{" "}
                  ·{" "}
                  {Number(
                    kind === "top" ? m.engagement : m.virality_score,
                  ).toLocaleString()}
                </li>
              ),
            )}
          </ul>
        </article>
      ))}
    </section>
  );
}
