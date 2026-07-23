import "server-only";

import { createHash } from "crypto";
import { getAnomalies, getBills, getCommunity, getForecasts, getProfiles, getRecommendations, getSnapshots } from "@/lib/data";
import { FactKey } from "./contracts";

export function buildHouseholdAiContext(householdId: string) {
  const profile = getProfiles().find((item) => item.household_id === householdId);
  const snapshot = getSnapshots().find((item) => item.household_id === householdId);
  const forecast = getForecasts().find((item) => item.household_id === householdId);
  const bill = getBills().find((item) => item.household_id === householdId);
  const recommendations = getRecommendations().filter((item) => item.household_id === householdId);
  const anomalies = getAnomalies().filter((item) => item.household_id === householdId);
  const community = getCommunity();
  const matched = community.matched_comparison[householdId];

  if (!profile || !snapshot || !forecast || !bill || !matched) {
    throw new Error(`Incomplete AI context for ${householdId}`);
  }

  const openAnomalies = anomalies.filter((item) => item.resolution_status !== "resolved");
  const { household_id: _snapshotHouseholdId, top_recommendation_id: _topRecommendationId, ...metricValues } = snapshot;
  const context = {
    household: {
      dwelling_type: profile.dwelling_type,
      dwelling_size_m2: profile.dwelling_size_m2,
      residents: profile.residents,
      adults: profile.adults,
      children: profile.children,
      seniors: profile.seniors,
      bathrooms: profile.bathrooms,
      garden: profile.garden,
      pool: profile.pool,
      occupancy_pattern: profile.occupancy_pattern,
      seasonal_home: profile.seasonal_home
    },
    metrics: metricValues,
    forecast: {
      next_7d_m3: forecast.next_7d_m3,
      next_14d_m3: forecast.next_14d_m3,
      month_end_projection_m3: forecast.month_end_projection_m3,
      budget_exceed_probability: forecast.budget_exceed_probability,
      uncertainty_pct: forecast.uncertainty_pct,
      drivers: forecast.drivers
    },
    anomalies: anomalies.map(({ anomaly_id, household_id: _householdId, ...item }) => item),
    analytical_recommendations: recommendations.map(({ household_id: _householdId, ...item }) => item),
    peer_comparison: matched,
    bill: {
      period: bill.period,
      fixed_service_charge: bill.fixed_service_charge,
      variable_charge: bill.variable_charge,
      meter_fee: bill.meter_fee,
      sewerage_component: bill.sewerage_component,
      taxes: bill.taxes,
      total: bill.total,
      previous_total: bill.previous_total,
      next_bill_forecast: bill.next_bill_forecast
    }
  };

  const facts: Record<FactKey, string> = {
    week_change_pct: `Weekly change: ${snapshot.week_change_pct.toFixed(1)}%`,
    month_to_date_m3: `Month-to-date use: ${snapshot.month_to_date_m3.toFixed(2)} m³`,
    litres_per_person_day: `Use per resident: ${snapshot.litres_per_person_day.toFixed(1)} L/person/day`,
    budget_progress_pct: `Monthly budget used: ${snapshot.budget_progress_pct.toFixed(1)}%`,
    month_end_projection_m3: `Month-end projection: ${forecast.month_end_projection_m3.toFixed(2)} m³`,
    budget_m3: `Monthly budget: ${snapshot.budget_m3.toFixed(1)} m³`,
    forecast_next_7d_m3: `Next 7 days forecast: ${forecast.next_7d_m3.toFixed(2)} m³`,
    forecast_next_14d_m3: `Next 14 days forecast: ${forecast.next_14d_m3.toFixed(2)} m³`,
    forecast_uncertainty_pct: `Forecast uncertainty: ±${forecast.uncertainty_pct.toFixed(1)}%`,
    budget_exceed_probability: `Budget exceed probability: ${(forecast.budget_exceed_probability * 100).toFixed(0)}%`,
    morning_share: `Morning consumption share: ${(snapshot.morning_share * 100).toFixed(1)}%`,
    evening_share: `Evening consumption share: ${(snapshot.evening_share * 100).toFixed(1)}%`,
    night_flow_average: `Average night flow: ${snapshot.night_flow_average.toFixed(2)} L/hour`,
    possible_leak_probability: `Possible leak-pattern probability: ${(snapshot.possible_leak_probability * 100).toFixed(0)}%`,
    peer_percentile: `Matched-cohort percentile: ${matched.percentile}th`,
    cohort_size: `Matched cohort size: ${matched.cohort_size} households`,
    cohort_median_lppd: `Matched-cohort median: ${matched.median_lppd.toFixed(1)} L/person/day`,
    open_anomalies: `Open anomaly signals: ${openAnomalies.length}`,
    bill_total_eur: `Current synthetic bill total: €${bill.total.toFixed(2)}`,
    previous_bill_total_eur: `Previous synthetic bill total: €${bill.previous_total.toFixed(2)}`,
  };

  return { context, facts, profile, snapshot, forecast, recommendations, anomalies, matched, bill };
}

export function safetyIdentifier(householdId: string) {
  return `waterlens_${createHash("sha256").update(householdId).digest("hex").slice(0, 24)}`;
}
