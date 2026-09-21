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
  const key = String(platform || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  const slug = slugs[key];
  const title = titles[slug] || String(platform || "Platform");

  if (slug === "linkedin") {
    return (
      <svg
        viewBox="0 0 448 512"
        width={size}
        height={size}
        role="img"
        aria-label={title}
        className={`inline-block shrink-0 fill-current text-zinc-600 ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8 0 24.1 24.09 0 53.79 0s53.79 24.1 53.79 53.8c0 29.7-24.09 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
      </svg>
    );
  }

  if (!slug) {
    return (
      <span
        title={title}
        aria-label={title}
        className={`inline-flex items-center justify-center text-zinc-600 ${className}`}
      >
        <span
          className="rounded-full bg-current opacity-70"
          style={{ width: size * 0.72, height: size * 0.72 }}
        />
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
