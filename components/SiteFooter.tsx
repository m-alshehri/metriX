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
    <footer className="mt-0 border-t border-white/10 bg-[#660066] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="text-3xl font-black tracking-tight">metriX</div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              {ar
                ? "منصة ذكاء اجتماعي تجمع البيانات العامة وتحولها إلى مؤشرات قابلة للفهم واتخاذ القرار."
                : "Social intelligence that turns public conversations into clear, decision-ready insight."}
            </p>
            <a
              href={`/${locale}#request-demo`}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#660066] transition hover:bg-white/90"
            >
              {ar ? "اطلب عرضاً" : "Request a demo"}
            </a>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group[0]}>
                <h3 className="text-sm font-black">{group[0]}</h3>
                <div className="mt-4 space-y-3">
                  {group.slice(1).map((item) => (
                    <a key={item} href="#" className="block text-sm text-white/65 transition hover:text-white">
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} metriX</span>
          <div className="flex gap-5">
            <Link href={`/${locale}/privacy`} className="hover:text-white">{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white">{ar ? "الشروط" : "Terms"}</Link>
            <a href={`/${locale}#request-demo`} className="hover:text-white">{ar ? "تواصل معنا" : "Contact"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
