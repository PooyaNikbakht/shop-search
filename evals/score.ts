import type { Filters } from "../lib/schema";

/** Fields scored by the eval. Keywords are free text and reported, not scored. */
export const SCORED_FIELDS = [
  "categories", "brands", "genders", "priceMin", "priceMax", "minRating", "sizes", "colours",
  "materialsInclude", "materialsExclude", "waterproof", "maxWeightGrams", "inStock", "onSale",
] as const satisfies readonly (keyof Filters)[];
export type ScoredField = (typeof SCORED_FIELDS)[number] | "unmapped";

export interface Counts {
  tp: number;
  fp: number;
  fn: number;
}

function atoms(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).toLowerCase());
  return [String(value)];
}

export function compareField(expected: unknown, predicted: unknown): Counts {
  const e = new Set(atoms(expected));
  const p = new Set(atoms(predicted));
  let tp = 0;
  for (const a of p) if (e.has(a)) tp += 1;
  return { tp, fp: p.size - tp, fn: e.size - tp };
}

const FILLER = new Set(["a", "an", "the", "for", "my", "as", "to", "of", "that", "with", "not", "fit"]);
function contentWords(phrase: string): string[] {
  return phrase.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w));
}

/**
 * Unmapped phrases match when they share a content word, so "dad" and
 * "for my dad" count as the same phrase. "not black" vs "black" also matches.
 */
export function compareUnmapped(expected: readonly string[], predicted: readonly string[]): Counts {
  const overlap = (a: string, b: string) => {
    const words = new Set(contentWords(a));
    return contentWords(b).some((w) => words.has(w));
  };
  const tp = predicted.filter((p) => expected.some((e) => overlap(e, p))).length;
  const fp = predicted.length - tp;
  const fn = expected.filter((e) => !predicted.some((p) => overlap(e, p))).length;
  return { tp, fp, fn };
}

export function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

export function filtersEqual(expected: Filters, predicted: Filters): boolean {
  return SCORED_FIELDS.every((f) => {
    const c = compareField(expected[f], predicted[f]);
    return c.fp === 0 && c.fn === 0;
  });
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
