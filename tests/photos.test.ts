import { describe, expect, it } from "vitest";
import products from "@/data/products.json";
import manifest from "@/data/photo-manifest.json";
import { CATEGORIES } from "@/lib/catalog-meta";
import { PHOTOS, SUBCATEGORY_PHOTOS, photoFor } from "@/config/photos";

const exported = manifest as Record<string, { w: number[] }>;

describe("product photos", () => {
  it("only maps to photos that were exported", () => {
    for (const keys of Object.values(SUBCATEGORY_PHOTOS)) {
      for (const key of keys) expect(exported[key], key).toBeDefined();
    }
    for (const key of Object.keys(PHOTOS)) expect(exported[key], key).toBeDefined();
    for (const cat of CATEGORIES) expect(exported[`t-${cat}`], cat).toBeDefined();
  });

  it("is deterministic and covers most of the catalog", () => {
    const first = products.map((p) => photoFor(p)?.key ?? null);
    const second = products.map((p) => photoFor(p)?.key ?? null);
    expect(second).toEqual(first);
    const covered = first.filter(Boolean).length / first.length;
    expect(covered).toBeGreaterThan(0.9);
  });

  it("varies photos within a subcategory", () => {
    const boots = products.filter((p) => p.subcategory === "Hiking Boot").map((p) => photoFor(p)?.key);
    expect(new Set(boots).size).toBe(SUBCATEGORY_PHOTOS["Hiking Boot"].length);
  });
});
