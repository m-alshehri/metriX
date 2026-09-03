import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <Link href="/" className="text-2xl font-black text-metrix-900">metriX</Link>
        <h1 className="mt-8 text-3xl font-black">إنشاء حساب</h1>
        <p className="mt-2 text-zinc-500">واجهة مبدئية وسيتم تفعيل إنشاء الحساب الحقيقي عند ربط Supabase.</p>

        <div className="mt-7 space-y-4">
          <input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder="الاسم" />
          <input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder="البريد الإلكتروني" />
          <input type="password" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-metrix-500" placeholder="كلمة المرور" />
          <button className="w-full rounded-2xl bg-metrix-900 px-4 py-3 font-bold text-white">إنشاء الحساب</button>
        </div>
      </div>
    </main>
  );
}
