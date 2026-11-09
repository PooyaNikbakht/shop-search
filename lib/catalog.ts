import raw from "@/data/products.json";
import type { Product } from "./schema";

/** The generated catalog. Validated by the generator, so it is trusted here. */
export const PRODUCTS: readonly Product[] = raw as Product[];
