import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/[locale]/auth/actions";

export default async function SiteHeader({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const other = ar ? "en" : "ar";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const nav = ar
    ? [
        ["المنتج", "#product"],
        ["الحلول", "#solutions"],
        ["الذكاء الاصطناعي", "#ai"],
        ["المصادر", "#sources"],
      ]
    : [
        ["Product", "#product"],
        ["Solutions", "#solutions"],
        ["AI Intelligence", "#ai"],
        ["Sources", "#sources"],
      ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 lg:px-6">
        <Link href={`/${locale}`} className="shrink-0 text-[28px] font-black tracking-[-0.04em] text-[#330033]">
          metri<span className="text-[#660066]">X</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-[#330033]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/${other}`}
            className="rounded-full px-3 py-2 text-sm font-black text-zinc-600 transition hover:bg-zinc-100"
            aria-label={ar ? "English" : "العربية"}
          >
            {ar ? "EN" : "ع"}
          </Link>

          {user ? (
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button
                className="hidden rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-[#660066] hover:text-[#660066] sm:inline-flex"
              >
                {ar ? "تسجيل الخروج" : "Logout"}
              </button>
            </form>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="hidden rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-[#660066] hover:text-[#660066] sm:inline-flex"
            >
              {ar ? "تسجيل الدخول" : "Login"}
            </Link>
          )}

          <a
            href={`/${locale}#request-demo`}
            className="rounded-full bg-[#330033] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#660066]"
          >
            {ar ? "اطلب عرضاً" : "Request a demo"}
          </a>
        </div>
      </div>
    </header>
  );
}
