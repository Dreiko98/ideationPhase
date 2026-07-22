import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from analytics.pipeline import build_peer_matching, detect_anomalies, engineer_features, score_recommendations

DATA = Path(__file__).resolve().parents[1] / "public" / "data"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def test_feature_aggregation_stays_aligned_by_household_id():
    dates = pd.date_range("2026-06-12", periods=40)
    daily = pd.DataFrame([
        {"household_id": hh, "date": date, "daily_consumption_litres": value}
        for hh, value in [("HH-A", 100.0), ("HH-B", 400.0)] for date in dates
    ])
    hourly = pd.DataFrame([
        {"household_id": hh, "timestamp": date + pd.Timedelta(hours=hour), "litres": value / 24, "flow_rate": value / 1440}
        for hh, value in [("HH-A", 100.0), ("HH-B", 400.0)] for date in dates[-30:] for hour in range(24)
    ])
    households = pd.DataFrame([
        {"household_id": "HH-B", "residents": 4, "personal_goal_m3": 20, "garden": True, "pool": False},
        {"household_id": "HH-A", "residents": 2, "personal_goal_m3": 10, "garden": False, "pool": False},
    ])
    interactions = pd.DataFrame([
        {"household_id": "HH-A", "event_type": "dashboard_view"},
        {"household_id": "HH-B", "event_type": "dashboard_view"},
    ])
    result = engineer_features(daily, hourly, households, pd.DataFrame(), interactions).set_index("household_id")
    assert result.loc["HH-A", "litres_per_person_day"] == pytest.approx(50)
    assert result.loc["HH-B", "litres_per_person_day"] == pytest.approx(100)
    assert result.loc["HH-A", "estimated_outdoor_share"] == 0
    assert result.loc["HH-B", "estimated_outdoor_share"] == pytest.approx(0.2)


def test_forecast_contract_and_model_performance():
    forecasts = load("forecast.json")
    assert len(forecasts) == 5
    for row in forecasts:
        assert len(row["daily_forecast"]) == 14
        assert row["next_14d_m3"] >= row["next_7d_m3"] > 0
        assert all(day["lower"] <= day["litres"] <= day["upper"] for day in row["daily_forecast"])
        assert row["model_performance"]["mae"] < row["model_performance"]["baseline_mae"]


def test_continuous_night_flow_rule_flags_a_possible_leak():
    dates = pd.date_range("2026-07-01", periods=10)
    hourly = pd.DataFrame([
        {"household_id": hh, "timestamp": d + pd.Timedelta(hours=h), "litres": 8.0 if hh == "HH-LEAK" and h <= 4 else 1.0, "flow_rate": 0.13 if hh == "HH-LEAK" and h <= 4 else 0.02}
        for hh in ["HH-OK", "HH-LEAK"] for d in dates for h in range(24)
    ])
    daily = pd.DataFrame([{"household_id": hh, "date": d, "daily_consumption_litres": 100} for hh in ["HH-OK", "HH-LEAK"] for d in dates])
    features = pd.DataFrame([
        {"household_id": hh, "litres_per_person_day": 50, "coefficient_of_variation": 0.1, "night_flow_average": night, "weekend_weekday_ratio": 1, "trend_slope": 0, "anomaly_score": 0}
        for hh, night in [("HH-OK", 1), ("HH-LEAK", 8)]
    ])
    found = detect_anomalies(daily, hourly, features)
    leak = found[found.household_id == "HH-LEAK"]
    assert not leak.empty
    assert "continuous-flow" in leak.iloc[0].possible_cause


def test_peer_matching_uses_anonymous_cohorts_and_minimum_size():
    households = pd.DataFrame([
        {"household_id": f"H{i}", "residents": 2, "dwelling_type": "apartment", "dwelling_size_m2": 80, "bathrooms": 1, "garden": False, "pool": False, "district_id": "D1", "occupancy_pattern": "mixed", "seasonal_home": False}
        for i in range(12)
    ])
    features = pd.DataFrame({"household_id": [f"H{i}" for i in range(12)], "residents": [2] * 12, "litres_per_person_day": np.arange(80, 92)})
    peers = build_peer_matching(features, households)
    assert peers.cohort_size.min() >= 8
    assert not any("district" in column for column in peers.columns)


def test_recommendation_scoring_is_bounded_and_ranked():
    features = pd.DataFrame([{"household_id": "H1", "possible_leak_probability": 0.2, "morning_consumption_share": 0.3, "personal_budget_progress": 80, "anomaly_score": 0.5, "engagement_score": 0.2, "recommendation_response_score": 0.1}])
    anomalies = pd.DataFrame(columns=["household_id", "resolution_status"])
    recs = score_recommendations(features, anomalies)
    assert len(recs) == 3
    assert recs.relevance_score.between(0, 1).all()
    assert recs.relevance_score.is_monotonic_decreasing


def test_json_schemas_privacy_and_cross_page_consistency():
    profiles, metrics, forecasts = load("households.json"), load("household_metrics.json"), load("forecast.json")
    anomalies, recs, bills, community = load("anomalies.json"), load("recommendations.json"), load("bill.json"), load("community.json")
    ids = {p["household_id"] for p in profiles}
    assert len(ids) == 5
    assert ids == {m["household_id"] for m in metrics} == {f["household_id"] for f in forecasts} == {b["household_id"] for b in bills}
    assert all(a["household_id"] in ids for a in anomalies)
    assert all(r["household_id"] in ids for r in recs)
    assert all("household_id" not in district and "postal_area" not in district for district in community["districts"])
    hh1_metric = next(m for m in metrics if m["household_id"] == "HH-0001")
    hh1_forecast = next(f for f in forecasts if f["household_id"] == "HH-0001")
    assert hh1_metric["week_change_pct"] == pytest.approx(12.1)
    assert hh1_metric["peer_percentile"] == community["matched_comparison"]["HH-0001"]["percentile"] == 64
    assert hh1_metric["month_end_projection_m3"] == hh1_forecast["month_end_projection_m3"] == pytest.approx(12.2)
    assert hh1_forecast["month_end_projection_m3"] > hh1_metric["budget_m3"]
    assert sum(a["resolution_status"] == "resolved" for a in anomalies if a["household_id"] == "HH-0001") >= 1
    assert sum(r["status"] == "open" for r in recs if r["household_id"] == "HH-0001") == 1
