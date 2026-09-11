type Mention = {
  platform?: string | null;
  content?: string | null;
  sentiment?: string | null;
  published_at?: string | null;
};

export default function ProjectTrends({ mentions, locale }: { mentions: Mention[]; locale: string }) {
  const ar = locale === "ar";
  const rows = mentions || [];
  const days = new Map<string,number>();
  const terms = new Map<string,number>();

  const stop = new Set(["the","and","for","that","with","this","from","have","you","your","are","was","على","في","من","إلى","الى","عن","هذا","هذه","التي","الذي","مع","تم","ما","هو","هي"]);

  for (const m of rows) {
    if (m.published_at) {
      const d = m.published_at.slice(0,10);
      days.set(d,(days.get(d)||0)+1);
    }
    for (const raw of String(m.content || "")
      .toLowerCase()
      .split(/[^a-zA-Z0-9\u0600-\u06FF_#@]+/)) {
      const w = raw.trim();
      if (w.length < 3 || stop.has(w)) continue;
      terms.set(w,(terms.get(w)||0)+1);
    }
  }

  const timeline = Array.from(days.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30);
  const topTerms = Array.from(terms.entries()).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const max = Math.max(1,...timeline.map((x)=>x[1]));

  return (
    <section className="mt-10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">{ar ? "ذكاء الاتجاهات" : "TREND INTELLIGENCE"}</div>
      <h2 className="mt-2 text-3xl font-black">{ar ? "اتجاهات نشاط الحسابات" : "Account Activity Trends"}</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "حجم النشاط بمرور الوقت" : "Activity volume over time"}</h3>
          <div className="mt-5 flex h-48 items-end gap-1">
            {timeline.map(([day,n])=>(
              <div key={day} title={`${day}: ${n}`} className="min-w-1 flex-1 rounded-t bg-metrix-900" style={{height:`${Math.max(6,(n/max)*100)}%`}} />
            ))}
          </div>
          {!timeline.length && <p className="mt-4 text-sm text-zinc-500">{ar ? "لا توجد بيانات زمنية بعد." : "No timeline data yet."}</p>}
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "المواضيع المتكررة" : "Trending terms"}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {topTerms.map(([term,count])=>(
              <span key={term} className="rounded-full bg-metrix-50 px-3 py-2 text-sm font-bold text-metrix-900">{term} · {count}</span>
            ))}
          </div>
          {!topTerms.length && <p className="text-sm text-zinc-500">{ar ? "لا توجد بيانات كافية بعد." : "Not enough data yet."}</p>}
        </div>
      </div>
    </section>
  );
}
