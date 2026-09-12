"use client";

import { FormEvent, useState } from "react";

export default function RequestDemoForm({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/request-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_rgba(51,0,51,0.10)] md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-zinc-700">
          {ar ? "الاسم" : "Name"}
          <input name="name" required className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#660066]" />
        </label>
        <label className="text-sm font-bold text-zinc-700">
          {ar ? "البريد الإلكتروني" : "Work email"}
          <input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#660066]" />
        </label>
        <label className="text-sm font-bold text-zinc-700">
          {ar ? "الجهة / الشركة" : "Company / organization"}
          <input name="company" required className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#660066]" />
        </label>
        <label className="text-sm font-bold text-zinc-700">
          {ar ? "رقم التواصل" : "Phone"}
          <input name="phone" className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#660066]" />
        </label>
      </div>

      <label className="mt-4 block text-sm font-bold text-zinc-700">
        {ar ? "ما الذي تريد رصده؟" : "What would you like to monitor?"}
        <textarea
          name="message"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#660066]"
          placeholder={ar ? "مثال: حسابات علامتنا التجارية والمنافسين..." : "e.g. our brand accounts, competitors, reputation and campaigns..."}
        />
      </label>

      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <button
        disabled={status === "sending"}
        className="mt-5 w-full rounded-full bg-[#330033] px-6 py-3.5 font-black text-white transition hover:bg-[#660066] disabled:opacity-50"
      >
        {status === "sending"
          ? (ar ? "جارٍ الإرسال..." : "Sending...")
          : (ar ? "إرسال طلب العرض" : "Request my demo")}
      </button>

      {status === "sent" && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {ar ? "تم إرسال طلبك بنجاح. سنتواصل معك قريباً." : "Your request was sent successfully. We’ll be in touch shortly."}
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {ar ? "تعذر إرسال الطلب حالياً. حاول مرة أخرى." : "We couldn’t send your request right now. Please try again."}
        </p>
      )}
    </form>
  );
}
