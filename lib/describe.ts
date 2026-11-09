import { CATEGORY_LABELS, GENDER_LABELS } from "./catalog-meta";
import type { FilterKey, Filters } from "./schema";

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatWeight(grams: number): string {
  return grams >= 1000 ? `${+(grams / 1000).toFixed(2)} kg` : `${grams} g`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function priceLabel(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined) return `${formatPrice(min)} to ${formatPrice(max)}`;
  if (max !== undefined) return `Under ${formatPrice(max)}`;
  if (min !== undefined) return `Over ${formatPrice(min)}`;
  return undefined;
}

/** One chip per active filter value. `editable` chips open a range popover. */
export interface Chip {
  id: string;
  label: string;
  /** The filter fields this chip represents. */
  keys: FilterKey[];
  /** For array filters, the single value this chip removes. */
  value?: string;
  editable?: "price" | "rating" | "weight";
}

export function filtersToChips(f: Filters): Chip[] {
  const chips: Chip[] = [];
  const each = (key: FilterKey, values: readonly string[] | undefined, label: (v: string) => string) => {
    for (const v of values ?? []) chips.push({ id: `${key}:${v}`, label: label(v), keys: [key], value: v });
  };
  each("categories", f.categories, (v) => CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS] ?? v);
  each("genders", f.genders, (v) => GENDER_LABELS[v as keyof typeof GENDER_LABELS] ?? v);
  each("brands", f.brands, (v) => v);
  const price = priceLabel(f.priceMin, f.priceMax);
  if (price) chips.push({ id: "price", label: price, keys: ["priceMin", "priceMax"], editable: "price" });
  if (f.minRating !== undefined)
    chips.push({ id: "rating", label: `${f.minRating}+ stars`, keys: ["minRating"], editable: "rating" });
  each("sizes", f.sizes, (v) => `Size ${v}`);
  each("colours", f.colours, cap);
  each("materialsInclude", f.materialsInclude, cap);
  each("materialsExclude", f.materialsExclude, (v) => `No ${v}`);
  if (f.waterproof !== undefined)
    chips.push({ id: "waterproof", label: f.waterproof ? "Waterproof" : "Not waterproof", keys: ["waterproof"] });
  if (f.maxWeightGrams !== undefined)
    chips.push({ id: "weight", label: `Under ${formatWeight(f.maxWeightGrams)}`, keys: ["maxWeightGrams"], editable: "weight" });
  if (f.inStock) chips.push({ id: "inStock", label: "In stock", keys: ["inStock"] });
  if (f.onSale) chips.push({ id: "onSale", label: "On sale", keys: ["onSale"] });
  each("keywords", f.keywords, (v) => `"${v}"`);
  return chips;
}

export function removeChip(f: Filters, chip: Chip): Filters {
  const next: Record<string, unknown> = { ...f };
  for (const key of chip.keys) {
    const current = next[key];
    if (chip.value !== undefined && Array.isArray(current)) {
      const rest = current.filter((v) => v !== chip.value);
      if (rest.length) next[key] = rest;
      else delete next[key];
    } else {
      delete next[key];
    }
  }
  return next as Filters;
}

function list(items: string[], joiner = "or"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items[items.length - 1]}`;
}

/** A short plain-English sentence describing a filter object. */
export function describeFilters(f: Filters): string {
  const head: string[] = [];
  if (f.genders?.length) head.push(list(f.genders.map((g) => (g === "unisex" ? "unisex" : g === "kids" ? "kids'" : `${GENDER_LABELS[g].toLowerCase()}'s`))));
  if (f.waterproof === true) head.push("waterproof");
  if (f.colours?.length) head.push(list(f.colours));
  const noun = f.categories?.length
    ? list(f.categories.map((c) => CATEGORY_LABELS[c].toLowerCase()))
    : "products";
  const kw = f.keywords?.length ? ` matching ${list(f.keywords.map((k) => `"${k}"`))}` : "";
  const parts: string[] = [`${cap([...head, noun].join(" "))}${kw}`];
  if (f.brands?.length) parts.push(`from ${list(f.brands)}`);
  const price = priceLabel(f.priceMin, f.priceMax);
  if (price) parts.push(price.toLowerCase());
  if (f.sizes?.length) parts.push(`size ${list(f.sizes)}`);
  if (f.minRating !== undefined) parts.push(`rated ${f.minRating}+ stars`);
  if (f.materialsInclude?.length) parts.push(`in ${list(f.materialsInclude)}`);
  if (f.materialsExclude?.length) parts.push(`no ${list(f.materialsExclude)}`);
  if (f.waterproof === false) parts.push("not waterproof");
  if (f.maxWeightGrams !== undefined) parts.push(`under ${formatWeight(f.maxWeightGrams)}`);
  if (f.inStock) parts.push("in stock");
  if (f.onSale) parts.push("on sale");
  return `${parts.join(", ")}.`;
}
