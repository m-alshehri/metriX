import { notFound } from "next/navigation";
import {
  BellRing,
  BrainCircuit,
  ChartNoAxesCombined,
  Eye,
  Globe2,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { isLocale } from "@/lib/i18n";
import PlatformIcon from "@/components/PlatformIcon";
import RequestDemoForm from "@/components/RequestDemoForm";

const platforms = [
  "x",
  "youtube",
  "instagram",
  "tiktok",
  "threads",
  "facebook",
  "linkedin",
  "reddit",
  "google_maps",
  "snapchat",
];

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const copy = ar
    ? {
        eyebrow: "عرض توضيحي للذكاء الاجتماعي",
        trusted: "رؤية موحدة للمحادثات العامة عبر أهم المنصات",
        overview: "نظرة عامة توضيحية",
        period: "آخر 30 يوم",
        mentions: "الإشارات",
        reach: "الوصول",
        engagement: "التفاعل",
        volume: "نشاط المحادثات",
        sentiment: "المشاعر",
        positive: "إيجابي",
        neutral: "محايد",
        negative: "سلبي",
        signal: "إشارة جديدة",
        signalText: "ارتفاع ملحوظ في التفاعل خلال الساعة الأخيرة",
        neverMiss: "لا تفوّت إشارة مهمة.",
        neverMissP:
          "اجمع المحتوى العام من حسابات ومنصات متعددة واعرف ما يتغير حول العلامة أو الجهة التي تتابعها.",
        metrics: "مؤشرات واضحة، بدون ضوضاء.",
        metricsP:
          "قارن الأداء، راقب التفاعل، افهم المشاعر واكتشف ما يستحق الاهتمام من شاشة واحدة.",
        insights: "ذكاء اصطناعي يحوّل البيانات إلى قرار.",
        insightsP:
          "استخدم تحليل المشاعر والموضوعات والاتجاهات وAI Insights للانتقال من جمع البيانات إلى الفهم.",
        alerts: "اعرف التغيّر فور حدوثه.",
        alertsP:
          "التنبيهات تساعدك في التقاط القفزات والتغيّرات المهمة قبل أن تصبح مشكلة أو فرصة ضائعة.",
        sources: "مصادر متعددة. تجربة واحدة.",
        aiTitle: "من البيانات الخام إلى ذكاء قابل للاستخدام.",
        aiP: "metriX يلخص الصورة ويعرض الموضوعات والمشاعر والمنصات والمحتوى الأعلى تفاعلاً.",
        demoTitle: "شاهد كيف يمكن لـ metriX أن يعمل لجهتك.",
        demoP:
          "أرسل طلباً قصيراً وسنتواصل معك حول عرض توضيحي مناسب لحالة الاستخدام.",
      }
    : {
        eyebrow: "SOCIAL INTELLIGENCE DEMO",
        trusted:
          "One view of public conversations across the platforms that matter",
        overview: "Illustrative brand overview",
        period: "Last 30 days",
        mentions: "Mentions",
        reach: "Reach",
        engagement: "Engagement",
        volume: "Conversation activity",
        sentiment: "Sentiment",
        positive: "Positive",
        neutral: "Neutral",
        negative: "Negative",
        signal: "New signal",
        signalText: "Engagement is rising noticeably in the last hour",
        neverMiss: "Never miss a signal that matters.",
        neverMissP:
          "Collect public content from multiple accounts and platforms, and see what is changing around the brand or organization you monitor.",
        metrics: "Clear metrics. Less noise.",
        metricsP:
          "Compare performance, track engagement, understand sentiment and surface what deserves attention from one screen.",
        insights: "AI that turns data into decisions.",
        insightsP:
          "Use sentiment, topics, trends and AI Insights to move from data collection to understanding.",
        alerts: "Know when something changes.",
        alertsP:
          "Catch meaningful spikes and shifts before they become a problem — or a missed opportunity.",
        sources: "Many sources. One experience.",
        aiTitle: "From raw data to usable intelligence.",
        aiP: "metriX summarizes the picture and surfaces topics, sentiment, platforms and top-performing content.",
        demoTitle: "See how metriX can work for your organization.",
        demoP:
          "Send a short request and we’ll contact you about a demo tailored to your monitoring use case.",
      };

  const bars = [
    36, 52, 44, 68, 57, 76, 62, 88, 70, 95, 74, 84, 64, 91, 78, 98, 82, 90, 72,
    94,
  ];

  return (
    <main className="overflow-hidden bg-white">
      <section className="relative border-b border-zinc-100 py-14 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_20%,rgba(102,0,102,0.10),transparent_35%),radial-gradient(circle_at_20%_30%,rgba(51,0,51,0.07),transparent_30%)]" />
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#660066]/15 bg-[#660066]/5 px-3 py-2 text-sm tracking-[.08em] text-[#660066]">
              <Sparkles size={15} />
              {copy.eyebrow}
            </div>
            <div className="metrix-pulse hidden items-center gap-2 text-sm text-emerald-600 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
              {ar ? "بيانات توضيحية" : "Sample data"}
            </div>
          </div>

          <div className="metrix-float rounded-xl border border-zinc-200 bg-white p-3 shadow-[0_30px_90px_rgba(51,0,51,0.14)] sm:p-5">
            <div className="rounded-lg bg-zinc-50 p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="text-xs uppercase tracking-[.18em] text-[#660066]">
                    metriX intelligence
                  </div>
                  <h1 className="mt-1 text-3xl tracking-[-0.04em] text-[#330033] sm:text-4xl">
                    {copy.overview}
                  </h1>
                </div>
                <div className="w-fit rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
                  {copy.period}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  [copy.mentions, "18.4K", "+12%"],
                  [copy.reach, "3.2M", "+8%"],
                  [copy.engagement, "284K", "+21%"],
                ].map(([label, value, delta]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="text-sm text-zinc-400">{label}</div>
                    <div className="mt-1 text-3xl text-[#330033]">{value}</div>
                    <div className="mt-1 text-sm text-emerald-600">{delta}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_.75fr]">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-[#330033]">
                      {copy.volume}
                    </span>
                    <span className="text-sm text-zinc-400">30d</span>
                  </div>
                  <div className="mt-7 flex h-40 items-end gap-1.5 sm:h-48 sm:gap-2">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className="metrix-bar flex-1 rounded-t-sm bg-[#660066]"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 90}ms`,
                          opacity: 0.32 + i / 32,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-zinc-400">
                    <span>01 Sep</span>
                    <span>08 Sep</span>
                    <span>15 Sep</span>
                    <span>22 Sep</span>
                    <span>30 Sep</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-white p-5">
                    <div className="text-base text-[#330033]">
                      {copy.sentiment}
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        [copy.positive, "68%", "w-[68%] bg-emerald-500"],
                        [copy.neutral, "23%", "w-[23%] bg-zinc-400"],
                        [copy.negative, "9%", "w-[9%] bg-red-500"],
                      ].map(([label, val, width]) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm">
                            <span>{label}</span>
                            <span>{val}</span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-sm bg-zinc-100">
                            <div className={`h-full rounded-sm ${width}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="metrix-pulse rounded-lg border border-[#660066]/15 bg-[#660066]/5 p-4">
                    <div className="flex items-center gap-2 text-sm text-[#660066]">
                      <BellRing size={16} />
                      {copy.signal}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {copy.signalText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm uppercase tracking-[.14em] text-zinc-400">
            {copy.trusted}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {platforms.map((p) => (
              <div
                key={p}
                className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 bg-white shadow-sm"
              >
                <PlatformIcon
                  platform={p}
                  size={20}
                  className="text-zinc-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            [Eye, copy.neverMiss, copy.neverMissP],
            [ChartNoAxesCombined, copy.metrics, copy.metricsP],
            [BrainCircuit, copy.insights, copy.insightsP],
          ].map(([Icon, title, body]: any) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#660066]/8 text-[#660066]">
                <Icon size={22} />
              </div>
              <h2 className="mt-6 text-3xl tracking-[-0.03em]">{title}</h2>
              <p className="mt-3 leading-7 text-zinc-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="solutions" className="bg-[#330033] py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">
          <div>
            <div className="text-sm uppercase tracking-[.18em] text-fuchsia-300">
              {copy.alerts}
            </div>
            <h2 className="mt-4 text-5xl tracking-[-0.045em] sm:text-6xl">
              {copy.neverMiss}
            </h2>
            <p className="mt-5 max-w-xl text-xl leading-8 text-white/70">
              {copy.alertsP}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [BellRing, ar ? "تنبيهات التغيّرات" : "Change alerts"],
                [ShieldCheck, ar ? "متابعة السمعة" : "Reputation monitoring"],
                [Search, ar ? "رصد موجه" : "Focused monitoring"],
                [UsersRound, ar ? "فهم الجمهور" : "Audience understanding"],
              ].map(([Icon, label]: any) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <Icon size={20} className="text-fuchsia-300" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="rounded-lg bg-white p-5 text-[#330033]">
              <div className="flex items-center justify-between">
                <span className="text-lg">Signal monitor</span>
                <span className="metrix-pulse text-sm text-emerald-600">
                  ● demo
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Reputation spike detected",
                  "Engagement accelerating",
                  "New topic cluster emerging",
                  "Cross-platform mention increase",
                ].map((x, i) => (
                  <div
                    key={x}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4"
                  >
                    <span>{x}</span>
                    <span className="text-sm text-[#660066]">
                      +{12 + i * 7}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[.16em] text-[#660066]">
              <BrainCircuit size={17} /> AI intelligence
            </div>
            <h2 className="mt-4 text-5xl tracking-[-0.045em] text-[#330033] sm:text-6xl">
              {copy.aiTitle}
            </h2>
            <p className="mt-5 text-xl leading-8 text-zinc-600">{copy.aiP}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Sentiment",
              "Topic Signals",
              "Fastest growth",
              "AI Insights",
            ].map((x, i) => (
              <div
                key={x}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="text-sm text-zinc-400">0{i + 1}</div>
                <div className="mt-8 text-xl text-[#330033]">{x}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sources"
        className="border-y border-zinc-100 bg-zinc-50 py-16"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-2 text-[#660066]">
            <Globe2 size={20} />
            <span>{copy.sources}</span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {platforms.map((p) => (
              <div
                key={p}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"
              >
                <PlatformIcon platform={p} size={18} />
                <span className="capitalize">{p.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="request-demo" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:grid-cols-[.9fr_1.1fr] lg:p-10">
          <div>
            <h2 className="text-4xl tracking-[-0.04em] text-[#330033] sm:text-5xl">
              {copy.demoTitle}
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">{copy.demoP}</p>
          </div>
          <RequestDemoForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
