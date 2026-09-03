import { ArrowRight, ArrowLeft, BarChart3, BellRing, BrainCircuit, MessagesSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import DashboardPreview from "@/components/DashboardPreview";
import { getDictionary, isLocale } from "@/lib/i18n";

const icons = [Search, MessagesSquare, BrainCircuit, BarChart3, BellRing, ShieldCheck];

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const t = getDictionary(locale);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return <main>
    <Navbar locale={locale} t={t} />
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(173,74,162,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(51,0,51,0.12),transparent_25%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-metrix-200 bg-metrix-50 px-4 py-2 text-sm font-bold text-metrix-800"><Sparkles size={16}/>{t.hero.badge}</div>
          <h1 className="mt-7 text-5xl font-black leading-[1.15] tracking-tight text-zinc-950 md:text-6xl">{t.hero.title1}<span className="text-metrix-900">{t.hero.title2}</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">{t.hero.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`/${locale}/signup`} className="inline-flex items-center gap-2 rounded-full bg-metrix-900 px-6 py-3.5 font-bold text-white">{t.hero.start}<Arrow size={18}/></a>
            <a href="#features" className="rounded-full border border-zinc-200 bg-white px-6 py-3.5 font-bold text-zinc-800">{t.hero.explore}</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500"><span>✓ {t.hero.bullet1}</span><span>✓ {t.hero.bullet2}</span><span>✓ {t.hero.bullet3}</span></div>
        </div>
        <DashboardPreview t={t}/>
      </div>
    </section>

    <section id="features" className="border-y border-black/5 bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-metrix-700">{t.features.eyebrow}</p><h2 className="mt-3 text-4xl font-black tracking-tight">{t.features.title}</h2><p className="mt-4 text-lg leading-8 text-zinc-600">{t.features.description}</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((item:string[], i:number)=>{ const Icon=icons[i]; return <div key={item[0]} className="rounded-3xl border border-black/5 bg-zinc-50 p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-metrix-900 text-white"><Icon size={22}/></div><h3 className="mt-5 text-xl font-black">{item[0]}</h3><p className="mt-3 leading-7 text-zinc-600">{item[1]}</p></div>})}
        </div>
      </div>
    </section>

    <section id="how" className="py-20"><div className="mx-auto max-w-7xl px-6"><div className="grid gap-10 lg:grid-cols-3">{t.how.steps.map((step:string[],i:number)=><div key={step[0]} className="rounded-3xl bg-metrix-950 p-8 text-white"><div className="text-sm font-black tracking-[0.2em] text-metrix-300">0{i+1}</div><h3 className="mt-6 text-2xl font-black">{step[0]}</h3><p className="mt-3 leading-7 text-white/70">{step[1]}</p></div>)}</div></div></section>

    <section id="insights" className="bg-metrix-950 py-20 text-white"><div className="mx-auto max-w-7xl px-6 text-center"><p className="text-sm font-black uppercase tracking-[0.2em] text-metrix-300">{t.insights.eyebrow}</p><h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">{t.insights.title}</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">{t.insights.description}</p></div></section>

    <section id="pricing" className="py-20"><div className="mx-auto max-w-5xl px-6"><div className="rounded-[2rem] border border-metrix-100 bg-metrix-50 p-10 text-center md:p-14"><h2 className="text-4xl font-black">{t.pricing.title}</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-zinc-600">{t.pricing.description}</p><a href={`/${locale}/signup`} className="mt-7 inline-flex rounded-full bg-metrix-900 px-7 py-3.5 font-bold text-white">{t.pricing.button}</a></div></div></section>

    <footer className="border-t border-black/5 py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between"><span className="font-black text-metrix-900">metriX</span><span>{t.footer}</span></div></footer>
  </main>;
}
