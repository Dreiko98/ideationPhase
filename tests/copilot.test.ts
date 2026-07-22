import { describe, expect, it } from "vitest";
import { runCopilot } from "@/lib/copilot";

const context = {
  snapshot: { household_id: "HH-0001", story_tag: "primary-demo", week_change_pct: 12.1, month_to_date_m3: 7, litres_per_person_day: 81, budget_progress_pct: 64.4, month_end_projection_m3: 12.2, budget_m3: 11, peer_percentile: 64, anomaly_status: "Possible anomaly", morning_share: 0.21, evening_share: 0.24, night_flow_average: 5.36, possible_leak_probability: 0.19, estimated_outdoor_share: 0, top_recommendation_id: "R1" },
  forecast: { household_id: "HH-0001", next_7d_m3: 2.3, next_14d_m3: 4.6, month_end_projection_m3: 12.2, budget_exceed_probability: 0.7, bill_range_eur: [29.8, 35.96] as [number, number], uncertainty_pct: 20.9, model_performance: { mae: 36.8, mape: 0.21, baseline_mae: 51.7, baseline_mape: 0.28 }, drivers: ["lag_7"], daily_forecast: [] },
  anomalies: [{ anomaly_id: "A1", household_id: "HH-0001", start_time: "2026-07-20", end_time: "2026-07-21", severity: "medium" as const, anomaly_score: 0.58, possible_cause: "Morning period increase", confidence: "medium" as const, estimated_excess_litres: 120, recommended_check: "Review", resolution_status: "open" as const }],
  recommendations: [{ recommendation_id: "R1", household_id: "HH-0001", title: "Investigate morning peaks", explanation: "Morning change", trigger: "morning_share", estimated_impact_range: "3%-9%", confidence: "high" as const, effort: "low" as const, cost_level: "low" as const, relevance_score: 0.8, action_steps: ["Review"], related_metric: "morning_share", status: "open" as const }],
  matchedComparison: { cohort_size: 82, median_lppd: 57.7, percentile: 64 }
};

describe("Water Copilot grounding", () => {
  it.each([
    ["Why did my consumption increase this week?", "weekly_change_pct=12.1"],
    ["Explain my monthly forecast", "projection_m3=12.20"],
    ["How am I doing against my budget?", "budget_progress_pct=64.4"],
    ["Compare me with similar households", "peer_percentile=64"],
    ["Do I have an anomaly?", "anomaly_score=0.58"],
    ["What is my highest-impact action?", "relevance_score=0.80"]
  ])("returns traceable facts for %s", (question, expectedFact) => {
    const answer = runCopilot(question, context);
    expect(answer.facts).toContain(expectedFact);
  });

  it("routes mutating actions before generic budget intent", () => {
    expect(runCopilot("Save a new budget goal", context).intent).toBe("save_goal");
    expect(runCopilot("Create a support request", context).intent).toBe("support");
  });

  it("does not invent a metric for unsupported questions", () => {
    const answer = runCopilot("What will rainfall be next year?", context);
    expect(answer.intent).toBe("fallback");
    expect(answer.facts).toEqual([]);
  });
});
