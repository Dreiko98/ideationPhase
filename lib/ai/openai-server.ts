import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { runCopilot } from "@/lib/copilot";
import { generateStructuredSummary } from "@/lib/aiSummary";
import { AiChatResponse, AiInsights, ChatApiMessage, FACT_KEYS, FactKey } from "./contracts";
import { buildHouseholdAiContext, safetyIdentifier } from "./context";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const factKeySchema = z.enum(FACT_KEYS);

const insightsSchema = z.object({
  summary: z.object({
    whatChanged: z.string(),
    whatMayExplain: z.string(),
    whatToDo: z.string(),
    confidence: z.string()
  }),
  recommendations: z.array(z.object({
    sourceRecommendationId: z.string(),
    title: z.string(),
    explanation: z.string(),
    expectedImpact: z.string(),
    actionSteps: z.array(z.string()).min(2).max(4)
  })).length(3),
  communitySummary: z.object({
    headline: z.string(),
    interpretation: z.string(),
    comparison: z.string(),
    privacyNote: z.string()
  }),
  billSummary: z.object({
    headline: z.string(),
    explanation: z.string(),
    nextStep: z.string()
  }),
  factKeys: z.array(factKeySchema).min(1)
});

const chatSchema = z.object({
  message: z.string(),
  factKeys: z.array(factKeySchema),
  followUp: z.string(),
  suggestedActions: z.array(z.string()).max(3)
});

const insightCache = new Map<string, { expires: number; value: Promise<AiInsights> }>();

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function localInsights(householdId: string, reason: string): AiInsights {
  const { snapshot, forecast, recommendations, matched, bill, facts } = buildHouseholdAiContext(householdId);
  const summary = generateStructuredSummary({
    consumption_change_7d: snapshot.week_change_pct,
    main_change_period: "06:00–08:00",
    forecast_month_m3: forecast.month_end_projection_m3,
    budget_m3: snapshot.budget_m3,
    night_flow_status: snapshot.night_flow_average < 8 ? "normal" : "elevated",
    outdoor_use_probability: snapshot.estimated_outdoor_share,
    peer_percentile: snapshot.peer_percentile,
    top_recommendation: recommendations[0]?.title ?? "Monitor the next seven days",
    confidence: "medium"
  });
  return {
    provider: "local",
    model: "deterministic-fallback",
    generatedAt: new Date().toISOString(),
    fallbackReason: reason,
    summary,
    recommendations: recommendations.slice(0, 3).map((item) => ({
      sourceRecommendationId: item.recommendation_id,
      title: item.title,
      explanation: item.explanation,
      expectedImpact: item.estimated_impact_range,
      actionSteps: item.action_steps
    })),
    communitySummary: {
      headline: `You are at the ${matched.percentile}th percentile in your matched cohort.`,
      interpretation: `The comparison includes ${matched.cohort_size} households with a median of ${matched.median_lppd.toFixed(1)} L/person/day.`,
      comparison: `Your recent use is ${matched.diff_from_median_pct.toFixed(1)}% from the matched median.`,
      privacyNote: "Only anonymous cohort and district aggregates are used; no other household reading is shown."
    },
    billSummary: {
      headline: `Your synthetic bill is €${bill.total.toFixed(2)}.`,
      explanation: bill.explanation,
      nextStep: "Review the variable charge and forecast before changing your monthly goal."
    },
    factKeys: Object.keys(facts) as FactKey[]
  };
}

async function requestInsights(householdId: string): Promise<AiInsights> {
  if (!process.env.OPENAI_API_KEY) return localInsights(householdId, "Add OPENAI_API_KEY to .env.local to enable OpenAI.");
  const { context, facts, recommendations } = buildHouseholdAiContext(householdId);
  try {
    const response = await client().responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: [
        "You are WaterLens, a careful household water-use analyst.",
        "Use the supplied JSON as the source of truth for household metrics. Do not alter a measured metric or present a suggested value as measured data.",
        "You may introduce reasonable durations, step counts, suggested targets or indicative savings as part of advice, but label them clearly as recommendations or estimates rather than household facts.",
        "Do not diagnose a leak; describe signals and practical checks.",
        "Turn analytical recommendation candidates into personalised, low-risk actions. Keep each sourceRecommendationId unchanged and use exactly the three supplied candidates.",
        "Distinguish measured use, model forecasts, uncertainty, cohort aggregates, and synthetic bill data.",
        "Use plain English for a general household. State uncertainty and avoid guilt, alarm, guarantees, or claims of causation.",
        "For factKeys, list every metric used in the prose. Never expose household IDs or postal information."
      ].join(" "),
      input: JSON.stringify({ household_context: context, canonical_facts: facts, allowed_recommendation_ids: recommendations.map((item) => item.recommendation_id) }),
      text: { format: zodTextFormat(insightsSchema, "waterlens_insights"), verbosity: "medium" },
      max_output_tokens: 1800,
      safety_identifier: safetyIdentifier(householdId),
      store: false
    });
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("OpenAI returned no structured insight output");
    const allowedIds = new Set(recommendations.map((item) => item.recommendation_id));
    if (parsed.recommendations.some((item) => !allowedIds.has(item.sourceRecommendationId))) {
      throw new Error("OpenAI returned an unknown recommendation ID");
    }
    return { provider: "openai", model: MODEL, generatedAt: new Date().toISOString(), ...parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI error";
    console.error("WaterLens insights fallback:", message);
    return localInsights(householdId, message);
  }
}

export async function generateHouseholdInsights(householdId: string, refresh = false) {
  const key = `${MODEL}:${householdId}`;
  const cached = insightCache.get(key);
  if (!refresh && cached && cached.expires > Date.now()) return cached.value;
  const value = requestInsights(householdId);
  insightCache.set(key, { expires: Date.now() + 5 * 60 * 1000, value });
  return value;
}

function localChat(householdId: string, question: string, reason: string): AiChatResponse {
  const { snapshot, forecast, recommendations, anomalies, matched } = buildHouseholdAiContext(householdId);
  const result = runCopilot(question, { snapshot, forecast, recommendations, anomalies, matchedComparison: matched });
  return {
    provider: "local",
    model: "deterministic-fallback",
    message: result.message,
    facts: result.facts,
    factKeys: [],
    followUp: result.followUp,
    suggestedActions: [],
    fallbackReason: reason
  };
}

export async function generateChatAnswer(householdId: string, messages: ChatApiMessage[]): Promise<AiChatResponse> {
  const question = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
  if (!process.env.OPENAI_API_KEY) return localChat(householdId, question, "Add OPENAI_API_KEY to .env.local to enable OpenAI.");
  const { context, facts } = buildHouseholdAiContext(householdId);
  try {
    const response = await client().responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: [
        "You are the WaterLens AI assistant. Answer only from the supplied household context and canonical facts.",
        "Treat supplied household metrics as authoritative and do not alter them. If the data does not answer the question, say what is missing.",
        "You may propose reasonable durations, step counts, goals and indicative savings when giving advice; clearly label them as your recommendation, not as observed household data.",
        "Clearly label forecasts, probabilities, synthetic bill values, and possible anomaly signals. Never diagnose a leak.",
        "Give practical, low-risk water-saving advice tailored to the household profile. Do not claim guaranteed savings.",
        "Keep the answer conversational and concise. factKeys must list every metric used in the answer."
      ].join(" "),
      input: JSON.stringify({ household_context: context, canonical_facts: facts, recent_conversation: messages.slice(-10) }),
      text: { format: zodTextFormat(chatSchema, "waterlens_chat"), verbosity: "medium" },
      max_output_tokens: 900,
      safety_identifier: safetyIdentifier(householdId),
      store: false
    });
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("OpenAI returned no structured chat output");
    return {
      provider: "openai",
      model: MODEL,
      message: parsed.message,
      facts: parsed.factKeys.map((key) => facts[key]),
      factKeys: parsed.factKeys,
      followUp: parsed.followUp,
      suggestedActions: parsed.suggestedActions
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI error";
    console.error("WaterLens chat fallback:", message);
    return localChat(householdId, question, message);
  }
}
