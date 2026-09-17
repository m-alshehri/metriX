import Link from "next/link";
import { Globe2, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/[locale]/auth/actions";

export default async function SiteHeader({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const other = ar ? "en" : "ar";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const nav = ar
    ? [
        { label: "المنتج", items: [["الاستماع الاجتماعي", "#product"], ["تحليل المشاعر", "#product"], ["التنبيهات", "#solutions"]] },
        { label: "الحلول", items: [["للعلامات التجارية", "#solutions"], ["للجهات الحكومية", "#solutions"], ["للجامعات", "#solutions"]] },
        { label: "الذكاء الاصطناعي", items: [["AI Insights", "#ai"], ["Topic Signals", "#ai"], ["اكتشاف الاتجاهات", "#ai"]] },
        { label: "المصادر", items: [["مركز المعرفة", "#sources"], ["دليل البدء", "#sources"], ["تكاملات البيانات", "#sources"]] },
      ]
    : [
        { label: "Product", items: [["Social listening", "#product"], ["Sentiment analysis", "#product"], ["Alerts", "#solutions"]] },
        { label: "Solutions", items: [["For brands", "#solutions"], ["For government", "#solutions"], ["For universities", "#solutions"]] },
        { label: "AI Intelligence", items: [["AI Insights", "#ai"], ["Topic Signals", "#ai"], ["Trend detection", "#ai"]] },
        { label: "Resources", items: [["Knowledge center", "#sources"], ["Getting started", "#sources"], ["Data integrations", "#sources"]] },
      ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href={`/${locale}`} className="shrink-0 text-[30px] tracking-[-0.04em] text-[#330033]">
          metri<span className="text-[#660066]">X</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((group) => (
            <details key={group.label} className="group relative">
              <summary className="cursor-pointer list-none rounded-lg px-4 py-2 text-base text-zinc-700 transition hover:bg-zinc-100 hover:text-[#330033]">
                {group.label} <span className="ml-1 text-xs text-zinc-400">⌄</span>
              </summary>
              <div className="absolute left-0 top-[calc(100%+8px)] min-w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl">
                {group.items.map(([label, href]) => (
                  <a key={label} href={`/${locale}${href}`} className="block rounded-md px-3 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-[#330033]">{label}</a>
                ))}
              </div>
            </details>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href={`/${other}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-[#330033] transition hover:border-[#660066] hover:bg-zinc-50" aria-label={ar ? "Switch to English" : "التبديل إلى العربية"} title={ar ? "English" : "العربية"}>
            <Globe2 size={20} />
          </Link>

          {user ? (
            <form action={signOut} className="hidden sm:block">
              <input type="hidden" name="locale" value={locale} />
              <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base text-zinc-800 transition hover:border-[#660066] hover:text-[#660066]">{ar ? "تسجيل الخروج" : "Logout"}</button>
            </form>
          ) : (
            <Link href={`/${locale}/login`} className="hidden rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base text-zinc-800 transition hover:border-[#660066] hover:text-[#660066] sm:inline-flex">{ar ? "تسجيل الدخول" : "Login"}</Link>
          )}

          <a href={`/${locale}#request-demo`} className="hidden rounded-lg bg-[#330033] px-4 py-2.5 text-base text-white transition hover:bg-[#660066] sm:inline-flex">{ar ? "اطلب عرضاً" : "Request a demo"}</a>

          <details className="relative lg:hidden">
            <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg border border-zinc-200 bg-white text-[#330033]"><Menu size={21} /></summary>
            <div className={`absolute top-[calc(100%+10px)] w-[min(88vw,340px)] rounded-lg border border-zinc-200 bg-white p-3 shadow-2xl ${ar ? "left-0" : "right-0"}`}>
              {nav.map((group) => (
                <details key={group.label} className="border-b border-zinc-100 py-1 last:border-0">
                  <summary className="cursor-pointer list-none rounded-md px-3 py-3 text-base text-[#330033]">{group.label} <span className="text-zinc-400">⌄</span></summary>
                  <div className="pb-2">
                    {group.items.map(([label, href]) => <a key={label} href={`/${locale}${href}`} className="block rounded-md px-5 py-2 text-sm text-zinc-600 hover:bg-zinc-50">{label}</a>)}
                  </div>
                </details>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {user ? (
                  <form action={signOut}><input type="hidden" name="locale" value={locale} /><button className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm">{ar ? "خروج" : "Logout"}</button></form>
                ) : <Link href={`/${locale}/login`} className="rounded-lg border border-zinc-300 px-3 py-2.5 text-center text-sm">{ar ? "دخول" : "Login"}</Link>}
                <a href={`/${locale}#request-demo`} className="rounded-lg bg-[#330033] px-3 py-2.5 text-center text-sm text-white">{ar ? "اطلب عرضاً" : "Demo"}</a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
