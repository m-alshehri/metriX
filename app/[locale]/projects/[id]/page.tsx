import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, isLocale } from "@/lib/i18n";
import { addKeyword, deleteKeyword } from "../actions";

export default async function ProjectPage({
  params,
  searchParams
}:{
  params:{locale:string;id:string};
  searchParams?:{message?:string;error?:string};
}){
  if(!isLocale(params.locale)) notFound();
  const locale=params.locale,t=getDictionary(locale),supabase=createClient();

  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/${locale}/login`);

  const {data:project}=await supabase
    .from("projects")
    .select("id,name,description,created_at")
    .eq("id",params.id)
    .single();

  if(!project) notFound();

  const {data:keywords}=await supabase
    .from("keywords")
    .select("id,keyword,created_at")
    .eq("project_id",params.id)
    .order("created_at",{ascending:false});

  let notice:string|null=null;
  if(searchParams?.message==="keyword-created") notice=t.keywords.created;
  if(searchParams?.message==="keyword-deleted") notice=t.keywords.deleted;

  let error:string|null=null;
  if(searchParams?.error==="duplicate") error=t.keywords.duplicate;
  else if(searchParams?.error) error=t.keywords.error;

  return <main className="min-h-screen bg-zinc-50">
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}/dashboard`} className="text-2xl font-black text-metrix-900">metriX</Link>
        <Link href={`/${locale}/dashboard`} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold">{t.projects.back}</Link>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-[2rem] bg-metrix-950 p-8 text-white">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-300">Project</div>
        <h1 className="mt-3 text-4xl font-black">{project.name}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/70">{project.description||"—"}</p>
      </div>

      {notice&&<div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}
      {error&&<div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">{t.keywords.addTitle}</h2>
          <p className="mt-2 leading-7 text-zinc-500">{t.keywords.description}</p>
          <form action={addKeyword} className="mt-6 space-y-4">
            <input type="hidden" name="locale" value={locale}/>
            <input type="hidden" name="project_id" value={project.id}/>
            <input name="keyword" required className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder={t.keywords.placeholder}/>
            <button className="rounded-full bg-metrix-900 px-6 py-3 font-bold text-white">{t.keywords.add}</button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">{t.keywords.title}</h2>
          {!keywords||keywords.length===0
            ? <p className="mt-6 text-zinc-500">{t.keywords.empty}</p>
            : <div className="mt-6 space-y-3">
              {keywords.map(k=><div key={k.id} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                <div className="font-bold">{k.keyword}</div>
                <form action={deleteKeyword}>
                  <input type="hidden" name="locale" value={locale}/>
                  <input type="hidden" name="project_id" value={project.id}/>
                  <input type="hidden" name="keyword_id" value={k.id}/>
                  <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600">{t.keywords.delete}</button>
                </form>
              </div>)}
            </div>}
        </section>
      </div>
    </div>
  </main>;
}
