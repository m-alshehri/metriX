import MetricCard from "./MetricCard";

export default function DashboardPreview() {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-4 shadow-soft">
      <div className="rounded-[1.5rem] bg-zinc-50 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-metrix-600">Dashboard</p>
            <h3 className="mt-1 text-xl font-black">نظرة عامة على علامتك</h3>
          </div>
          <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-500 shadow-sm">
            آخر 30 يوم
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="الإشارات" value="18,432" change="+24.8%" />
          <MetricCard label="التفاعل" value="284K" change="+18.2%" />
          <MetricCard label="الوصول" value="3.2M" change="+11.4%" />
          <MetricCard label="المشاعر الإيجابية" value="71%" change="+6.1%" />
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold">الإشارات عبر الزمن</span>
            <span className="text-xs text-zinc-400">Live preview</span>
          </div>
          <div className="flex h-44 items-end gap-2">
            {[35, 52, 45, 68, 58, 79, 64, 88, 72, 93, 84, 100].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-metrix-900/80" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
