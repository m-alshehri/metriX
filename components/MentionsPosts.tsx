"use client";
import { useMemo, useState } from "react";
import { safePublicUrl } from "@/lib/security";
function initials(m: any) {
  return String(m.author_name || m.author_username || "?")
    .trim()
    .slice(0, 2)
    .toUpperCase();
}
export default function MentionsPosts({
  mentions,
  locale,
}: {
  mentions: any[];
  locale: string;
}) {
  const ar = locale === "ar";
  const [platform, setPlatform] = useState("all");
  const platforms = useMemo(
    () =>
      Array.from(new Set(mentions.map((x) => String(x.platform || "Other")))),
    [mentions],
  );
  const rows = (
    platform === "all"
      ? mentions
      : mentions.filter((x) => String(x.platform) === platform)
  ).slice(0, 100);
  return (
    <section className="rounded-[1.6rem] border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl">
          {ar ? "الإشارات والمنشورات" : "Mentions & posts"}{" "}
          <span className="text-sm text-zinc-400">({mentions.length})</span>
        </h3>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-full border bg-white px-3 py-2 text-sm"
        >
          <option value="all">{ar ? "كل المنصات" : "All platforms"}</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((m) => (
          <article
            key={m.id}
            className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[48px_1fr_auto] md:items-start"
          >
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-sm text-[#330033] shadow-sm">
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(m)
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-zinc-400">
                {m.author_name || m.author_username || "Unknown"} ·{" "}
                {m.platform || ""}
              </div>
              <p className="mt-1 line-clamp-3 text-base leading-6 text-zinc-700">
                {m.content || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-400">
                <span>♥ {m.likes || 0}</span>
                <span>↻ {m.shares || 0}</span>
                <span>💬 {m.replies || 0}</span>
                <span>◉ {Number(m.views || 0).toLocaleString()}</span>
              </div>
            </div>
            {m.post_url && (
              <a
                href={safePublicUrl(m.post_url) || undefined}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#330033]"
              >
                {ar ? "فتح" : "Open"}
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
