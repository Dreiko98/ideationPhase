export const FACT_KEYS = [
  "week_change_pct",
  "month_to_date_m3",
  "litres_per_person_day",
  "budget_progress_pct",
  "month_end_projection_m3",
  "budget_m3",
  "forecast_next_7d_m3",
  "forecast_next_14d_m3",
  "forecast_uncertainty_pct",
  "budget_exceed_probability",
  "morning_share",
  "evening_share",
  "night_flow_average",
  "possible_leak_probability",
  "peer_percentile",
  "cohort_size",
  "cohort_median_lppd",
  "open_anomalies",
  "bill_total_eur",
  "previous_bill_total_eur",
  "district_trend_pct",
  "district_budget_on_track_pct"
] as const;

export type FactKey = (typeof FACT_KEYS)[number];

export type AiRecommendation = {
  sourceRecommendationId: string;
  title: string;
  explanation: string;
  expectedImpact: string;
  actionSteps: string[];
};

export type AiInsights = {
  provider: "openai" | "local";
  model: string;
  generatedAt: string;
  fallbackReason?: string;
  summary: {
    whatChanged: string;
    whatMayExplain: string;
    whatToDo: string;
    confidence: string;
  };
  recommendations: AiRecommendation[];
  communitySummary: {
    headline: string;
    interpretation: string;
    comparison: string;
    privacyNote: string;
  };
  billSummary: {
    headline: string;
    explanation: string;
    nextStep: string;
  };
  factKeys: FactKey[];
};

export type ChatApiMessage = { role: "user" | "assistant"; content: string };

export type AiChatResponse = {
  provider: "openai" | "local";
  model: string;
  message: string;
  facts: string[];
  factKeys: FactKey[];
  followUp: string;
  suggestedActions: string[];
  fallbackReason?: string;
};
