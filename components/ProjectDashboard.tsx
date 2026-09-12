"use client";

import { useMemo, useState } from "react";
import PlatformIcon from "@/components/PlatformIcon";

type Mention = {
  id?: string;
  platform?: string | null;
  sentiment?: string | null;
  published_at?: string | null;
  likes?: number | null;
  shares?: number | null;
  replies?: number | null;
  views?: number | null;
  author_name?: string | null;
  author_username?: string | null;
  content?: string | null;
  post_url?: string | null;
};

const keyOf = (p?: string | null) =>
  String(p || "other").toLowerCase().replace(/\s+/g, "_");

function Donut({
  segments,
  center,
}: {
  segments: { label: string; value: number }[];
  center: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let offset = 0;
  const circumference = 2 * Math.PI * 43;

  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40">
      <circle cx="60" cy="60" r="43" fill="none" stroke="#f4f4f5" strokeWidth="15" />
      {segments.map((seg, i) => {
        const len = (seg.value / total) * circumference;
        const node = (
          <circle
            key={seg.label}
            cx="60"
            cy="60"
            r="43"
            fill="none"
            stroke={["#330033", "#6b456b", "#998099", "#c5b7c5", "#e2dce2"][i % 5]}
            strokeWidth="15"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          >
            <title>{seg.label}: {seg.value}</title>
          </circle>
        );
        offset += len;
        return node;
      })}
      <text x="60" y="57" textAnchor="middle" className="fill-zinc-950 text-[10px] font-black">{center}</text>
      <text x="60" y="72" textAnchor="middle" className="fill-zinc-400 text-[6px]">items</text>
    </svg>
  );
}

export default function ProjectDashboard({
  mentions,
  locale,
}: {
  mentions: Mention[];
  locale: string;
}) {
  const ar = locale === "ar";
  const [metric, setMetric] = useState<"items" | "engagement" | "views">("items");

  const data = useMemo(() => {
    const rows = mentions || [];
    const platform = new Map<string, { label: string; items: number; engagement: number; views: number }>();
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    const days = new Map<string, number>();
    const terms = new Map<string, number>();
    const stop = new Set(["the","and","for","that","with","this","from","your","you","our","https","post","على","في","من","إلى","الى","عن","هذا","هذه","مع"]);

    rows.forEach((m) => {
      const key = keyOf(m.platform);
      const x = platform.get(key) || { label: String(m.platform || "Other"), items: 0, engagement: 0, views: 0 };
      x.items += 1;
      x.engagement += Number(m.likes || 0) + Number(m.shares || 0) + Number(m.replies || 0);
      x.views += Number(m.views || 0);
      platform.set(key, x);

      if (m.sentiment === "positive") sentiment.positive++;
      if (m.sentiment === "neutral") sentiment.neutral++;
      if (m.sentiment === "negative") sentiment.negative++;

      if (m.published_at) {
        const day = m.published_at.slice(0, 10);
        days.set(day, (days.get(day) || 0) + 1);
      }

      for (const raw of String(m.content || "").toLowerCase().split(/[^\p{L}\p{N}_#@]+/u)) {
        const term = raw.trim();
        if (term.length >= 4 && !stop.has(term)) terms.set(term, (terms.get(term) || 0) + 1);
      }
    });

    const platformRows = Array.from(platform.entries()).sort((a, b) => b[1].items - a[1].items);
    const timeline = Array.from(days.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-24);
    const topTerms = Array.from(terms.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const top = [...rows]
      .map((m) => ({ ...m, score: Number(m.likes || 0) + Number(m.shares || 0) + Number(m.replies || 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return { rows, platformRows, sentiment, timeline, topTerms, top };
  }, [mentions]);

  const maxMetric = Math.max(1, ...data.platformRows.map(([, v]) => Number(v[metric] || 0)));
  const maxDay = Math.max(1, ...data.timeline.map(([, n]) => n));

  const sentimentSegments = [
    { label: ar ? "إيجابي" : "Positive", value: data.sentiment.positive },
    { label: ar ? "محايد" : "Neutral", value: data.sentiment.neutral },
    { label: ar ? "سلبي" : "Negative", value: data.sentiment.negative },
  ];

  return (
    <section className="mt-6">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black">{ar ? "حصة المنصات" : "Platform share"}</h3>
            <span className="text-xs font-bold text-zinc-400">{data.rows.length} {ar ? "عنصر" : "items"}</span>
          </div>
          <div className="mt-2 flex items-center gap-5">
            <Donut
              center={String(data.rows.length)}
              segments={data.platformRows.slice(0, 5).map(([, v]) => ({ label: v.label, value: v.items }))}
            />
            <div className="min-w-0 flex-1 space-y-3">
              {data.platformRows.slice(0, 5).map(([key, v]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={key} size={18} />
                    <span className="sr-only">{v.label}</span>
                  </div>
                  <b className="text-sm">{v.items}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-4">
          <h3 className="font-black">{ar ? "المشاعر" : "Sentiment"}</h3>
          <div className="mt-2 flex items-center gap-5">
            <Donut
              center={String(data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative)}
              segments={sentimentSegments}
            />
            <div className="flex-1 space-y-3 text-sm">
              {sentimentSegments.map((x, i) => (
                <div key={x.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#330033","#998099","#ded6de"][i] }} />
                    {x.label}
                  </span>
                  <b>{x.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-4">
          <h3 className="font-black">{ar ? "نشاط آخر الفترات" : "Recent activity"}</h3>
          <div className="mt-5 flex h-40 items-end gap-1">
            {data.timeline.length ? data.timeline.map(([day, n]) => (
              <div
                key={day}
                title={`${day}: ${n}`}
                className="group relative min-w-1 flex-1 rounded-t bg-[#330033]/80 transition hover:bg-[#330033]"
                style={{ height: `${Math.max(8, (n / maxDay) * 100)}%` }}
              >
                <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-[10px] text-white group-hover:block">{n}</span>
              </div>
            )) : <div className="m-auto text-sm text-zinc-400">{ar ? "لا توجد بيانات بعد" : "No timeline data yet"}</div>}
          </div>
        </div>

        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-black">{ar ? "مقارنة أداء المنصات" : "Platform performance"}</h3>
            <div className="flex rounded-full bg-zinc-100 p-1 text-xs font-bold">
              {(["items","engagement","views"] as const).map((x) => (
                <button
                  key={x}
                  onClick={() => setMetric(x)}
                  className={`rounded-full px-3 py-1.5 ${metric === x ? "bg-white text-[#330033] shadow-sm" : "text-zinc-500"}`}
                >
                  {x === "items" ? (ar ? "العناصر" : "Items") : x === "engagement" ? (ar ? "التفاعل" : "Engagement") : (ar ? "المشاهدات" : "Views")}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.platformRows.map(([key, v]) => {
              const val = Number(v[metric] || 0);
              return (
                <div key={key} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <PlatformIcon platform={key} size={20} />
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-[#330033]" style={{ width: `${Math.max(2, (val / maxMetric) * 100)}%` }} />
                  </div>
                  <span className="min-w-16 text-right text-xs font-black text-zinc-700">{val.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-5">
          <h3 className="font-black">{ar ? "إشارات الموضوعات" : "Topic signals"}</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {data.topTerms.map(([term, count], i) => (
              <span
                key={term}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 font-bold text-zinc-700"
                style={{ fontSize: `${Math.max(11, 16 - i * .45)}px` }}
              >
                {term} <span className="text-zinc-400">{count}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] border bg-white p-5 shadow-sm xl:col-span-12">
          <h3 className="font-black">{ar ? "أعلى المحتوى تفاعلاً" : "Top engaging content"}</h3>
          <div className="mt-3 divide-y">
            {data.top.map((m, i) => (
              <div key={m.id || i} className="grid gap-3 py-4 md:grid-cols-[40px_1fr_auto] md:items-center">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100">
                  <PlatformIcon platform={keyOf(m.platform)} size={19} />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-zinc-800">{m.content || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-400">{m.author_name || m.author_username || "—"}</p>
                </div>
                <div className="text-sm font-black text-[#330033]">{m.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
