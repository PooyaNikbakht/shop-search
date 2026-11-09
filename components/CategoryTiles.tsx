"use client";

import Image from "next/image";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/catalog-meta";
import type { Filters } from "@/lib/schema";

/** Quick category shortcuts. Each tile toggles the same `categories` filter the facets use. */
export function CategoryTiles({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const active = new Set<Category>(filters.categories ?? []);

  function toggle(cat: Category) {
    const next = new Set(active);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange({ ...filters, categories: next.size ? [...next].sort() : undefined });
  }

  return (
    <nav aria-label="Shop by category" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <ul className="flex gap-2 sm:grid sm:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((cat) => {
          const on = active.has(cat);
          return (
            <li key={cat} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(cat)}
                className={`group flex h-full w-[6.5rem] flex-col overflow-hidden rounded-[8px] border text-center text-xs font-medium transition-colors sm:w-full ${
                  on ? "border-accent bg-accent text-accent-ink" : "border-border bg-background text-ink hover:border-accent"
                }`}
              >
                <span className="relative block aspect-[4/3] w-full bg-surface sm:aspect-square">
                  <Image
                    src={`/photos/t-${cat}`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 150px, (min-width: 640px) 25vw, 104px"
                    className={`object-cover transition-opacity ${on ? "opacity-80" : ""}`}
                  />
                  {on && (
                    <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="flex flex-1 items-center justify-center px-1.5 py-2 leading-tight">{CATEGORY_LABELS[cat]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
