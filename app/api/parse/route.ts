import { z } from "zod";
import { parseQuery } from "@/lib/parse";

const BodySchema = z.object({ query: z.string().trim().min(1).max(300) });

function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON like { \"query\": \"...\" }." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "The query must be between 1 and 300 characters." }, { status: 400 });
  }
  const result = await parseQuery(parsed.data.query, { ip: clientIp(request) });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
