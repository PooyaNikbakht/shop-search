import { z } from "zod";
import {
  BRANDS,
  CATEGORIES,
  COLOURS,
  GENDERS,
  MATERIALS,
  SORTS,
} from "./catalog-meta";

/**
 * Single source of truth for search filters. Every field is optional.
 * Used to validate LLM output, to serialize the URL, and to drive the engine.
 */
export const FiltersSchema = z
  .strictObject({
    categories: z.array(z.enum(CATEGORIES)).min(1),
    brands: z.array(z.enum(BRANDS)).min(1),
    genders: z.array(z.enum(GENDERS)).min(1),
    priceMin: z.number().nonnegative(),
    priceMax: z.number().positive(),
    minRating: z.number().min(1).max(5),
    sizes: z.array(z.string().trim().min(1).max(12)).min(1),
    colours: z.array(z.enum(COLOURS)).min(1),
    materialsInclude: z.array(z.enum(MATERIALS)).min(1),
    materialsExclude: z.array(z.enum(MATERIALS)).min(1),
    waterproof: z.boolean(),
    maxWeightGrams: z.number().positive(),
    inStock: z.literal(true),
    onSale: z.literal(true),
    keywords: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  })
  .partial()
  .refine(
    (f) => f.priceMin === undefined || f.priceMax === undefined || f.priceMin <= f.priceMax,
    { message: "priceMin must not exceed priceMax", path: ["priceMin"] },
  );

export type Filters = z.infer<typeof FiltersSchema>;
export type FilterKey = keyof Filters;

export const FILTER_KEYS = [
  "categories",
  "brands",
  "genders",
  "priceMin",
  "priceMax",
  "minRating",
  "sizes",
  "colours",
  "materialsInclude",
  "materialsExclude",
  "waterproof",
  "maxWeightGrams",
  "inStock",
  "onSale",
  "keywords",
] as const satisfies readonly FilterKey[];

export const SortSchema = z.enum(SORTS);

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.enum(BRANDS),
  category: z.enum(CATEGORIES),
  subcategory: z.string(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  rating: z.number(),
  reviewCount: z.number(),
  gender: z.enum(GENDERS),
  sizes: z.array(z.string()),
  colours: z.array(z.enum(COLOURS)),
  materials: z.array(z.enum(MATERIALS)),
  waterproof: z.boolean(),
  weightGrams: z.number(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

/**
 * Drops empty arrays, undefined and null values, de-duplicates arrays and
 * returns a canonical, validated filter object. Throws on invalid input.
 */
export function normalizeFilters(input: unknown): Filters {
  const cleaned = stripEmpty(input);
  return canonical(FiltersSchema.parse(cleaned));
}

export function safeNormalizeFilters(
  input: unknown,
): { success: true; data: Filters } | { success: false; error: z.ZodError } {
  const result = FiltersSchema.safeParse(stripEmpty(input));
  return result.success ? { success: true, data: canonical(result.data) } : result;
}

function stripEmpty(input: unknown): unknown {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      const unique = Array.from(new Set(value));
      if (unique.length === 0) continue;
      out[key] = unique;
      continue;
    }
    if (value === false && (key === "inStock" || key === "onSale")) continue;
    out[key] = value;
  }
  return out;
}

/** Stable key order and sorted arrays, so equal filters serialize identically. */
function canonical(filters: Filters): Filters {
  const out: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined) continue;
    out[key] = Array.isArray(value) && key !== "keywords" ? [...value].sort() : value;
  }
  return out as Filters;
}

export function isEmptyFilters(filters: Filters): boolean {
  return FILTER_KEYS.every((k) => filters[k] === undefined);
}
