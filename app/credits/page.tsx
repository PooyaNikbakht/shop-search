import type { Metadata } from "next";
import Link from "next/link";
import { PHOTO_CREDITS, PHOTO_EDITS } from "@/data/photo-credits";
import { site } from "@/config/site";

export const metadata: Metadata = { title: `Photo credits · ${site.storeName}` };

export default function CreditsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-muted underline underline-offset-4 hover:text-accent">
        Back to the store
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Photo credits</h1>
      <p className="mt-4 max-w-2xl text-base text-muted">
        Every photo in this demo store comes from Unsplash and is used under the{" "}
        <a className="text-ink underline underline-offset-4 hover:text-accent" href="https://unsplash.com/license">
          Unsplash License
        </a>
        . The products are synthetic, so photos are matched by product type, not to real items.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        <span className="font-medium text-ink">Edits:</span> {PHOTO_EDITS}
      </p>
      <ul className="mt-8 divide-y divide-border border-y border-border">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.url} className="grid gap-1 py-3 text-sm sm:grid-cols-[200px_1fr_auto] sm:items-baseline sm:gap-6">
            <p className="font-medium">{c.photographer}</p>
            <p className="break-words font-mono text-xs text-muted">{c.files.join(", ")}</p>
            <a className="text-accent underline underline-offset-4" href={c.url}>
              View on Unsplash<span className="sr-only"> (photo by {c.photographer})</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
