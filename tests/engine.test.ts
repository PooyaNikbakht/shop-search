import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/lib/catalog";
import { PAGE_SIZE, computeFacets, filterProducts, keywordScore, priceBucketId, search, sortProducts } from "@/lib/engine";
import type { Product } from "@/lib/schema";

function product(overrides: Partial<Product>): Product {
  return {
    id: "x", title: "Test Item", brand: "Northvale", category: "jackets", subcategory: "Rain Shell",
    price: 100, rating: 4, reviewCount: 10, gender: "unisex", sizes: ["M"], colours: ["black"],
    materials: ["nylon"], waterproof: false, weightGrams: 400, inStock: true, tags: [], createdAt: "2025-01-01",
    ...overrides,
  };
}

const items: Product[] = [
  product({ id: "a", price: 40, rating: 3.8, colours: ["red"], createdAt: "2024-01-01" }),
  product({ id: "b", price: 150, rating: 4.6, waterproof: true, materials: ["gore-tex", "nylon"], gender: "women", createdAt: "2026-01-01" }),
  product({ id: "c", price: 90, rating: 4.2, category: "footwear", subcategory: "Hiking Boot", title: "Talus Hiking Boot", materials: ["leather", "rubber"], sizes: ["8", "9"], tags: ["boots", "hiking"] }),
  product({ id: "d", price: 75, compareAtPrice: 100, inStock: false, brand: "Highmark", weightGrams: 1200 }),
];

describe("filterProducts", () => {
  it("returns everything with no filters", () => {
    expect(filterProducts(items, {})).toHaveLength(4);
  });
  it("applies price range inclusively", () => {
    expect(filterProducts(items, { priceMin: 75, priceMax: 150 }).map((p) => p.id)).toEqual(["b", "c", "d"]);
  });
  it("ORs values inside a field and ANDs across fields", () => {
    const ids = filterProducts(items, { genders: ["women", "unisex"], waterproof: true }).map((p) => p.id);
    expect(ids).toEqual(["b"]);
  });
  it("excludes materials and requires included ones", () => {
    expect(filterProducts(items, { materialsExclude: ["leather"] }).map((p) => p.id)).toEqual(["a", "b", "d"]);
    expect(filterProducts(items, { materialsInclude: ["gore-tex"] }).map((p) => p.id)).toEqual(["b"]);
  });
  it("handles stock, sale, weight, rating, size and colour", () => {
    expect(filterProducts(items, { inStock: true }).map((p) => p.id)).not.toContain("d");
    expect(filterProducts(items, { onSale: true }).map((p) => p.id)).toEqual(["d"]);
    expect(filterProducts(items, { maxWeightGrams: 500 }).map((p) => p.id)).not.toContain("d");
    expect(filterProducts(items, { minRating: 4.5 }).map((p) => p.id)).toEqual(["b"]);
    expect(filterProducts(items, { sizes: ["9"] }).map((p) => p.id)).toEqual(["c"]);
    expect(filterProducts(items, { colours: ["red"] }).map((p) => p.id)).toEqual(["a"]);
  });
  it("matches keywords against title, tags and subcategory with plural stemming", () => {
    expect(keywordScore(items[2], ["boots"])).toBe(1);
    expect(filterProducts(items, { keywords: ["boot"] }).map((p) => p.id)).toEqual(["c"]);
  });
});

describe("sortProducts", () => {
  it("sorts by price both ways, rating and newest", () => {
    expect(sortProducts(items, "price-asc").map((p) => p.id)).toEqual(["a", "d", "c", "b"]);
    expect(sortProducts(items, "price-desc").map((p) => p.id)).toEqual(["b", "c", "d", "a"]);
    expect(sortProducts(items, "rating")[0].id).toBe("b");
    expect(sortProducts(items, "newest")[0].id).toBe("b");
  });
  it("ranks keyword matches first for relevance", () => {
    expect(sortProducts(items, "relevance", { keywords: ["hiking"] })[0].id).toBe("c");
  });
});

describe("search", () => {
  it("paginates 24 per page and clamps the page number", () => {
    const first = search(PRODUCTS, {}, { page: 1 });
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.total).toBe(PRODUCTS.length);
    const last = search(PRODUCTS, {}, { page: 9999 });
    expect(last.page).toBe(last.pageCount);
  });
  it("computes facets that ignore their own field", () => {
    const facets = computeFacets(items, { genders: ["women"] });
    const women = facets.genders.find((g) => g.value === "women");
    const unisex = facets.genders.find((g) => g.value === "unisex");
    expect(women?.count).toBe(1);
    expect(unisex?.count).toBe(3);
    expect(facets.categories.find((c) => c.value === "jackets")?.count).toBe(1);
  });
  it("buckets prices", () => {
    expect(priceBucketId(10)).toBe("0-50");
    expect(priceBucketId(50)).toBe("50-100");
    expect(priceBucketId(999)).toBe("400+");
  });
  it("answers a full-catalog query in well under 100 ms", () => {
    const started = performance.now();
    search(PRODUCTS, { categories: ["footwear"], waterproof: true, priceMax: 150, keywords: ["boots"] });
    expect(performance.now() - started).toBeLessThan(100);
  });
});
