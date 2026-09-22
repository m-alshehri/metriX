"use client";
import { useMemo, useState } from "react";
import PlatformIcon from "@/components/PlatformIcon";
export default function FilteredContentList({
  items,
  locale,
  kind = "growth",
}: {
  items: any[];
  locale: string;
  kind?: "growth" | "engagement";
}) {
  const ar = locale === "ar";
  const [platform, setPlatform] = useState("all");
  const platforms = useMemo(
    () => Array.from(new Set(items.map((x) => String(x.platform || "Other")))),
    [items],
  );
  const rows =
    platform === "all"
      ? items
      : items.filter((x) => String(x.platform) === platform);
  return (
    <div>
      <div className="mb-3 flex justify-end">
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
      <div className="divide-y">
        {rows.map((m: any) => (
          <div
            key={m.id}
            className="grid gap-3 py-4 md:grid-cols-[36px_1fr_auto] md:items-center"
          >
            <PlatformIcon
              platform={String(m.platform || "")
                .toLowerCase()
                .replace(/\s+/g, "_")}
              size={20}
            />
            <div>
              <p className="line-clamp-2 text-base text-zinc-700">
                {m.content}
              </p>
              <div className="mt-1 text-sm text-zinc-400">
                ♥ {Number(m.likes || 0).toLocaleString()} · ↻{" "}
                {Number(m.shares || 0).toLocaleString()} · 💬{" "}
                {Number(m.replies || 0).toLocaleString()} · ◉{" "}
                {Number(m.views || 0).toLocaleString()}
              </div>
            </div>
            <div className="text-right text-base text-[#330033]">
              {kind === "growth"
                ? Number(m.virality_score || 0).toFixed(1)
                : (
                    Number(m.likes || 0) +
                    Number(m.shares || 0) +
                    Number(m.replies || 0)
                  ).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
