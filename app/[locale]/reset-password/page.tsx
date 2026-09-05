import Link from "next/link";
import {notFound} from "next/navigation";
import {isLocale} from "@/lib/i18n";
import {createClient} from "@/lib/supabase/server";
import {updatePassword} from "../auth/actions";

export default async function ResetPasswordPage({params,searchParams}:{params:{locale:string};searchParams?:{error?:string}}){
  if(!isLocale(params.locale))notFound();
  const locale=params.locale,ar=locale==="ar",supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return <main dir={ar?"rtl":"ltr"} className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
      <Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">metriX</Link>
      <h1 className="mt-8 text-3xl font-black">{ar?"تعيين كلمة مرور جديدة":"Choose a new password"}</h1>
      {!user?<><div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{ar?"رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.":"This recovery link is invalid or expired. Request a new one."}</div><Link href={`/${locale}/forgot-password`} className="mt-5 block text-center font-bold text-metrix-900 hover:underline">{ar?"طلب رابط جديد":"Request a new link"}</Link></>:<>
        <p className="mt-3 text-sm text-zinc-600">{ar?"اكتب كلمة المرور الجديدة مرتين للتأكيد.":"Enter your new password twice to confirm it."}</p>
        {searchParams?.error&&<div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{searchParams.error==="mismatch"?(ar?"كلمتا المرور غير متطابقتين.":"Passwords do not match."):searchParams.error==="short-password"?(ar?"يجب أن تكون كلمة المرور 6 أحرف على الأقل.":"Password must be at least 6 characters."):(ar?"تعذر تحديث كلمة المرور. حاول مرة أخرى.":"We couldn't update your password. Please try again.")}</div>}
        <form action={updatePassword} className="mt-7 space-y-4"><input type="hidden" name="locale" value={locale}/><input name="password" type="password" minLength={6} required className="w-full rounded-2xl border px-4 py-3" placeholder={ar?"كلمة المرور الجديدة":"New password"}/><input name="confirmPassword" type="password" minLength={6} required className="w-full rounded-2xl border px-4 py-3" placeholder={ar?"تأكيد كلمة المرور":"Confirm new password"}/><button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">{ar?"حفظ كلمة المرور":"Save new password"}</button></form>
      </>}
    </div>
  </main>
}
