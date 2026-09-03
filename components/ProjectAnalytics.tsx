"use client";

type Mention = {
  id: string;
  platform: string;
  author_name: string | null;
  author_username: string | null;
  content: string | null;
  published_at: string | null;
  likes: number;
  shares: number;
  replies: number;
  views: number | string;
  sentiment: string | null;
  keyword_id: string | null;
};

type Keyword = {
  id: string;
  keyword: string;
};

export default function ProjectAnalytics({
  mentions,
  keywords,
  locale,
}: {
  mentions: Mention[];
  keywords: Keyword[];
  locale: string;
}) {
  const ar = locale === "ar";
  const fmt = new Intl.NumberFormat(ar ? "ar-SA" : "en-US");

  const positive = mentions.filter((m) => m.sentiment === "positive").length;
  const neutral = mentions.filter((m) => m.sentiment === "neutral").length;
  const negative = mentions.filter((m) => m.sentiment === "negative").length;
  const analyzed = positive + neutral + negative;

  const pct = (value: number) =>
    analyzed ? Math.round((value / analyzed) * 100) : 0;

  const engagement = (m: Mention) =>
    (m.likes || 0) + (m.shares || 0) + (m.replies || 0);

  const topPosts = [...mentions]
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, 5);

  const authorMap = new Map<
    string,
    { name: string; count: number; engagement: number }
  >();

  mentions.forEach((m) => {
    const key =
      m.author_username?.replace(/^@/, "") ||
      m.author_name ||
      (ar ? "غير معروف" : "Unknown");
    const current = authorMap.get(key) || {
      name: key,
      count: 0,
      engagement: 0,
    };
    current.count += 1;
    current.engagement += engagement(m);
    authorMap.set(key, current);
  });

  const topAuthors = [...authorMap.values()]
    .sort(
      (a, b) =>
        b.count - a.count || b.engagement - a.engagement
    )
    .slice(0, 5);

  const keywordStats = keywords
    .map((k) => {
      const rows = mentions.filter((m) => m.keyword_id === k.id);
      return {
        id: k.id,
        keyword: k.keyword,
        mentions: rows.length,
        engagement: rows.reduce((sum, m) => sum + engagement(m), 0),
        positive: rows.filter((m) => m.sentiment === "positive").length,
      };
    })
    .sort((a, b) => b.mentions - a.mentions);

  const dayMap = new Map<string, number>();
  mentions.forEach((m) => {
    if (!m.published_at) return;
    const d = new Date(m.published_at);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  });

  const timeline = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  const maxDay = Math.max(1, ...timeline.map(([, count]) => count));

  const sentimentRows = [
    {
      label: ar ? "إيجابي" : "Positive",
      count: positive,
      percent: pct(positive),
      bar: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
    },
    {
      label: ar ? "محايد" : "Neutral",
      count: neutral,
      percent: pct(neutral),
      bar: "bg-zinc-400",
      badge: "bg-zinc-100 text-zinc-700",
    },
    {
      label: ar ? "سلبي" : "Negative",
      count: negative,
      percent: pct(negative),
      bar: "bg-red-500",
      badge: "bg-red-50 text-red-700",
    },
  ];

  return (
    <section className="mt-10">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
          {ar ? "التحليلات" : "Analytics"}
        </div>
        <h2 className="mt-2 text-3xl font-black">
          {ar ? "لوحة تحليل المشروع" : "Project analytics"}
        </h2>
        <p className="mt-2 text-zinc-500">
          {ar
            ? "نظرة تحليلية على المشاعر، النشاط، الكلمات المفتاحية والحسابات الأكثر ظهورًا."
            : "A clear view of sentiment, activity, keyword performance, and the most active authors."}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black">
              {ar ? "توزيع المشاعر" : "Sentiment distribution"}
            </h3>
            <span className="rounded-full bg-metrix-50 px-3 py-1 text-xs font-bold text-metrix-900">
              {fmt.format(analyzed)} {ar ? "محللة" : "analyzed"}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {sentimentRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className={`rounded-full px-3 py-1 font-bold ${row.badge}`}>
                    {row.label}
                  </span>
                  <span className="font-black">
                    {row.percent}% · {fmt.format(row.count)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${row.bar}`}
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-7 shadow-sm">
          <h3 className="text-xl font-black">
            {ar ? "الإشارات عبر الوقت" : "Mentions over time"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {ar ? "آخر 14 يومًا تحتوي على بيانات" : "Last 14 days containing data"}
          </p>

          {timeline.length === 0 ? (
            <div className="mt-8 text-sm text-zinc-400">
              {ar ? "لا توجد بيانات زمنية حتى الآن." : "No timeline data yet."}
            </div>
          ) : (
            <div className="mt-7 flex h-52 items-end gap-2">
              {timeline.map(([day, count]) => (
                <div
                  key={day}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-black">{count}</span>
                  <div
                    className="w-full rounded-t-xl bg-metrix-900"
                    style={{
                      height: `${Math.max(10, (count / maxDay) * 150)}px`,
                    }}
                    title={`${day}: ${count}`}
                  />
                  <span className="max-w-full truncate text-[10px] text-zinc-400">
                    {day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border bg-white p-7 shadow-sm lg:col-span-2">
          <h3 className="text-xl font-black">
            {ar ? "أداء الكلمات المفتاحية" : "Keyword performance"}
          </h3>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-400">
                  <th className="pb-3 font-bold">
                    {ar ? "الكلمة" : "Keyword"}
                  </th>
                  <th className="pb-3 font-bold">
                    {ar ? "الإشارات" : "Mentions"}
                  </th>
                  <th className="pb-3 font-bold">
                    {ar ? "التفاعل" : "Engagement"}
                  </th>
                  <th className="pb-3 font-bold">
                    {ar ? "إيجابي" : "Positive"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {keywordStats.map((k) => (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="py-4 font-black">{k.keyword}</td>
                    <td className="py-4">{fmt.format(k.mentions)}</td>
                    <td className="py-4">{fmt.format(k.engagement)}</td>
                    <td className="py-4">{fmt.format(k.positive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-7 shadow-sm">
          <h3 className="text-xl font-black">
            {ar ? "أكثر الحسابات نشاطًا" : "Top authors"}
          </h3>

          <div className="mt-5 space-y-3">
            {topAuthors.length === 0 ? (
              <div className="text-sm text-zinc-400">
                {ar ? "لا توجد بيانات." : "No data yet."}
              </div>
            ) : (
              topAuthors.map((author, index) => (
                <div
                  key={`${author.name}-${index}`}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-black">
                      {author.name.startsWith("@")
                        ? author.name
                        : `@${author.name}`}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {fmt.format(author.engagement)}{" "}
                      {ar ? "تفاعل" : "engagement"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-black">
                    {fmt.format(author.count)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border bg-white p-7 shadow-sm">
        <h3 className="text-xl font-black">
          {ar ? "أكثر المنشورات تفاعلًا" : "Top engaging posts"}
        </h3>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {topPosts.length === 0 ? (
            <div className="text-sm text-zinc-400">
              {ar ? "لا توجد بيانات." : "No data yet."}
            </div>
          ) : (
            topPosts.map((post) => (
              <div key={post.id} className="rounded-2xl bg-zinc-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-metrix-900">
                    {post.platform}
                  </span>
                  <span className="text-xs font-black text-zinc-500">
                    {fmt.format(engagement(post))}{" "}
                    {ar ? "تفاعل" : "engagement"}
                  </span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6">
                  {post.content || "—"}
                </p>
                <div className="mt-4 flex gap-4 text-xs text-zinc-400">
                  <span>♥ {fmt.format(post.likes || 0)}</span>
                  <span>↻ {fmt.format(post.shares || 0)}</span>
                  <span>💬 {fmt.format(post.replies || 0)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
