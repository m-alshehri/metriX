"use client";

import { useEffect, useState } from "react";

type Platform = "x" | "youtube" | "instagram" | "facebook" | "tiktok" | "threads";

const PLATFORMS: { id: Platform; label: string; placeholder: string }[] = [
  { id: "x", label: "X", placeholder: "@username" },
  { id: "youtube", label: "YouTube", placeholder: "@handle or Channel ID" },
  { id: "instagram", label: "Instagram", placeholder: "@username" },
  { id: "facebook", label: "Facebook", placeholder: "Page username / URL" },
  { id: "tiktok", label: "TikTok", placeholder: "@username" },
  { id: "threads", label: "Threads", placeholder: "@username" },
];

export default function SocialAccounts({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const ar = locale === "ar";
  const blank: Record<Platform, string> = {
    x: "",
    youtube: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    threads: "",
  };

  const [values, setValues] = useState<Record<Platform, string>>(blank);
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await fetch(`/api/social-accounts?projectId=${encodeURIComponent(projectId)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not load accounts");

      const next = { ...blank };
      const st: Record<string, any> = {};
      for (const a of j.accounts || []) {
        if (a.platform in next) next[a.platform as Platform] = a.handle || "";
        st[a.platform] = a;
      }
      setValues(next);
      setStatuses(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const accounts = PLATFORMS.map((p) => ({
        platform: p.id,
        handle: values[p.id].trim(),
        enabled: true,
      })).filter((a) => a.handle);

      const r = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, accounts }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not save accounts");

      setMessage(ar ? "تم حفظ الحسابات." : "Social accounts saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save accounts");
    } finally {
      setSaving(false);
    }
  }

  function badge(platform: Platform) {
    const s = statuses[platform];
    if (!s?.last_sync_status) return null;
    const ok = s.last_sync_status === "success";
    const auth = s.last_sync_status === "authorization_required";
    return (
      <div className={`mt-2 text-xs font-bold ${ok ? "text-emerald-700" : auth ? "text-amber-700" : "text-red-600"}`}>
        {ok
          ? ar ? "✓ تمت المزامنة" : "✓ Synced"
          : auth
          ? ar ? "يتطلب ربط Meta" : "Meta authorization required"
          : ar ? "تعذر آخر تحديث" : "Last sync failed"}
      </div>
    );
  }

  return (
    <section className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
        {ar ? "حسابات المنصات" : "SOCIAL ACCOUNTS"}
      </div>
      <h2 className="mt-2 text-2xl font-black">
        {ar ? "الحسابات المراد مراقبتها" : "Accounts to Monitor"}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
        {ar
          ? "أدخل اسم المستخدم أو معرّف الحساب العام. يتم جمع البيانات العامة عبر EnsembleData بدون OAuth لـ X وYouTube وInstagram وTikTok وThreads."
          : "Enter the public account username or ID. Public data is collected through EnsembleData without customer OAuth for X, YouTube, Instagram, TikTok and Threads."}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((p) => (
          <label key={p.id} className="rounded-2xl border border-zinc-200 p-4">
            <span className="block text-sm font-black">{p.label}</span>
            <input
              value={values[p.id]}
              onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              disabled={loading}
              placeholder={p.placeholder}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
            />
            {badge(p.id)}
            {p.id === "facebook" ? (
              <div className="mt-2 text-xs leading-5 text-zinc-500">
                {ar
                  ? "ملاحظة: EnsembleData لا يدرج Facebook ضمن المنصات المدعومة حاليًا؛ سيستمر Facebook عبر تكامل Meta الموجود."
                  : "Note: EnsembleData does not currently list Facebook as supported; Facebook continues through the existing Meta integration."}
              </div>
            ) : null}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={loading || saving}
        className="mt-5 rounded-full bg-metrix-900 px-6 py-3 font-black text-white disabled:opacity-50"
      >
        {saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ الحسابات" : "Save Accounts")}
      </button>

      {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
    </section>
  );
}
