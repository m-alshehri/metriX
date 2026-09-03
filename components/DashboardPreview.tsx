import MetricCard from "./MetricCard";
export default function DashboardPreview({t}:{t:any}){
 return <div className="rounded-[2rem] border border-black/5 bg-white p-4 shadow-soft"><div className="rounded-[1.5rem] bg-zinc-50 p-5">
 <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-metrix-700">Dashboard</p><h3 className="mt-1 text-xl font-black">{t.dashboardPreview.title}</h3></div><div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-500">{t.dashboardPreview.period}</div></div>
 <div className="grid gap-3 sm:grid-cols-2"><MetricCard label={t.dashboardPreview.mentions} value="18,432"/><MetricCard label={t.dashboardPreview.engagement} value="284K"/><MetricCard label={t.dashboardPreview.reach} value="3.2M"/><MetricCard label={t.dashboardPreview.positive} value="71%"/></div>
 </div></div>;
}
