/**
 * Deterministic rule-based parser. No keys, no network, used by tests, the
 * public demo fallback, and as the baseline in the eval suite.
 */
import {
  BRANDS,
  COLOURS,
  KEYWORD_VOCABULARY,
  MATERIALS,
  type Brand,
  type Category,
  type Colour,
  type Gender,
  type Material,
} from "../catalog-meta";
import { describeFilters } from "../describe";
import { normalizeFilters, type Filters } from "../schema";
import type { Parser, RawParse } from "./types";

const BREAK = " ¦ ";

type Draft = {
  categories: Set<Category>;
  brands: Set<Brand>;
  genders: Set<Gender>;
  sizes: Set<string>;
  colours: Set<Colour>;
  materialsInclude: Set<Material>;
  materialsExclude: Set<Material>;
  keywords: Set<string>;
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  waterproof?: boolean;
  maxWeightGrams?: number;
  inStock?: true;
  onSale?: true;
  notes: string[];
  /** Size words like "medium" that only count when the category is sized that way. */
  softSizes: Array<[phrase: string, size: string]>;
};

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const GENDER_ALIASES: Record<Gender, string[]> = {
  women: ["women's", "womens", "women", "woman's", "woman", "ladies", "lady's", "female", "for her"],
  men: ["men's", "mens", "men", "man's", "male", "guys", "for him"],
  kids: ["kids'", "kid's", "kids", "kid", "children's", "children", "child", "youth", "boys", "girls", "junior"],
  unisex: ["unisex", "gender neutral"],
};

const COLOUR_ALIASES: Record<string, Colour> = {
  gray: "grey", charcoal: "grey", silver: "grey", khaki: "tan", beige: "tan", sand: "tan",
  maroon: "red", burgundy: "red", crimson: "red", lime: "green", forest: "green", "forest green": "green",
  "sky blue": "blue", "light blue": "blue", cobalt: "blue", turquoise: "teal", aqua: "teal",
  violet: "purple", lavender: "purple", magenta: "pink", coral: "orange", gold: "yellow",
  mustard: "yellow", chocolate: "brown", coffee: "brown", army: "olive", "army green": "olive",
};

const MATERIAL_ALIASES: Record<string, Material> = {
  "gore-tex": "gore-tex", "gore tex": "gore-tex", goretex: "gore-tex", gtx: "gore-tex",
  "merino wool": "merino", merino: "merino", wool: "merino",
  "synthetic insulation": "synthetic insulation", synthetic: "synthetic insulation", primaloft: "synthetic insulation",
  aluminum: "aluminium", aluminium: "aluminium", "carbon fiber": "carbon", "carbon fibre": "carbon", carbon: "carbon",
  leather: "leather", suede: "suede", mesh: "mesh", rubber: "rubber", nylon: "nylon", polyester: "polyester",
  ripstop: "ripstop", softshell: "softshell", "soft shell": "softshell", fleece: "fleece", down: "down", cotton: "cotton",
};

/** Category nouns. Keywords (comma-separated) are added when the noun is narrower than the category. */
const CATEGORY_ALIASES: Array<[string, Category, string?]> = [
  ["sleeping bags", "sleeping-bags"], ["sleeping bag", "sleeping-bags"], ["quilts", "sleeping-bags", "quilt"], ["quilt", "sleeping-bags", "quilt"],
  ["base layers", "base-layers"], ["base layer", "base-layers"], ["baselayers", "base-layers"], ["baselayer", "base-layers"],
  ["thermals", "base-layers"], ["long underwear", "base-layers"],
  ["sun hoodies", "base-layers", "sun"], ["sun hoodie", "base-layers", "sun"],
  ["t-shirts", "base-layers", "tee"], ["t-shirt", "base-layers", "tee"], ["tees", "base-layers", "tee"], ["tee", "base-layers", "tee"],
  ["trail runners", "footwear", "trail"], ["trail running shoes", "footwear", "trail"], ["running shoes", "footwear", "running"],
  ["hiking boots", "footwear", "hiking,boots"], ["approach shoes", "footwear", "approach"], ["hiking shoes", "footwear", "hiking"],
  ["boots", "footwear", "boots"], ["boot", "footwear", "boots"], ["hikers", "footwear", "hiking"],
  ["sandals", "footwear", "sandals"], ["sandal", "footwear", "sandals"],
  ["sneakers", "footwear", "shoes"], ["trainers", "footwear", "shoes"], ["runners", "footwear", "runner"],
  ["shoes", "footwear"], ["shoe", "footwear"], ["footwear", "footwear"],
  ["rain jackets", "jackets", "rain"], ["rain jacket", "jackets", "rain"], ["raincoat", "jackets", "rain"],
  ["rain shell", "jackets", "rain"], ["shells", "jackets", "shell"], ["shell", "jackets", "shell"],
  ["puffers", "jackets", "puffer"], ["puffer", "jackets", "puffer"], ["parkas", "jackets", "parka"], ["parka", "jackets", "parka"],
  ["windbreaker", "jackets"], ["anorak", "jackets"], ["coats", "jackets"], ["coat", "jackets"],
  ["jackets", "jackets"], ["jacket", "jackets"],
  ["rain pants", "pants", "rain"], ["ski pants", "pants", "ski"], ["trousers", "pants"], ["shorts", "pants", "shorts"],
  ["pants", "pants"], ["pant", "pants"],
  ["daypacks", "backpacks", "daypack"], ["daypack", "backpacks", "daypack"], ["rucksack", "backpacks"],
  ["backpacks", "backpacks"], ["backpack", "backpacks"], ["packs", "backpacks"], ["pack", "backpacks"],
  ["tents", "tents"], ["tent", "tents"], ["shelters", "tents", "shelter"], ["shelter", "tents", "shelter"],
  ["beanies", "accessories", "beanie"], ["beanie", "accessories", "beanie"], ["hats", "accessories", "hat"], ["hat", "accessories", "hat"],
  ["caps", "accessories", "cap"], ["cap", "accessories", "cap"], ["gloves", "accessories", "gloves"], ["mittens", "accessories", "gloves"],
  ["socks", "accessories", "socks"], ["trekking poles", "accessories", "poles"], ["poles", "accessories", "poles"],
  ["headlamps", "accessories", "headlamp"], ["headlamp", "accessories", "headlamp"], ["water bottle", "accessories", "bottle"],
  ["bottles", "accessories", "bottle"], ["bottle", "accessories", "bottle"], ["gaiters", "accessories", "gaiters"],
  ["accessories", "accessories"],
];

/** Free-text keywords, normalised to the form the catalog uses. */
const KEYWORD_ALIASES: Record<string, string> = {
  hike: "hiking", hikes: "hiking", hiking: "hiking", trail: "trail", trails: "trail",
  run: "running", running: "running", jogging: "running", camp: "camping", camping: "camping",
  climb: "climbing", climbing: "climbing", bouldering: "climbing", ski: "ski", skiing: "ski", snowboarding: "snow",
  snow: "snow", backpacking: "backpacking", thru: "backpacking", travel: "travel", travelling: "travel", traveling: "travel",
  winter: "winter", summer: "summer", rain: "rain", rainy: "rain", ultralight: "ultralight", ultralite: "ultralight", "ultra light": "ultralight",
  lightweight: "lightweight", light: "lightweight", packable: "packable", breathable: "breathable",
  warm: "warm", insulated: "insulated", "3-season": "3-season", "three season": "3-season",
  "4-season": "4-season", "four season": "4-season", hydration: "hydration", "car camping": "car",
};

const BRAND_ALIASES: Array<[string, Brand]> = BRANDS.flatMap((brand): Array<[string, Brand]> => {
  const lower = brand.toLowerCase();
  const out: Array<[string, Brand]> = [[lower, brand], [lower.replace(" & ", " and "), brand]];
  const short = lower.replace(/ (co\.|supply|outdoor|trail)$/, "");
  if (short !== lower) out.push([short, brand]);
  return out;
});

const SIZE_WORDS: Record<string, string> = {
  xxs: "XS", xs: "XS", "extra small": "XS", "x-small": "XS", s: "S", small: "S", m: "M", medium: "M",
  l: "L", large: "L", xl: "XL", "x-large": "XL", "extra large": "XL", xxl: "XXL", "2xl": "XXL", "xx-large": "XXL",
  regular: "Regular", long: "Long",
};

const STOP = new Set([
  "a", "an", "the", "and", "or", "with", "of", "in", "on", "to", "that", "which", "are", "is", "be",
  "some", "any", "i", "i'm", "im", "want", "wanna", "need", "needs", "looking", "look", "show", "me", "find",
  "get", "please", "something", "stuff", "good", "nice", "great", "new", "pair", "pairs", "set", "also",
  "but", "both", "either", "like", "really", "very", "just", "can", "you", "for", "my", "your", "our",
  "his", "her", "as", "it", "one", "ones", "from", "by", "at", "up", "all", "that's", "thats", "have",
  "has", "would", "should", "could", "will", "buy", "shopping", "gear", "item", "items", "products", "product",
  "options", "made", "size", "sizes", "colour", "color", "colours", "colors", "price", "priced", "around",
  "about", "available", "only", "under", "over", "than", "less", "more", "rated", "stars", "star", "plus",
]);
/** Kept at the start of an unmapped phrase so "for my dad" reads naturally. */
const KEEP_LEAD = new Set(["for", "as"]);

// Every word the parser understands, used for typo correction.
const DICTIONARY: Set<string> = new Set(
  [
    ...Object.values(GENDER_ALIASES).flat(),
    ...COLOURS, ...Object.keys(COLOUR_ALIASES),
    ...MATERIALS, ...Object.keys(MATERIAL_ALIASES),
    ...CATEGORY_ALIASES.map(([a]) => a),
    ...Object.keys(KEYWORD_ALIASES), ...KEYWORD_VOCABULARY,
    ...BRAND_ALIASES.map(([a]) => a),
    "waterproof", "water", "proof", "resistant", "stock", "sale", "discounted", "clearance", "under", "below",
    "between", "stars", "rated", "rating", "without", "except", "vegan", "lighter", "weighing", "dollars", "bucks",
  ].flatMap((p) => p.split(/\s+/)),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k\b)?`;

function toNumber(digits: string, k?: string): number {
  const n = Number(digits.replace(/,/g, ""));
  return k ? n * 1000 : n;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A longest-first alternation group, with no boundaries. */
function alternation(phrases: string[]): string {
  const sorted = [...new Set(phrases)].sort((a, b) => b.length - a.length).map(escape);
  return `(${sorted.join("|")})`;
}

/** Word-bounded version of `alternation`, as a global regex. */
function phraseRegex(phrases: string[]): RegExp {
  return new RegExp(String.raw`(?<![\w'-])${alternation(phrases)}(?![\w-])`, "g");
}

function damerauLevenshtein(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Corrects likely typos ("waterprof", "jakcet") against the parser dictionary. */
export function correctTypos(text: string): string {
  return text.replace(/[a-z][a-z'-]{3,}/g, (word) => {
    if (word.length < 5 || DICTIONARY.has(word) || STOP.has(word)) return word;
    const maxDistance = word.length >= 8 ? 2 : 1;
    let best: string | undefined;
    let bestDistance = maxDistance + 1;
    for (const candidate of DICTIONARY) {
      if (Math.abs(candidate.length - word.length) > maxDistance || candidate.length < 4) continue;
      const distance = damerauLevenshtein(word, candidate);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best ?? word;
  });
}

// ---------------------------------------------------------------------------
// Rules. Each rule consumes the text it understood, replacing it with a break.
// ---------------------------------------------------------------------------

type Rule = (text: string, d: Draft) => string;

const consume = (text: string, re: RegExp, fn: (...m: string[]) => boolean | void): string =>
  text.replace(re, (...args: unknown[]) => {
    const groups = args.slice(0, -2).map((g) => (typeof g === "string" ? g : ""));
    return fn(...groups) === false ? groups[0] : BREAK;
  });

const CURRENCY = String.raw`(?:\s*(?:bucks|dollars|usd|cad))?`;

const priceRules: Rule = (text, d) => {
  // Ranges: "between 50 and 80 bucks", "$50-$80", "50 to 80 dollars"
  text = consume(
    text,
    new RegExp(String.raw`(?:between|from)\s+\$?${NUM}\s*(?:and|to|-)\s*\$?${NUM}${CURRENCY}`, "g"),
    (_m, a, ak, b, bk) => {
      d.priceMin = toNumber(a, ak);
      d.priceMax = toNumber(b, bk);
    },
  );
  text = consume(text, new RegExp(String.raw`\$${NUM}\s*(?:-|to)\s*\$?${NUM}${CURRENCY}`, "g"), (_m, a, ak, b, bk) => {
    d.priceMin = toNumber(a, ak);
    d.priceMax = toNumber(b, bk);
  });
  text = consume(text, new RegExp(String.raw`\b${NUM}\s*(?:-|to)\s*${NUM}\s*(?:bucks|dollars|usd)`, "g"), (_m, a, ak, b, bk) => {
    d.priceMin = toNumber(a, ak);
    d.priceMax = toNumber(b, bk);
  });
  // Upper bound: "under $150", "less than 1.5k", "max 200 bucks"
  text = consume(
    text,
    new RegExp(
      String.raw`(?:under|below|less than|cheaper than|no more than|not more than|max(?:imum)?|up to|at most|within|<)\s*\$?${NUM}${CURRENCY}(?!\s*(?:kg|g|grams?|lbs?|pounds?|oz|stars?|person|p\b))`,
      "g",
    ),
    (_m, a, k) => {
      d.priceMax = toNumber(a, k);
    },
  );
  // Lower bound: "over $100", "at least 200"
  text = consume(
    text,
    new RegExp(
      String.raw`(?:over|above|more than|at least|starting at|min(?:imum)?|>)\s*\$?${NUM}${CURRENCY}(?!\s*(?:kg|g|grams?|lbs?|pounds?|oz|stars?|person|p\b|\.\d))`,
      "g",
    ),
    (_m, a, k) => {
      d.priceMin = toNumber(a, k);
    },
  );
  // Bare amount: "$150", "150 bucks" reads as a budget ceiling.
  text = consume(text, new RegExp(String.raw`(?:\$${NUM}${CURRENCY}|\b${NUM}\s*(?:bucks|dollars|usd))`, "g"), (_m, a, ak, b, bk) => {
    if (d.priceMax === undefined) d.priceMax = a ? toNumber(a, ak) : toNumber(b, bk);
  });
  return text;
};

const ratingRules: Rule = (text, d) => {
  text = consume(
    text,
    /(?:(?:at least|rated|min(?:imum)?|over|above)\s+)?(\d(?:\.\d)?)\s*\+?\s*(?:-\s*)?stars?(?:\s*(?:rating|rated))?(?:\s*(?:and up|and above|or more|or better|or higher|plus|\+|minimum))?/g,
    (_m, n) => {
      const v = Number(n);
      if (v < 1 || v > 5) return false;
      d.minRating = v;
    },
  );
  text = consume(text, /rated\s+(\d(?:\.\d)?)\s*(?:\+|or (?:more|better|higher|above)|and (?:up|above))?/g, (_m, n) => {
    const v = Number(n);
    if (v < 1 || v > 5) return false;
    d.minRating = v;
  });
  text = consume(text, /\b(top|best|highest)[\s-]rated\b/g, () => {
    d.minRating = 4.5;
  });
  text = consume(text, /\b(?:highly|well)[\s-](?:rated|reviewed)\b|\bgood reviews\b/g, () => {
    d.minRating = 4;
  });
  return text;
};

const weightRules: Rule = (text, d) =>
  consume(
    text,
    new RegExp(
      String.raw`(?:under|below|less than|lighter than|max(?:imum)?|at most|weighing less than|weighs less than|<)\s*${NUM}\s*(kg|kgs|kilos?|kilograms?|g|grams?|lbs?|pounds?|oz|ounces?)\b`,
      "g",
    ),
    (_m, n, k, unit) => {
      const v = toNumber(n, k);
      const grams = unit.startsWith("k") ? v * 1000 : unit.startsWith("l") || unit.startsWith("p") ? v * 453.6 : unit.startsWith("o") ? v * 28.35 : v;
      d.maxWeightGrams = Math.round(grams);
    },
  );

const sizeRules: Rule = (text, d) => {
  const words = Object.keys(SIZE_WORDS).sort((a, b) => b.length - a.length).map(escape).join("|");
  const one = String.raw`(\d{1,2}(?:\.5)?|${words})(?![\w-])`;
  const more = String.raw`(?:\s*(?:or|and|,|/)\s*${one})?`;
  text = consume(text, new RegExp(String.raw`\bsize[sd]?\s*:?\s*${one}${more}${more}`, "g"), (_m, a, b, c) => {
    for (const s of [a, b, c]) if (s) d.sizes.add(SIZE_WORDS[s] ?? s);
  });
  text = consume(text, /\b(\d)[\s-]?(?:person|people|man|p)\b/g, (_m, n) => {
    d.sizes.add(`${n}P`);
    d.categories.add("tents");
  });
  text = consume(text, /\b(?:in (?:a )?)(extra small|extra large|x-large|xx-large|small|medium|large|xxl|xl|xs)\b|\b(xxl|xl|xs|2xl)\b/g, (_m, a, b) => {
    d.sizes.add(SIZE_WORDS[a || b]);
  });
  // A bare "medium" is only a size for things sold in S/M/L.
  text = consume(text, /\b(extra small|extra large|small|medium|large)\b(?!\s*(?:tent|sleeping|bag|quilt))/g, (m, w) => {
    d.softSizes.push([m.trim(), SIZE_WORDS[w]]);
  });
  return text;
};

const MATERIAL_RE = String.raw`${alternation(Object.keys(MATERIAL_ALIASES))}(?![\w-])`;
const COLOUR_WORDS = [...COLOURS, ...Object.keys(COLOUR_ALIASES)];

const negationRules: Rule = (text, d) => {
  const neg = String.raw`(?:not|no|non|without|free of|avoid|avoiding|except|anything but|nothing)`;
  text = consume(text, new RegExp(String.raw`\bvegan\b`, "g"), () => {
    for (const m of ["leather", "suede", "down", "merino"] as const) d.materialsExclude.add(m);
  });
  text = consume(text, new RegExp(String.raw`\b${neg}[\s-]+${MATERIAL_RE}`, "g"), (_m, mat) => {
    d.materialsExclude.add(MATERIAL_ALIASES[mat]);
  });
  text = consume(text, new RegExp(String.raw`(?<![\w'-])${alternation(Object.keys(MATERIAL_ALIASES))}[\s-]free\b`, "g"), (_m, mat) => {
    d.materialsExclude.add(MATERIAL_ALIASES[mat]);
  });
  text = consume(text, /\b(?:not|non)[\s-]?waterproof\b/g, () => {
    d.waterproof = false;
  });
  // Excluding a colour isn't a filter we support: report it honestly.
  text = consume(text, new RegExp(String.raw`\b${neg}[\s-]+${alternation(COLOUR_WORDS)}(?![\w-])`, "g"), (m) => {
    d.notes.push(m.trim());
  });
  return text;
};

const flagRules: Rule = (text, d) => {
  text = consume(text, /\bwater[\s-]?(?:proof|resistant|tight)\b|\bwaterproof\b|\bwp\b/g, () => {
    d.waterproof = true;
  });
  text = consume(text, /\b(?:in[\s-]stock|available now|ready to ship|ships (?:now|today))\b/g, () => {
    d.inStock = true;
  });
  text = consume(text, /\b(?:on sale|sale|discounted|discount|deals?|clearance|marked down)\b/g, () => {
    d.onSale = true;
  });
  return text;
};

const genderRules: Rule = (text, d) => {
  for (const gender of ["women", "kids", "unisex", "men"] as const) {
    text = consume(text, phraseRegex(GENDER_ALIASES[gender]), () => {
      d.genders.add(gender);
    });
  }
  return text;
};

const brandRules: Rule = (text, d) =>
  consume(text, phraseRegex(BRAND_ALIASES.map(([a]) => a)), (m) => {
    const hit = BRAND_ALIASES.find(([a]) => a === m);
    if (hit) d.brands.add(hit[1]);
  });

const categoryRules: Rule = (text, d) =>
  consume(text, phraseRegex(CATEGORY_ALIASES.map(([a]) => a)), (m) => {
    const hit = CATEGORY_ALIASES.find(([a]) => a === m);
    if (!hit) return false;
    d.categories.add(hit[1]);
    for (const k of hit[2]?.split(",") ?? []) d.keywords.add(k);
  });

const materialRules: Rule = (text, d) =>
  consume(text, phraseRegex(Object.keys(MATERIAL_ALIASES)), (m) => {
    d.materialsInclude.add(MATERIAL_ALIASES[m]);
  });

const colourRules: Rule = (text, d) =>
  consume(text, phraseRegex(COLOUR_WORDS), (m) => {
    d.colours.add((COLOURS as readonly string[]).includes(m) ? (m as Colour) : COLOUR_ALIASES[m]);
  });

const keywordRules: Rule = (text, d) =>
  consume(text, phraseRegex(Object.keys(KEYWORD_ALIASES)), (m) => {
    d.keywords.add(KEYWORD_ALIASES[m]);
  });

const RULES: Rule[] = [
  weightRules,
  ratingRules,
  priceRules,
  sizeRules,
  negationRules,
  flagRules,
  brandRules,
  genderRules,
  categoryRules,
  materialRules,
  colourRules,
  keywordRules,
];

function leftovers(text: string): string[] {
  const out: string[] = [];
  for (const segment of text.split(/¦|[,;.!?()]|\s-\s/)) {
    const words = segment.split(/\s+/).map((w) => w.replace(/^['"]+|['"]+$/g, "")).filter(Boolean);
    if (!words.some((w) => !STOP.has(w) && !/^\d+$/.test(w))) continue;
    let start = 0;
    let end = words.length;
    while (start < end && STOP.has(words[start]) && !KEEP_LEAD.has(words[start])) start++;
    while (end > start && STOP.has(words[end - 1])) end--;
    // A lead-in like "for" only stays if the phrase still has content after it.
    const phrase = words.slice(start, end).join(" ");
    if (phrase) out.push(phrase);
  }
  return out;
}

export function parseOffline(query: string): { filters: Filters; interpretation: string; unmapped: string[] } {
  const d: Draft = {
    categories: new Set(), brands: new Set(), genders: new Set(), sizes: new Set(), colours: new Set(),
    materialsInclude: new Set(), materialsExclude: new Set(), keywords: new Set(), notes: [], softSizes: [],
  };
  let text = ` ${correctTypos(query.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim())} `;
  for (const rule of RULES) text = rule(text, d);

  const sizedInSml: Category[] = ["jackets", "pants", "base-layers", "backpacks", "accessories"];
  const softOk = d.categories.size === 0 || [...d.categories].some((c) => sizedInSml.includes(c));
  for (const [phrase, size] of d.softSizes) {
    if (softOk) d.sizes.add(size);
    else d.notes.push(phrase);
  }

  // A material the shopper excluded can't also be required.
  for (const m of d.materialsExclude) d.materialsInclude.delete(m);
  if (d.priceMin !== undefined && d.priceMax !== undefined && d.priceMin > d.priceMax) {
    [d.priceMin, d.priceMax] = [d.priceMax, d.priceMin];
  }
  if (d.minRating !== undefined) d.minRating = Math.min(5, Math.max(1, d.minRating));

  const filters = normalizeFilters({
    categories: [...d.categories],
    brands: [...d.brands],
    genders: [...d.genders],
    priceMin: d.priceMin,
    priceMax: d.priceMax,
    minRating: d.minRating,
    sizes: [...d.sizes],
    colours: [...d.colours],
    materialsInclude: [...d.materialsInclude],
    materialsExclude: [...d.materialsExclude],
    waterproof: d.waterproof,
    maxWeightGrams: d.maxWeightGrams,
    inStock: d.inStock,
    onSale: d.onSale,
    keywords: [...d.keywords].slice(0, 8),
  });
  const unmapped = [...d.notes, ...leftovers(text)];
  return { filters, interpretation: describeFilters(filters), unmapped };
}

export const offlineParser: Parser = {
  name: "offline",
  async parse(query: string): Promise<RawParse> {
    return parseOffline(query);
  },
};
