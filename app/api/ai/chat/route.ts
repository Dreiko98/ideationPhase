import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfiles } from "@/lib/data";
import { generateChatAnswer } from "@/lib/ai/openai-server";
import { consumeAiRateLimit } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  householdId: z.string().regex(/^HH-\d{4}$/),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) })).min(1).max(20)
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !getProfiles().some((item) => item.household_id === parsed.data.householdId)) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }
  if (!consumeAiRateLimit(`chat:${parsed.data.householdId}`, 20)) return NextResponse.json({ error: "Too many chat requests" }, { status: 429 });
  const answer = await generateChatAnswer(parsed.data.householdId, parsed.data.messages);
  return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" } });
}
