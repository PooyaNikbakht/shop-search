import { SORTS, type Sort } from "./catalog-meta";
import { FILTER_KEYS, safeNormalizeFilters, type FilterKey, type Filters } from "./schema";

/** Short, readable query-string keys for each filter. */
export const URL_KEYS: Record<FilterKey, string> = {
  categories: "cat",
  brands: "brand",
  genders: "gender",
  priceMin: "min",
  priceMax: "max",
  minRating: "rating",
  sizes: "size",
  colours: "colour",
  materialsInclude: "mat",
  materialsExclude: "notmat",
  waterproof: "wp",
  maxWeightGrams: "maxg",
  inStock: "stock",
  onSale: "sale",
  keywords: "kw",
};

const ARRAY_KEYS = new Set<FilterKey>([
  "categories",
  "brands",
  "genders",
  "sizes",
  "colours",
  "materialsInclude",
  "materialsExclude",
  "keywords",
]);
const NUMBER_KEYS = new Set<FilterKey>(["priceMin", "priceMax", "minRating", "maxWeightGrams"]);

export const PROVIDERS = ["anthropic", "openai", "offline"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export interface SearchState {
  q: string;
  filters: Filters;
  sort: Sort;
  page: number;
  /** Parser feedback, kept in the URL so a shared link restores it. */
  unmapped: string[];
  via?: ProviderName;
}

export const DEFAULT_STATE: SearchState = { q: "", filters: {}, sort: "relevance", page: 1, unmapped: [] };

type ParamsLike = Pick<URLSearchParams, "get" | "getAll">;

function readList(params: ParamsLike, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Reads filters from a query string. Invalid values are dropped one field at a
 * time, so a single bad parameter never discards the rest of the search.
 */
export function filtersFromParams(params: ParamsLike): Filters {
  const raw: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const urlKey = URL_KEYS[key];
    if (ARRAY_KEYS.has(key)) {
      const list = readList(params, urlKey);
      if (list.length) raw[key] = list;
    } else if (NUMBER_KEYS.has(key)) {
      const value = params.get(urlKey);
      if (value !== null && value.trim() !== "" && Number.isFinite(Number(value))) raw[key] = Number(value);
    } else {
      const value = params.get(urlKey);
      if (key === "waterproof" && (value === "1" || value === "0")) raw[key] = value === "1";
      if ((key === "inStock" || key === "onSale") && value === "1") raw[key] = true;
    }
  }
  const whole = safeNormalizeFilters(raw);
  if (whole.success) return whole.data;

  // Keep every field that validates on its own.
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (safeNormalizeFilters({ [key]: value }).success) kept[key] = value;
  }
  const partial = safeNormalizeFilters(kept);
  if (partial.success) return partial.data;
  // Only cross-field rules can still fail here (priceMin > priceMax).
  delete kept.priceMin;
  const last = safeNormalizeFilters(kept);
  return last.success ? last.data : {};
}

export function filtersToParams(filters: Filters, params = new URLSearchParams()): URLSearchParams {
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined) continue;
    const urlKey = URL_KEYS[key];
    if (Array.isArray(value)) params.set(urlKey, value.join(","));
    else if (typeof value === "boolean") params.set(urlKey, value ? "1" : "0");
    else params.set(urlKey, String(value));
  }
  return params;
}

export function stateFromParams(params: ParamsLike): SearchState {
  const sortParam = params.get("sort");
  const sort = (SORTS as readonly string[]).includes(sortParam ?? "") ? (sortParam as Sort) : "relevance";
  const pageNum = Number(params.get("page"));
  const via = params.get("via");
  return {
    q: (params.get("q") ?? "").slice(0, 300),
    filters: filtersFromParams(params),
    sort,
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
    unmapped: (params.get("un") ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10),
    via: (PROVIDERS as readonly string[]).includes(via ?? "") ? (via as ProviderName) : undefined,
  };
}

export function stateToParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  filtersToParams(state.filters, params);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.unmapped.length) params.set("un", state.unmapped.join("|"));
  if (state.via) params.set("via", state.via);
  return params;
}

/** Only the parameters `/api/products` needs. */
export function productQuery(state: Pick<SearchState, "filters" | "sort" | "page">): string {
  const params = filtersToParams(state.filters);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}
