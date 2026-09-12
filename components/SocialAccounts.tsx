"use client";

import { useEffect, useState } from "react";
import MetaConnect from "@/components/MetaConnect";

type Platform = "x" | "youtube" | "instagram" | "facebook" | "tiktok" | "threads";

const PLATFORMS: { id: Platform; label: string; placeholder: string }[] = [
  { id: "x", label: "X", placeholder: "@username" },
  { id: "youtube", label: "YouTube", placeholder: "@channel or Channel ID" },
  { id: "instagram", label: "Instagram", placeholder: "@username" },
  { id: "facebook", label: "Facebook", placeholder: "Page username, ID or URL" },
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
  const [oauth, setOauth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [accountsResponse, oauthResponse] = await Promise.all([
        fetch(`/api/social-accounts?projectId=${encodeURIComponent(projectId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/oauth/status?projectId=${encodeURIComponent(projectId)}`, {
          cache: "no-store",
        }),
      ]);

      const accountsData = await accountsResponse.json();
      if (!accountsResponse.ok || !accountsData.ok) {
        throw new Error(accountsData.error || "Could not load accounts");
      }

      const next = { ...blank };
      const st: Record<string, any> = {};

      for (const a of accountsData.accounts || []) {
        if (a.platform in next) next[a.platform as Platform] = a.handle || "";
        st[a.platform] = a;
      }

      setValues(next);
      setStatuses(st);

      if (oauthResponse.ok) {
        const oauthData = await oauthResponse.json();
        const connected: Record<string, any> = {};
        for (const c of oauthData.connections || []) connected[c.platform] = c;
        setOauth(connected);
      }
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

      setMessage(ar ? "تم حفظ حسابات المنصات." : "Social accounts saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save accounts");
    } finally {
      setSaving(false);
    }
  }

  function syncBadge(platform: Platform) {
    const s = statuses[platform];
    if (!s?.last_sync_status) return null;

    const ok = s.last_sync_status === "success";
    const auth = s.last_sync_status === "authorization_required";

    return (
      <div
        className={`mt-2 text-xs font-bold ${
          ok ? "text-emerald-700" : auth ? "text-amber-700" : "text-red-600"
        }`}
      >
        {ok
          ? ar
            ? "✓ تمت المزامنة"
            : "✓ Synced"
          : auth
          ? ar
            ? "يتطلب ربط/تفويض المنصة"
            : "Platform authorization required"
          : ar
          ? "تعذر آخر تحديث"
          : "Last sync failed"}
      </div>
    );
  }

  function oauthButton(platform: "tiktok" | "threads") {
    const connected = oauth[platform]?.status === "connected";
    return (
      <a
        href={`/api/oauth/${platform}/start?projectId=${encodeURIComponent(
          projectId
        )}&locale=${encodeURIComponent(locale)}`}
        className={`mt-3 inline-flex rounded-full px-4 py-2 text-xs font-black ${
          connected
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "bg-metrix-900 text-white"
        }`}
      >
        {connected
          ? ar
            ? `✓ إعادة ربط ${platform === "tiktok" ? "TikTok" : "Threads"}`
            : `✓ Reconnect ${platform === "tiktok" ? "TikTok" : "Threads"}`
          : ar
          ? `ربط ${platform === "tiktok" ? "TikTok" : "Threads"}`
          : `Connect ${platform === "tiktok" ? "TikTok" : "Threads"}`}
      </a>
    );
  }

  return (
    <>
      <section className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
          {ar ? "حسابات المنصات" : "SOCIAL ACCOUNTS"}
        </div>

        <h2 className="mt-2 text-2xl font-black">
          {ar ? "الحسابات المراد مراقبتها" : "Accounts to Monitor"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          {ar
            ? "أدخل حساب الجهة على كل منصة. TikTok وThreads يحتاجان ربط OAuth من صاحب الحساب."
            : "Enter the organization's account on each platform. TikTok and Threads require OAuth authorization from the account owner."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PLATFORMS.map((p) => (
            <label key={p.id} className="rounded-2xl border border-zinc-200 p-4">
              <span className="block text-sm font-black">{p.label}</span>

              <input
                value={values[p.id]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [p.id]: e.target.value }))
                }
                disabled={loading}
                placeholder={p.placeholder}
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
              />

              {syncBadge(p.id)}
              {p.id === "tiktok" ? oauthButton("tiktok") : null}
              {p.id === "threads" ? oauthButton("threads") : null}
            </label>
          ))}
        </div>

        <div className="mt-5">
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
        </div>

        {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-[2rem] border bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
          META
        </div>
        <h2 className="mt-2 text-xl font-black">
          {ar ? "ربط Facebook وInstagram" : "Connect Facebook & Instagram"}
        </h2>
        <p className="mt-2 mb-5 text-sm text-zinc-500">
          {ar
            ? "اربط Meta ثم عيّن الصفحة وحساب Instagram لهذا المشروع. سيستخدم Full Pipeline هذا التعيين مباشرة."
            : "Connect Meta, then assign the Facebook Page and Instagram account to this project. Full Pipeline will use that assignment directly."}
        </p>
        <MetaConnect locale={locale} />
      </section>
    </>
  );
}
