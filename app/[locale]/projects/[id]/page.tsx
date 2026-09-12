import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, isLocale } from "@/lib/i18n";
import { addTestMention } from "../actions";
import { analyzeSentiment } from "../ai-actions";
import { runFullPipeline } from "../pipeline-actions";
import { sendTestAlertEmail } from "../email-actions";
import SocialAccounts from "@/components/SocialAccounts";
import ProjectDashboard from "@/components/ProjectDashboard";
import ProjectAIInsights from "@/components/ProjectAIInsights";
import AlertSettings from "@/components/AlertSettings";
import AlertsCenter from "@/components/AlertsCenter";
import PlatformIcon from "@/components/PlatformIcon";
import AdvancedIntelligenceV5 from "@/components/AdvancedIntelligenceV5";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams?: Record<string, string | undefined>;
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const t = getDictionary(locale);
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: project }, { data: mentions }, { data: lastRun }] = await Promise.all([
    supabase.from("projects").select("id,name,description,avatar_url").eq("id", params.id).eq("user_id", user.id).single(),
    supabase
      .from("mentions")
      .select("id,platform,author_name,author_username,content,post_url,published_at,likes,shares,replies,views,sentiment,social_account_id")
      .eq("project_id", params.id)
      .order("published_at", { ascending: false }),
    supabase
      .from("pipeline_runs")
      .select("status,imported,analyzed,alerts,started_at")
      .eq("project_id", params.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!project) notFound();

  const ms = mentions || [];
  const pendingCount = ms.filter((x) => x.sentiment === null).length;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-5 rounded-[1.8rem] border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-zinc-100 font-black text-zinc-500">
              {project.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                project.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <Link href={`/${locale}/dashboard`} className="text-xs font-bold text-zinc-400 hover:text-[#330033]">
                {ar ? "← المشاريع" : "← Projects"}
              </Link>
              <h1 className="mt-1 text-2xl font-black tracking-tight">{project.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">{project.description || (ar ? "لوحة الرصد والتحليل" : "Monitoring intelligence dashboard")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={runFullPipeline}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={project.id} />
              <button className="rounded-full bg-[#330033] px-5 py-2.5 text-sm font-black text-white">
                {ar ? "تشغيل التحليل" : "Run pipeline"}
              </button>
            </form>
            <form action={analyzeSentiment}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={project.id} />
              <button disabled={pendingCount === 0} className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-black text-zinc-700 disabled:opacity-40">
                {ar ? "تحليل المشاعر" : "Analyze sentiment"}{pendingCount ? ` (${pendingCount})` : ""}
              </button>
            </form>
            <form action={sendTestAlertEmail}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={project.id} />
              <button className="rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600">
                {ar ? "اختبار البريد" : "Test email"}
              </button>
            </form>
          </div>
        </div>

        {lastRun && (
          <div className="mt-3 text-right text-xs font-semibold text-zinc-400">
            {lastRun.status === "success"
              ? (ar
                  ? `آخر تشغيل: ${lastRun.imported || 0} مستورد · ${lastRun.analyzed || 0} محلل · ${lastRun.alerts || 0} تنبيه`
                  : `Last run: ${lastRun.imported || 0} imported · ${lastRun.analyzed || 0} analyzed · ${lastRun.alerts || 0} alerts`)
              : (ar ? "آخر تشغيل لم يكتمل بنجاح" : "Last pipeline run did not complete successfully")}
          </div>
        )}

        <div className="mt-6">
          <SocialAccounts projectId={params.id} locale={locale} />
        </div>

        <ProjectDashboard mentions={ms as any[]} locale={locale} />
        <AdvancedIntelligenceV5 projectId={params.id} locale={locale} />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <details className="rounded-[1.6rem] border bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none font-black">
              {ar ? "AI Insights والتوصيات" : "AI Insights & recommendations"}
              <span className="float-end text-zinc-400">＋</span>
            </summary>
            <div className="mt-4">
              <ProjectAIInsights projectId={params.id} locale={locale} searchParams={searchParams} />
            </div>
          </details>

          <details className="rounded-[1.6rem] border bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none font-black">
              {ar ? "الأتمتة والتنبيهات" : "Automation & alerts"}
              <span className="float-end text-zinc-400">＋</span>
            </summary>
            <div className="mt-4 space-y-6">
              <AlertSettings projectId={params.id} locale={locale} status={searchParams?.settings} />
              <AlertsCenter projectId={params.id} locale={locale} />
            </div>
          </details>
        </div>

        <details className="mt-6 rounded-[1.6rem] border bg-white p-5 shadow-sm">
          <summary className="cursor-pointer list-none font-black">
            {ar ? "الإشارات والمنشورات" : "Mentions & posts"}
            <span className="float-end rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">{ms.length}</span>
          </summary>

          <div className="mt-5 space-y-3">
            {ms.slice(0, 30).map((m) => (
              <article key={m.id} className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[40px_1fr_auto] md:items-start">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm">
                  <PlatformIcon platform={String(m.platform || "").toLowerCase().replace(/\s+/g, "_")} size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-400">{m.author_name || m.author_username || "Unknown"}</div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-700">{m.content || "—"}</p>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-400">
                    <span>♥ {m.likes || 0}</span><span>↻ {m.shares || 0}</span><span>💬 {m.replies || 0}</span><span>◉ {Number(m.views || 0).toLocaleString()}</span>
                  </div>
                </div>
                {m.post_url && <a href={m.post_url} target="_blank" rel="noreferrer" className="text-xs font-black text-[#330033]">{ar ? "فتح" : "Open"}</a>}
              </article>
            ))}
          </div>
        </details>

        <details className="mt-4 rounded-[1.6rem] border border-dashed bg-white p-5">
          <summary className="cursor-pointer list-none text-sm font-bold text-zinc-500">
            {ar ? "أداة الاختبار اليدوي (مؤقتة)" : "Manual test tool (temporary)"}
          </summary>
          <form action={addTestMention} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="project_id" value={project.id} />
            <select name="platform" className="rounded-2xl border px-4 py-3">
              <option>X</option><option>Instagram</option><option>Facebook</option><option>TikTok</option><option>YouTube</option><option>Threads</option>
            </select>
            <input name="author_username" className="rounded-2xl border px-4 py-3" placeholder="@username" />
            <textarea name="content" required rows={3} className="rounded-2xl border px-4 py-3 sm:col-span-2" placeholder={t.mentions.content} />
            <input name="post_url" className="rounded-2xl border px-4 py-3 sm:col-span-2" placeholder={t.mentions.url} />
            <input name="likes" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" />
            <input name="shares" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" />
            <input name="replies" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" />
            <input name="views" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" />
            <select name="sentiment" className="rounded-2xl border px-4 py-3">
              <option value="positive">{t.mentions.positive}</option>
              <option value="neutral">{t.mentions.neutral}</option>
              <option value="negative">{t.mentions.negative}</option>
            </select>
            <input name="published_at" type="datetime-local" className="rounded-2xl border px-4 py-3" />
            <button className="rounded-full bg-[#330033] px-6 py-3 font-bold text-white sm:col-span-2">{t.mentions.add}</button>
          </form>
        </details>
      </div>
    </main>
  );
}
