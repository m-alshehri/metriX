import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";

export default function Page({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const t = getDictionary(locale);
  const isLogin = false;
  const other = locale === "en" ? "ar" : "en";

  return <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
      <div className="flex items-center justify-between">
        <Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">metriX</Link>
        <Link href={`/${other}/signup`} className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold">{locale === "en" ? "العربية" : "English"}</Link>
      </div>
      <h1 className="mt-8 text-3xl font-black">{isLogin ? t.auth.loginTitle : t.auth.signupTitle}</h1>
      <p className="mt-2 text-zinc-500">{isLogin ? t.auth.loginDescription : t.auth.signupDescription}</p>
      <div className="mt-7 space-y-4">
        {!isLogin && <input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder={t.auth.name}/>}
        <input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder={t.auth.email}/>
        <input type="password" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder={t.auth.password}/>
        <button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">{isLogin ? t.auth.loginButton : t.auth.signupButton}</button>
      </div>
    </div>
  </main>;
}
