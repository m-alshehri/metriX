import Link from "next/link";

export default function SiteFooter({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const groups = ar
    ? [
        ["المنتج", ["الاستماع الاجتماعي", "#product"], ["التحليلات", "#product"], ["التنبيهات", "#solutions"], ["تقارير الذكاء", "#ai"]],
        ["الحلول", ["العلامات التجارية", "#solutions"], ["الجامعات", "#solutions"], ["الجهات الحكومية", "#solutions"], ["الوكالات", "#solutions"]],
        ["المصادر", ["المدونة", "#sources"], ["دليل الاستخدام", "#sources"], ["مركز المساعدة", "#sources"], ["تكاملات API", "#sources"]],
      ]
    : [
        ["Product", ["Social listening", "#product"], ["Analytics", "#product"], ["Alerts", "#solutions"], ["AI reports", "#ai"]],
        ["Solutions", ["Brands", "#solutions"], ["Universities", "#solutions"], ["Government", "#solutions"], ["Agencies", "#solutions"]],
        ["Resources", ["Blog", "#sources"], ["Guides", "#sources"], ["Help center", "#sources"], ["API integrations", "#sources"]],
      ];

  return (
    <footer className="mt-0 border-t border-white/10 bg-[#330033] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.1fr_2fr]">
          <div className="pt-6 md:pt-10">
            <div className="inline-flex items-baseline text-[38px] tracking-[-0.05em]">metri<span className="text-fuchsia-300">X</span></div>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/70">
              {ar ? "منصة ذكاء اجتماعي تحول المحادثات العامة إلى مؤشرات واتجاهات ورؤى قابلة للاستخدام." : "Social intelligence that turns public conversations into clear signals, trends and decision-ready insight."}
            </p>
            <div className="mt-7 inline-flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3" aria-label="metriX logo">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-xl text-[#330033]">X</span>
              <span className="text-xl tracking-[-0.03em]">metriX intelligence</span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {groups.map((group: any) => (
              <div key={group[0]}>
                <h3 className="text-base text-white">{group[0]}</h3>
                <div className="mt-4 space-y-3">
                  {group.slice(1).map(([item, href]: [string, string]) => <a key={item} href={`/${locale}${href}`} className="block text-base text-white/65 transition hover:text-white">{item}</a>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} metriX</span>
          <div className="flex flex-wrap gap-5">
            <Link href={`/${locale}/privacy`} className="hover:text-white">{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white">{ar ? "الشروط" : "Terms"}</Link>
            <a href={`/${locale}#sources`} className="hover:text-white">{ar ? "عن متركس" : "About"}</a>
            <a href={`/${locale}#request-demo`} className="hover:text-white">{ar ? "تواصل معنا" : "Contact"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
