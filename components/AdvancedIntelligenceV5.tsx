import { createClient } from "@/lib/supabase/server";
import PlatformIcon from "@/components/PlatformIcon";

function pct(current:number, previous:number){ if(!previous) return current?100:0; return ((current-previous)/previous)*100; }
function fmt(n:any){ return Number(n||0).toLocaleString(); }

export default async function AdvancedIntelligenceV5({projectId,locale}:{projectId:string;locale:string}){
  const ar=locale==="ar"; const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user) return null;
  const [{data:daily},{data:summary},{data:topics},{data:accounts},{data:viral},{data:usage},{data:authors},{data:voiceRows}] = await Promise.all([
    supabase.from("project_daily_metrics").select("*").eq("project_id",projectId).order("metric_date",{ascending:false}).limit(14),
    supabase.from("daily_project_summaries").select("*").eq("project_id",projectId).order("summary_date",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("mention_topics").select("topic,score,last_seen_at").eq("project_id",projectId).order("last_seen_at",{ascending:false}).limit(80),
    supabase.from("social_accounts").select("id,platform,handle,last_sync_status,last_sync_error,last_successful_sync,records_imported,consecutive_failures,provider").eq("project_id",projectId).eq("enabled",true),
    supabase.from("mentions").select("id,platform,content,post_url,author_name,author_username,virality_score,sentiment,likes,shares,replies,views").eq("project_id",projectId).order("virality_score",{ascending:false}).limit(5),
    supabase.from("metrix_usage_events").select("event_type,quantity,provider,created_at").eq("project_id",projectId).gte("created_at",new Date(Date.now()-30*86400000).toISOString()).limit(1000),
    supabase.from("author_snapshots").select("platform,author_username,author_name,followers,influence_score,captured_at").eq("project_id",projectId).order("influence_score",{ascending:false}).limit(5),
    supabase.from("mentions").select("social_account_id").eq("project_id",projectId).limit(5000),
  ]);

  const d=daily||[]; const current=d.slice(0,7).reduce((a:any,x:any)=>({mentions:a.mentions+Number(x.mentions||0),engagement:a.engagement+Number(x.engagement||0),views:a.views+Number(x.views||0),negative:a.negative+Number(x.negative||0)}),{mentions:0,engagement:0,views:0,negative:0});
  const previous=d.slice(7,14).reduce((a:any,x:any)=>({mentions:a.mentions+Number(x.mentions||0),engagement:a.engagement+Number(x.engagement||0),views:a.views+Number(x.views||0),negative:a.negative+Number(x.negative||0)}),{mentions:0,engagement:0,views:0,negative:0});
  const topicCounts=new Map<string,number>(); for(const x of topics||[]) topicCounts.set(x.topic,(topicCounts.get(x.topic)||0)+1); const topTopics=Array.from(topicCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const usageTotal=(usage||[]).reduce((s:any,x:any)=>s+Number(x.quantity||0),0);
  const voice = new Map<string, number>(); for (const x of voiceRows || []) if (x.social_account_id) voice.set(x.social_account_id, (voice.get(x.social_account_id)||0)+1);
  const voiceRowsUi=(accounts||[]).map((a:any)=>({...a,count:voice.get(a.id)||0})).sort((a:any,b:any)=>b.count-a.count); const voiceTotal=voiceRowsUi.reduce((s:number,a:any)=>s+a.count,0)||1;

  return <section className="mt-6 space-y-4">
    <div className="grid gap-4 md:grid-cols-4">
      {[
        [ar?"الإشارات / 7 أيام":"Mentions / 7d",current.mentions,pct(current.mentions,previous.mentions)],
        [ar?"التفاعل / 7 أيام":"Engagement / 7d",current.engagement,pct(current.engagement,previous.engagement)],
        [ar?"المشاهدات / 7 أيام":"Views / 7d",current.views,pct(current.views,previous.views)],
        [ar?"السلبية / 7 أيام":"Negative / 7d",current.negative,pct(current.negative,previous.negative)],
      ].map(([label,value,delta]:any)=><div key={label} className="rounded-[1.4rem] border bg-white p-5 shadow-sm"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-2xl font-black">{fmt(value)}</div><div className={`mt-1 text-xs font-black ${Number(delta)>=0?"text-amber-600":"text-emerald-600"}`}>{Number(delta)>=0?"+":""}{Number(delta).toFixed(0)}% {ar?"مقابل الفترة السابقة":"vs previous period"}</div></div>)}
    </div>

    {summary && <div className="rounded-[1.6rem] border border-[#660066]/15 bg-[#660066]/5 p-6"><div className="text-xs font-black uppercase tracking-[.16em] text-[#660066]">{ar?"الملخص التنفيذي اليومي":"Daily executive brief"}</div><p className="mt-3 text-base font-semibold leading-7 text-zinc-800">{summary.executive_summary}</p><div className="mt-4 grid gap-3 md:grid-cols-3">{[[ar?"أبرز النقاط":"Highlights",summary.highlights],[ar?"المخاطر":"Risks",summary.risks],[ar?"الفرص":"Opportunities",summary.opportunities]].map(([title,items]:any)=><div key={title} className="rounded-2xl bg-white p-4"><div className="text-sm font-black">{title}</div><ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-600">{(items||[]).slice(0,3).map((x:string)=><li key={x}>• {x}</li>)}</ul></div>)}</div></div>}

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-black">{ar?"الموضوعات الصاعدة":"Emerging topics"}</h3><span className="text-xs text-zinc-400">AI topics</span></div><div className="mt-4 flex flex-wrap gap-2">{topTopics.length?topTopics.map(([topic,count])=><span key={topic} className="rounded-full bg-zinc-100 px-3 py-2 text-sm font-bold">{topic} <b className="text-[#660066]">{count}</b></span>):<span className="text-sm text-zinc-400">{ar?"ستظهر بعد التحليل":"Appears after AI enrichment"}</span>}</div></div>
      <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-black">{ar?"استهلاك آخر 30 يوم":"30-day usage"}</h3><span className="text-xl font-black text-[#660066]">{fmt(usageTotal)}</span></div><p className="mt-2 text-sm text-zinc-500">{ar?"يشمل سجلات المزود والتحليلات والملخصات، لتجهيز التسعير والحصص لاحقاً.":"Tracks provider records and AI operations for future quotas and pricing."}</p></div>
    </div>

    <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-black">{ar?"حصة الرصد بين الحسابات":"Share of monitored voice"}</h3><span className="text-xs text-zinc-400">{ar?"ضمن الحسابات المضافة للمشروع":"within monitored accounts"}</span></div><div className="mt-5 space-y-3">{voiceRowsUi.map((a:any)=><div key={a.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3"><PlatformIcon platform={String(a.platform||"").toLowerCase()} size={18}/><div><div className="flex justify-between text-xs font-bold"><span>{a.handle}</span><span>{((a.count/voiceTotal)*100).toFixed(1)}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#660066]" style={{width:`${Math.max(1,(a.count/voiceTotal)*100)}%`}}/></div></div><span className="text-xs font-black text-zinc-500">{fmt(a.count)}</span></div>)}</div></div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><h3 className="font-black">{ar?"صحة مصادر البيانات":"Data-source health"}</h3><div className="mt-4 space-y-2">{(accounts||[]).map((a:any)=><div key={a.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-2xl bg-zinc-50 p-3"><PlatformIcon platform={String(a.platform||"").toLowerCase()} size={19}/><div><div className="text-sm font-black">{a.handle}</div><div className="text-[11px] text-zinc-400">{a.provider||"—"} · {fmt(a.records_imported)} {ar?"سجل":"records"}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${a.last_sync_status==="success"?"bg-emerald-50 text-emerald-700":a.last_sync_status==="failed"?"bg-red-50 text-red-700":"bg-zinc-100 text-zinc-500"}`}>{a.last_sync_status||"new"}</span></div>)}</div></div>
      <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><h3 className="font-black">{ar?"أكثر المؤلفين تأثيراً":"Influential authors"}</h3><div className="mt-4 space-y-3">{(authors||[]).map((a:any,i:number)=><div key={`${a.platform}-${a.author_username}-${i}`} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3"><div><div className="text-sm font-black">{a.author_name||a.author_username||"—"}</div><div className="text-[11px] text-zinc-400">{a.author_username?`@${a.author_username}`:""} · {a.followers!=null?`${fmt(a.followers)} followers`:a.platform}</div></div><div className="text-sm font-black text-[#660066]">{Math.round(Number(a.influence_score||0)).toLocaleString()}</div></div>)}</div></div>
    </div>

    <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm"><h3 className="font-black">{ar?"المحتوى الأسرع نمواً":"Fastest-growing content"}</h3><div className="mt-3 divide-y">{(viral||[]).map((m:any)=><div key={m.id} className="grid gap-3 py-4 md:grid-cols-[36px_1fr_auto] md:items-center"><PlatformIcon platform={String(m.platform||"").toLowerCase().replace(/\s+/g,"_")} size={20}/><div><p className="line-clamp-2 text-sm font-semibold text-zinc-700">{m.content}</p><div className="mt-1 text-xs text-zinc-400">♥ {fmt(m.likes)} · ↻ {fmt(m.shares)} · 💬 {fmt(m.replies)} · ◉ {fmt(m.views)}</div></div><div className="text-right"><div className="text-sm font-black text-[#660066]">{Number(m.virality_score||0).toFixed(1)}</div><div className="text-[10px] text-zinc-400">velocity</div></div></div>)}</div></div>
  </section>;
}
