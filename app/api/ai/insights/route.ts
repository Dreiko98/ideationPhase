import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfiles } from "@/lib/data";
import { generateHouseholdInsights } from "@/lib/ai/openai-server";
import { consumeAiRateLimit } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ householdId: z.string().regex(/^HH-\d{4}$/), refresh: z.boolean().optional() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !getProfiles().some((item) => item.household_id === parsed.data.householdId)) {
    return NextResponse.json({ error: "Invalid demo household" }, { status: 400 });
  }
  if (!consumeAiRateLimit(`insights:${parsed.data.householdId}`, 8)) return NextResponse.json({ error: "Too many AI insight requests" }, { status: 429 });
  const insights = await generateHouseholdInsights(parsed.data.householdId, parsed.data.refresh ?? false);
  return NextResponse.json(insights, { headers: { "Cache-Control": "no-store" } });
}
