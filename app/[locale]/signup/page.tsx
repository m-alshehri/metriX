import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { signUp } from "../auth/actions";

export default function SignupPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams?: { error?: string };
}) {
  if (!isLocale(params.locale)) notFound();

  const locale = params.locale;
  const t = getDictionary(locale);
  const other = locale === "en" ? "ar" : "en";

  const error = searchParams?.error ? t.auth.genericError : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <div className="flex items-center justify-between">
          <Link href={`/${locale}`} className="text-2xl font-black text-metrix-900">
            metriX
          </Link>
          <Link
            href={`/${other}/signup`}
            className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold"
          >
            {locale === "en" ? "العربية" : "English"}
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-black">{t.auth.signupTitle}</h1>
        <p className="mt-2 text-zinc-500">{t.auth.signupDescription}</p>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form action={signUp} className="mt-7 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input
            name="name"
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500"
            placeholder={t.auth.name}
          />
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
            {t.auth.signupButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {t.auth.haveAccount}{" "}
          <Link href={`/${locale}/login`} className="font-bold text-metrix-900">
            {t.auth.loginLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
