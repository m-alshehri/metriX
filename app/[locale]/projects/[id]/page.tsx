import Link from "next/link";import {redirect,notFound} from "next/navigation";import {createClient} from "@/lib/supabase/server";import {getDictionary,isLocale} from "@/lib/i18n";import {addKeyword,deleteKeyword,addTestMention} from "../actions";import MetricCard from "@/components/MetricCard";

export default async function ProjectPage({params,searchParams}:{params:{locale:string;id:string};searchParams?:{message?:string;error?:string}}){
 if(!isLocale(params.locale))notFound(); const locale=params.locale,t=getDictionary(locale),supabase=createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect(`/${locale}/login`);
 const {data:project}=await supabase.from("projects").select("id,name,description").eq("id",params.id).single(); if(!project)notFound();
 const {data:keywords}=await supabase.from("keywords").select("id,keyword").eq("project_id",params.id).order("created_at",{ascending:false});
 const {data:mentions}=await supabase.from("mentions").select("id,platform,author_name,author_username,content,post_url,published_at,likes,shares,replies,views,sentiment,keyword_id").eq("project_id",params.id).order("published_at",{ascending:false});

 const ms=mentions||[],count=ms.length,reach=ms.reduce((s,x)=>s+(Number(x.views)||0),0),eng=ms.reduce((s,x)=>s+(x.likes||0)+(x.shares||0)+(x.replies||0),0),pos=ms.filter(x=>x.sentiment==="positive").length,positive=count?Math.round(pos/count*100):0;
 const notice=searchParams?.message==="mention-created"?t.mentions.created:searchParams?.message==="keyword-created"?t.keywords.created:searchParams?.message==="keyword-deleted"?t.keywords.deleted:null;
 const error=searchParams?.error==="duplicate"?t.keywords.duplicate:searchParams?.error?t.mentions.error:null;

 return <main className="min-h-screen bg-zinc-50">
 <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><Link href={`/${locale}/dashboard`} className="text-2xl font-black text-metrix-900">metriX</Link><Link href={`/${locale}/dashboard`} className="rounded-full border px-4 py-2 text-sm font-bold">{t.projects.back}</Link></div></header>
 <div className="mx-auto max-w-7xl px-6 py-12">
   <div className="rounded-[2rem] bg-metrix-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-300">Project</div><h1 className="mt-3 text-4xl font-black">{project.name}</h1><p className="mt-3 text-white/70">{project.description||"—"}</p></div>
   {notice&&<div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}{error&&<div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
   <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><MetricCard label={t.dashboard.mentions} value={String(count)}/><MetricCard label={t.dashboard.reach} value={reach.toLocaleString()}/><MetricCard label={t.dashboard.engagement} value={eng.toLocaleString()}/><MetricCard label={t.dashboard.sentiment} value={`${positive}%`}/></div>

   <div className="mt-10 grid gap-8 lg:grid-cols-2">
     <section className="rounded-[2rem] border bg-white p-7 shadow-sm"><h2 className="text-2xl font-black">{t.keywords.addTitle}</h2><form action={addKeyword} className="mt-5 flex gap-3"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="project_id" value={project.id}/><input name="keyword" required className="min-w-0 flex-1 rounded-2xl border px-4 py-3" placeholder={t.keywords.placeholder}/><button className="rounded-full bg-metrix-900 px-5 py-3 font-bold text-white">{t.keywords.add}</button></form><div className="mt-5 space-y-2">{(keywords||[]).map(k=><div key={k.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="font-bold">{k.keyword}</span><form action={deleteKeyword}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="keyword_id" value={k.id}/><button className="text-sm font-bold text-red-600">{t.keywords.delete}</button></form></div>)}</div></section>

     <section className="rounded-[2rem] border bg-white p-7 shadow-sm"><h2 className="text-2xl font-black">{t.mentions.addTitle}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{t.mentions.description}</p><form action={addTestMention} className="mt-5 grid gap-3 sm:grid-cols-2">
       <input type="hidden" name="locale" value={locale}/><input type="hidden" name="project_id" value={project.id}/>
       <select name="platform" className="rounded-2xl border px-4 py-3"><option>X</option><option>Instagram</option><option>TikTok</option><option>YouTube</option></select>
       <select name="keyword_id" className="rounded-2xl border px-4 py-3"><option value="">{t.mentions.keyword}</option>{(keywords||[]).map(k=><option key={k.id} value={k.id}>{k.keyword}</option>)}</select>
       <input name="author_name" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.author}/><input name="author_username" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.username}/>
       <textarea name="content" required className="sm:col-span-2 rounded-2xl border px-4 py-3" rows={3} placeholder={t.mentions.content}/>
       <input name="post_url" className="sm:col-span-2 rounded-2xl border px-4 py-3" placeholder={t.mentions.url}/>
       <input name="likes" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.likes}/><input name="shares" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.shares}/>
       <input name="replies" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.replies}/><input name="views" type="number" min="0" defaultValue="0" className="rounded-2xl border px-4 py-3" placeholder={t.mentions.views}/>
       <select name="sentiment" className="rounded-2xl border px-4 py-3"><option value="positive">{t.mentions.positive}</option><option value="neutral">{t.mentions.neutral}</option><option value="negative">{t.mentions.negative}</option></select>
       <input name="published_at" type="datetime-local" className="rounded-2xl border px-4 py-3"/>
       <button className="sm:col-span-2 rounded-full bg-metrix-900 px-6 py-3 font-bold text-white">{t.mentions.add}</button>
     </form></section>
   </div>

   <section className="mt-10"><h2 className="text-2xl font-black">{t.mentions.title}</h2>{ms.length===0?<div className="mt-5 rounded-[2rem] border bg-white p-8 text-zinc-500">{t.mentions.empty}</div>:<div className="mt-5 space-y-4">{ms.map(m=><article key={m.id} className="rounded-[2rem] border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="rounded-full bg-metrix-50 px-3 py-1 text-xs font-black text-metrix-900">{m.platform}</span><span className="mx-2 font-bold">{m.author_name||m.author_username||"Unknown"}</span>{m.author_username&&<span className="text-sm text-zinc-400">@{m.author_username.replace(/^@/,"")}</span>}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${m.sentiment==="positive"?"bg-emerald-50 text-emerald-700":m.sentiment==="negative"?"bg-red-50 text-red-700":"bg-zinc-100 text-zinc-600"}`}>{m.sentiment}</span></div><p className="mt-4 leading-7">{m.content}</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-zinc-500"><span>♥ {m.likes}</span><span>↻ {m.shares}</span><span>💬 {m.replies}</span><span>◉ {Number(m.views).toLocaleString()}</span><span>{m.published_at?new Date(m.published_at).toLocaleString(locale==="ar"?"ar-SA":"en-US"):""}</span></div>{m.post_url&&<a href={m.post_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-metrix-900">{t.mentions.viewPost}</a>}</article>)}</div>}</section>
 </div></main>;
}
