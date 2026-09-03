import { ArrowLeft, BarChart3, BellRing, BrainCircuit, MessagesSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import DashboardPreview from "@/components/DashboardPreview";

const features = [
  { icon: Search, title: "رصد ذكي", text: "تابع الكلمات والعلامات والموضوعات عبر قنوات متعددة من مكان واحد." },
  { icon: MessagesSquare, title: "تحليل الإشارات", text: "اجمع المنشورات والتعليقات والتفاعلات في تدفق موحد قابل للفلترة." },
  { icon: BrainCircuit, title: "ذكاء اصطناعي", text: "استخرج المشاعر والموضوعات والملخصات والأنماط المهمة تلقائيًا." },
  { icon: BarChart3, title: "تحليلات لحظية", text: "راقب الحجم والوصول والتفاعل والحصة الصوتية عبر لوحات واضحة." },
  { icon: BellRing, title: "تنبيهات", text: "اكتشف الارتفاعات غير الطبيعية والأزمات المحتملة قبل أن تتفاقم." },
  { icon: ShieldCheck, title: "مساحات عمل للعملاء", text: "حسابات ومشاريع وصلاحيات منفصلة لكل عميل أو فريق." }
];

export default function HomePage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(173,74,162,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(51,0,51,0.12),transparent_25%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-metrix-200 bg-metrix-50 px-4 py-2 text-sm font-bold text-metrix-800">
              <Sparkles size={16} />
              Social Intelligence powered by AI
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[1.15] tracking-tight text-zinc-950 md:text-6xl">
              افهم ما يقوله الناس عن
              <span className="text-metrix-900"> علامتك.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
              metriX منصة للرصد والتحليل تساعد المؤسسات على متابعة الحديث الرقمي، قياس التفاعل،
              فهم المشاعر، واكتشاف أهم الاتجاهات في الوقت المناسب.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/signup" className="inline-flex items-center gap-2 rounded-full bg-metrix-900 px-6 py-3.5 font-bold text-white hover:bg-metrix-800">
                ابدأ مجانًا
                <ArrowLeft size={18} />
              </a>
              <a href="#features" className="rounded-full border border-zinc-200 bg-white px-6 py-3.5 font-bold text-zinc-800 hover:bg-zinc-50">
                استكشف المزايا
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
              <span>✓ رصد متعدد المصادر</span>
              <span>✓ تحليل مشاعر</span>
              <span>✓ تقارير ذكية</span>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="features" className="border-y border-black/5 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-metrix-700">المنصة</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">كل ما تحتاجه لفهم حضورك الرقمي</h2>
            <p className="mt-4 text-lg leading-8 text-zinc-600">
              من الرصد الأولي وحتى التفسير بالذكاء الاصطناعي، صممنا تجربة واحدة تختصر عليك الأدوات المتفرقة.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-black/5 bg-zinc-50 p-7 transition hover:-translate-y-1 hover:bg-white hover:shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-metrix-900 text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-zinc-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-3">
            {[
              ["01", "أنشئ مشروعك", "أضف اسم العلامة والكلمات والمواضيع التي تريد مراقبتها."],
              ["02", "اجمع الإشارات", "اربط مصادر البيانات وابدأ بتجميع الإشارات والتفاعلات."],
              ["03", "حوّل البيانات لقرار", "استخدم المؤشرات والتحليل والذكاء الاصطناعي لاستخراج ما يهمك."]
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-3xl bg-metrix-950 p-8 text-white">
                <div className="text-sm font-black tracking-[0.2em] text-metrix-300">{n}</div>
                <h3 className="mt-6 text-2xl font-black">{t}</h3>
                <p className="mt-3 leading-7 text-white/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="insights" className="bg-metrix-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-metrix-300">metriX AI</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            لا تكتفِ بمشاهدة الأرقام. افهم لماذا تغيّرت.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">
            اجعل الذكاء الاصطناعي يلخص لك أهم التغيرات والمواضيع والمخاطر والفرص بدل قراءة آلاف الإشارات يدويًا.
          </p>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-[2rem] border border-metrix-100 bg-metrix-50 p-10 text-center md:p-14">
            <h2 className="text-4xl font-black">ابدأ النسخة الأولى من metriX</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-zinc-600">
              هذه الصفحة هي الأساس. في الخطوات التالية سنضيف تسجيل الدخول، إنشاء المشاريع، قاعدة البيانات، ثم لوحة التحليلات الحقيقية.
            </p>
            <a href="/signup" className="mt-7 inline-flex rounded-full bg-metrix-900 px-7 py-3.5 font-bold text-white hover:bg-metrix-800">
              ابدأ الآن
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <span className="font-black text-metrix-900">metriX</span>
          <span>© 2026 metriX. Social Intelligence Platform.</span>
        </div>
      </footer>
    </main>
  );
}
