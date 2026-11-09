import { PRODUCTS } from "@/lib/catalog";
import { search } from "@/lib/engine";
import { stateFromParams } from "@/lib/url";

export async function GET(request: Request) {
  const started = performance.now();
  const { filters, sort, page } = stateFromParams(new URL(request.url).searchParams);
  const result = search(PRODUCTS, filters, { sort, page });
  const ms = performance.now() - started;
  return Response.json(
    { ...result, filters },
    { headers: { "Server-Timing": `search;dur=${ms.toFixed(1)}`, "Cache-Control": "no-store" } },
  );
}
