import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { signIn, signInWithGoogle } from "../auth/actions";

export default async function LoginPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale,
    t = getDictionary(locale),
    other = locale === "en" ? "ar" : "en",
    ar = locale === "ar";
  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      className="flex min-h-screen items-center justify-center bg-zinc-50 px-6"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <div className="flex justify-between">
          <Link href={`/${locale}`} className="text-3xl text-metrix-900">
            metriX
          </Link>
          <Link
            href={`/${other}/login`}
            className="rounded-full border px-3 py-2 text-base"
          >
            {locale === "en" ? "العربية" : "English"}
          </Link>
        </div>
        <h1 className="mt-8 text-4xl">{t.auth.loginTitle}</h1>
        {searchParams?.message === "check-email" && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-base text-emerald-800">
            {t.auth.checkEmail}
          </div>
        )}
        {searchParams?.message === "password-updated" && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-base text-emerald-800">
            {ar
              ? "تم تحديث كلمة المرور بنجاح. سجّل الدخول بكلمة المرور الجديدة."
              : "Your password has been updated. Sign in with your new password."}
          </div>
        )}
        {searchParams?.error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-base text-red-800">
            {ar
              ? "تعذر تسجيل الدخول. تحقق من بيانات الدخول أو إعدادات Google."
              : "Unable to sign in. Check your credentials or Google sign-in configuration."}
          </div>
        )}

        <form action={signInWithGoogle} className="mt-7">
          <input type="hidden" name="locale" value={locale} />
          <button
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-[#330033] transition hover:bg-zinc-50"
            type="submit"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.55l3.35-2.62Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
              />
            </svg>
            {ar ? "تسجيل الدخول باستخدام Google" : "Continue with Google"}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          <span>{ar ? "أو" : "or"}</span>
          <span className="h-px flex-1 bg-zinc-200" />
        </div>
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border px-4 py-3"
            placeholder={t.auth.email}
          />
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-2xl border px-4 py-3"
            placeholder={t.auth.password}
          />
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-sm text-metrix-900 hover:underline"
            >
              {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
            </Link>
          </div>
          <button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 text-white">
            {t.auth.loginButton}
          </button>
        </form>
        <Link href={`/${locale}/signup`} className="mt-5 block text-center">
          {ar ? "إنشاء حساب" : "Create account"}
        </Link>
      </div>
    </main>
  );
}
