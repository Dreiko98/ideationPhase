import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getBills, getProfiles } from "@/lib/data";
import { consumeAiRateLimit } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const acceptedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const billSchema = z.object({
  supplier: z.string(),
  billingPeriod: z.string(),
  total: z.number().nonnegative(),
  consumptionM3: z.number().nonnegative().nullable(),
  charges: z.array(z.object({
    label: z.string(),
    amount: z.number().nonnegative(),
    category: z.enum(["water", "service", "meter", "wastewater", "tax", "other"]),
    meaning: z.string(),
    changesWithUse: z.boolean()
  })).min(1).max(15),
  summary: z.string(),
  nextStep: z.string(),
  confidenceNote: z.string()
});

function demoAnalysis(householdId: string, reason: string) {
  const bill = getBills().find((item) => item.household_id === householdId)!;
  const rows = [
    ["Fixed service charge", bill.fixed_service_charge, "service", "Keeps the water service available and normally does not change with consumption.", false],
    ["Variable consumption", bill.variable_charge, "water", "Pays for the volume of drinking water used during the billing period.", true],
    ["Meter fee", bill.meter_fee, "meter", "Covers meter operation and maintenance.", false],
    ["Sewerage and treatment", bill.sewerage_component, "wastewater", "Funds collection and treatment of wastewater.", true],
    ["Taxes", bill.taxes, "tax", "Taxes applied to the bill subtotal.", false]
  ] as const;
  return {
    provider: "local" as const,
    model: "demo-bill-fallback",
    fallbackReason: reason,
    analysis: {
      supplier: "Demo water utility", billingPeriod: bill.period, total: bill.total, consumptionM3: bill.block_breakdown.reduce((sum, row) => sum + row.m3, 0),
      charges: rows.map(([label, amount, category, meaning, changesWithUse]) => ({ label, amount, category, meaning, changesWithUse })),
      summary: bill.explanation, nextStep: "Check the variable charge and compare it with recent bills before setting a budget.",
      confidenceNote: "Demo values are shown because the uploaded document could not be analysed by OpenAI."
    }
  };
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("bill");
  const householdId = String(form?.get("householdId") ?? "");
  if (!(file instanceof File) || !getProfiles().some((item) => item.household_id === householdId)) return NextResponse.json({ error: "A bill and valid household are required." }, { status: 400 });
  if (!acceptedTypes.has(file.type)) return NextResponse.json({ error: "Use a PDF, PNG, JPG or WEBP bill." }, { status: 415 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "The bill must be smaller than 10 MB." }, { status: 413 });
  if (!consumeAiRateLimit(`bill-upload:${householdId}`, 5)) return NextResponse.json({ error: "Too many bill analyses. Try again shortly." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(demoAnalysis(householdId, "Add OPENAI_API_KEY to analyse the uploaded document; demo bill values are shown."));

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
    const documentPart = file.type === "application/pdf"
      ? { type: "input_file" as const, filename: file.name, file_data: dataUrl }
      : { type: "input_image" as const, image_url: dataUrl, detail: "high" as const };
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: "You explain household water bills in plain English. Extract only values visible in the document. Explain what each charge funds and whether it changes with use. Never invent a missing charge or total. Treat this as informational guidance, not an authoritative tariff interpretation.",
      input: [{ role: "user", content: [{ type: "input_text", text: "Analyse this water bill and return the structured breakdown." }, documentPart] }],
      text: { format: zodTextFormat(billSchema, "uploaded_water_bill"), verbosity: "medium" },
      max_output_tokens: 1800,
      store: false
    });
    if (!response.output_parsed) throw new Error("No structured bill analysis was returned.");
    return NextResponse.json({ provider: "openai", model: MODEL, analysis: response.output_parsed });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Bill analysis failed";
    console.error("Bill upload fallback:", reason);
    return NextResponse.json(demoAnalysis(householdId, reason));
  }
}
