import React from "react";

const slugs: Record<string, string> = {
  x: "x",
  twitter: "x",
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  threads: "threads",
  facebook: "facebook",
  linkedin: "linkedin",
  google_maps: "googlemaps",
  googlemaps: "googlemaps",
  reddit: "reddit",
  snapchat: "snapchat",
};

const titles: Record<string, string> = {
  x: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  googlemaps: "Google Maps",
  reddit: "Reddit",
  snapchat: "Snapchat",
};

export default function PlatformIcon({
  platform,
  size = 22,
  className = "",
}: {
  platform?: string | null;
  size?: number;
  className?: string;
}) {
  const key = String(platform || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const slug = slugs[key];
  const title = titles[slug] || String(platform || "Platform");

  if (!slug) {
    return (
      <span
        title={title}
        aria-label={title}
        className={`inline-flex items-center justify-center text-zinc-600 ${className}`}
      >
        <span className="rounded-full bg-current opacity-70" style={{ width: size * 0.72, height: size * 0.72 }} />
      </span>
    );
  }

  const mask = `url(https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/${slug}.svg)`;

  return (
    <span
      title={title}
      aria-label={title}
      role="img"
      className={`inline-block shrink-0 bg-current text-zinc-600 ${className}`}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
