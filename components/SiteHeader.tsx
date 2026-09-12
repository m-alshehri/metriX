import Link from "next/link";

export default function SiteHeader({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const other = ar ? "en" : "ar";

  const nav = ar
    ? ["المنتج", "الحلول", "المصادر", "الأسعار"]
    : ["Product", "Solutions", "Resources", "Pricing"];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-6">
        <Link href={`/${locale}`} className="shrink-0 text-2xl font-black tracking-tight text-[#330033]">
          metri<span className="opacity-70">X</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item}
              href="#"
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-[#330033]"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/${other}/dashboard`}
            className="rounded-full px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100"
          >
            {ar ? "EN" : "ع"}
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="hidden rounded-full border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-800 hover:border-[#330033] sm:inline-flex"
          >
            {ar ? "لوحة التحكم" : "Dashboard"}
          </Link>
          <a
            href="#"
            className="rounded-full bg-[#330033] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            {ar ? "ابدأ الآن" : "Start free"}
          </a>
        </div>
      </div>
    </header>
  );
}
