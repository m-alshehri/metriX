import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";
import { checked } from "@/lib/db-result";
import { runFullPipeline, checkBrightDataStatus } from "../pipeline-actions";
import { analyzeSentiment } from "../ai-actions";
import SocialAccounts from "@/components/SocialAccounts";
import ProjectDashboard from "@/components/ProjectDashboard";
import ProjectAIInsights from "@/components/ProjectAIInsights";
import AdvancedIntelligenceV5 from "@/components/AdvancedIntelligenceV5";
import AlertSettings from "@/components/AlertSettings";
import AlertsCenter from "@/components/AlertsCenter";
import DashboardTabs from "@/components/DashboardTabs";
import MentionsPosts from "@/components/MentionsPosts";
import PipelineStatus from "@/components/PipelineStatus";
export const maxDuration = 300;
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, id } = await params,
    q = await searchParams;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar",
    db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const project = checked(
    await db
      .from("projects")
      .select("id,name,description,avatar_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (!project) notFound();
  const tab = [
    "overview",
    "intelligence",
    "mentions",
    "sources",
    "alerts",
  ].includes(q.tab || "")
    ? q.tab!
    : "overview";
  let content: React.ReactNode;
  if (tab === "overview") {
    const summary = checked(
      await db.rpc("metrix_dashboard", { p_project: id }),
    );
    content = <ProjectDashboard summary={summary} locale={locale} />;
  } else if (tab === "intelligence")
    content = (
      <>
        <AdvancedIntelligenceV5 projectId={id} locale={locale} />
        <ProjectAIInsights projectId={id} locale={locale} searchParams={q} />
      </>
    );
  else if (tab === "sources")
    content = <SocialAccounts projectId={id} locale={locale} />;
  else if (tab === "alerts")
    content = (
      <>
        <AlertSettings projectId={id} locale={locale} status={q.settings} />
        <AlertsCenter projectId={id} locale={locale} />
      </>
    );
  else {
    const page = Math.max(
        1,
        Math.min(100000, Number.parseInt(q.page || "1", 10) || 1),
      ),
      size = 50;
    const result = await db
      .from("mentions")
      .select(
        "id,platform,author_name,author_username,content,post_url,published_at,likes,shares,replies,views,sentiment",
        { count: "exact" },
      )
      .eq("project_id", id)
      .eq("is_test", false)
      .order("published_at", { ascending: false })
      .order("id")
      .range((page - 1) * size, page * size - 1);
    const rows = checked(result) || [];
    content = (
      <>
        <MentionsPosts mentions={rows} locale={locale} />
        <nav
          className="mt-4 flex justify-between"
          aria-label={ar ? "صفحات المنشورات" : "Post pages"}
        >
          {page > 1 ? (
            <Link href={`?tab=mentions&page=${page - 1}`}>
              {ar ? "السابق" : "Previous"}
            </Link>
          ) : (
            <span />
          )}
          <span>
            {page} / {Math.max(1, Math.ceil((result.count || 0) / size))}
          </span>
          {page * size < (result.count || 0) && (
            <Link href={`?tab=mentions&page=${page + 1}`}>
              {ar ? "التالي" : "Next"}
            </Link>
          )}
        </nav>
      </>
    );
  }
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <Link href={`/${locale}/dashboard`}>
        {ar ? "العودة للمشاريع" : "Back to projects"}
      </Link>
      <h1 className="mt-3 text-3xl">{project.name}</h1>
      <p className="mt-2 text-zinc-500">{project.description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {[
          [runFullPipeline, ar ? "جمع وتحليل" : "Collect & analyze"],
          [
            analyzeSentiment,
            ar ? "تحليل البيانات المعلقة" : "Enrich pending records",
          ],
          [
            checkBrightDataStatus,
            ar ? "استكمال البيانات المنتظرة" : "Recover pending data",
          ],
        ].map(([action, label], i) => (
          <form key={i} action={action as (data: FormData) => Promise<void>}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="project_id" value={id} />
            <button className="rounded-xl border bg-white px-4 py-2">
              {label as string}
            </button>
          </form>
        ))}
      </div>
      {q.pipeline === "limited" && (
        <p role="alert" className="mt-4 text-red-700">
          {ar
            ? "تعذر بدء المهمة. قد يكون حد التشغيل قد بلغ؛ حاول لاحقًا."
            : "Could not queue the job. A run limit may have been reached; try later."}
        </p>
      )}
      <PipelineStatus projectId={id} locale={locale} />
      <DashboardTabs locale={locale} projectId={id} active={tab} />
      {content}
    </main>
  );
}
