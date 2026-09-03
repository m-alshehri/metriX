import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, isLocale } from "@/lib/i18n";
import { signOut } from "../auth/actions";
import MetricCard from "@/components/MetricCard";

export default async function DashboardPage({
  params
}: {
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound();

  const locale = params.locale;
  const t = getDictionary(locale);
  const other = locale === "en" ? "ar" : "en";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const displayName =
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    "User";

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">
            metriX
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/${other}/dashboard`}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold"
            >
              {locale === "en" ? "العربية" : "English"}
            </Link>

            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button className="rounded-full bg-metrix-900 px-5 py-2.5 text-sm font-bold text-white">
                {t.dashboard.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-metrix-700">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-black">
          {t.dashboard.welcome}, {displayName}
        </h1>
        <p className="mt-3 text-zinc-600">{t.dashboard.subtitle}</p>
        <p className="mt-2 text-sm text-zinc-400">
          {t.dashboard.signedInAs}: {user.email}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label={t.dashboard.mentions} value="—" />
          <MetricCard label={t.dashboard.reach} value="—" />
          <MetricCard label={t.dashboard.engagement} value="—" />
          <MetricCard label={t.dashboard.sentiment} value="—" />
        </div>

        <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-10 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black">{t.dashboard.emptyTitle}</h2>
            <p className="mt-3 leading-7 text-zinc-600">{t.dashboard.emptyText}</p>
            <button
              disabled
              className="mt-6 rounded-full bg-metrix-900 px-6 py-3 font-bold text-white opacity-50"
            >
              {t.dashboard.newProject}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
