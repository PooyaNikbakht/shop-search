// Shared vocabulary for the catalog, the filter schema, the parsers and the UI.
// Every enum the LLM is allowed to return lives here.

export const CATEGORIES = [
  "footwear",
  "jackets",
  "pants",
  "base-layers",
  "backpacks",
  "tents",
  "sleeping-bags",
  "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  footwear: "Footwear",
  jackets: "Jackets",
  pants: "Pants",
  "base-layers": "Base layers",
  backpacks: "Backpacks",
  tents: "Tents",
  "sleeping-bags": "Sleeping bags",
  accessories: "Accessories",
};

export const GENDERS = ["men", "women", "unisex", "kids"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  men: "Men",
  women: "Women",
  unisex: "Unisex",
  kids: "Kids",
};

export const BRANDS = [
  "Alder & Pike",
  "Bramblewood",
  "Canyon Thread",
  "Cobalt Ridge",
  "Driftline",
  "Fjellstad",
  "Granite Peak Co.",
  "Highmark",
  "Kestrel Outdoor",
  "Larchmont Trail",
  "Lumen Alpine",
  "Northvale",
  "Ridgeline Supply",
  "Summitcraft",
  "Tidewater",
  "Wren & Ember",
] as const;
export type Brand = (typeof BRANDS)[number];

export const COLOURS = [
  "black",
  "white",
  "grey",
  "navy",
  "blue",
  "teal",
  "green",
  "olive",
  "red",
  "orange",
  "yellow",
  "brown",
  "tan",
  "purple",
  "pink",
] as const;
export type Colour = (typeof COLOURS)[number];

export const COLOUR_HEX: Record<Colour, string> = {
  black: "#1F2328",
  white: "#F2F2EE",
  grey: "#8A9099",
  navy: "#1E2F55",
  blue: "#2F6FB7",
  teal: "#1B8A84",
  green: "#3C7A46",
  olive: "#6B6F3A",
  red: "#B83A32",
  orange: "#D9752B",
  yellow: "#D9B53B",
  brown: "#6E4B32",
  tan: "#B79A73",
  purple: "#6A4C93",
  pink: "#D27A9A",
};

export const MATERIALS = [
  "leather",
  "suede",
  "mesh",
  "rubber",
  "nylon",
  "polyester",
  "ripstop",
  "gore-tex",
  "softshell",
  "fleece",
  "merino",
  "down",
  "synthetic insulation",
  "cotton",
  "aluminium",
  "carbon",
] as const;
export type Material = (typeof MATERIALS)[number];

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const SHOE_SIZES = [
  "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5",
  "10", "10.5", "11", "11.5", "12", "13",
] as const;
export const KIDS_SHOE_SIZES = ["1", "2", "3", "4", "5", "6"] as const;
export const TENT_SIZES = ["1P", "2P", "3P", "4P", "6P"] as const;
export const BAG_SIZES = ["Regular", "Long"] as const;
export const ONE_SIZE = "One Size";

/** All sizes that exist anywhere in the catalog. */
export const ALL_SIZES: readonly string[] = Array.from(
  new Set<string>([
    ...APPAREL_SIZES,
    ...SHOE_SIZES,
    ...KIDS_SHOE_SIZES,
    ...TENT_SIZES,
    ...BAG_SIZES,
    ONE_SIZE,
  ]),
);

export const SORTS = ["relevance", "price-asc", "price-desc", "rating", "newest"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  relevance: "Relevance",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  newest: "Newest",
};

export const PRICE_BUCKETS = [
  { id: "0-50", label: "Under $50", min: undefined, max: 50 },
  { id: "50-100", label: "$50 to $100", min: 50, max: 100 },
  { id: "100-200", label: "$100 to $200", min: 100, max: 200 },
  { id: "200-400", label: "$200 to $400", min: 200, max: 400 },
  { id: "400+", label: "$400 and up", min: 400, max: undefined },
] as const satisfies ReadonlyArray<{ id: string; label: string; min?: number; max?: number }>;

/**
 * Words the catalog actually uses in titles, subcategories and tags. The
 * offline parser keeps these as free-text keywords; anything else that is not
 * a known filter ends up in `unmapped`.
 */
export const KEYWORD_VOCABULARY = [
  "hiking", "trail", "running", "runner", "runners", "approach", "sandal", "sandals",
  "winter", "boot", "boots", "shoe", "shoes", "sneaker", "sneakers",
  "rain", "shell", "puffer", "parka", "insulated", "fleece", "softshell", "vest",
  "climbing", "ski", "snow", "shorts", "joggers", "tights", "leggings",
  "top", "tee", "hoodie", "sun", "crew", "bottoms", "baselayer",
  "daypack", "pack", "travel", "hydration", "duffel",
  "backpacking", "camping", "car", "shelter", "trekking", "poles",
  "quilt", "mummy", "beanie", "gloves", "socks", "headlamp", "bottle",
  "gaiters", "cap", "hat", "ultralight", "lightweight", "packable", "breathable",
  "warm", "summer", "3-season", "4-season", "mid", "low",
] as const;
