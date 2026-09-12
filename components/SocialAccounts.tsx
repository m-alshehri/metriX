"use client";

import { useEffect, useState } from "react";
import PlatformIcon from "@/components/PlatformIcon";

type Platform =
  | "x" | "youtube" | "instagram" | "tiktok" | "threads"
  | "facebook" | "linkedin" | "google_maps" | "reddit" | "snapchat";

const PLATFORMS: {
  id: Platform;
  label: string;
  placeholder: string;
  provider: string;
}[] = [
  { id: "x", label: "X", placeholder: "@username", provider: "EnsembleData" },
  { id: "youtube", label: "YouTube", placeholder: "@handle or Channel ID", provider: "EnsembleData" },
  { id: "instagram", label: "Instagram", placeholder: "@username", provider: "EnsembleData" },
  { id: "tiktok", label: "TikTok", placeholder: "@username", provider: "EnsembleData" },
  { id: "threads", label: "Threads", placeholder: "@username", provider: "EnsembleData" },
  { id: "facebook", label: "Facebook", placeholder: "Page username or public URL", provider: "Bright Data" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/...", provider: "Bright Data" },
  { id: "google_maps", label: "Google Maps", placeholder: "Full Google Maps place URL", provider: "Bright Data" },
  { id: "reddit", label: "Reddit", placeholder: "r/community or reddit user URL", provider: "EnsembleData" },
  { id: "snapchat", label: "Snapchat", placeholder: "@username", provider: "EnsembleData" },
];

export default function SocialAccounts({ projectId, locale }: { projectId: string; locale: string }) {
  const ar = locale === "ar";
  const emptyValues = () => Object.fromEntries(PLATFORMS.map((p) => [p.id, ""])) as Record<Platform, string>;

  const [values, setValues] = useState<Record<Platform, string>>(emptyValues());
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await fetch(`/api/social-accounts?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not load accounts");

      const next = emptyValues();
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

  useEffect(() => { void load(); }, [projectId]);

  async function save() {
    setSaving(true); setMessage(""); setError("");
    try {
      const accounts = PLATFORMS
        .map((p) => ({ platform: p.id, handle: values[p.id].trim(), enabled: true }))
        .filter((a) => a.handle);

      const r = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, accounts }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not save accounts");
      setMessage(ar ? "تم حفظ المصادر." : "Sources saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save accounts");
    } finally {
      setSaving(false);
    }
  }

  function status(platform: Platform) {
    const raw = String(statuses[platform]?.last_sync_status || "");
    if (!raw) return <span className="h-2 w-2 rounded-full bg-zinc-300" title="Not synced" />;
    if (raw.startsWith("success")) return <span className="h-2 w-2 rounded-full bg-emerald-500" title="Synced" />;
    if (raw === "no_data") return <span className="h-2 w-2 rounded-full bg-amber-400" title="No data returned" />;
    return <span className="h-2 w-2 rounded-full bg-red-500" title={String(statuses[platform]?.last_sync_error || "Sync failed")} />;
  }

  return (
    <section className="rounded-[1.6rem] border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[.18em] text-zinc-400">{ar ? "مصادر الرصد" : "MONITORING SOURCES"}</div>
          <h2 className="mt-1 text-lg font-black">{ar ? "الحسابات والمنصات" : "Accounts & platforms"}</h2>
        </div>
        <button onClick={save} disabled={loading || saving} className="rounded-full bg-[#330033] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
          {saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ المصادر" : "Save sources")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PLATFORMS.map((p) => (
          <label key={p.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 transition focus-within:border-[#330033] focus-within:bg-white">
            <div className="flex items-center justify-between">
              <PlatformIcon platform={p.id} size={22} />
              <div className="flex items-center gap-2">
                {status(p.id)}
                <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">{p.provider === "Bright Data" ? "BD" : "ED"}</span>
              </div>
            </div>
            <span className="sr-only">{p.label}</span>
            <input
              value={values[p.id]}
              onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              disabled={loading}
              placeholder={p.placeholder}
              className="mt-3 w-full border-0 bg-transparent p-0 text-xs outline-none placeholder:text-zinc-400"
            />
          </label>
        ))}
      </div>

      {message && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">{message}</div>}
      {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">{error}</div>}
    </section>
  );
}
