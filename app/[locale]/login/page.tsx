import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { signIn } from "../auth/actions";

export default function LoginPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams?: { message?: string; error?: string };
}) {
  if (!isLocale(params.locale)) notFound();

  const locale = params.locale;
  const t = getDictionary(locale);
  const other = locale === "en" ? "ar" : "en";

  const message =
    searchParams?.message === "check-email"
      ? t.auth.checkEmail
      : null;

  const error =
    searchParams?.error === "invalid-login"
      ? t.auth.invalidLogin
      : searchParams?.error
      ? t.auth.genericError
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <div className="flex items-center justify-between">
          <Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">
            metriX
          </Link>
          <Link
            href={`/${other}/login`}
            className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold"
          >
            {locale === "en" ? "العربية" : "English"}
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-black">{t.auth.loginTitle}</h1>
        <p className="mt-2 text-zinc-500">{t.auth.loginDescription}</p>

        {message && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form action={signIn} className="mt-7 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500"
            placeholder={t.auth.email}
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500"
            placeholder={t.auth.password}
          />
          <button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">
            {t.auth.loginButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {t.auth.noAccount}{" "}
          <Link href={`/${locale}/signup`} className="font-bold text-metrix-900">
            {t.auth.createAccount}
          </Link>
        </p>
      </div>
    </main>
  );
}
