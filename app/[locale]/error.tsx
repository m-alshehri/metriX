"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl">تعذر تحميل الصفحة / Could not load this page</h1>
      <p className="mt-4">
        حاول مرة أخرى. إذا استمرت المشكلة، تواصل مع الدعم. / Please retry or
        contact support.
      </p>
      <button className="mt-5 rounded border px-5 py-2" onClick={reset}>
        إعادة المحاولة / Retry
      </button>
    </main>
  );
}
