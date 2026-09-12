"use client";

import { useEffect, useState } from "react";

type Platform =
  | "x"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "threads"
  | "facebook"
  | "linkedin"
  | "google_maps"
  | "reddit"
  | "snapchat";

const PLATFORMS: {
  id: Platform;
  label: string;
  placeholder: string;
  provider: string;
  note?: string;
}[] = [
  { id: "x", label: "X", placeholder: "@username", provider: "EnsembleData" },
  { id: "youtube", label: "YouTube", placeholder: "@handle or Channel ID", provider: "EnsembleData" },
  { id: "instagram", label: "Instagram", placeholder: "@username", provider: "EnsembleData" },
  { id: "tiktok", label: "TikTok", placeholder: "@username", provider: "EnsembleData" },
  { id: "threads", label: "Threads", placeholder: "@username", provider: "EnsembleData" },
  { id: "facebook", label: "Facebook", placeholder: "Page username or public URL", provider: "Bright Data" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/...", provider: "Bright Data", note: "Company or public profile URL" },
  { id: "google_maps", label: "Google Maps Reviews", placeholder: "Full Google Maps place URL", provider: "Bright Data" },
  { id: "reddit", label: "Reddit", placeholder: "r/community or https://reddit.com/user/username", provider: "EnsembleData", note: "Supports subreddit monitoring and public user profiles" },
  { id: "snapchat", label: "Snapchat", placeholder: "@username", provider: "EnsembleData", note: "Public profile/snaps where available" },
];

export default function SocialAccounts({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const ar = locale === "ar";

  const emptyValues = () =>
    Object.fromEntries(
      PLATFORMS.map((p) => [p.id, ""])
    ) as Record<Platform, string>;

  const [values, setValues] =
    useState<Record<Platform, string>>(emptyValues());

  const [statuses, setStatuses] =
    useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await fetch(
        `/api/social-accounts?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );

      const j = await r.json();

      if (!r.ok || !j.ok) {
        throw new Error(j.error || "Could not load accounts");
      }

      const next = emptyValues();
      const st: Record<string, any> = {};

      for (const a of j.accounts || []) {
        if (a.platform in next) {
          next[a.platform as Platform] = a.handle || "";
        }
        st[a.platform] = a;
      }

      setValues(next);
      setStatuses(st);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load accounts"
      );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          accounts,
        }),
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        throw new Error(j.error || "Could not save accounts");
      }

      setMessage(
        ar
          ? "تم حفظ جميع المصادر."
          : "Monitoring sources saved."
      );

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save accounts"
      );
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(platform: Platform) {
    const s = statuses[platform];

    if (!s?.last_sync_status) return null;

    const ok = s.last_sync_status === "success";

    return (
      <div
        className={`mt-2 text-xs font-bold ${
          ok ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {ok
          ? ar
            ? "✓ تمت المزامنة"
            : "✓ Synced"
          : ar
            ? "تعذر آخر تحديث"
            : "Last sync failed"}

        {!ok && s.last_sync_error ? (
          <div className="mt-1 font-normal text-zinc-500">
            {String(s.last_sync_error).slice(0, 240)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
        {ar ? "مصادر الرصد" : "MONITORING SOURCES"}
      </div>

      <h2 className="mt-2 text-2xl font-black">
        {ar
          ? "المنصات المراد مراقبتها"
          : "Platforms to Monitor"}
      </h2>

      <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
        {ar
          ? "يستخدم metriX مصادر بيانات عامة متعددة ويحوّل جميع النتائج إلى طبقة تحليل موحدة."
          : "metriX uses multiple public-data providers and normalizes all results into one intelligence pipeline."}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((p) => (
          <label
            key={p.id}
            className="rounded-2xl border border-zinc-200 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="block text-sm font-black">
                {p.label}
              </span>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-600">
                {p.provider}
              </span>
            </div>

            <input
              value={values[p.id]}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [p.id]: e.target.value,
                }))
              }
              disabled={loading}
              placeholder={p.placeholder}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
            />

            {p.note ? (
              <div className="mt-2 text-xs text-zinc-500">
                {p.note}
              </div>
            ) : null}

            {statusBadge(p.id)}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={loading || saving}
        className="mt-5 rounded-full bg-metrix-900 px-6 py-3 font-black text-white disabled:opacity-50"
      >
        {saving
          ? ar
            ? "جارٍ الحفظ..."
            : "Saving..."
          : ar
            ? "حفظ المصادر"
            : "Save Sources"}
      </button>

      {message ? (
        <p className="mt-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-bold text-red-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
