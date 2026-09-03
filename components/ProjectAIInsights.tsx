import { createClient } from "@/lib/supabase/server";
import { generateProjectInsights } from "@/app/[locale]/projects/ai-insights-actions";

type Insight = {
  id: string;
  executive_summary: string;
  top_topics: string[] | null;
  positive_drivers: string[] | null;
  negative_drivers: string[] | null;
  risks: string[] | null;
  opportunities: string[] | null;
  recommendations: string[] | null;
  mentions_analyzed: number;
  generated_at: string;
};

function InsightList({
  title,
  items,
}: {
  title: string;
  items: string[] | null;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <h4 className="text-base font-black">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-metrix-900" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProjectAIInsights({
  projectId,
  locale,
  searchParams,
}: {
  projectId: string;
  locale: string;
  searchParams?: {
    insights?: string;
    insighterror?: string;
    code?: string;
  };
}) {
  const ar = locale === "ar";
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("project_insights")
    .select(
      "id,executive_summary,top_topics,positive_drivers,negative_drivers,risks,opportunities,recommendations,mentions_analyzed,generated_at"
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const insight = (data ?? null) as Insight | null;

  const error = searchParams?.insighterror;
  const code = searchParams?.code;

  const errorText =
    error === "missing-openai-key"
      ? ar
        ? "مفتاح OpenAI غير موجود في إعدادات Vercel."
        : "OPENAI_API_KEY is missing from Vercel."
      : error === "no-mentions"
      ? ar
        ? "لا توجد إشارات كافية لتحليلها حتى الآن."
        : "There are no mentions available to analyze yet."
      : error === "database"
      ? ar
        ? "حدث خطأ أثناء قراءة أو حفظ بيانات التحليل."
        : "There was a database error while reading or saving insights."
      : error === "openai-401"
      ? ar
        ? "OpenAI رفض مفتاح API. تحقق من المفتاح في Vercel."
        : "OpenAI rejected the API key. Check the key in Vercel."
      : error === "openai-429"
      ? ar
        ? `تم الوصول إلى حد OpenAI أو الرصيد المتاح${
            code ? ` (${code})` : ""
          }.`
        : `OpenAI quota or rate limit reached${
            code ? ` (${code})` : ""
          }.`
      : error === "openai-api"
      ? ar
        ? "تعذر إنشاء التحليل بسبب خطأ من OpenAI."
        : "OpenAI returned an error while generating insights."
      : error === "parse"
      ? ar
        ? "تم استلام استجابة غير متوقعة من OpenAI."
        : "OpenAI returned an unexpected response."
      : null;

  return (
    <section className="mt-10 rounded-[2.25rem] border border-metrix-100 bg-gradient-to-br from-white to-metrix-50/40 p-7 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
            {ar ? "ذكاء اصطناعي" : "AI INSIGHTS"}
          </div>
          <h2 className="mt-2 text-3xl font-black">
            {ar ? "ملخص ذكي للمشروع" : "AI-powered project insights"}
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-500">
            {ar
              ? "يحلل metriX أحدث الإشارات ويستخلص المواضيع والمخاطر والفرص والتوصيات المهمة."
              : "metriX analyzes the latest mentions and surfaces the most important topics, risks, opportunities, and recommendations."}
          </p>
        </div>

        <form action={generateProjectInsights}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-2xl bg-metrix-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90"
          >
            {insight
              ? ar
                ? "إعادة توليد التحليل"
                : "Regenerate AI Insights"
              : ar
              ? "إنشاء التحليل الذكي"
              : "Generate AI Insights"}
          </button>
        </form>
      </div>

      {errorText && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorText}
        </div>
      )}

      {searchParams?.insights === "generated" && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {ar
            ? "تم إنشاء التحليل الذكي وحفظه بنجاح."
            : "AI insights generated and saved successfully."}
        </div>
      )}

      {!insight ? (
        <div className="mt-7 rounded-3xl border border-dashed bg-white/70 p-8 text-center">
          <div className="text-lg font-black">
            {ar ? "لا يوجد تحليل ذكي بعد" : "No AI insights yet"}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {ar
              ? "اضغط الزر أعلاه لتحليل أحدث بيانات المشروع."
              : "Use the button above to analyze the project's latest data."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-7 rounded-3xl bg-metrix-950 p-7 text-white">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
              {ar ? "الملخص التنفيذي" : "EXECUTIVE SUMMARY"}
            </div>
            <p className="mt-4 text-base leading-8 text-white/90">
              {insight.executive_summary}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
                {insight.mentions_analyzed}{" "}
                {ar ? "إشارة تم تحليلها" : "mentions analyzed"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
                {new Intl.DateTimeFormat(ar ? "ar-SA" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(insight.generated_at))}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <InsightList
              title={ar ? "أهم المواضيع" : "Top topics"}
              items={insight.top_topics}
            />
            <InsightList
              title={ar ? "محركات الانطباع الإيجابي" : "Positive sentiment drivers"}
              items={insight.positive_drivers}
            />
            <InsightList
              title={ar ? "محركات الانطباع السلبي" : "Negative sentiment drivers"}
              items={insight.negative_drivers}
            />
            <InsightList
              title={ar ? "المخاطر" : "Risks"}
              items={insight.risks}
            />
            <InsightList
              title={ar ? "الفرص" : "Opportunities"}
              items={insight.opportunities}
            />
            <InsightList
              title={ar ? "التوصيات" : "Recommendations"}
              items={insight.recommendations}
            />
          </div>
        </>
      )}
    </section>
  );
}
