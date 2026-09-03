"use client";

type Mention = {
  id: string;
  keyword_id: string | null;
  content: string | null;
  published_at: string | null;
  sentiment: string | null;
  likes: number;
  shares: number;
  replies: number;
};

type Keyword = { id: string; keyword: string };

const AR_STOP = new Set(["في","من","على","إلى","الى","عن","هذا","هذه","ذلك","هو","هي","ما","لا","لم","لن","مع","كان","كانت","كل","بعد","قبل","عند","بين","أو","او","و","يا","أن","ان","إن","اذا","إذا","قد","تم","حتى","التي","الذي","ثم","له","لها","فيها","فيه","جدا","بس","مو","ولا","انا","أنا"]);
const EN_STOP = new Set(["the","and","for","that","this","with","from","are","was","were","have","has","you","your","our","their","they","but","not","about","after","before","there","what","when","where","how","all","more","very","just","also","been","being","is","am","be","to","of","in","on","at","as","it","a","an","or","if","we","i","he","she"]);

function dayKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function engagement(m: Mention) {
  return (m.likes || 0) + (m.shares || 0) + (m.replies || 0);
}

function extractTerms(mentions: Mention[]) {
  const counts = new Map<string, number>();
  mentions.forEach((m) => {
    if (!m.content) return;
    const cleaned = m.content
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/[@#][A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
      .replace(/[^A-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g, " ")
      .toLowerCase();
    const unique = new Set(
      cleaned.split(/\s+/).map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .filter((x) => !AR_STOP.has(x) && !EN_STOP.has(x))
        .filter((x) => !/^\d+$/.test(x))
    );
    unique.forEach((term) => counts.set(term, (counts.get(term) || 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a,b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0,12);
}

export default function ProjectTrends({ mentions, keywords, locale }: {
  mentions: Mention[];
  keywords: Keyword[];
  locale: string;
}) {
  const ar = locale === "ar";
  const fmt = new Intl.NumberFormat(ar ? "ar-SA" : "en-US");
  const dayMap = new Map<string, {
    day: string; mentions: number; positive: number; neutral: number; negative: number; engagement: number;
  }>();

  mentions.forEach((m) => {
    if (!m.published_at) return;
    const key = dayKey(m.published_at);
    if (!key) return;
    const row = dayMap.get(key) || { day:key, mentions:0, positive:0, neutral:0, negative:0, engagement:0 };
    row.mentions += 1;
    row.engagement += engagement(m);
    if (m.sentiment === "positive") row.positive += 1;
    if (m.sentiment === "neutral") row.neutral += 1;
    if (m.sentiment === "negative") row.negative += 1;
    dayMap.set(key,row);
  });

  const days = Array.from(dayMap.values()).sort((a,b) => a.day.localeCompare(b.day)).slice(-30);
  const maxMentions = Math.max(1, ...days.map((d) => d.mentions));
  const previousCounts = days.slice(0,-1).map((d) => d.mentions);
  const latest = days.length ? days[days.length-1] : null;
  const baseline = previousCounts.length ? previousCounts.reduce((a,b)=>a+b,0)/previousCounts.length : 0;
  const spike = latest && baseline > 0 ? {
    ratio: latest.mentions / baseline,
    percent: Math.round(((latest.mentions-baseline)/baseline)*100)
  } : null;
  const spikeLevel = spike && spike.ratio >= 2 ? "high" : spike && spike.ratio >= 1.5 ? "medium" : "normal";

  const keywordRows = keywords.map((k) => {
    const rows = mentions.filter((m) => m.keyword_id === k.id);
    const latestCount = rows.filter((m) =>
      !!m.published_at && days.length > 0 && dayKey(m.published_at) === days[days.length-1]?.day
    ).length;
    return { keyword:k.keyword, total:rows.length, latest:latestCount, engagement:rows.reduce((s,m)=>s+engagement(m),0) };
  }).sort((a,b)=>b.total-a.total);

  const terms = extractTerms(mentions);

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
            {ar ? "ذكاء الاتجاهات" : "TREND INTELLIGENCE"}
          </div>
          <h2 className="mt-2 text-3xl font-black">{ar ? "الاتجاهات والمواضيع" : "Trends & Topic Intelligence"}</h2>
          <p className="mt-2 text-zinc-500">
            {ar ? "تتبّع تغير حجم الحديث والمشاعر والكلمات المفتاحية واكتشاف الارتفاعات المفاجئة." : "Track conversation volume, sentiment movement, keyword activity, and unusual spikes."}
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm font-black ${
          spikeLevel==="high" ? "bg-red-50 text-red-700" : spikeLevel==="medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {spikeLevel==="high"
            ? (ar ? `ارتفاع قوي${spike ? ` +${spike.percent}%` : ""}` : `Strong spike${spike ? ` +${spike.percent}%` : ""}`)
            : spikeLevel==="medium"
            ? (ar ? `ارتفاع ملحوظ${spike ? ` +${spike.percent}%` : ""}` : `Noticeable increase${spike ? ` +${spike.percent}%` : ""}`)
            : (ar ? "لا يوجد ارتفاع غير معتاد" : "No unusual spike detected")}
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border bg-white p-7 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">{ar ? "حجم الحديث عبر الوقت" : "Conversation volume over time"}</h3>
            <p className="mt-1 text-sm text-zinc-500">{ar ? "آخر 30 يومًا تحتوي على بيانات" : "Last 30 days containing data"}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">{fmt.format(mentions.length)}</div>
            <div className="text-xs text-zinc-400">{ar ? "إجمالي الإشارات" : "total mentions"}</div>
          </div>
        </div>
        {days.length===0 ? <div className="mt-8 text-sm text-zinc-400">{ar ? "لا توجد بيانات زمنية حتى الآن." : "No timeline data yet."}</div> :
          <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-2">
            {days.map((day) => (
              <div key={day.day} className="flex min-w-[34px] flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-black">{day.mentions}</span>
                <div className="w-full rounded-t-xl bg-metrix-900" style={{height:`${Math.max(12,(day.mentions/maxMentions)*180)}px`}} title={`${day.day}: ${day.mentions}`} />
                <span className="text-[10px] text-zinc-400">{day.day.slice(5)}</span>
              </div>
            ))}
          </div>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border bg-white p-7 shadow-sm">
          <h3 className="text-xl font-black">{ar ? "تغير المشاعر" : "Sentiment movement"}</h3>
          <p className="mt-1 text-sm text-zinc-500">{ar ? "التوزيع اليومي للمشاعر المحللة" : "Daily distribution of analyzed sentiment"}</p>
          <div className="mt-6 space-y-4">
            {days.slice(-7).map((day) => {
              const analyzed=day.positive+day.neutral+day.negative;
              const p=analyzed?Math.round(day.positive/analyzed*100):0;
              const n=analyzed?Math.round(day.neutral/analyzed*100):0;
              const neg=analyzed?Math.max(0,100-p-n):0;
              return <div key={day.day}>
                <div className="mb-2 flex justify-between text-xs"><span className="font-bold">{day.day}</span><span className="text-zinc-400">{fmt.format(analyzed)} {ar ? "محللة" : "analyzed"}</span></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div className="bg-emerald-500" style={{width:`${p}%`}} />
                  <div className="bg-zinc-400" style={{width:`${n}%`}} />
                  <div className="bg-red-500" style={{width:`${neg}%`}} />
                </div>
              </div>;
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>● {ar ? "إيجابي" : "Positive"}</span><span>● {ar ? "محايد" : "Neutral"}</span><span>● {ar ? "سلبي" : "Negative"}</span>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-7 shadow-sm">
          <h3 className="text-xl font-black">{ar ? "المواضيع المتكررة" : "Trending terms"}</h3>
          <p className="mt-1 text-sm text-zinc-500">{ar ? "الكلمات الأكثر تكرارًا عبر الإشارات الحالية" : "Frequently recurring terms across current mentions"}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {terms.length===0 ? <span className="text-sm text-zinc-400">{ar ? "لا توجد بيانات كافية." : "Not enough data yet."}</span> :
              terms.map((term,index)=>(
                <div key={term.term} className={`rounded-2xl border px-4 py-3 ${index<3 ? "border-metrix-200 bg-metrix-50" : "bg-zinc-50"}`}>
                  <div className="font-black">{term.term}</div>
                  <div className="mt-1 text-xs text-zinc-400">{fmt.format(term.count)} {ar ? "إشارة" : "mentions"}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border bg-white p-7 shadow-sm">
        <h3 className="text-xl font-black">{ar ? "اتجاه الكلمات المفتاحية" : "Keyword trend watch"}</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b text-left text-zinc-400">
              <th className="pb-3 font-bold">{ar ? "الكلمة المفتاحية" : "Keyword"}</th>
              <th className="pb-3 font-bold">{ar ? "الإجمالي" : "Total"}</th>
              <th className="pb-3 font-bold">{ar ? "أحدث يوم" : "Latest day"}</th>
              <th className="pb-3 font-bold">{ar ? "التفاعل" : "Engagement"}</th>
            </tr></thead>
            <tbody>{keywordRows.map((row)=>(
              <tr key={row.keyword} className="border-b last:border-0">
                <td className="py-4 font-black">{row.keyword}</td><td className="py-4">{fmt.format(row.total)}</td>
                <td className="py-4">{fmt.format(row.latest)}</td><td className="py-4">{fmt.format(row.engagement)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {mentions.length<30 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {ar ? "ملاحظة: حجم البيانات الحالي صغير، لذلك مؤشرات الاتجاه والارتفاعات المفاجئة أولية وستصبح أدق تلقائيًا مع زيادة الإشارات." : "Note: the current dataset is small, so trend and spike signals are preliminary and will become more reliable as more mentions are collected."}
      </div>}
    </section>
  );
}
