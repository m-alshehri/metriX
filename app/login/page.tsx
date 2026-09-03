import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <Link href="/" className="text-2xl font-black text-metrix-900">metriX</Link>
        <h1 className="mt-8 text-3xl font-black">تسجيل الدخول</h1>
        <p className="mt-2 text-zinc-500">واجهة أولية — سنربطها بـ Supabase في الخطوة التالية.</p>

        <div className="mt-7 space-y-4">
          <input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder="البريد الإلكتروني" />
          <input type="password" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder="كلمة المرور" />
          <button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">دخول</button>
        </div>
      </div>
    </main>
  );
}
