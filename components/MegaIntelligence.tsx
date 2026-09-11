import { createClient } from "@/lib/supabase/server";
import { runFullPipeline } from "@/app/[locale]/projects/pipeline-actions";
import { sendTestAlertEmail } from "@/app/[locale]/projects/email-actions";
import SocialAccounts from "@/components/SocialAccounts";

export default async function MegaIntelligence({ projectId, locale }: { projectId: string; locale: string }) {
  const ar = locale === "ar";
  const db = createClient();

  const [{ data: mentions }, { data: lastRun }, { data: settings }] = await Promise.all([
    db.from("mentions").select("platform,author_username,author_name,content,likes,shares,replies,views").eq("project_id", projectId),
    db.from("pipeline_runs").select("status,imported,analyzed,alerts,started_at,finished_at,details").eq("project_id", projectId).order("started_at",{ascending:false}).limit(1).maybeSingle(),
    db.from("project_settings").select("email_alerts_enabled,alert_email").eq("project_id", projectId).maybeSingle(),
  ]);

  const rows:any[] = mentions || [];
  const platforms = new Map<string,{count:number;engagement:number}>();
  const authors = new Map<string,number>();
  const terms = new Map<string,number>();
  const stop = new Set(["the","and","for","that","with","this","from","على","في","من","إلى","الى","عن","هذا","هذه","مع"]);

  for (const m of rows) {
    const p = String(m.platform||"Other");
    const e = Number(m.likes||0)+Number(m.shares||0)+Number(m.replies||0);
    const x = platforms.get(p)||{count:0,engagement:0}; x.count++; x.engagement += e; platforms.set(p,x);
    const a = m.author_username || m.author_name;
    if (a) authors.set(String(a), (authors.get(String(a))||0)+e);
    for (const raw of String(m.content || "")
      .toLowerCase()
      .split(/[^a-zA-Z0-9\u0600-\u06FF_#@]+/)) {
      const w=raw.trim(); if (w.length>=3 && !stop.has(w)) terms.set(w,(terms.get(w)||0)+1);
    }
  }

  const total = rows.length || 1;
  const platformRows = Array.from(platforms.entries()).sort((a,b)=>b[1].count-a[1].count);
  const topAuthors = Array.from(authors.entries()).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const topTerms = Array.from(terms.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);

  const lastRunLabel =
    lastRun?.status === "success"
      ? (ar ? `آخر تشغيل ناجح: ${lastRun.imported} مستورد · ${lastRun.analyzed} محلل · ${lastRun.alerts} تنبيه`
            : `Last successful run: ${lastRun.imported} imported · ${lastRun.analyzed} analyzed · ${lastRun.alerts} alerts`)
      : lastRun?.status === "failed"
      ? (ar ? "آخر تشغيل فشل. راجع سجلات Vercel." : "The last pipeline run failed. Check Vercel logs.")
      : (ar ? "لم يتم تشغيل الـPipeline الكامل بعد." : "The full pipeline has not been run yet.");

  return (
    <section className="mt-10">
      <SocialAccounts projectId={projectId} locale={locale} />

      <div className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">{ar ? "الأتمتة" : "AUTOMATION"}</div>
            <h2 className="mt-2 text-2xl font-black">{ar ? "تشغيل التحليل الكامل" : "Run Full Pipeline"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              {ar
                ? "يجمع البيانات من الحسابات المحفوظة، يحلل المشاعر، يحدث AI Insights، ثم يفحص التنبيهات."
                : "Collects data from saved social accounts, analyzes sentiment, refreshes AI Insights, then scans for alerts."}
            </p>
            <p className="mt-3 text-sm font-bold text-zinc-700">{lastRunLabel}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {settings?.email_alerts_enabled && settings?.alert_email
                ? (ar ? `تنبيهات البريد مفعلة إلى ${settings.alert_email}` : `Email alerts enabled for ${settings.alert_email}`)
                : (ar ? "تنبيهات البريد غير مفعلة." : "Email alerts are disabled.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={runFullPipeline}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={projectId} />
              <button className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white">{ar ? "تشغيل كامل الآن" : "Run Full Pipeline"}</button>
            </form>
            <form action={sendTestAlertEmail}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="project_id" value={projectId} />
              <button className="rounded-full border border-metrix-900 px-6 py-3 font-black text-metrix-900">{ar ? "إرسال بريد تجريبي" : "Send Test Email"}</button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-metrix-700">{ar ? "طبقة الذكاء" : "INTELLIGENCE LAYER"}</div>
      <h2 className="mt-2 text-3xl font-black">{ar ? "المنصات والمواضيع والمؤثرون" : "Platforms, Topics & Influencers"}</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "توزيع النشاط حسب المنصة" : "Platform share"}</h3>
          <div className="mt-4 space-y-3">
            {platformRows.map(([p,v])=> {
              const percent=Math.round((v.count/total)*100);
              return <div key={p}><div className="flex justify-between text-sm"><b>{p}</b><span>{percent}%</span></div>
                <div className="mt-1 h-2 rounded bg-zinc-100"><div className="h-2 rounded bg-metrix-900" style={{width:`${percent}%`}} /></div></div>
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "المواضيع البارزة" : "Topic signals"}</h3>
          <div className="mt-4 flex flex-wrap gap-2">{topTerms.map(([t,c])=><span key={t} className="rounded-full bg-metrix-50 px-3 py-2 text-sm font-bold">{t} · {c}</span>)}</div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <h3 className="font-black">{ar ? "أهم المؤلفين" : "Top authors"}</h3>
          <div className="mt-4 space-y-3">
            {topAuthors.map(([name,eng])=><div key={name} className="flex justify-between border-b pb-2 text-sm"><b>{name}</b><span>{eng} {ar ? "تفاعل" : "eng."}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
