import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, isLocale } from "@/lib/i18n";
import { addTestMention } from "../actions";
import { analyzeSentiment } from "../ai-actions";
import MetricCard from "@/components/MetricCard";
import ProjectAnalytics from "@/components/ProjectAnalytics";
import ProjectAIInsights from "@/components/ProjectAIInsights";
import ProjectTrends from "@/components/ProjectTrends";
import MegaIntelligence from "@/components/MegaIntelligence";
import AlertSettings from "@/components/AlertSettings";
import AlertsCenter from "@/components/AlertsCenter";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams?: {
    message?: string;
    error?: string;
    aimessage?: string;
    aierror?: string;
    analyzed?: string;
    insights?: string;
    insighterror?: string;
    code?: string;
    settings?: string;
  };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const t = getDictionary(locale);
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: project } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: mentions } = await supabase
    .from("mentions")
    .select("id,platform,author_name,author_username,content,post_url,published_at,likes,shares,replies,views,sentiment,social_account_id")
    .eq("project_id", params.id)
    .order("published_at", { ascending: false });

  const ms = mentions ?? [];
  const count = ms.length;
  const reach = ms.reduce((sum,x)=>sum+(Number(x.views)||0),0);
  const engagement = ms.reduce((sum,x)=>sum+(x.likes||0)+(x.shares||0)+(x.replies||0),0);
  const analyzed = ms.filter((x)=>["positive","neutral","negative"].includes(String(x.sentiment)));
  const positiveCount = analyzed.filter((x)=>x.sentiment==="positive").length;
  const positive = analyzed.length ? Math.round((positiveCount/analyzed.length)*100) : 0;
  const pendingCount = ms.filter((x)=>x.sentiment===null).length;

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}/dashboard`} className="text-2xl font-black text-metrix-900">metriX</Link>
          <Link href={`/${locale}/dashboard`} className="rounded-full border px-4 py-2 text-sm font-bold">{t.projects.back}</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] bg-metrix-950 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-300">Project</div>
              <h1 className="mt-3 text-4xl font-black">{project.name}</h1>
              <p className="mt-3 text-white/70">{project.description || "—"}</p>
            </div>
            <form action={analyzeSentiment}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={project.id} />
              <button disabled={pendingCount===0} className="rounded-full border border-white/30 bg-white/10 px-6 py-3 font-black text-white disabled:opacity-40">
                {t.ai.button}{pendingCount>0 ? ` (${pendingCount})` : ""}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label={t.dashboard.mentions} value={String(count)} />
          <MetricCard label={t.dashboard.reach} value={reach.toLocaleString()} />
          <MetricCard label={t.dashboard.engagement} value={engagement.toLocaleString()} />
          <MetricCard label={t.dashboard.sentiment} value={analyzed.length ? `${positive}%` : (ar ? "غير محلل" : "Not analyzed")} />
        </div>

        <MegaIntelligence projectId={params.id} locale={locale} />

        <ProjectAnalytics mentions={ms} locale={locale} />

        <ProjectAIInsights projectId={params.id} locale={locale} searchParams={searchParams} />

        <ProjectTrends mentions={ms} locale={locale} />

        <AlertSettings projectId={params.id} locale={locale} status={searchParams?.settings} />

        <AlertsCenter projectId={params.id} locale={locale} />

        <section className="mt-10 rounded-[2rem] border bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">{ar ? "إضافة عنصر تجريبي" : "Add test mention"}</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {ar ? "نحتفظ بالنموذج التجريبي مؤقتاً لاختبار التحليلات." : "Temporary manual form retained for analytics testing."}
          </p>
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
            <button className="rounded-full bg-metrix-900 px-6 py-3 font-bold text-white sm:col-span-2">{t.mentions.add}</button>
          </form>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">{t.mentions.title}</h2>
            {pendingCount>0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{t.ai.pending.replace("{count}",String(pendingCount))}</span>}
          </div>

          {ms.length===0 ? (
            <div className="mt-5 rounded-[2rem] border bg-white p-8 text-zinc-500">{t.mentions.empty}</div>
          ) : (
            <div className="mt-5 space-y-4">
              {ms.map((m)=>(
                <article key={m.id} className="rounded-[2rem] border bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-metrix-50 px-3 py-1 text-xs font-black text-metrix-900">{m.platform}</span>
                      <span className="mx-2 font-bold">{m.author_name || m.author_username || "Unknown"}</span>
                    </div>
                    {m.sentiment && <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">{m.sentiment}</span>}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap leading-7">{m.content}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-zinc-500">
                    <span>♥ {m.likes}</span><span>↻ {m.shares}</span><span>💬 {m.replies}</span><span>◉ {Number(m.views).toLocaleString()}</span>
                  </div>
                  {m.post_url && <a href={m.post_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-metrix-900">{t.mentions.viewPost}</a>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
