import Link from "next/link";

export default function SiteFooter({ locale }: { locale: string }) {
  const ar = locale === "ar";

  const groups = ar
    ? [
        ["المنتج", "الاستماع الاجتماعي", "التحليلات", "التنبيهات", "تقارير الذكاء"],
        ["الحلول", "العلامات التجارية", "الجامعات", "الجهات الحكومية", "الوكالات"],
        ["المصادر", "المدونة", "دليل الاستخدام", "مركز المساعدة", "API"],
      ]
    : [
        ["Product", "Social listening", "Analytics", "Alerts", "AI reports"],
        ["Solutions", "Brands", "Universities", "Government", "Agencies"],
        ["Resources", "Blog", "Guides", "Help center", "API"],
      ];

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="text-3xl font-black tracking-tight">metriX</div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
              {ar
                ? "منصة ذكاء اجتماعي تجمع البيانات العامة وتحولها إلى مؤشرات قابلة للفهم واتخاذ القرار."
                : "Social intelligence that turns public conversations into clear, decision-ready insight."}
            </p>
            <div className="mt-6 flex gap-2">
              {["X", "in", "YT"].map((x) => (
                <a key={x} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-xs font-bold text-zinc-300 hover:bg-white/10">
                  {x}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group[0]}>
                <h3 className="text-sm font-black">{group[0]}</h3>
                <div className="mt-4 space-y-3">
                  {group.slice(1).map((item) => (
                    <a key={item} href="#" className="block text-sm text-zinc-400 hover:text-white">
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} metriX</span>
          <div className="flex gap-5">
            <Link href={`/${locale}/privacy`} className="hover:text-white">{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white">{ar ? "الشروط" : "Terms"}</Link>
            <a href="#" className="hover:text-white">{ar ? "تواصل معنا" : "Contact"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
