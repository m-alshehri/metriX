import Link from "next/link";

export default function LegalPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href={`/${params.locale}`} className="text-sm font-bold text-[#330033]">{ar ? "metriX →" : "← metriX"}</Link>
        <article className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
          <h1 className="text-3xl font-black">{ar ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
          <p className="mt-2 text-sm text-zinc-500">{ar ? "آخر تحديث: 12 سبتمبر 2026" : "Last updated: September 12, 2026"}</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-700">
            {ar ? <><section><h2 className="text-lg font-black text-zinc-950">1. مقدمة</h2><p>metriX منصة لمراقبة وتحليل حسابات التواصل الاجتماعي للجهات. توضح هذه السياسة كيفية معالجة البيانات عند استخدام المنصة أو ربط حسابات التواصل الاجتماعي المدعومة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">2. البيانات التي نعالجها</h2><p>قد نعالج معلومات الحساب والمشروع، ومعرّفات حسابات التواصل الاجتماعي، والمحتوى العام أو المصرح به عبر واجهات البرمجة، ومقاييس التفاعل، وبيانات التفويض اللازمة لتقديم الخدمة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">3. ربط المنصات</h2><p>يتم ربط حسابات الأطراف الثالثة من خلال آليات التفويض الخاصة بمقدم الخدمة مثل OAuth. تستخدم metriX الصلاحيات التي يوافق عليها المستخدم فقط.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">4. استخدام البيانات</h2><p>تستخدم البيانات لتقديم التحليلات وتحليل المشاعر والرؤى والتقارير والتنبيهات والمزامنة والأتمتة وتحسين أمن وموثوقية الخدمة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">5. الرموز وبيانات الاعتماد</h2><p>تعامل رموز الوصول وبيانات التفويض كمعلومات حساسة ولا يتم عرضها للمستخدمين الآخرين.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">6. مشاركة البيانات</h2><p>لا نبيع البيانات الشخصية. قد يعالج مزودو البنية التحتية والتقنية الضروريون البيانات بالقدر اللازم لتشغيل الخدمة والالتزام بالمتطلبات المعمول بها.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">7. الاحتفاظ والحذف</h2><p>قد نحتفظ بالبيانات طالما كانت مطلوبة لتقديم الخدمة أو لأغراض مشروعة ومسموح بها. ويمكن للمستخدم إلغاء ربط الحسابات المدعومة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">8. الأمان</h2><p>نطبق تدابير تقنية وتنظيمية مناسبة لحماية البيانات، مع الإقرار بأنه لا توجد وسيلة تخزين أو نقل إلكتروني تضمن حماية مطلقة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">9. خدمات الأطراف الثالثة</h2><p>يخضع استخدام المنصات المرتبطة أيضًا لشروط وسياسات الخصوصية الخاصة بكل مقدم خدمة، وقد تتغير البيانات والصلاحيات المتاحة وفق سياسات وواجهات البرمجة.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">10. التواصل</h2><p>للاستفسارات المتعلقة بالخصوصية، تواصل معنا عبر قنوات الاتصال الرسمية المنشورة في موقع metriX.</p></section></> : <><section><h2 className="text-lg font-black text-zinc-950">1. Introduction</h2><p>metriX is a social media monitoring and analytics platform for organizations. This policy explains how data is processed when you use metriX or connect supported social media accounts.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">2. Data We Process</h2><p>We may process account and project information, social media identifiers, public or API-authorized content, engagement metrics, and authorization data required to provide the service.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">3. Connected Platforms</h2><p>Third-party accounts are connected through provider authorization such as OAuth. metriX uses only permissions approved by the user for available monitoring and analytics functions.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">4. Use of Data</h2><p>Data is used to provide analytics, sentiment analysis, insights, reports, alerts, synchronization, automation, security, and service reliability.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">5. Tokens and Credentials</h2><p>Access tokens and authorization credentials are treated as sensitive information and are not displayed to other users.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">6. Data Sharing</h2><p>We do not sell personal data. Necessary infrastructure and technology providers may process data only as required to operate the service and meet applicable requirements.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">7. Retention and Deletion</h2><p>Data may be retained while needed to provide the service or for legitimate permitted purposes. Users can disconnect supported accounts, and deletion of a project or account may remove associated data subject to applicable requirements.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">8. Security</h2><p>We apply appropriate technical and organizational measures to protect data, although no electronic storage or transmission method can guarantee absolute security.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">9. Third-Party Services</h2><p>Use of connected social platforms is also governed by each provider's terms and privacy policies. Available data and permissions may change according to provider policies and APIs.</p></section>
<section><h2 className="text-lg font-black text-zinc-950">10. Contact</h2><p>For privacy questions, please contact us through the official contact channels published on the metriX website.</p></section></>}
          </div>
        </article>
      </div>
    </main>
  );
}
