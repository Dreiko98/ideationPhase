import { Anomaly, ForecastEntry, HouseholdSnapshot, Recommendation } from "./types";

type CopilotContext = {
  snapshot: HouseholdSnapshot;
  forecast: ForecastEntry;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  matchedComparison: {
    cohort_size: number;
    median_lppd: number;
    percentile: number;
  };
};

type ToolResponse = {
  message: string;
  facts: string[];
  followUp: string;
};

function get_consumption_summary(ctx: CopilotContext): ToolResponse {
  return {
    message: `Consumption is ${ctx.snapshot.week_change_pct.toFixed(
      1
    )}% above your previous week, with stronger use in the morning period.`,
    facts: [
      `weekly_change_pct=${ctx.snapshot.week_change_pct.toFixed(1)}`,
      `morning_share=${(ctx.snapshot.morning_share * 100).toFixed(1)}%`,
      `night_flow_average=${ctx.snapshot.night_flow_average.toFixed(2)} l/h`
    ],
    followUp: "Would you like to log a household context update, such as guests staying over?"
  };
}

function get_month_forecast(ctx: CopilotContext): ToolResponse {
  return {
    message: `Estimated month-end consumption is ${ctx.forecast.month_end_projection_m3.toFixed(
      1
    )} m3 with an uncertainty of ±${ctx.forecast.uncertainty_pct.toFixed(1)}%.`,
    facts: [
      `projection_m3=${ctx.forecast.month_end_projection_m3.toFixed(2)}`,
      `budget_exceed_probability=${(ctx.forecast.budget_exceed_probability * 100).toFixed(0)}%`
    ],
    followUp: "Do you want the top action to reduce the projected total?"
  };
}

function get_budget_status(ctx: CopilotContext): ToolResponse {
  return {
    message: `Budget progress is ${ctx.snapshot.budget_progress_pct.toFixed(
      0
    )}%. Current budget is ${ctx.snapshot.budget_m3.toFixed(1)} m3.`,
    facts: [`budget_progress_pct=${ctx.snapshot.budget_progress_pct.toFixed(1)}`, `budget_m3=${ctx.snapshot.budget_m3}`],
    followUp: "Would you like to create a new monthly goal?"
  };
}

function get_anomalies(ctx: CopilotContext): ToolResponse {
  const open = ctx.anomalies.find((a) => a.resolution_status !== "resolved");
  if (!open) {
    return {
      message: "No open anomalies are currently flagged.",
      facts: ["open_anomalies=0"],
      followUp: "Would you like a preventive recommendation instead?"
    };
  }
  return {
    message: `A ${open.severity} anomaly was detected and is described as: ${open.possible_cause}.`,
    facts: [
      `anomaly_score=${open.anomaly_score.toFixed(2)}`,
      `estimated_excess_litres=${open.estimated_excess_litres.toFixed(0)}`,
      `confidence=${open.confidence}`
    ],
    followUp: "Would you like to confirm or dismiss this anomaly?"
  };
}

function get_peer_comparison(ctx: CopilotContext): ToolResponse {
  return {
    message: `You are around the ${ctx.matchedComparison.percentile}th percentile among ${ctx.matchedComparison.cohort_size} similar households.`,
    facts: [
      `peer_percentile=${ctx.matchedComparison.percentile}`,
      `cohort_median_lppd=${ctx.matchedComparison.median_lppd.toFixed(1)}`
    ],
    followUp: "Would you like to see one action commonly linked to better-performing similar households?"
  };
}

function explain_bill_change(ctx: CopilotContext): ToolResponse {
  return {
    message: "The synthetic bill increase is mainly explained by higher morning usage and a forecast above your personal budget.",
    facts: [
      `week_change_pct=${ctx.snapshot.week_change_pct.toFixed(1)}`,
      `projection_m3=${ctx.forecast.month_end_projection_m3.toFixed(1)}`
    ],
    followUp: "Would you like to open the full bill explainer breakdown?"
  };
}

function get_recommendations(ctx: CopilotContext): ToolResponse {
  const top = ctx.recommendations[0];
  if (!top) {
    return {
      message: "No recommendations are currently available for this household.",
      facts: ["recommendations=0"],
      followUp: "Would you like to review your budget instead?"
    };
  }
  return {
    message: `Highest-impact action now: ${top.title}.`,
    facts: [
      `relevance_score=${top.relevance_score.toFixed(2)}`,
      `estimated_impact=${top.estimated_impact_range}`,
      `confidence=${top.confidence}`
    ],
    followUp: "Would you like me to mark this recommendation as accepted?"
  };
}

function create_support_request(): ToolResponse {
  return {
    message: "Support request drafted with your latest anomaly and forecast context.",
    facts: ["support_request_status=created"],
    followUp: "Do you want to include preferred contact time?"
  };
}

function update_household_profile(): ToolResponse {
  return {
    message: "Household context updated for analysis (example: guests stayed over). Anomaly sensitivity will be adjusted in the next run.",
    facts: ["profile_update=queued"],
    followUp: "Would you like me to downgrade the current anomaly status now?"
  };
}

function save_personal_goal(): ToolResponse {
  return {
    message: "New personal monthly goal has been saved.",
    facts: ["goal_status=saved"],
    followUp: "Would you like reminders when forecast risk rises above 60%?"
  };
}

const intents: Array<{ key: string; test: RegExp; run: (ctx: CopilotContext) => ToolResponse }> = [
  { key: "support", test: /(support|ticket|utility)/i, run: create_support_request },
  { key: "update_context", test: /(guest|update|context|profile)/i, run: update_household_profile },
  { key: "save_goal", test: /(save.*goal|new budget)/i, run: save_personal_goal },
  { key: "consumption_change", test: /why.*(increase|changed)|recent consumption/i, run: get_consumption_summary },
  { key: "forecast", test: /(forecast|month-end|next 7|next 14)/i, run: get_month_forecast },
  { key: "budget", test: /(budget|goal)/i, run: get_budget_status },
  { key: "peer", test: /(similar|peer|compare)/i, run: get_peer_comparison },
  { key: "anomaly", test: /(anomaly|leak|night flow)/i, run: get_anomalies },
  { key: "bill", test: /(bill|charge|tariff)/i, run: explain_bill_change },
  { key: "recommend", test: /(recommend|action|highest-impact)/i, run: get_recommendations }
];

export function runCopilot(userMessage: string, ctx: CopilotContext) {
  const intent = intents.find((i) => i.test.test(userMessage));
  if (!intent) {
    return {
      intent: "fallback",
      message: "I can explain your consumption change, forecast, budget, anomalies, peer comparison, bill, and next best action.",
      facts: [],
      followUp: "Try: Why did my consumption increase this week?"
    };
  }
  const out = intent.run(ctx);
  return { intent: intent.key, ...out };
}

export const suggestedQuestions = [
  "Why did my consumption increase this week?",
  "Explain my monthly forecast.",
  "How am I doing against my personal budget?",
  "Compare me with similar households.",
  "Do I have a possible leak pattern?",
  "What is my highest-impact action now?"
];
