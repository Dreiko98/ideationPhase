type SummaryFacts = {
  consumption_change_7d: number;
  main_change_period: string;
  forecast_month_m3: number;
  budget_m3: number;
  night_flow_status: "normal" | "elevated";
  outdoor_use_probability: number;
  peer_percentile: number;
  top_recommendation: string;
  confidence: "low" | "medium" | "high";
};

export function generateStructuredSummary(f: SummaryFacts) {
  const overBudget = f.forecast_month_m3 > f.budget_m3;
  return {
    whatChanged: `Your weekly consumption changed by ${f.consumption_change_7d.toFixed(
      1
    )}% and the strongest shift appears around ${f.main_change_period}.`,
    whatMayExplain: `Night flow is ${f.night_flow_status}, so a strong continuous-leak signal is not the main driver. Outdoor-use probability is ${(f.outdoor_use_probability * 100).toFixed(
      0
    )}% and your matched-household percentile is ${f.peer_percentile}.`,
    whatToDo: overBudget
      ? `You are estimated to finish at ${f.forecast_month_m3.toFixed(
          1
        )} m3 vs your ${f.budget_m3.toFixed(1)} m3 budget. Recommended next step: ${f.top_recommendation}.`
      : `You are on track versus budget. Keep following: ${f.top_recommendation}.`,
    confidence: `Confidence: ${f.confidence}. This explanation is generated from deterministic model outputs and may change when new readings arrive.`
  };
}

export type LlmSummaryAdapter = (facts: SummaryFacts) => Promise<ReturnType<typeof generateStructuredSummary>>;

export const localSummaryAdapter: LlmSummaryAdapter = async (facts) => generateStructuredSummary(facts);
