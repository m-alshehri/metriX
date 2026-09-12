import { notFound } from "next/navigation";
import { ArrowRight, BellRing, BrainCircuit, ChartNoAxesCombined, Eye, Globe2, MessageCircleMore, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import PlatformIcon from "@/components/PlatformIcon";
import RequestDemoForm from "@/components/RequestDemoForm";

const platforms = ["x", "youtube", "instagram", "tiktok", "threads", "facebook", "linkedin", "reddit", "google_maps", "snapchat"];

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";

  const copy = ar ? {
    eyebrow: "منصة ذكاء اجتماعي مدعومة بالذكاء الاصطناعي",
    headlineA: "راقب حضور علامتك.",
    headlineB: "افهم جمهورك.",
    headlineC: "تحرك قبل أن تتسارع المحادثة.",
    intro: "metriX يجمع المحادثات العامة من المنصات الرقمية في لوحة موحدة، ثم يحولها إلى مشاعر واتجاهات ومؤشرات وتوصيات قابلة للتنفيذ.",
    demo: "اطلب عرضاً",
    login: "تسجيل الدخول",
    trusted: "رؤية موحدة للمحادثات العامة عبر أهم المنصات",
    neverMiss: "لا تفوّت إشارة مهمة.",
    neverMissP: "اجمع المحتوى العام من حسابات ومنصات متعددة واعرف ما يتغير حول العلامة أو الجهة التي تتابعها.",
    metrics: "مؤشرات واضحة، بدون ضوضاء.",
    metricsP: "قارن الأداء، راقب التفاعل، افهم المشاعر واكتشف ما يستحق الاهتمام من شاشة واحدة.",
    insights: "ذكاء اصطناعي يحوّل البيانات إلى قرار.",
    insightsP: "استخدم تحليل المشاعر والموضوعات والاتجاهات وAI Insights للانتقال من جمع البيانات إلى الفهم.",
    alerts: "اعرف التغيّر فور حدوثه.",
    alertsP: "التنبيهات تساعدك في التقاط القفزات والتغيّرات المهمة قبل أن تصبح مشكلة أو فرصة ضائعة.",
    sources: "مصادر متعددة. تجربة واحدة.",
    aiTitle: "من البيانات الخام إلى ذكاء قابل للاستخدام.",
    aiP: "بدلاً من قراءة مئات المنشورات، metriX يلخص الصورة ويعرض لك الموضوعات والمشاعر والمنصات والمحتوى الأعلى تفاعلاً.",
    demoTitle: "شاهد كيف يمكن لـ metriX أن يعمل لجهتك.",
    demoP: "أرسل طلباً قصيراً وسنستخدم معلوماتك للتواصل معك حول عرض توضيحي مناسب لحالة الاستخدام.",
  } : {
    eyebrow: "AI-POWERED SOCIAL INTELLIGENCE",
    headlineA: "Track your brand presence.",
    headlineB: "Understand your audience.",
    headlineC: "Move before the conversation does.",
    intro: "metriX brings public conversations from digital platforms into one intelligence workspace, then turns them into sentiment, trends, metrics and actionable recommendations.",
    demo: "Request a demo",
    login: "Login",
    trusted: "One view of public conversations across the platforms that matter",
    neverMiss: "Never miss a signal that matters.",
    neverMissP: "Collect public content from multiple accounts and platforms, and see what is changing around the brand or organization you monitor.",
    metrics: "Clear metrics. Less noise.",
    metricsP: "Compare performance, track engagement, understand sentiment and surface what deserves attention from one screen.",
    insights: "AI that turns data into decisions.",
    insightsP: "Use sentiment, topics, trends and AI Insights to move from data collection to understanding.",
    alerts: "Know when something changes.",
    alertsP: "Alerts help you catch meaningful spikes and shifts before they become a problem — or a missed opportunity.",
    sources: "Many sources. One experience.",
    aiTitle: "From raw data to usable intelligence.",
    aiP: "Instead of reading hundreds of posts, metriX summarizes the picture and surfaces topics, sentiment, platforms and top-performing content.",
    demoTitle: "See how metriX can work for your organization.",
    demoP: "Send a short request and we’ll contact you about a demo tailored to your monitoring use case.",
  };

  return (
    <main className="overflow-hidden bg-white">
      <section className="relative border-b border-zinc-100">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_70%_20%,rgba(102,0,102,0.10),transparent_35%),radial-gradient(circle_at_20%_30%,rgba(51,0,51,0.08),transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#660066]/15 bg-[#660066]/5 px-4 py-2 text-xs font-black tracking-[.08em] text-[#660066]">
              <Sparkles size={15} />
              {copy.eyebrow}
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-7xl">
              <span className="block">{copy.headlineA}</span>
              <span className="block text-[#660066]">{copy.headlineB}</span>
              <span className="block">{copy.headlineC}</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-600">{copy.intro}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#request-demo" className="inline-flex items-center gap-2 rounded-full bg-[#330033] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#660066]">
                {copy.demo} <ArrowRight size={17} className={ar ? "rotate-180" : ""} />
              </a>
              <a href={`/${locale}/login`} className="rounded-full border border-zinc-300 bg-white px-6 py-3.5 text-sm font-black text-zinc-800 transition hover:border-[#660066] hover:text-[#660066]">
                {copy.login}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[#660066]/5 blur-2xl" />
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-[0_30px_90px_rgba(51,0,51,0.14)]">
              <div className="rounded-[1.5rem] bg-zinc-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#660066]">metriX intelligence</div>
                    <div className="mt-1 text-xl font-black text-zinc-950">{ar ? "نظرة عامة على العلامة" : "Brand overview"}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-2 text-xs font-black text-zinc-500 shadow-sm">{ar ? "آخر 30 يوم" : "Last 30 days"}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    [ar ? "الإشارات" : "Mentions", "18.4K", "+12%"],
                    [ar ? "الوصول" : "Reach", "3.2M", "+8%"],
                    [ar ? "التفاعل" : "Engagement", "284K", "+21%"],
                  ].map(([label, value, delta]) => (
                    <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-[11px] font-bold text-zinc-400">{label}</div>
                      <div className="mt-1 text-xl font-black">{value}</div>
                      <div className="mt-1 text-[10px] font-black text-emerald-600">{delta}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span>{ar ? "حجم المحادثات" : "Conversation volume"}</span>
                      <span className="text-zinc-400">30d</span>
                    </div>
                    <div className="mt-5 flex h-32 items-end gap-1.5">
                      {[22,35,29,46,40,54,49,72,64,83,59,76,92,68,86,72,98,88,70,91].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-[#660066]" style={{ height: `${h}%`, opacity: .28 + i / 28 }} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-xs font-black">{ar ? "المشاعر" : "Sentiment"}</div>
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold"><span>{ar ? "إيجابي" : "Positive"}</span><span>68%</span></div>
                        <div className="mt-1.5 h-2 rounded-full bg-zinc-100"><div className="h-full w-[68%] rounded-full bg-emerald-500" /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold"><span>{ar ? "محايد" : "Neutral"}</span><span>23%</span></div>
                        <div className="mt-1.5 h-2 rounded-full bg-zinc-100"><div className="h-full w-[23%] rounded-full bg-zinc-400" /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold"><span>{ar ? "سلبي" : "Negative"}</span><span>9%</span></div>
                        <div className="mt-1.5 h-2 rounded-full bg-zinc-100"><div className="h-full w-[9%] rounded-full bg-red-500" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-12">
          <p className="text-center text-xs font-black uppercase tracking-[.16em] text-zinc-400">{copy.trusted}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {platforms.map((p) => (
              <div key={p} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm">
                <PlatformIcon platform={p} size={21} className="text-zinc-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            [Eye, copy.neverMiss, copy.neverMissP],
            [ChartNoAxesCombined, copy.metrics, copy.metricsP],
            [BrainCircuit, copy.insights, copy.insightsP],
          ].map(([Icon, title, body]: any) => (
            <article key={title} className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#660066]/8 text-[#660066]"><Icon size={23} /></div>
              <h2 className="mt-6 text-2xl font-black tracking-[-0.03em]">{title}</h2>
              <p className="mt-3 leading-7 text-zinc-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="solutions" className="bg-zinc-950 py-24 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <div className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">{copy.alerts}</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{copy.neverMiss}</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">{copy.alertsP}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [BellRing, ar ? "تنبيهات التغيّرات" : "Change alerts"],
                [ShieldCheck, ar ? "متابعة السمعة" : "Reputation monitoring"],
                [Search, ar ? "رصد موجه" : "Focused monitoring"],
                [UsersRound, ar ? "فهم الجمهور" : "Audience understanding"],
              ].map(([Icon, label]: any) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Icon size={20} className="text-fuchsia-300" />
                  <span className="font-bold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
            <div className="rounded-[1.4rem] bg-white p-5 text-zinc-900">
              <div className="flex items-center justify-between">
                <div className="font-black">{ar ? "تنبيه ذكي" : "Smart alert"}</div>
                <div className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">{ar ? "تغيّر مهم" : "Important shift"}</div>
              </div>
              <div className="mt-5 rounded-2xl bg-zinc-50 p-5">
                <div className="text-xs font-bold text-zinc-400">{ar ? "ارتفاع في المحادثات" : "Conversation spike detected"}</div>
                <div className="mt-2 text-3xl font-black">+164%</div>
                <div className="mt-4 flex h-28 items-end gap-1">
                  {[18,21,24,22,30,27,38,40,35,42,48,55,51,60,74,98].map((h, i) => (
                    <div key={i} className={`flex-1 rounded-t ${i > 12 ? "bg-red-500" : "bg-[#660066]"}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
            <div className="rounded-[1.4rem] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-[#660066]"><BrainCircuit size={20} /> AI Insights</div>
              <div className="mt-5 space-y-3">
                {[
                  ar ? "المحتوى الإيجابي يرتفع حول خدمة العملاء." : "Positive conversation is increasing around customer service.",
                  ar ? "هناك نمو واضح في التفاعل على الفيديو القصير." : "Short-form video engagement is showing clear growth.",
                  ar ? "الموضوع الأكثر تكراراً هذا الأسبوع مرتبط بالشراكات." : "The most repeated topic this week is related to partnerships.",
                ].map((x, i) => (
                  <div key={x} className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#660066] text-xs font-black text-white">{i + 1}</span>
                    <p className="text-sm font-semibold leading-6 text-zinc-700">{x}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#660066]"><Sparkles size={16} /> AI intelligence</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{copy.aiTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-zinc-600">{copy.aiP}</p>
        </div>
      </section>

      <section id="sources" className="border-y border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <Globe2 className="mx-auto text-[#660066]" size={34} />
          <h2 className="mt-5 text-4xl font-black tracking-[-0.04em]">{copy.sources}</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {platforms.map((p) => (
              <div key={p} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <PlatformIcon platform={p} size={24} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="request-demo" className="scroll-mt-28 bg-white py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="lg:pt-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#660066]/8 px-4 py-2 text-xs font-black text-[#660066]">
              <MessageCircleMore size={16} />
              {copy.demo}
            </div>
            <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{copy.demoTitle}</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">{copy.demoP}</p>
          </div>
          <RequestDemoForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
