import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";

/** Small flat mark: a peak with a switchback trail climbing it. */
function StoreMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--accent-2)" />
      <path d="M4 25 13 11l5 7 3-4 7 11z" fill="var(--hero)" />
      <path
        d="M10 25h7l-5-3h7l-4-3h4"
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function StoreBar() {
  return (
    <div className="border-b border-hero-line">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-[8px] text-hero-ink">
          <StoreMark />
          <span className="truncate text-[15px] font-semibold tracking-tight">{site.storeName}</span>
          <span className="hidden shrink-0 rounded-full border border-hero-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-hero-muted min-[400px]:inline">
            Demo store
          </span>
        </Link>
        <nav aria-label="Site" className="flex shrink-0 items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-[8px] px-2.5 py-1.5 text-hero-muted hover:bg-hero-line hover:text-hero-ink"
          >
            Home
          </Link>
          <a
            href={site.howItWorksUrl}
            className="rounded-[8px] px-2.5 py-1.5 text-hero-muted hover:bg-hero-line hover:text-hero-ink"
          >
            How it works
          </a>
          {site.repoUrl ? (
            <a
              href={site.repoUrl}
              aria-label="Source on GitHub"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-hero-muted hover:bg-hero-line hover:text-hero-ink"
            >
              <GitHubIcon />
            </a>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

/** Pine tree: two stacked triangles on a short trunk, standing on (x, y). */
function pine(x: number, y: number, h: number) {
  const w = h * 0.42;
  return `M${x - w} ${y - h * 0.18}L${x} ${y - h * 0.62}L${x + w} ${y - h * 0.18}Z M${x - w * 0.8} ${y - h * 0.5}L${x} ${y - h}L${x + w * 0.8} ${y - h * 0.5}Z M${x - 1.5} ${y}h3v${-h * 0.2}h-3Z`;
}

const TREES: [number, number, number][] = [
  [95, 130, 26], [128, 132, 20], [290, 114, 30], [326, 116, 24], [512, 124, 24],
  [718, 120, 28], [756, 122, 22], [958, 118, 30], [994, 120, 24], [1186, 126, 28], [1218, 128, 22],
];

/**
 * Flat, layered mountain range for the bottom edge of the hero. Slices to the
 * container so it keeps its proportions; the front layer matches the page so
 * the band ends in a ridge line instead of a straight edge.
 */
export function MountainRange() {
  return (
    <svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className="block h-[110px] w-full sm:h-[150px] lg:h-[190px]"
    >
      <path
        fill="var(--hero-far)"
        d="M0 112L80 78L150 100L250 42L340 92L420 64L520 104L610 32L700 88L790 58L880 100L960 50L1060 96L1150 54L1240 92L1330 62L1440 96V200H0Z"
      />
      <path
        fill="var(--hero-mid)"
        d="M0 146L110 104L200 136L310 86L420 134L530 98L640 142L740 94L860 140L980 92L1090 134L1200 102L1320 140L1440 112V200H0Z"
      />
      <path fill="var(--hero-tree)" d={TREES.map(([x, y, h]) => pine(x, y, h)).join(" ")} />
      <path
        fill="var(--hero-near)"
        d="M0 176L140 142L260 168L400 134L560 170L700 140L860 174L1000 138L1160 170L1300 146L1440 166V200H0Z"
      />
      <path fill="var(--background)" d="M0 200V186L240 180L520 190L820 178L1120 188L1440 180V200Z" />
    </svg>
  );
}

const DEMO_CHIPS = ["Footwear", "Women", "Waterproof", "Under $150", "Size 8", "4 stars & up"];

/** Flat illustration of the idea: one sentence in, editable chips out. Desktop only. */
function QueryToChips() {
  return (
    <div aria-hidden="true" className="hidden rounded-[8px] border border-hero-line bg-hero-far p-5 lg:block">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-hero-muted">
        <span className="h-2 w-2 rounded-full bg-accent-2" />
        You type
      </div>
      <p className="mt-2 rounded-[6px] bg-hero px-3 py-2.5 text-sm leading-snug text-hero-ink">
        waterproof women&apos;s hiking boots under $150, size 8, 4 stars and up
      </p>
      <svg viewBox="0 0 24 24" className="mx-auto my-3 h-6 w-6 text-accent-2" fill="none">
        <path d="M12 4v14m0 0-6-6m6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-hero-muted">
        <span className="h-2 w-2 rounded-full bg-hero-ink" />
        You get filters
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {DEMO_CHIPS.map((c, i) => (
          <li
            key={c}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              i === 0 ? "bg-accent-2 text-hero" : "bg-hero-ink text-hero"
            }`}
          >
            {c}
            <span className="opacity-60">&times;</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Hero({ examples }: { examples: React.ReactNode }) {
  return (
    <div className="on-hero relative isolate overflow-hidden bg-hero text-hero-ink">
      <Image
        src="/photos/hero-trail"
        alt=""
        fill
        preload
        fetchPriority="high"
        sizes="100vw"
        className="-z-10 object-cover object-[50%_60%]"
      />
      {/* Solid forest scrim (no gradient) keeps light text above AA contrast on any part of the photo. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hero/75" />
      <StoreBar />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-4 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:pt-16">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-accent-2">Natural-language search</p>
          <h1 className="mt-3 text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[2.875rem] xl:text-5xl">
            Describe the gear you want.{" "}
            <span className="sm:block">
              We turn it into{" "}
              <mark className="rounded-[4px] bg-accent-2 px-1.5 text-hero [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                filters you can edit.
              </mark>
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-hero-muted sm:text-lg">
            A demo store with 3,000 synthetic outdoor products. Your sentence becomes validated filters, shown as chips.
          </p>
          <div className="mt-7">{examples}</div>
        </div>
        <QueryToChips />
      </div>
      <MountainRange />
    </div>
  );
}
