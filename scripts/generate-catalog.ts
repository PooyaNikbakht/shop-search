/**
 * Deterministic catalog generator. Same seed, same products.json, every time.
 * Usage: npm run catalog
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPAREL_SIZES,
  BAG_SIZES,
  KIDS_SHOE_SIZES,
  ONE_SIZE,
  SHOE_SIZES,
  type Brand,
  type Category,
  type Colour,
  type Gender,
  type Material,
} from "../lib/catalog-meta";
import { ProductSchema, type Product } from "../lib/schema";

const SEED = 20261030;
const TARGET_COUNT = 3000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rand() < p;
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function pickSome<T>(items: readonly T[], min: number, max: number): T[] {
  const pool = [...items];
  const n = Math.min(pool.length, int(min, max));
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
/** Roughly normal, via the sum of uniforms. */
function normal(mean: number, sd: number) {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return mean + (s - 3) * sd * Math.SQRT2;
}

interface Subcategory {
  name: string; // singular, used in titles
  price: [number, number];
  weight: [number, number];
  genders: Partial<Record<Gender, number>>;
  materials: Material[][]; // options, one picked
  waterproof: number; // probability
  sizes: "apparel" | "shoes" | "tents-small" | "tents-large" | "bags" | "packs" | "one" | "sml";
  tags: string[];
  adjectives?: string[];
}

const CATALOG: Record<Category, { brands: Brand[]; share: number; subs: Subcategory[] }> = {
  footwear: {
    share: 0.2,
    brands: ["Fjellstad", "Kestrel Outdoor", "Ridgeline Supply", "Larchmont Trail", "Northvale", "Highmark"],
    subs: [
      { name: "Hiking Boot", price: [95, 260], weight: [850, 1500], genders: { men: 4, women: 4, kids: 1 }, materials: [["leather", "rubber"], ["suede", "mesh", "rubber"], ["nylon", "mesh", "rubber"], ["leather", "gore-tex", "rubber"], ["suede", "gore-tex", "rubber"]], waterproof: 0.6, sizes: "shoes", tags: ["hiking", "backpacking", "boots"], adjectives: ["Mid", "Mid GTX", "Pro", "Trek"] },
      { name: "Trail Runner", price: [85, 180], weight: [480, 700], genders: { men: 5, women: 5 }, materials: [["mesh", "rubber"], ["mesh", "nylon", "rubber"], ["mesh", "gore-tex", "rubber"]], waterproof: 0.25, sizes: "shoes", tags: ["running", "trail", "shoes", "lightweight"] },
      { name: "Approach Shoe", price: [100, 190], weight: [600, 900], genders: { men: 3, women: 3 }, materials: [["suede", "rubber"], ["leather", "rubber"], ["mesh", "rubber"]], waterproof: 0.1, sizes: "shoes", tags: ["climbing", "approach", "shoes"] },
      { name: "Sandal", price: [35, 110], weight: [380, 650], genders: { men: 3, women: 3, kids: 1 }, materials: [["nylon", "rubber"], ["leather", "rubber"], ["polyester", "rubber"]], waterproof: 0, sizes: "shoes", tags: ["summer", "travel", "sandals"] },
      { name: "Winter Boot", price: [110, 290], weight: [1100, 1900], genders: { men: 3, women: 3, kids: 1 }, materials: [["leather", "rubber", "synthetic insulation"], ["nylon", "rubber", "synthetic insulation"], ["suede", "rubber", "fleece"]], waterproof: 0.85, sizes: "shoes", tags: ["winter", "snow", "insulated", "boots"] },
    ],
  },
  jackets: {
    share: 0.17,
    brands: ["Northvale", "Lumen Alpine", "Cobalt Ridge", "Tidewater", "Wren & Ember", "Highmark", "Alder & Pike"],
    subs: [
      { name: "Rain Shell", price: [90, 380], weight: [250, 520], genders: { men: 4, women: 4, kids: 1, unisex: 1 }, materials: [["gore-tex", "nylon"], ["nylon", "polyester"], ["ripstop", "nylon"]], waterproof: 1, sizes: "apparel", tags: ["rain", "shell", "hiking", "packable"] },
      { name: "Down Jacket", price: [140, 420], weight: [280, 700], genders: { men: 4, women: 4, kids: 1 }, materials: [["down", "nylon"], ["down", "ripstop"]], waterproof: 0.1, sizes: "apparel", tags: ["puffer", "insulated", "warm", "packable", "winter"] },
      { name: "Fleece Jacket", price: [50, 150], weight: [300, 600], genders: { men: 4, women: 4, kids: 2 }, materials: [["fleece", "polyester"]], waterproof: 0, sizes: "apparel", tags: ["fleece", "everyday", "warm", "camping"] },
      { name: "Softshell Jacket", price: [80, 230], weight: [350, 650], genders: { men: 3, women: 3 }, materials: [["softshell", "polyester"], ["softshell", "nylon"]], waterproof: 0.15, sizes: "apparel", tags: ["softshell", "climbing", "breathable"] },
      { name: "Insulated Parka", price: [190, 560], weight: [800, 1500], genders: { men: 3, women: 3, kids: 1 }, materials: [["down", "nylon", "gore-tex"], ["synthetic insulation", "polyester"], ["down", "polyester"]], waterproof: 0.6, sizes: "apparel", tags: ["parka", "winter", "insulated", "warm", "snow"] },
    ],
  },
  pants: {
    share: 0.12,
    brands: ["Canyon Thread", "Alder & Pike", "Northvale", "Cobalt Ridge", "Tidewater", "Highmark"],
    subs: [
      { name: "Hiking Pant", price: [45, 135], weight: [280, 480], genders: { men: 4, women: 4, kids: 1 }, materials: [["nylon"], ["nylon", "polyester"], ["ripstop", "nylon"], ["cotton", "polyester"]], waterproof: 0, sizes: "apparel", tags: ["hiking", "trail", "breathable"] },
      { name: "Rain Pant", price: [60, 210], weight: [200, 400], genders: { men: 3, women: 3, unisex: 1 }, materials: [["gore-tex", "nylon"], ["nylon", "polyester"]], waterproof: 1, sizes: "apparel", tags: ["rain", "shell", "packable"] },
      { name: "Ski Pant", price: [120, 330], weight: [600, 1000], genders: { men: 3, women: 3, kids: 1 }, materials: [["gore-tex", "polyester", "synthetic insulation"], ["nylon", "polyester"]], waterproof: 0.9, sizes: "apparel", tags: ["ski", "snow", "winter"] },
      { name: "Climbing Pant", price: [60, 125], weight: [300, 450], genders: { men: 3, women: 3 }, materials: [["cotton", "nylon"], ["softshell", "nylon"]], waterproof: 0, sizes: "apparel", tags: ["climbing", "breathable"] },
      { name: "Trail Short", price: [30, 85], weight: [120, 250], genders: { men: 3, women: 3, kids: 1 }, materials: [["nylon"], ["polyester"]], waterproof: 0, sizes: "apparel", tags: ["shorts", "running", "summer", "lightweight"] },
    ],
  },
  "base-layers": {
    share: 0.1,
    brands: ["Wren & Ember", "Bramblewood", "Lumen Alpine", "Kestrel Outdoor", "Canyon Thread"],
    subs: [
      { name: "Merino Crew", price: [55, 125], weight: [150, 260], genders: { men: 4, women: 4, kids: 1 }, materials: [["merino"]], waterproof: 0, sizes: "apparel", tags: ["baselayer", "top", "crew", "warm", "breathable"] },
      { name: "Synthetic Tee", price: [25, 70], weight: [110, 200], genders: { men: 4, women: 4, kids: 1 }, materials: [["polyester"]], waterproof: 0, sizes: "apparel", tags: ["baselayer", "top", "tee", "running", "lightweight"] },
      { name: "Merino Bottoms", price: [55, 115], weight: [160, 260], genders: { men: 4, women: 4 }, materials: [["merino"]], waterproof: 0, sizes: "apparel", tags: ["baselayer", "bottoms", "tights", "warm"] },
      { name: "Sun Hoodie", price: [35, 90], weight: [140, 240], genders: { men: 3, women: 3, kids: 1 }, materials: [["polyester"], ["nylon", "polyester"]], waterproof: 0, sizes: "apparel", tags: ["sun", "hoodie", "summer", "hiking", "breathable"] },
    ],
  },
  backpacks: {
    share: 0.13,
    brands: ["Granite Peak Co.", "Summitcraft", "Driftline", "Ridgeline Supply", "Larchmont Trail"],
    subs: [
      { name: "Daypack", price: [40, 150], weight: [450, 1000], genders: { unisex: 6, women: 1, kids: 1 }, materials: [["nylon"], ["polyester"], ["ripstop", "nylon"]], waterproof: 0.15, sizes: "one", tags: ["daypack", "hiking", "everyday"] },
      { name: "Hiking Pack", price: [130, 330], weight: [1200, 2300], genders: { unisex: 3, men: 2, women: 2 }, materials: [["nylon", "aluminium"], ["ripstop", "aluminium"]], waterproof: 0.1, sizes: "packs", tags: ["backpacking", "hiking", "pack"] },
      { name: "Travel Pack", price: [90, 230], weight: [1000, 1700], genders: { unisex: 5 }, materials: [["polyester"], ["nylon"]], waterproof: 0.1, sizes: "one", tags: ["travel", "duffel", "pack"] },
      { name: "Hydration Pack", price: [45, 135], weight: [250, 600], genders: { unisex: 4, women: 1 }, materials: [["nylon", "mesh"], ["polyester", "mesh"]], waterproof: 0, sizes: "sml", tags: ["hydration", "running", "trail", "lightweight"] },
      { name: "Ultralight Pack", price: [160, 340], weight: [450, 900], genders: { unisex: 5 }, materials: [["ripstop", "carbon"], ["ripstop"]], waterproof: 0.5, sizes: "packs", tags: ["ultralight", "backpacking", "pack", "lightweight"] },
    ],
  },
  tents: {
    share: 0.08,
    brands: ["Summitcraft", "Granite Peak Co.", "Northvale", "Driftline"],
    subs: [
      { name: "Backpacking Tent", price: [190, 680], weight: [1100, 2600], genders: { unisex: 1 }, materials: [["ripstop", "nylon", "aluminium"], ["polyester", "aluminium"]], waterproof: 0.95, sizes: "tents-small", tags: ["backpacking", "camping", "3-season"] },
      { name: "Car Camping Tent", price: [120, 520], weight: [3500, 9000], genders: { unisex: 1 }, materials: [["polyester", "aluminium"], ["cotton", "polyester"]], waterproof: 0.9, sizes: "tents-large", tags: ["camping", "car", "3-season"] },
      { name: "Ultralight Shelter", price: [260, 720], weight: [450, 1100], genders: { unisex: 1 }, materials: [["ripstop", "carbon"], ["nylon", "carbon"]], waterproof: 0.9, sizes: "tents-small", tags: ["ultralight", "shelter", "backpacking", "lightweight"] },
      { name: "Mountaineering Tent", price: [480, 950], weight: [2300, 3800], genders: { unisex: 1 }, materials: [["nylon", "aluminium"]], waterproof: 1, sizes: "tents-small", tags: ["4-season", "winter", "snow", "climbing"] },
    ],
  },
  "sleeping-bags": {
    share: 0.08,
    brands: ["Summitcraft", "Lumen Alpine", "Northvale", "Bramblewood"],
    subs: [
      { name: "Down Sleeping Bag", price: [190, 580], weight: [600, 1500], genders: { unisex: 4, women: 2 }, materials: [["down", "nylon"], ["down", "ripstop"]], waterproof: 0.1, sizes: "bags", tags: ["backpacking", "mummy", "warm", "packable"] },
      { name: "Synthetic Sleeping Bag", price: [70, 230], weight: [1100, 2200], genders: { unisex: 4, women: 1 }, materials: [["synthetic insulation", "polyester"]], waterproof: 0, sizes: "bags", tags: ["camping", "mummy", "warm"] },
      { name: "Camp Quilt", price: [150, 390], weight: [450, 900], genders: { unisex: 3 }, materials: [["down", "ripstop"], ["synthetic insulation", "ripstop"]], waterproof: 0, sizes: "bags", tags: ["quilt", "ultralight", "backpacking", "lightweight"] },
      { name: "Kids Sleeping Bag", price: [40, 95], weight: [700, 1200], genders: { kids: 1 }, materials: [["synthetic insulation", "polyester"]], waterproof: 0, sizes: "one", tags: ["camping", "warm"] },
    ],
  },
  accessories: {
    share: 0.12,
    brands: ["Bramblewood", "Wren & Ember", "Highmark", "Kestrel Outdoor", "Canyon Thread", "Driftline", "Ridgeline Supply"],
    subs: [
      { name: "Beanie", price: [18, 45], weight: [50, 110], genders: { unisex: 5, kids: 1 }, materials: [["merino"], ["fleece", "polyester"]], waterproof: 0, sizes: "one", tags: ["beanie", "hat", "warm", "winter"] },
      { name: "Insulated Glove", price: [30, 120], weight: [90, 220], genders: { men: 2, women: 2, unisex: 2, kids: 1 }, materials: [["leather", "synthetic insulation"], ["softshell", "fleece"], ["gore-tex", "nylon", "synthetic insulation"]], waterproof: 0.4, sizes: "sml", tags: ["gloves", "warm", "winter", "ski"] },
      { name: "Hiking Sock", price: [14, 32], weight: [40, 90], genders: { men: 3, women: 3, unisex: 2, kids: 1 }, materials: [["merino", "nylon"], ["polyester", "nylon"]], waterproof: 0, sizes: "sml", tags: ["socks", "hiking", "trail"] },
      { name: "Trekking Poles", price: [45, 190], weight: [300, 600], genders: { unisex: 1 }, materials: [["aluminium"], ["carbon"]], waterproof: 0, sizes: "one", tags: ["trekking", "poles", "hiking", "backpacking"] },
      { name: "Headlamp", price: [25, 110], weight: [60, 160], genders: { unisex: 1 }, materials: [["polyester"]], waterproof: 0.5, sizes: "one", tags: ["headlamp", "camping", "running"] },
      { name: "Insulated Bottle", price: [25, 55], weight: [300, 520], genders: { unisex: 1 }, materials: [["aluminium"]], waterproof: 0, sizes: "one", tags: ["bottle", "camping", "travel"] },
      { name: "Trail Cap", price: [22, 45], weight: [50, 100], genders: { unisex: 4, men: 1, women: 1 }, materials: [["nylon"], ["polyester"], ["cotton"]], waterproof: 0, sizes: "one", tags: ["cap", "hat", "sun", "running", "summer"] },
      { name: "Gaiters", price: [35, 95], weight: [150, 320], genders: { unisex: 1 }, materials: [["gore-tex", "nylon"], ["nylon"]], waterproof: 0.7, sizes: "sml", tags: ["gaiters", "snow", "hiking"] },
    ],
  },
};

const MODEL_NAMES = [
  "Talus", "Cirque", "Arete", "Scree", "Cairn", "Couloir", "Moraine", "Tarn",
  "Serac", "Saddle", "Krummholz", "Bivy", "Basin", "Summit", "Switchback", "Ridgeway",
  "Overlook", "Fernline", "Driftwood", "Cedar", "Larkspur", "Granite", "Alpenglow", "Boulder",
  "Highpoint", "Tamarack", "Kettle", "Spur", "Gully", "Traverse", "Meridian", "Wayfinder",
];

const COLOUR_SETS: Record<Category, Colour[]> = {
  footwear: ["black", "brown", "tan", "grey", "olive", "navy", "blue", "red", "orange", "teal", "purple", "white"],
  jackets: ["black", "navy", "blue", "red", "orange", "green", "olive", "yellow", "grey", "teal", "purple", "pink", "white"],
  pants: ["black", "grey", "olive", "tan", "navy", "brown", "green", "blue"],
  "base-layers": ["black", "grey", "navy", "blue", "teal", "green", "red", "purple", "pink", "white"],
  backpacks: ["black", "grey", "navy", "olive", "green", "orange", "red", "blue", "tan", "yellow"],
  tents: ["green", "orange", "yellow", "grey", "tan", "olive", "blue"],
  "sleeping-bags": ["blue", "orange", "red", "green", "navy", "grey", "purple"],
  accessories: ["black", "grey", "navy", "red", "orange", "green", "olive", "blue", "tan", "pink", "purple", "yellow"],
};

function weightedGender(weights: Partial<Record<Gender, number>>): Gender {
  const entries = Object.entries(weights) as [Gender, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [g, w] of entries) {
    r -= w;
    if (r <= 0) return g;
  }
  return entries[0][0];
}

function sizesFor(kind: Subcategory["sizes"], gender: Gender): string[] {
  switch (kind) {
    case "apparel": {
      const base = gender === "kids" ? ["XS", "S", "M", "L"] : [...APPAREL_SIZES];
      // Drop a few sizes at random to simulate partial availability.
      return base.filter(() => chance(0.85));
    }
    case "shoes": {
      if (gender === "kids") return KIDS_SHOE_SIZES.filter(() => chance(0.85));
      const range = gender === "women" ? SHOE_SIZES.slice(0, 13) : SHOE_SIZES.slice(4);
      return range.filter(() => chance(0.8));
    }
    case "tents-small":
      return [pick(["1P", "2P", "2P", "3P"])];
    case "tents-large":
      return [pick(["4P", "4P", "6P"])];
    case "bags":
      return chance(0.7) ? [...BAG_SIZES] : ["Regular"];
    case "packs":
      return ["S", "M", "L"].filter(() => chance(0.9));
    case "sml":
      return ["S", "M", "L"];
    case "one":
      return [ONE_SIZE];
  }
}

function roundPrice(p: number): number {
  if (p < 40) return Math.max(9.95, Math.round(p) - 0.05);
  return Math.round(p / 5) * 5 - 0.05;
}

function makeProduct(index: number, category: Category): Product {
  const meta = CATALOG[category];
  const sub = pick(meta.subs);
  const brand = pick(meta.brands);
  const gender = weightedGender(sub.genders);
  const model = pick(MODEL_NAMES);
  const adjective = sub.adjectives && chance(0.5) ? ` ${pick(sub.adjectives)}` : "";
  const materials = pick(sub.materials);
  const waterproof = materials.includes("gore-tex") || chance(sub.waterproof);
  const sizes = sizesFor(sub.sizes, gender);
  const tentSize = category === "tents" ? ` ${sizes[0].replace("P", "-Person")}` : "";
  const genderPrefix = gender === "men" ? "Men's " : gender === "women" ? "Women's " : gender === "kids" && !sub.name.startsWith("Kids") ? "Kids' " : "";
  const title = `${genderPrefix}${model}${adjective}${tentSize} ${sub.name}`.replace(/\s+/g, " ").trim();

  // Price: skewed toward the lower half of the range, brand tier nudges it.
  const premium = ["Lumen Alpine", "Fjellstad", "Summitcraft", "Highmark"].includes(brand) ? 1.12 : 1;
  const raw = between(sub.price[0], sub.price[1]) * (0.7 + 0.3 * rand()) * premium * (gender === "kids" ? 0.75 : 1);
  const price = roundPrice(Math.max(sub.price[0] * 0.85, raw));
  const onSale = chance(0.18);
  const compareAtPrice = onSale ? roundPrice(price / (1 - between(0.15, 0.4))) : undefined;

  const rating = Math.round(Math.min(5, Math.max(1.5, normal(4.25, 0.4))) * 10) / 10;
  const reviewCount = Math.floor(Math.exp(between(0, 7.6)));
  const weightGrams = Math.round(between(sub.weight[0], sub.weight[1]) * (gender === "kids" ? 0.7 : 1) / 10) * 10;
  const colours = pickSome(COLOUR_SETS[category], 1, 3);

  const tags = new Set(sub.tags);
  if (waterproof) tags.add("waterproof");
  const midWeight = (sub.weight[0] + sub.weight[1]) / 2;
  if (weightGrams < midWeight * 0.85) tags.add("lightweight");

  const start = Date.UTC(2023, 0, 1);
  const end = Date.UTC(2026, 8, 30);
  const createdAt = new Date(start + Math.floor(rand() * (end - start))).toISOString().slice(0, 10);

  const product: Product = {
    id: `p${String(index + 1).padStart(4, "0")}`,
    title,
    brand,
    category,
    subcategory: sub.name,
    price,
    ...(compareAtPrice ? { compareAtPrice } : {}),
    rating,
    reviewCount,
    gender,
    sizes: sizes.length ? sizes : [ONE_SIZE],
    colours,
    materials,
    waterproof,
    weightGrams,
    inStock: chance(0.88),
    tags: [...tags].sort(),
    createdAt,
  };
  return ProductSchema.parse(product);
}

function main() {
  const categories = Object.keys(CATALOG) as Category[];
  const products: Product[] = [];
  for (const category of categories) {
    const count = Math.round(TARGET_COUNT * CATALOG[category].share);
    for (let i = 0; i < count; i++) products.push(makeProduct(products.length, category));
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(here, "../data/products.json");
  mkdirSync(dirname(out), { recursive: true });
  // One product per line keeps diffs readable and the file compact.
  writeFileSync(out, `[\n${products.map((p) => JSON.stringify(p)).join(",\n")}\n]\n`);
  console.log(`Wrote ${products.length} products to data/products.json`);
}

main();
