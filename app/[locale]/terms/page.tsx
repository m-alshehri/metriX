import Link from "next/link";

export default function LegalPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href={`/${params.locale}`} className="text-sm font-bold text-[#330033]">{ar ? "metriX →" : "← metriX"}</Link>
        <article className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
          <h1 className="text-3xl font-black">{ar ? "شروط الاستخدام" : "Terms of Service"}</h1>
          <p className="mt-2 text-sm text-zinc-500">{ar ? "آخر تحديث: 12 سبتمبر 2026" : "Last updated: September 12, 2026"}</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-700">
            {ar ? <><section><h2 className="text-lg font-black text-zinc-950">1. قبول الشروط</h2><p>باستخدام metriX فإنك توافق على هذه الشروط. وإذا كنت تستخدم الخدمة نيابة عن جهة، فإنك تقر بأن لديك الصلاحية اللازمة لربط حساباتها وتفويض metriX للوصول إليها.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">2. وصف الخدمة</h2><p>توفر metriX أدوات لمراقبة وتحليل حسابات التواصل الاجتماعي، بما في ذلك جمع البيانات المتاحة وتحليلات التفاعل والمشاعر والرؤى والتقارير والتنبيهات، وفق إمكانات المنصات وواجهات البرمجة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">3. الحسابات والتفويض</h2><p>أنت مسؤول عن صحة معلومات الحساب وأمان بيانات الدخول، ولا يجوز ربط حساب أو أصل رقمي ما لم تكن مخولًا بذلك.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">4. الاستخدام المقبول</h2><p>يجب استخدام الخدمة بصورة مشروعة وبما يتوافق مع شروط المنصات المرتبطة. ويحظر الوصول غير المصرح به أو تجاوز قيود واجهات البرمجة أو إساءة استخدام البيانات.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">5. خدمات الأطراف الثالثة</h2><p>تعتمد بعض الميزات على خدمات خارجية، وقد تتغير أو تتوقف بسبب تغييرات واجهات البرمجة أو الصلاحيات أو سياسات مقدمي الخدمات.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">6. التحليلات والذكاء الاصطناعي</h2><p>قد تستخدم metriX تقنيات آلية وذكاء اصطناعي لتحليل المشاعر وتوليد الرؤى. هذه النتائج تقديرية وقد لا تكون دقيقة في جميع الحالات.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">7. الملكية الفكرية</h2><p>تظل حقوق محتوى المستخدمين والأطراف الثالثة لأصحابها، ولا تنقل هذه الشروط ملكية برمجيات metriX أو علامتها أو مكوناتها المحمية للمستخدم.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">8. توفر الخدمة</h2><p>نسعى لتقديم خدمة موثوقة، إلا أن الصيانة أو الأعطال أو قيود الأطراف الثالثة قد تؤثر على التوفر، وقد يتم تعديل الميزات أو تحديثها.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">9. إنهاء الاستخدام</h2><p>يمكن للمستخدم التوقف عن استخدام الخدمة وإلغاء ربط الحسابات، كما قد يتم تقييد الوصول عند إساءة الاستخدام أو مخالفة الشروط أو المتطلبات القانونية أو الأمنية.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">10. التواصل</h2><p>للاستفسارات المتعلقة بهذه الشروط، تواصل معنا عبر قنوات الاتصال الرسمية المنشورة في موقع metriX.</p></section></> : <><section><h2 className="text-lg font-black text-zinc-950">1. Acceptance of Terms</h2><p>By using metriX, you agree to these Terms. If you use the service for an organization, you represent that you have authority to connect its accounts and authorize metriX access.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">2. Service Description</h2><p>metriX provides social media monitoring and analytics, including available data collection, engagement and sentiment analytics, insights, reports, and alerts, subject to connected platform and API capabilities.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">3. Accounts and Authorization</h2><p>You are responsible for accurate account information and credential security. You must not connect an account or digital asset unless you are authorized to do so.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">4. Acceptable Use</h2><p>You must use the service lawfully and comply with connected-platform terms. Unauthorized access, attempts to bypass API restrictions, and misuse of data are prohibited.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">5. Third-Party Services</h2><p>Some features depend on external services. Features may change or become unavailable because of API, permission, or provider-policy changes.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">6. Analytics and AI</h2><p>metriX may use automated and AI technologies for sentiment classification and insight generation. Outputs are analytical estimates and may not be accurate in every case.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">7. Intellectual Property</h2><p>Rights in user and third-party content remain with their respective owners. These Terms do not transfer ownership of metriX software, branding, or protected components.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">8. Service Availability</h2><p>We aim to provide a reliable service, but maintenance, outages, and third-party limitations may occur. Features may be modified or updated.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">9. Termination</h2><p>Users may stop using the service and disconnect supported accounts. Access may be restricted for misuse, Terms violations, or legal or security requirements.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">10. Contact</h2><p>For questions about these Terms, please contact us through the official contact channels published on the metriX website.</p></section></>}
          </div>
        </article>
      </div>
    </main>
  );
}
