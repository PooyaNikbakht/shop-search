import { describe, expect, it } from "vitest";
import { filtersToChips, removeChip, describeFilters } from "@/lib/describe";
import { FiltersSchema, normalizeFilters, safeNormalizeFilters, type Filters } from "@/lib/schema";
import { filtersFromParams, filtersToParams, stateFromParams, stateToParams, type SearchState } from "@/lib/url";

const full: Filters = normalizeFilters({
  categories: ["footwear", "jackets"],
  brands: ["Alder & Pike"],
  genders: ["women", "unisex"],
  priceMin: 50,
  priceMax: 149.5,
  minRating: 4,
  sizes: ["8", "M"],
  colours: ["navy"],
  materialsInclude: ["gore-tex"],
  materialsExclude: ["leather"],
  waterproof: true,
  maxWeightGrams: 900,
  inStock: true,
  onSale: true,
  keywords: ["hiking boots"],
});

describe("FiltersSchema", () => {
  it("accepts an empty object", () => {
    expect(FiltersSchema.safeParse({}).success).toBe(true);
  });
  it("rejects unknown enum values and unknown keys", () => {
    expect(FiltersSchema.safeParse({ brands: ["Acme"] }).success).toBe(false);
    expect(FiltersSchema.safeParse({ colour: ["red"] }).success).toBe(false);
  });
  it("rejects an inverted price range and out-of-range ratings", () => {
    expect(FiltersSchema.safeParse({ priceMin: 100, priceMax: 50 }).success).toBe(false);
    expect(FiltersSchema.safeParse({ minRating: 7 }).success).toBe(false);
  });
  it("normalizes nulls, empty arrays, false flags and duplicates", () => {
    const result = safeNormalizeFilters({ brands: [], colours: ["red", "red"], inStock: false, priceMax: null });
    expect(result).toEqual({ success: true, data: { colours: ["red"] } });
  });
});

describe("URL round-trip", () => {
  it("serializes and restores every filter", () => {
    const params = filtersToParams(full);
    expect(filtersFromParams(new URLSearchParams(params.toString()))).toEqual(full);
  });
  it("round-trips the full search state", () => {
    const state: SearchState = { q: "boots under $150", filters: full, sort: "price-asc", page: 3, unmapped: ["for my dad"], via: "offline" };
    expect(stateFromParams(new URLSearchParams(stateToParams(state).toString()))).toEqual(state);
  });
  it("drops invalid fields but keeps valid ones", () => {
    const filters = filtersFromParams(new URLSearchParams("cat=footwear,spaceships&max=abc&rating=4&brand=Nope"));
    expect(filters).toEqual({ minRating: 4 });
    const kept = filtersFromParams(new URLSearchParams("cat=footwear&min=200&max=100"));
    expect(kept).toEqual({ categories: ["footwear"], priceMax: 100 });
  });
  it("defaults sort and page for bad input", () => {
    const state = stateFromParams(new URLSearchParams("sort=random&page=-2"));
    expect(state.sort).toBe("relevance");
    expect(state.page).toBe(1);
  });
});

describe("chips", () => {
  it("creates one chip per value and removes a single value", () => {
    const chips = filtersToChips({ genders: ["men", "unisex"], priceMax: 150 });
    expect(chips.map((c) => c.label)).toEqual(["Men", "Unisex", "Under $150"]);
    const next = removeChip({ genders: ["men", "unisex"], priceMax: 150 }, chips[0]);
    expect(next).toEqual({ genders: ["unisex"], priceMax: 150 });
    expect(removeChip(next, chips[2])).toEqual({ genders: ["unisex"] });
  });
  it("describes filters in plain words", () => {
    expect(describeFilters({ genders: ["women"], waterproof: true, categories: ["footwear"], priceMax: 150 })).toBe(
      "Women's waterproof footwear, under $150.",
    );
  });
});
