import Link from "next/link";
import {notFound} from "next/navigation";
import {isLocale} from "@/lib/i18n";
import {requestPasswordReset} from "../auth/actions";

export default function ForgotPasswordPage({params,searchParams}:{params:{locale:string};searchParams?:{message?:string;error?:string}}){
  if(!isLocale(params.locale))notFound();
  const locale=params.locale,ar=locale==="ar",other=ar?"en":"ar";
  return <main dir={ar?"rtl":"ltr"} className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
      <div className="flex justify-between"><Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">metriX</Link><Link href={`/${other}/forgot-password`} className="rounded-full border px-3 py-2 text-sm font-bold">{ar?"English":"العربية"}</Link></div>
      <h1 className="mt-8 text-3xl font-black">{ar?"استعادة كلمة المرور":"Reset your password"}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{ar?"أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.":"Enter your email and we’ll send you a secure link to choose a new password."}</p>
      {searchParams?.message==="check-email"&&<div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{ar?"تم إرسال رابط الاستعادة. افتح أحدث رسالة وصلتك إلى بريدك الإلكتروني.":"Recovery link sent. Open the newest email in your inbox."}</div>}
      {searchParams?.error&&<div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{searchParams.error==="expired"?(ar?"انتهت جلسة الاستعادة. اطلب رابطًا جديدًا.":"Your recovery session expired. Request a new link."):(ar?"تعذر إرسال رابط الاستعادة. حاول مرة أخرى.":"We couldn't send the recovery link. Please try again.")}</div>}
      <form action={requestPasswordReset} className="mt-7 space-y-4"><input type="hidden" name="locale" value={locale}/><input name="email" type="email" required className="w-full rounded-2xl border px-4 py-3" placeholder={ar?"البريد الإلكتروني":"Email address"}/><button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">{ar?"إرسال رابط الاستعادة":"Send recovery link"}</button></form>
      <Link href={`/${locale}/login`} className="mt-5 block text-center text-sm font-bold text-metrix-900 hover:underline">{ar?"العودة لتسجيل الدخول":"Back to sign in"}</Link>
    </div>
  </main>
}
