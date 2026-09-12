import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, isLocale } from "@/lib/i18n";
import { signOut } from "../auth/actions";
import ProjectCardManager from "@/components/ProjectCardManager";

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();

  const locale = params.locale;
  const ar = locale === "ar";
  const t = getDictionary(locale);
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,description,avatar_url,created_at")
    .order("created_at", { ascending: false });

  const displayName = (user.user_metadata?.name as string | undefined) || user.email || "User";

  return (
    <main className="min-h-[70vh] bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.18em] text-zinc-400">
              {ar ? "مساحة العمل" : "WORKSPACE"}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
              {t.dashboard.welcome}, {displayName}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {ar ? "إدارة مشاريع الرصد والوصول إلى لوحات التحليل." : "Manage monitoring projects and open their intelligence dashboards."}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/${locale}/projects/new`} className="rounded-full bg-[#330033] px-5 py-2.5 text-sm font-black text-white">
              + {t.dashboard.newProject}
            </Link>
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-bold text-zinc-700">
                {t.dashboard.logout}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-black">{t.dashboard.projectsTitle}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-500 shadow-sm ring-1 ring-zinc-200">
            {(projects || []).length} {ar ? "مشروع" : "projects"}
          </span>
        </div>

        {(projects || []).length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-zinc-300 bg-white p-12 text-center">
            <div className="text-3xl">＋</div>
            <h3 className="mt-3 font-black">{ar ? "أنشئ أول مشروع" : "Create your first project"}</h3>
            <p className="mt-2 text-sm text-zinc-500">{ar ? "ابدأ بإضافة الجهة أو العلامة التي تريد متابعتها." : "Add the organization or brand you want to monitor."}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(projects || []).map((p) => (
              <ProjectCardManager key={p.id} project={p as any} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
