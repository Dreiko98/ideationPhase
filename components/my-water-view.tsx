"use client";

import { Anomaly, ForecastEntry, HouseholdProfile, HouseholdSnapshot, Recommendation } from "@/lib/types";
import { generateStructuredSummary } from "@/lib/aiSummary";
import { useAiInsights } from "@/lib/ai/use-ai-insights";
import { AiStatus } from "./ai-status";
import { ForecastChart } from "./forecast-chart";
import { KpiCard } from "./kpi-card";

type Props = {
  profile: HouseholdProfile;
  snapshot: HouseholdSnapshot;
  forecast: ForecastEntry;
  recommendations: Recommendation[];
  anomalies: Anomaly[];
};

export function MyWaterView({ profile, snapshot, forecast, recommendations, anomalies }: Props) {
  const analyticalTop3 = recommendations.slice(0, 3);
  const { data: aiInsights, loading: aiLoading, error: aiError, refresh } = useAiInsights(snapshot.household_id);
  const displayedRecommendations = aiInsights?.recommendations ?? analyticalTop3.map((item) => ({
    sourceRecommendationId: item.recommendation_id,
    title: item.title,
    explanation: item.explanation,
    expectedImpact: item.estimated_impact_range,
    actionSteps: item.action_steps
  }));
  const openAnomaly = anomalies.find((item) => item.resolution_status !== "resolved");
  const budgetDifference = forecast.month_end_projection_m3 - snapshot.budget_m3;
  const averageForecastLitres = (forecast.next_14d_m3 * 1000) / 14;
  const peakDay = forecast.daily_forecast.reduce<ForecastEntry["daily_forecast"][number] | undefined>(
    (highest, item) => !highest || item.litres > highest.litres ? item : highest,
    undefined
  );
  const changeDirection = snapshot.week_change_pct >= 0 ? "higher" : "lower";
  const topAction = displayedRecommendations[0]?.title ?? "Keep monitoring the next seven days";
  const localSummary = generateStructuredSummary({
    consumption_change_7d: snapshot.week_change_pct,
    main_change_period: "06:00–08:00",
    forecast_month_m3: forecast.month_end_projection_m3,
    budget_m3: snapshot.budget_m3,
    night_flow_status: snapshot.night_flow_average < 8 ? "normal" : "elevated",
    outdoor_use_probability: snapshot.estimated_outdoor_share,
    peer_percentile: snapshot.peer_percentile,
    top_recommendation: topAction,
    confidence: "medium"
  });
  const summary = aiInsights?.summary ?? localSummary;

  const kpis = [
    {
      label: "Consumption this month",
      value: `${snapshot.month_to_date_m3.toFixed(1)} m³`,
      status: snapshot.week_change_pct > 0 ? "Higher than last week" : "Lower than last week",
      description: `${Math.abs(snapshot.week_change_pct).toFixed(1)}% ${changeDirection} than the previous comparable week.`,
      explain: "Smart-meter readings are added from the first day of this month and converted from litres to cubic metres (1 m³ = 1,000 litres)."
    },
    {
      label: "Litres per person per day",
      value: `${snapshot.litres_per_person_day.toFixed(0)} L`,
      status: "Adjusted for household size",
      description: `Average use divided across ${profile.residents} resident${profile.residents === 1 ? "" : "s"}.`,
      explain: "We average the latest 30 days of consumption and divide each day by the number of residents. This makes comparisons between differently sized households fairer."
    },
    {
      label: "Personal budget used",
      value: `${snapshot.budget_progress_pct.toFixed(0)}%`,
      status: budgetDifference > 0 ? "Forecast above goal" : "Forecast within goal",
      description: `${snapshot.month_to_date_m3.toFixed(1)} of ${snapshot.budget_m3.toFixed(1)} m³ used so far.`,
      explain: `Budget progress is month-to-date consumption divided by your ${snapshot.budget_m3.toFixed(1)} m³ monthly goal. The month-end forecast determines whether you are on track.`
    },
    {
      label: "Month-end forecast",
      value: `${forecast.month_end_projection_m3.toFixed(1)} m³`,
      status: budgetDifference > 0 ? `${budgetDifference.toFixed(1)} m³ above goal` : `${Math.abs(budgetDifference).toFixed(1)} m³ below goal`,
      description: `${(forecast.budget_exceed_probability * 100).toFixed(0)}% estimated chance of exceeding your goal.`,
      explain: `The model uses recent patterns, weekly lags, day of week and household context. Average uncertainty for this forecast is ±${forecast.uncertainty_pct.toFixed(0)}%.`
    },
    {
      label: "Water health",
      value: openAnomaly ? "Review signal" : "Normal pattern",
      status: openAnomaly ? `${openAnomaly.severity} priority · ${openAnomaly.confidence} confidence` : "No open anomaly",
      description: openAnomaly ? openAnomaly.possible_cause : "No pattern currently needs your attention.",
      explain: "This is a screening signal from night-flow, sudden-change and unusual-volume rules combined with an anomaly model. It is not a leak diagnosis."
    }
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-water-700 to-water-500 p-6 text-white">
          <h1 className="text-2xl font-semibold">Welcome, {profile.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-water-50">
            Your latest week was <strong>{Math.abs(snapshot.week_change_pct).toFixed(1)}% {changeDirection}</strong> than the previous comparable week. The clearest change appears between <strong>06:00 and 08:00</strong>.
          </p>
        </div>
        <div className="grid gap-5 p-5 text-sm md:grid-cols-3">
          <Insight title="What needs attention?">
            {budgetDifference > 0 ? `Current patterns could finish ${budgetDifference.toFixed(1)} m³ above your monthly goal.` : "The forecast remains within your monthly goal."}
          </Insight>
          <Insight title="Is it likely to be a leak?">
            Night flow is {snapshot.night_flow_average.toFixed(1)} L/hour, so {snapshot.night_flow_average < 8 ? "a strong continuous-flow signal is not the leading explanation." : "checking continuously running fixtures is recommended."}
          </Insight>
          <Insight title="Best next step">{topAction}.</Insight>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Key water metrics">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card min-w-0 p-5">
          <h2 className="text-lg font-semibold">How much might you use each day?</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">The dark line is the most likely estimate. The pale blue area is a reasonable uncertainty range—not a guaranteed minimum and maximum.</p>
          <ForecastChart data={forecast.daily_forecast} variant="band" />
          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-water-600" />Expected litres</span>
            <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-blue-100" />Likely range</span>
          </div>
        </article>
        <article className="card min-w-0 p-5">
          <h2 className="text-lg font-semibold">When is consumption expected to be highest?</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">Each bar is one forecast day. Teal bars mark weekends, when household routines can differ.</p>
          <ForecastChart data={forecast.daily_forecast} variant="bars" />
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
            <Metric label="Average forecast day" value={`${averageForecastLitres.toFixed(0)} litres`} />
            <Metric label="Highest forecast day" value={peakDay ? `${peakDay.litres.toFixed(0)} litres` : "Not available"} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">AI weekly explanation</h3>
            <AiStatus provider={aiInsights?.provider} model={aiInsights?.model} loading={aiLoading} />
          </div>
          <p className="mt-2 text-xs text-slate-500">OpenAI receives the selected synthetic profile and calculated metrics. It writes the explanation but cannot change the underlying numbers.</p>
          <div className="mt-4 space-y-4 text-sm leading-5 text-slate-700">
            <Explanation label="What changed" text={summary.whatChanged} />
            <Explanation label="What may explain it" text={summary.whatMayExplain} />
            <Explanation label="What to do next" text={summary.whatToDo} />
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{summary.confidence}</p>
          </div>
          <button onClick={() => void refresh()} disabled={aiLoading} className="mt-4 rounded-lg border border-water-200 px-3 py-2 text-xs font-medium text-water-700 disabled:opacity-50">Regenerate explanation</button>
          {aiInsights?.fallbackReason && <p className="mt-2 text-xs text-amber-700">{aiInsights.fallbackReason}</p>}
          {aiError && <p className="mt-2 text-xs text-red-700">{aiError}</p>}
        </article>

        <article className="card p-5">
          <h3 className="font-semibold">Signals to review</h3>
          <p className="mt-1 text-xs text-slate-500">A signal is a prompt to check—not proof that something is wrong.</p>
          <ul className="mt-3 space-y-3 text-sm">
            {anomalies.slice(0, 3).map((anomaly) => (
              <li key={anomaly.anomaly_id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium">{anomaly.possible_cause}</p>
                <p className="mt-1 text-slate-600">Severity: {anomaly.severity} · Confidence: {anomaly.confidence} · Status: {anomaly.resolution_status}</p>
                <p className="mt-2 text-xs text-slate-500">Suggested check: {anomaly.recommended_check}</p>
                {anomaly.estimated_excess_litres > 0 && <p className="mt-1 text-xs text-slate-500">Estimated excess during the event: about {anomaly.estimated_excess_litres.toFixed(0)} litres.</p>}
              </li>
            ))}
          </ul>
          {anomalies.length === 0 && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">No anomaly signals are currently open.</p>}
        </article>

        <article className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">AI-personalised actions</h3>
            <AiStatus provider={aiInsights?.provider} model={aiInsights?.model} loading={aiLoading} />
          </div>
          <p className="mt-2 text-xs text-slate-500">The analytical pipeline selects safe candidate actions; AI explains and personalises them using this household’s context.</p>
          <ol className="mt-3 space-y-3 text-sm">
            {displayedRecommendations.map((recommendation, index) => (
              <li key={recommendation.sourceRecommendationId} className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium"><span className="mr-2 text-water-600">{index + 1}.</span>{recommendation.title}</p>
                <p className="mt-1 text-slate-600">{recommendation.explanation}</p>
                <p className="mt-2 text-xs font-medium text-water-700">{recommendation.expectedImpact}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">{recommendation.actionSteps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ul>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}

function Insight({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 leading-5 text-slate-600">{children}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Explanation({ label, text }: { label: string; text: string }) {
  return <div><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-slate-600">{text}</p></div>;
}
