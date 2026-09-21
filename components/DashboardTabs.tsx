import Link from "next/link";
export default function DashboardTabs({
  locale,
  projectId,
  active,
}: {
  locale: string;
  projectId: string;
  active: string;
}) {
  const labels =
    locale === "ar"
      ? [
          "نظرة عامة",
          "الذكاء والتحليلات",
          "الإشارات والمنشورات",
          "مصادر البيانات",
          "التنبيهات",
        ]
      : [
          "Overview",
          "Intelligence",
          "Mentions & posts",
          "Data sources",
          "Alerts",
        ];
  return (
    <nav
      aria-label={locale === "ar" ? "أقسام المشروع" : "Project sections"}
      className="mb-5 flex flex-wrap gap-2"
    >
      {["overview", "intelligence", "mentions", "sources", "alerts"].map(
        (id, i) => (
          <Link
            key={id}
            href={`/${locale}/projects/${projectId}?tab=${id}`}
            aria-current={active === id ? "page" : undefined}
            className={`rounded-xl border px-4 py-3 ${active === id ? "bg-[#330033] text-white" : "bg-white"}`}
          >
            {labels[i]}
          </Link>
        ),
      )}
    </nav>
  );
}
