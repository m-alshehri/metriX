"use client";

import { useEffect, useState } from "react";

type Platform =
  | "x"
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "threads";

type Account = {
  platform: Platform;
  handle: string;
  enabled?: boolean;
};

const platforms: {
  id: Platform;
  label: string;
  placeholder: string;
}[] = [
  { id: "x", label: "X", placeholder: "@username" },
  { id: "youtube", label: "YouTube", placeholder: "@channel or Channel ID" },
  { id: "instagram", label: "Instagram", placeholder: "@username" },
  { id: "facebook", label: "Facebook", placeholder: "Page username or URL" },
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

  const [values, setValues] = useState<Record<Platform, string>>({
    x: "",
    youtube: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    threads: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `/api/social-accounts?projectId=${encodeURIComponent(projectId)}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Could not load social accounts");
        }

        const next = {
          x: "",
          youtube: "",
          instagram: "",
          facebook: "",
          tiktok: "",
          threads: "",
        } as Record<Platform, string>;

        for (const account of data.accounts || []) {
          if (account.platform in next) {
            next[account.platform as Platform] = account.handle || "";
          }
        }

        setValues(next);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load social accounts"
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const accounts: Account[] = platforms
        .map((platform) => ({
          platform: platform.id,
          handle: values[platform.id].trim(),
          enabled: true,
        }))
        .filter((account) => account.handle.length > 0);

      const response = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, accounts }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not save social accounts");
      }

      setMessage(
        ar
          ? "تم حفظ حسابات المنصات لهذا المشروع."
          : "Social accounts saved for this project."
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save social accounts"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
          {ar ? "حسابات المنصات" : "SOCIAL ACCOUNTS"}
        </div>

        <h2 className="mt-2 text-2xl font-black">
          {ar ? "الحسابات المراد تحليلها" : "Accounts to Monitor"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          {ar
            ? "أدخل حساب الجهة على كل منصة. سيستخدم metriX هذه الحسابات لجمع وتحليل المحتوى بدل الاعتماد على الكلمات المفتاحية."
            : "Enter the organization's account on each platform. metriX will use these accounts for collection and analysis instead of keyword-based monitoring."}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => (
          <label
            key={platform.id}
            className="rounded-2xl border border-zinc-200 p-4"
          >
            <span className="block text-sm font-black text-zinc-900">
              {platform.label}
            </span>

            <input
              value={values[platform.id]}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  [platform.id]: e.target.value,
                }))
              }
              disabled={loading}
              placeholder={platform.placeholder}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-metrix-900 disabled:bg-zinc-50"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white disabled:opacity-50"
        >
          {saving
            ? ar
              ? "جارٍ الحفظ..."
              : "Saving..."
            : ar
            ? "حفظ الحسابات"
            : "Save Accounts"}
        </button>

        {loading && (
          <span className="text-sm text-zinc-400">
            {ar ? "جارٍ التحميل..." : "Loading..."}
          </span>
        )}
      </div>

      {message && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
