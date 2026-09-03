import { createClient } from "@/lib/supabase/server";
import { buildIntelligence } from "@/lib/intelligence";

export default async function MegaIntelligence({projectId,locale}:{projectId:string;locale:string}) {
  const ar=locale==="ar", db=createClient();
  const {data:mentions}=await db.from("mentions").select("keyword_id,author_username,author_name,content,sentiment,likes,shares,replies,views").eq("project_id",projectId);
  const {data:keywords}=await db.from("keywords").select("id,keyword").eq("project_id",projectId);
  const intel=buildIntelligence(mentions||[],keywords||[]);
  return <section className="mt-10">
    <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">{ar?"الذكاء التنافسي":"INTELLIGENCE LAYER"}</div>
    <h2 className="mt-2 text-3xl font-black">{ar?"حصة الصوت والمواضيع والمؤثرون":"Share of Voice, Topics & Influencers"}</h2>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm"><h3 className="font-black">{ar?"حصة الصوت":"Share of Voice"}</h3><div className="mt-4 space-y-3">{intel.shareOfVoice.map(x=><div key={x.keyword}><div className="flex justify-between text-sm"><b>{x.keyword}</b><span>{x.percent}%</span></div><div className="mt-1 h-2 rounded bg-zinc-100"><div className="h-2 rounded bg-metrix-900" style={{width:`${x.percent}%`}}/></div></div>)}</div></div>
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm"><h3 className="font-black">{ar?"المواضيع البارزة":"Topic signals"}</h3><div className="mt-4 flex flex-wrap gap-2">{intel.topics.map(x=><span key={x.topic} className="rounded-full bg-metrix-50 px-3 py-2 text-sm font-bold">{x.topic} · {x.count}</span>)}</div></div>
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm"><h3 className="font-black">{ar?"أهم المؤلفين":"Top authors"}</h3><div className="mt-4 space-y-3">{intel.topAuthors.slice(0,7).map(x=><div key={x.name} className="flex justify-between border-b pb-2 text-sm"><b>{x.name}</b><span>{x.engagement} {ar?"تفاعل":"eng."}</span></div>)}</div></div>
    </div>
  </section>;
}
