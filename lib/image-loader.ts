"use client";

// Cloudflare Workers has no image optimizer, so every photo is exported ahead of time at two or
// three widths (public/photos/<key>-<width>.webp). This loader maps the width next/image asks for
// to the smallest exported file that is at least that wide.
import manifest from "@/data/photo-manifest.json";

const widths = manifest as Record<string, { w: number[] }>;

export default function photoLoader({ src, width }: { src: string; width: number }): string {
  const match = /^\/photos\/([a-z0-9-]+)$/.exec(src);
  const entry = match ? widths[match[1]] : undefined;
  if (!entry) return src;
  const best = entry.w.find((w) => w >= width) ?? entry.w[entry.w.length - 1];
  return `/photos/${match![1]}-${best}.webp`;
}
