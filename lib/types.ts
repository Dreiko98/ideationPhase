export type HouseholdProfile = {
  household_id: string;
  name: string;
  district_id: string;
  postal_area: string;
  dwelling_type: string;
  dwelling_size_m2: number;
  residents: number;
  adults: number;
  children: number;
  seniors: number;
  bathrooms: number;
  garden: boolean;
  pool: boolean;
  occupancy_pattern: string;
  seasonal_home: boolean;
  personal_goal_m3: number;
};

export type KpiCard = {
  id: string;
  label: string;
  value: string;
  status: string;
  explain: string;
};

export type HouseholdSnapshot = {
  household_id: string;
  story_tag: string;
  week_change_pct: number;
  month_to_date_m3: number;
  litres_per_person_day: number;
  budget_progress_pct: number;
  month_end_projection_m3: number;
  budget_m3: number;
  peer_percentile: number;
  anomaly_status: string;
  morning_share: number;
  evening_share: number;
  night_flow_average: number;
  possible_leak_probability: number;
  estimated_outdoor_share: number;
  top_recommendation_id: string;
};

export type ForecastEntry = {
  household_id: string;
  next_7d_m3: number;
  next_14d_m3: number;
  month_end_projection_m3: number;
  budget_exceed_probability: number;
  bill_range_eur: [number, number];
  uncertainty_pct: number;
  model_performance: {
    mae: number;
    mape: number;
    baseline_mae: number;
    baseline_mape: number;
  };
  drivers: string[];
  daily_forecast: Array<{
    date: string;
    litres: number;
    lower: number;
    upper: number;
  }>;
};

export type Anomaly = {
  anomaly_id: string;
  household_id: string;
  start_time: string;
  end_time: string;
  severity: "low" | "medium" | "high";
  anomaly_score: number;
  possible_cause: string;
  confidence: "low" | "medium" | "high";
  estimated_excess_litres: number;
  recommended_check: string;
  resolution_status: "open" | "resolved" | "downgraded";
};

export type Recommendation = {
  recommendation_id: string;
  household_id: string;
  title: string;
  explanation: string;
  trigger: string;
  estimated_impact_range: string;
  confidence: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  cost_level: "low" | "medium" | "high";
  relevance_score: number;
  action_steps: string[];
  related_metric: string;
  status: "open" | "accepted" | "dismissed" | "resolved";
};

export type CommunityData = {
  districts: Array<{
    district_id: string;
    avg_litres_per_household_day: number;
    anomaly_rate: number;
    budget_on_track_pct: number;
    trend_30d_pct: number;
  }>;
  matched_comparison: Record<
    string,
    {
      cohort_size: number;
      median_lppd: number;
      efficient_range: [number, number];
      percentile: number;
      diff_from_median_pct: number;
      diff_from_personal_best_pct: number;
    }
  >;
  equivalent_districts: Array<{
    district_id: string;
    equivalent_ids: string[];
  }>;
};

export type BillBreakdown = {
  household_id: string;
  period: string;
  fixed_service_charge: number;
  variable_charge: number;
  meter_fee: number;
  sewerage_component: number;
  taxes: number;
  total: number;
  previous_total: number;
  block_breakdown: Array<{ block: string; m3: number; rate: number; charge: number }>;
  explanation: string;
  next_bill_forecast: [number, number];
};
