import {
  BRANDS,
  CATEGORIES,
  GENDERS,
  PRICE_BUCKETS,
  type Brand,
  type Category,
  type Gender,
  type Sort,
} from "./catalog-meta";
import type { Filters, Product } from "./schema";

export const PAGE_SIZE = 24;

export interface FacetCount<T extends string = string> {
  value: T;
  count: number;
}

export interface Facets {
  categories: FacetCount<Category>[];
  brands: FacetCount<Brand>[];
  genders: FacetCount<Gender>[];
  price: FacetCount[];
}

export interface SearchResult {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  sort: Sort;
  facets: Facets;
}

export interface SearchOptions {
  sort?: Sort;
  page?: number;
  pageSize?: number;
}

type FacetName = "categories" | "brands" | "genders" | "price";

/** Lowercase, split on non-word characters, and strip a trailing plural "s". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .map(stem);
}

function stem(word: string): string {
  if (word.length > 3 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

const searchTextCache = new WeakMap<Product, Set<string>>();
function searchTokens(p: Product): Set<string> {
  let tokens = searchTextCache.get(p);
  if (!tokens) {
    tokens = new Set(
      tokenize(
        [p.title, p.brand, p.category.replace("-", " "), p.subcategory, ...p.tags, ...p.materials].join(" "),
      ),
    );
    searchTextCache.set(p, tokens);
  }
  return tokens;
}

/** Number of keywords (out of the filter's keywords) a product matches. */
export function keywordScore(p: Product, keywords: readonly string[] | undefined): number {
  if (!keywords?.length) return 0;
  const tokens = searchTokens(p);
  let score = 0;
  for (const keyword of keywords) {
    const parts = tokenize(keyword);
    if (parts.length > 0 && parts.every((t) => tokens.has(t))) score += 1;
  }
  return score;
}

/**
 * Tests a product against every filter except the facet being counted.
 * Excluding the facet's own filter gives the usual "OR within a facet" counts.
 */
function matches(p: Product, f: Filters, skip?: FacetName): boolean {
  if (skip !== "categories" && f.categories && !f.categories.includes(p.category)) return false;
  if (skip !== "brands" && f.brands && !f.brands.includes(p.brand)) return false;
  if (skip !== "genders" && f.genders && !f.genders.includes(p.gender)) return false;
  if (skip !== "price") {
    if (f.priceMin !== undefined && p.price < f.priceMin) return false;
    if (f.priceMax !== undefined && p.price > f.priceMax) return false;
  }
  if (f.minRating !== undefined && p.rating < f.minRating) return false;
  if (f.sizes && !f.sizes.some((s) => p.sizes.some((ps) => ps.toLowerCase() === s.toLowerCase()))) return false;
  if (f.colours && !f.colours.some((c) => p.colours.includes(c))) return false;
  if (f.materialsInclude && !f.materialsInclude.some((m) => p.materials.includes(m))) return false;
  if (f.materialsExclude && f.materialsExclude.some((m) => p.materials.includes(m))) return false;
  if (f.waterproof !== undefined && p.waterproof !== f.waterproof) return false;
  if (f.maxWeightGrams !== undefined && p.weightGrams > f.maxWeightGrams) return false;
  if (f.inStock && !p.inStock) return false;
  if (f.onSale && p.compareAtPrice === undefined) return false;
  if (f.keywords?.length && keywordScore(p, f.keywords) === 0) return false;
  return true;
}

export function filterProducts(products: readonly Product[], filters: Filters): Product[] {
  return products.filter((p) => matches(p, filters));
}

function compareBy(sort: Sort, keywords: readonly string[] | undefined) {
  return (a: Product, b: Product): number => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price || a.id.localeCompare(b.id);
      case "price-desc":
        return b.price - a.price || a.id.localeCompare(b.id);
      case "rating":
        return b.rating - a.rating || b.reviewCount - a.reviewCount || a.id.localeCompare(b.id);
      case "newest":
        return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
      case "relevance":
      default:
        return relevance(b, keywords) - relevance(a, keywords) || a.id.localeCompare(b.id);
    }
  };
}

/** Keyword matches dominate; rating weighted by review volume breaks ties. */
export function relevance(p: Product, keywords: readonly string[] | undefined): number {
  const confidence = Math.min(1, Math.log10(p.reviewCount + 1) / 3);
  return keywordScore(p, keywords) * 10 + p.rating * (0.5 + 0.5 * confidence) + (p.inStock ? 0.25 : 0);
}

export function sortProducts(products: readonly Product[], sort: Sort, filters: Filters = {}): Product[] {
  return [...products].sort(compareBy(sort, filters.keywords));
}

export function priceBucketId(price: number): string {
  for (const bucket of PRICE_BUCKETS) {
    const aboveMin = bucket.min === undefined || price >= bucket.min;
    const belowMax = bucket.max === undefined || price < bucket.max;
    if (aboveMin && belowMax) return bucket.id;
  }
  return PRICE_BUCKETS[PRICE_BUCKETS.length - 1].id;
}

export function computeFacets(products: readonly Product[], filters: Filters): Facets {
  const cat = new Map<Category, number>();
  const brand = new Map<Brand, number>();
  const gender = new Map<Gender, number>();
  const price = new Map<string, number>();
  for (const p of products) {
    if (matches(p, filters, "categories")) cat.set(p.category, (cat.get(p.category) ?? 0) + 1);
    if (matches(p, filters, "brands")) brand.set(p.brand, (brand.get(p.brand) ?? 0) + 1);
    if (matches(p, filters, "genders")) gender.set(p.gender, (gender.get(p.gender) ?? 0) + 1);
    if (matches(p, filters, "price")) {
      const id = priceBucketId(p.price);
      price.set(id, (price.get(id) ?? 0) + 1);
    }
  }
  return {
    categories: CATEGORIES.map((value) => ({ value, count: cat.get(value) ?? 0 })),
    brands: BRANDS.map((value) => ({ value, count: brand.get(value) ?? 0 })).sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    ),
    genders: GENDERS.map((value) => ({ value, count: gender.get(value) ?? 0 })),
    price: PRICE_BUCKETS.map((b) => ({ value: b.id, count: price.get(b.id) ?? 0 })),
  };
}

export function search(
  products: readonly Product[],
  filters: Filters,
  options: SearchOptions = {},
): SearchResult {
  const sort = options.sort ?? "relevance";
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const matched = filterProducts(products, filters);
  const sorted = sortProducts(matched, sort, filters);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageCount,
    pageSize,
    sort,
    facets: computeFacets(products, filters),
  };
}
