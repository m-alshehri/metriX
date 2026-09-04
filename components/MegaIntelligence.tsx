import { createClient } from "@/lib/supabase/server";
import { buildIntelligence } from "@/lib/intelligence";
import { runFullPipeline } from "@/app/[locale]/projects/pipeline-actions";

export default async function MegaIntelligence({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const ar = locale === "ar";
  const db = createClient();

  const [{ data: mentions }, { data: keywords }, { data: lastRun }] =
    await Promise.all([
      db
        .from("mentions")
        .select(
          "keyword_id,author_username,author_name,content,sentiment,likes,shares,replies,views"
        )
        .eq("project_id", projectId),

      db
        .from("keywords")
        .select("id,keyword")
        .eq("project_id", projectId),

      db
        .from("pipeline_runs")
        .select(
          "status,imported,analyzed,alerts,started_at,finished_at,details"
        )
        .eq("project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const intel = buildIntelligence(mentions || [], keywords || []);

  const lastRunLabel =
    lastRun?.status === "success"
      ? ar
        ? `آخر تشغيل ناجح: ${lastRun.imported} مستورد · ${lastRun.analyzed} محلل · ${lastRun.alerts} تنبيه`
        : `Last successful run: ${lastRun.imported} imported · ${lastRun.analyzed} analyzed · ${lastRun.alerts} alerts`
      : lastRun?.status === "failed"
      ? ar
        ? "آخر تشغيل فشل. راجع سجلات Vercel لمعرفة السبب."
        : "The last pipeline run failed. Check Vercel logs for details."
      : lastRun?.status === "running"
      ? ar
        ? "الـPipeline قيد التشغيل."
        : "The pipeline is currently running."
      : lastRun
      ? ar
        ? `آخر حالة: ${lastRun.status}`
        : `Last status: ${lastRun.status}`
      : ar
      ? "لم يتم تشغيل الـPipeline الكامل بعد."
      : "The full pipeline has not been run yet.";

  return (
    <section className="mt-10">
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
              {ar ? "الأتمتة" : "AUTOMATION"}
            </div>
            <h2 className="mt-2 text-2xl font-black">
              {ar ? "تشغيل الـPipeline الكامل" : "Run Full Pipeline"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              {ar
                ? "يجمع أحدث المنشورات من X، يحلل المشاعر، يحدث AI Insights، ثم يفحص التنبيهات."
                : "Collects new X posts, analyzes sentiment, refreshes AI Insights, then scans for alerts."}
            </p>
            <p
              className={`mt-3 text-sm font-bold ${
                lastRun?.status === "failed"
                  ? "text-red-600"
                  : lastRun?.status === "success"
                  ? "text-emerald-700"
                  : "text-zinc-600"
              }`}
            >
              {lastRunLabel}
            </p>
          </div>

          <form action={runFullPipeline}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="project_id" value={projectId} />
            <button className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white transition hover:opacity-90">
              {ar ? "تشغيل كامل الآن" : "Run Full Pipeline"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
        {ar ? "الذكاء التنافسي" : "INTELLIGENCE LAYER"}
      </div>

      <h2 className="mt-2 text-3xl font-black">
        {ar
          ? "حصة الصوت والمواضيع والمؤثرون"
          : "Share of Voice, Topics & Influencers"}
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "حصة الصوت" : "Share of Voice"}</h3>

          <div className="mt-4 space-y-3">
            {intel.shareOfVoice.map((x) => (
              <div key={x.keyword}>
                <div className="flex justify-between text-sm">
                  <b>{x.keyword}</b>
                  <span>{x.percent}%</span>
                </div>

                <div className="mt-1 h-2 rounded bg-zinc-100">
                  <div
                    className="h-2 rounded bg-metrix-900"
                    style={{ width: `${x.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">
            {ar ? "المواضيع البارزة" : "Topic signals"}
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {intel.topics.map((x) => (
              <span
                key={x.topic}
                className="rounded-full bg-metrix-50 px-3 py-2 text-sm font-bold"
              >
                {x.topic} · {x.count}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">
            {ar ? "أهم المؤلفين" : "Top authors"}
          </h3>

          <div className="mt-4 space-y-3">
            {intel.topAuthors.slice(0, 7).map((x) => (
              <div
                key={x.name}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <b>{x.name}</b>
                <span>
                  {x.engagement} {ar ? "تفاعل" : "eng."}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
