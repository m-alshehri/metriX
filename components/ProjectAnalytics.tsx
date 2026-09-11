type Mention = {
  platform?: string | null;
  sentiment?: string | null;
  published_at?: string | null;
  likes?: number | null;
  shares?: number | null;
  replies?: number | null;
  views?: number | null;
  author_name?: string | null;
  author_username?: string | null;
  content?: string | null;
  post_url?: string | null;
};

export default function ProjectAnalytics({
  mentions,
  locale,
}: {
  mentions: Mention[];
  locale: string;
}) {
  const ar = locale === "ar";
  const rows = mentions || [];
  const analyzed = rows.filter((x) => ["positive","neutral","negative"].includes(String(x.sentiment)));
  const count = (s:string) => analyzed.filter((x) => x.sentiment === s).length;
  const pct = (n:number) => analyzed.length ? Math.round((n / analyzed.length) * 100) : 0;

  const platforms = new Map<string,{mentions:number;engagement:number;views:number}>();
  for (const m of rows) {
    const p = String(m.platform || "Other");
    const current = platforms.get(p) || { mentions: 0, engagement: 0, views: 0 };
    current.mentions += 1;
    current.engagement += Number(m.likes||0)+Number(m.shares||0)+Number(m.replies||0);
    current.views += Number(m.views||0);
    platforms.set(p,current);
  }
  const platformRows = Array.from(platforms.entries()).sort((a,b)=>b[1].mentions-a[1].mentions);

  const top = [...rows]
    .map((m)=>({...m,eng:Number(m.likes||0)+Number(m.shares||0)+Number(m.replies||0)}))
    .sort((a,b)=>b.eng-a.eng)
    .slice(0,7);

  return (
    <section className="mt-10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
        {ar ? "التحليلات" : "ANALYTICS"}
      </div>
      <h2 className="mt-2 text-3xl font-black">{ar ? "تحليلات الحسابات" : "Account Analytics"}</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "توزيع المشاعر" : "Sentiment distribution"}</h3>
          <p className="mt-1 text-sm text-zinc-500">{analyzed.length} {ar ? "عنصر محلل" : "analyzed"}</p>
          <div className="mt-5 space-y-4">
            {[
              ["positive", ar ? "إيجابي" : "Positive", count("positive")],
              ["neutral", ar ? "محايد" : "Neutral", count("neutral")],
              ["negative", ar ? "سلبي" : "Negative", count("negative")],
            ].map(([key,label,value]:any)=>(
              <div key={key}>
                <div className="flex justify-between text-sm"><b>{label}</b><span>{pct(value)}% · {value}</span></div>
                <div className="mt-1 h-2 rounded bg-zinc-100">
                  <div className="h-2 rounded bg-metrix-900" style={{width:`${pct(value)}%`}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "أداء المنصات" : "Platform performance"}</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-zinc-500">
                <th className="py-2">{ar ? "المنصة" : "Platform"}</th>
                <th>{ar ? "العناصر" : "Items"}</th>
                <th>{ar ? "التفاعل" : "Engagement"}</th>
                <th>{ar ? "المشاهدات" : "Views"}</th>
              </tr></thead>
              <tbody>
                {platformRows.map(([p,v])=>(
                  <tr key={p} className="border-b last:border-0">
                    <td className="py-3 font-bold">{p}</td>
                    <td>{v.mentions}</td><td>{v.engagement.toLocaleString()}</td><td>{v.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!platformRows.length && <p className="py-6 text-zinc-500">{ar ? "لا توجد بيانات بعد." : "No data yet."}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border bg-white p-6 shadow-sm">
        <h3 className="font-black">{ar ? "الأعلى تفاعلاً" : "Top engaging content"}</h3>
        <div className="mt-4 space-y-3">
          {top.map((m:any,i)=>(
            <div key={`${m.post_url||i}`} className="flex items-start justify-between gap-4 border-b pb-3">
              <div><b>{m.platform}</b><p className="mt-1 line-clamp-2 text-sm text-zinc-600">{m.content || "—"}</p></div>
              <span className="whitespace-nowrap text-sm font-bold">{m.eng.toLocaleString()}</span>
            </div>
          ))}
          {!top.length && <p className="text-sm text-zinc-500">{ar ? "لا توجد بيانات بعد." : "No data yet."}</p>}
        </div>
      </div>
    </section>
  );
}
