import { sentiments } from "@/lib/sentiment";
type Summary = {
  platforms: {
    platform: string;
    items: number;
    engagement: number;
    views: number;
  }[];
  sentiments: Record<string, number>;
};
export default function ProjectDashboard({
  summary,
  locale,
}: {
  summary: Summary;
  locale: string;
}) {
  const ar = locale === "ar",
    rows = summary.platforms || [];
  const total = rows.reduce((n, p) => n + Number(p.items), 0);
  const labels = ar
    ? ["إيجابي جدًا", "إيجابي", "محايد", "سلبي", "سلبي جدًا"]
    : ["Very positive", "Positive", "Neutral", "Negative", "Very negative"];
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl">
          {ar ? "إجمالي البيانات المرصودة" : "All monitored records"}
        </h2>
        <p className="mt-3 text-4xl">{total.toLocaleString()}</p>
        <p className="mt-2 text-sm text-zinc-500">
          {ar
            ? "المؤشرات تشمل جميع السجلات الحقيقية المحفوظة. المشاهدات ليست وصولًا فريدًا."
            : "Metrics include all stored non-test records. Views are not unique reach."}
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white p-6">
        <table className="w-full text-start">
          <caption className="mb-4 text-start text-xl">
            {ar ? "أداء المنصات" : "Platform performance"}
          </caption>
          <thead>
            <tr>
              {(ar
                ? ["المنصة", "السجلات", "التفاعل", "المشاهدات"]
                : ["Platform", "Records", "Engagement", "Views"]
              ).map((x) => (
                <th className="p-2 text-start" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr className="border-t" key={p.platform}>
                <th className="p-2 text-start" scope="row">
                  {p.platform}
                </th>
                <td className="p-2">{Number(p.items).toLocaleString()}</td>
                <td className="p-2">{Number(p.engagement).toLocaleString()}</td>
                <td className="p-2">{Number(p.views).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl">
          {ar ? "توزيع المشاعر" : "Sentiment distribution"}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[...sentiments, "pending"].map((s, i) => (
            <div key={s}>
              <dt>{labels[i] || (ar ? "بانتظار التحليل" : "Pending")}</dt>
              <dd>{Number(summary.sentiments?.[s] || 0).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
