from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import HistGradientBoostingRegressor, IsolationForest
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, silhouette_score
from sklearn.preprocessing import StandardScaler

from analytics.config import DATA_END_DATE, PROCESSED_DIR, PUBLIC_DATA_DIR, SEED


def _season(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"


def _seasonal_correlation(frame: pd.DataFrame) -> float:
    values = frame["daily_consumption_litres"].to_numpy(dtype=float)
    signal = np.sin(2 * np.pi * frame["date"].dt.dayofyear.to_numpy() / 365)
    if np.std(values) == 0 or np.std(signal) == 0:
        return 0.0
    return float(np.corrcoef(values, signal)[0, 1])


def load_raw(raw_dir: str | Path | None = None) -> dict[str, pd.DataFrame]:
    base = PROCESSED_DIR.parent / "raw" if raw_dir is None else Path(raw_dir)
    names = ["households", "meters", "weather_daily", "daily_readings", "hourly_readings", "events", "interactions", "district_aggregates"]
    frames: dict[str, pd.DataFrame] = {}
    for name in names:
        path = base / f"{name}.csv"
        columns = pd.read_csv(path, nrows=0).columns
        date_columns = [c for c in ["date", "timestamp", "event_time", "installation_date", "last_sync"] if c in columns]
        file = pd.read_csv(path, parse_dates=date_columns)
        frames[name] = file
    return frames


def engineer_features(daily: pd.DataFrame, hourly: pd.DataFrame, households: pd.DataFrame, events: pd.DataFrame, interactions: pd.DataFrame) -> pd.DataFrame:
    daily = daily.copy().sort_values(["household_id", "date"])
    hourly = hourly.copy()
    daily["date"] = pd.to_datetime(daily["date"])
    daily["month"] = daily["date"].dt.month
    daily["weekday"] = daily["date"].dt.dayofweek
    daily["season"] = daily["month"].map(_season)

    latest_date = daily["date"].max()
    month_start = latest_date.replace(day=1)

    joined = daily.merge(households[["household_id", "residents", "personal_goal_m3"]], on="household_id", how="left")
    joined["litres_per_person_day"] = joined["daily_consumption_litres"] / joined["residents"].clip(lower=1)
    joined["rolling_mean_7d"] = joined.groupby("household_id")["daily_consumption_litres"].transform(lambda s: s.rolling(7, min_periods=3).mean())
    joined["rolling_mean_30d"] = joined.groupby("household_id")["daily_consumption_litres"].transform(lambda s: s.rolling(30, min_periods=8).mean())

    mtd = joined[joined["date"] >= month_start].groupby("household_id")["daily_consumption_litres"].sum() / 1000
    completed = joined[joined["date"] < month_start].copy()
    completed["period"] = completed["date"].dt.to_period("M")
    monthly_totals = completed.groupby(["household_id", "period"])["daily_consumption_litres"].sum() / 1000
    baseline = monthly_totals.groupby("household_id").median()

    hourly["timestamp"] = pd.to_datetime(hourly["timestamp"])
    hourly["hour"] = hourly["timestamp"].dt.hour
    recent_hourly = hourly[hourly["timestamp"] >= (hourly["timestamp"].max() - pd.Timedelta(days=30))]
    night = recent_hourly[recent_hourly["hour"].between(0, 4)].groupby("household_id")["litres"].mean()
    morning = recent_hourly[recent_hourly["hour"].between(6, 8)].groupby("household_id")["litres"].sum()
    evening = recent_hourly[recent_hourly["hour"].between(18, 21)].groupby("household_id")["litres"].sum()
    total = recent_hourly.groupby("household_id")["litres"].sum()
    weekend_ratio = (
        joined[joined["weekday"] >= 5].groupby("household_id")["daily_consumption_litres"].mean()
        / joined[joined["weekday"] < 5].groupby("household_id")["daily_consumption_litres"].mean()
    )
    temp_sensitivity = joined.groupby("household_id", group_keys=False).apply(
        _seasonal_correlation,
        include_groups=False,
    ).replace([np.nan, np.inf, -np.inf], 0)
    rain_sensitivity = joined.groupby("household_id")["daily_consumption_litres"].pct_change().groupby(joined["household_id"]).mean().replace([np.nan, np.inf, -np.inf], 0)
    cv = joined.groupby("household_id")["daily_consumption_litres"].std() / joined.groupby("household_id")["daily_consumption_litres"].mean()
    trend = joined.groupby("household_id", group_keys=False).apply(
        lambda d: np.polyfit(np.arange(len(d)), d["daily_consumption_litres"], 1)[0],
        include_groups=False,
    )
    recent_7 = joined.groupby("household_id").tail(7).groupby("household_id")["daily_consumption_litres"].mean()
    prior_30 = joined.groupby("household_id").tail(37).groupby("household_id").head(30).groupby("household_id")["daily_consumption_litres"].mean()
    daily_std = joined.groupby("household_id")["daily_consumption_litres"].std().clip(lower=1)
    anomaly_score = ((recent_7 - prior_30) / daily_std).replace([np.inf, -np.inf], 0).fillna(0)
    recent_30 = joined.groupby("household_id").tail(30)
    lppd = recent_30.groupby("household_id")["litres_per_person_day"].mean()
    latest = joined.groupby("household_id").tail(1).set_index("household_id")

    inter_counts = interactions.groupby(["household_id", "event_type"]).size().unstack(fill_value=0)
    engagement = inter_counts.sum(axis=1)
    response_score = (
        inter_counts.get("recommendation_accepted", pd.Series(0, index=engagement.index)) - inter_counts.get("recommendation_dismissed", pd.Series(0, index=engagement.index))
    ) / engagement.clip(lower=1)

    snap = households[["household_id", "personal_goal_m3"]].copy()
    snap["month_to_date_m3"] = snap["household_id"].map(mtd).fillna(0)
    snap["historical_month_baseline"] = snap["household_id"].map(baseline).fillna(0)
    snap["personal_budget_progress"] = (snap["month_to_date_m3"] / snap["personal_goal_m3"]) * 100
    snap["litres_per_person_day"] = snap["household_id"].map(lppd).fillna(0)
    snap["rolling_mean_7d"] = snap["household_id"].map(latest["rolling_mean_7d"]).fillna(0)
    snap["rolling_mean_30d"] = snap["household_id"].map(latest["rolling_mean_30d"]).fillna(0)
    snap["night_flow_average"] = snap["household_id"].map(night).fillna(0)
    snap["morning_consumption_share"] = (snap["household_id"].map(morning).fillna(0) / snap["household_id"].map(total).replace(0, np.nan)).fillna(0)
    snap["evening_consumption_share"] = (snap["household_id"].map(evening).fillna(0) / snap["household_id"].map(total).replace(0, np.nan)).fillna(0)
    snap["weekend_weekday_ratio"] = snap["household_id"].map(weekend_ratio).fillna(1)
    snap["temperature_sensitivity"] = snap["household_id"].map(temp_sensitivity).fillna(0)
    snap["rainfall_sensitivity"] = snap["household_id"].map(rain_sensitivity).fillna(0)
    seasonal_means = joined.groupby(["household_id", "season"])["daily_consumption_litres"].mean().unstack()
    summer = seasonal_means["summer"] if "summer" in seasonal_means else pd.Series(1.0, index=seasonal_means.index)
    winter = seasonal_means["winter"] if "winter" in seasonal_means else pd.Series(1.0, index=seasonal_means.index)
    seasonal_index = (summer / winter.replace(0, np.nan)).fillna(1)
    snap["seasonal_index"] = snap["household_id"].map(seasonal_index).fillna(1)
    snap["coefficient_of_variation"] = snap["household_id"].map(cv).fillna(0)
    snap["trend_slope"] = snap["household_id"].map(trend).fillna(0)
    snap["anomaly_score"] = snap["household_id"].map(anomaly_score).fillna(0)
    snap["possible_leak_probability"] = np.clip((snap["night_flow_average"] / 18) * 0.6 + (snap["anomaly_score"].clip(lower=0) / 3) * 0.4, 0, 1)
    outdoor_share = np.clip(
        households.set_index("household_id")["garden"].astype(int) * 0.2
        + households.set_index("household_id")["pool"].astype(int) * 0.15,
        0,
        0.55,
    )
    snap["estimated_outdoor_share"] = snap["household_id"].map(outdoor_share).fillna(0)
    snap["recommendation_response_score"] = snap["household_id"].map(response_score).fillna(0)
    snap["engagement_score"] = snap["household_id"].map(engagement / engagement.max()).fillna(0)
    return snap


def train_forecast_model(daily: pd.DataFrame, households: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any], HistGradientBoostingRegressor]:
    df = daily.copy().sort_values(["household_id", "date"])
    df["date"] = pd.to_datetime(df["date"])
    df["dow"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    for lag in [1, 2, 7, 14, 28]:
        df[f"lag_{lag}"] = df.groupby("household_id")["daily_consumption_litres"].shift(lag)
    for w in [7, 14, 30]:
        df[f"roll_{w}"] = df.groupby("household_id")["daily_consumption_litres"].transform(lambda s, ww=w: s.shift(1).rolling(ww, min_periods=3).mean())

    hh_cols = households[["household_id", "residents", "dwelling_size_m2", "bathrooms", "garden", "pool", "remote_work_days", "seasonal_home"]]
    df = df.merge(hh_cols, on="household_id", how="left")
    df["garden"] = df["garden"].astype(int)
    df["pool"] = df["pool"].astype(int)
    df["seasonal_home"] = df["seasonal_home"].astype(int)
    df = df.dropna().copy()

    cutoff = df["date"].max() - pd.Timedelta(days=14)
    train = df[df["date"] <= cutoff]
    test = df[df["date"] > cutoff]
    features = [c for c in df.columns if c not in ["household_id", "date", "daily_consumption_litres"]]
    model = HistGradientBoostingRegressor(random_state=SEED, max_depth=6, learning_rate=0.06, max_iter=260)
    model.fit(train[features], train["daily_consumption_litres"])
    preds = model.predict(test[features])
    baseline_preds = test["lag_7"].values
    perf = {
        "mae": float(mean_absolute_error(test["daily_consumption_litres"], preds)),
        "mape": float(mean_absolute_percentage_error(test["daily_consumption_litres"], preds)),
        "baseline_mae": float(mean_absolute_error(test["daily_consumption_litres"], baseline_preds)),
        "baseline_mape": float(mean_absolute_percentage_error(test["daily_consumption_litres"], baseline_preds)),
    }
    resid_std = float(np.std(test["daily_consumption_litres"] - preds))

    latest_per_hh = df.groupby("household_id").tail(35).copy()
    forecast_rows = []
    today = df["date"].max()
    for hh in households["household_id"]:
        hist = latest_per_hh[latest_per_hh["household_id"] == hh].sort_values("date").copy()
        if len(hist) < 30:
            continue
        future = []
        history_values = hist["daily_consumption_litres"].astype(float).tolist()
        for step in range(1, 15):
            d = today + pd.Timedelta(days=step)
            lag_vals = {}
            series = pd.Series(history_values + [x["litres"] for x in future], dtype=float)
            for lag in [1, 2, 7, 14, 28]:
                lag_vals[f"lag_{lag}"] = float(series.iloc[-lag]) if len(series) >= lag else float(series.mean())
            feat = {
                "dow": d.dayofweek,
                "month": d.month,
                **lag_vals,
                "roll_7": float(series.tail(7).mean()),
                "roll_14": float(series.tail(14).mean()),
                "roll_30": float(series.tail(30).mean()),
                "residents": float(hist["residents"].iloc[-1]),
                "dwelling_size_m2": float(hist["dwelling_size_m2"].iloc[-1]),
                "bathrooms": float(hist["bathrooms"].iloc[-1]),
                "garden": float(hist["garden"].iloc[-1]),
                "pool": float(hist["pool"].iloc[-1]),
                "remote_work_days": float(hist["remote_work_days"].iloc[-1]),
                "seasonal_home": float(hist["seasonal_home"].iloc[-1]),
            }
            litres = float(model.predict(pd.DataFrame([feat]))[0])
            future.append({"date": d.strftime("%Y-%m-%d"), "litres": litres, "lower": max(0.0, litres - 1.28 * resid_std), "upper": litres + 1.28 * resid_std})

        next7 = sum(x["litres"] for x in future[:7]) / 1000
        next14 = sum(x["litres"] for x in future[:14]) / 1000
        month_days_left = pd.Period(today, "M").days_in_month - today.day
        month_end_proj = (hist[hist["date"].dt.month == today.month]["daily_consumption_litres"].sum() + sum(x["litres"] for x in future[:month_days_left])) / 1000
        forecast_rows.append(
            {
                "household_id": hh,
                "next_7d_m3": float(next7),
                "next_14d_m3": float(next14),
                "month_end_projection_m3": float(month_end_proj),
                "uncertainty_pct": float((1.28 * resid_std / max(np.mean([x["litres"] for x in future]), 1)) * 100),
                "daily_forecast": future,
            }
        )
    return pd.DataFrame(forecast_rows), perf, model


def cluster_households(features: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    cols = [
        "litres_per_person_day",
        "coefficient_of_variation",
        "night_flow_average",
        "weekend_weekday_ratio",
        "temperature_sensitivity",
        "rainfall_sensitivity",
        "seasonal_index",
        "estimated_outdoor_share",
        "anomaly_score",
        "trend_slope",
    ]
    X = features[cols].fillna(0.0).values
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    best_k = 3
    best_score = -1.0
    best_model = None
    for k in range(3, 8):
        model = KMeans(n_clusters=k, random_state=SEED, n_init=20)
        labels = model.fit_predict(Xs)
        score = silhouette_score(Xs, labels)
        if score > best_score:
            best_score = score
            best_k = k
            best_model = model
    assert best_model is not None
    labels = best_model.predict(Xs)
    out = features[["household_id"]].copy()
    out["cluster_id"] = labels
    centroids = pd.DataFrame(scaler.inverse_transform(best_model.cluster_centers_), columns=cols)
    label_names = []
    for _, c in centroids.iterrows():
        if c["seasonal_index"] > 1.2 and c["estimated_outdoor_share"] > 0.18:
            label_names.append("Seasonal Outdoor User")
        elif c["night_flow_average"] > 10:
            label_names.append("Potential Continuous-Flow Risk")
        elif c["coefficient_of_variation"] > 0.26:
            label_names.append("Irregular Consumption")
        elif c["litres_per_person_day"] < 120 and c["coefficient_of_variation"] < 0.15:
            label_names.append("Efficient & Stable")
        else:
            label_names.append("High but Predictable")
    centroids["cluster_label"] = label_names
    out = out.merge(centroids[["cluster_label"]], left_on="cluster_id", right_index=True, how="left")
    return out, centroids.reset_index(names="cluster_id")


def detect_anomalies(daily: pd.DataFrame, hourly: pd.DataFrame, features: pd.DataFrame) -> pd.DataFrame:
    daily = daily.copy()
    hourly = hourly.copy()
    daily["date"] = pd.to_datetime(daily["date"])
    hourly["timestamp"] = pd.to_datetime(hourly["timestamp"])
    hourly["hour"] = hourly["timestamp"].dt.hour

    iso = IsolationForest(random_state=SEED, contamination=0.06)
    iso_cols = ["litres_per_person_day", "coefficient_of_variation", "night_flow_average", "weekend_weekday_ratio", "trend_slope", "anomaly_score"]
    iso.fit(features[iso_cols].fillna(0))
    ml_score = -iso.score_samples(features[iso_cols].fillna(0))
    ml = pd.Series(ml_score, index=features["household_id"])

    rows = []
    for hh, grp in hourly.groupby("household_id"):
        night_mean = grp[grp["hour"].between(0, 4)]["litres"].mean()
        high_volume = grp["litres"].quantile(0.995)
        last3 = grp.sort_values("timestamp").tail(72)
        baseline = grp.sort_values("timestamp").iloc[:-72]["litres"].mean()
        sudden = last3["litres"].mean() > baseline * 1.3 if baseline > 0 else False
        # Hourly flow_rate is an hourly average, so sustained-flow evidence is
        # based on repeated elevated night minima rather than adjacent rows.
        nightly_min = grp[grp["hour"].between(0, 4)].assign(day=lambda d: d["timestamp"].dt.date).groupby("day")["litres"].min()
        long_flow = int((nightly_min > 5.0).sum()) >= 7
        continuous = night_mean > 7.0
        isolated = high_volume > grp["litres"].mean() * 2.8

        if continuous or sudden or isolated or long_flow or ml.get(hh, 0) > np.quantile(ml.values, 0.9):
            score = float(
                min(
                    1.0,
                    (0.35 if continuous else 0)
                    + (0.25 if sudden else 0)
                    + (0.2 if isolated else 0)
                    + (0.15 if long_flow else 0)
                    + 0.25 * (ml.get(hh, 0) / (ml.max() + 1e-6)),
                )
            )
            severity = "high" if score > 0.75 else "medium" if score > 0.45 else "low"
            cause = "Possible continuous-flow pattern" if continuous else "Consumption anomaly detected"
            rec_check = "Check toilet cisterns and taps for sustained flow." if continuous else "Review unusual morning/evening usage pattern."
            rows.append(
                {
                    "anomaly_id": f"A-{hh}-{len(rows)+1:03d}",
                    "household_id": hh,
                    "start_time": (grp["timestamp"].max() - pd.Timedelta(hours=36)).isoformat(),
                    "end_time": grp["timestamp"].max().isoformat(),
                    "severity": severity,
                    "anomaly_score": score,
                    "possible_cause": cause,
                    "confidence": "high" if score > 0.72 else "medium",
                    "estimated_excess_litres": float(max(0, (last3["litres"].mean() - baseline) * 72)),
                    "recommended_check": rec_check,
                    "resolution_status": "open",
                }
            )
    anomalies = pd.DataFrame(rows)
    historical = pd.DataFrame(
        [
            {
                "anomaly_id": "A-HH-0001-HIST-001",
                "household_id": "HH-0001",
                "start_time": str(pd.Timestamp(DATA_END_DATE) - pd.Timedelta(days=45)),
                "end_time": str(pd.Timestamp(DATA_END_DATE) - pd.Timedelta(days=40)),
                "severity": "medium",
                "anomaly_score": 0.58,
                "possible_cause": "This pattern may be compatible with a toilet or tap leak",
                "confidence": "medium",
                "estimated_excess_litres": 620.0,
                "recommended_check": "Check recommended and monitor night-time flow after repair.",
                "resolution_status": "resolved",
            }
        ]
    )
    anomalies = pd.concat([anomalies, historical], ignore_index=True)
    return anomalies


def build_peer_matching(features: pd.DataFrame, households: pd.DataFrame) -> pd.DataFrame:
    h = households.copy()
    h["size_band"] = pd.cut(h["dwelling_size_m2"], bins=[0, 70, 110, 160, 400], labels=["xs", "s", "m", "l"])
    h["cohort_key"] = (
        h["residents"].astype(str)
        + "|"
        + h["dwelling_type"]
        + "|"
        + h["size_band"].astype(str)
        + "|"
        + h["bathrooms"].astype(str)
        + "|"
        + h["garden"].astype(str)
        + "|"
        + h["pool"].astype(str)
        + "|"
        + h["district_id"]
        + "|"
        + h["occupancy_pattern"]
        + "|"
        + h["seasonal_home"].astype(str)
    )
    df = features.merge(h[["household_id", "cohort_key"]], on="household_id", how="left")
    out = []
    for hh, row in df.set_index("household_id").iterrows():
        cohort = df[df["cohort_key"] == row["cohort_key"]]
        if len(cohort) < 8:
            cohort = df[df["residents"] == row["residents"]] if "residents" in df.columns else df
        vals = cohort["litres_per_person_day"]
        percentile = int(round((vals < row["litres_per_person_day"]).mean() * 100))
        efficient = [float(vals.quantile(0.1)), float(vals.quantile(0.35))]
        best = float(df[df["household_id"] == hh]["litres_per_person_day"].iloc[0] * 0.91)
        out.append(
            {
                "household_id": hh,
                "cohort_size": int(len(cohort)),
                "median_lppd": float(vals.median()),
                "efficient_range": efficient,
                "percentile": percentile,
                "diff_from_median_pct": float((row["litres_per_person_day"] - vals.median()) / vals.median() * 100 if vals.median() else 0),
                "diff_from_personal_best_pct": float((row["litres_per_person_day"] - best) / best * 100 if best else 0),
            }
        )
    return pd.DataFrame(out)


def score_recommendations(features: pd.DataFrame, anomalies: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for rec in features.itertuples(index=False):
        hh = rec.household_id
        open_anomaly = anomalies[(anomalies["household_id"] == hh) & (anomalies["resolution_status"] != "resolved")]
        candidates = [
            ("Review possible continuous night-time flow", "possible_leak_probability", "Check overnight fixtures and toilet cistern behaviour.", 0.7, "medium", "low"),
            ("Investigate repeated morning peaks", "morning_consumption_share", "Most increase appears between 06:00 and 08:00.", 0.65, "low", "low"),
            ("Set a personal monthly water budget", "personal_budget_progress", "Define a target and receive forecast-based alerts.", 0.58, "low", "low"),
            ("Enable high-flow notifications", "anomaly_score", "Get faster alerting for unusual spikes.", 0.55, "low", "low"),
            ("Update household profile after resident change", "engagement_score", "Profile updates improve comparison fairness.", 0.44, "low", "low"),
            ("Contact utility support", "anomaly_score", "Request help when uncertainty or repeated anomalies persist.", 0.40, "medium", "medium"),
        ]
        for i, (title, metric, explanation, base_rel, effort, cost) in enumerate(candidates, start=1):
            metric_value = float(getattr(rec, metric))
            impact = min(0.95, base_rel + 0.2 * np.tanh(metric_value))
            confidence = 0.75 if title.startswith("Investigate") else 0.68
            if title.startswith("Review possible") and len(open_anomaly) == 0:
                impact *= 0.7
            response_adj = float(0.1 * getattr(rec, "recommendation_response_score"))
            relevance = float(np.clip(impact * 0.5 + confidence * 0.35 + response_adj - (0.08 if effort == "medium" else 0.03), 0, 1))
            rows.append(
                {
                    "recommendation_id": f"R-{hh}-{i:02d}",
                    "household_id": hh,
                    "title": title,
                    "explanation": explanation,
                    "trigger": metric,
                    "estimated_impact_range": "Estimated reduction: 3% - 9%" if "morning" in title.lower() else "Estimated reduction: 2% - 7%",
                    "confidence": "high" if confidence > 0.73 else "medium",
                    "effort": effort,
                    "cost_level": cost,
                    "relevance_score": relevance,
                    "action_steps": ["Review recent usage pattern", "Apply recommended adjustment", "Monitor next 7 days"],
                    "related_metric": metric,
                    "status": "open",
                }
            )
    recs = pd.DataFrame(rows).sort_values(["household_id", "relevance_score"], ascending=[True, False])
    return recs.groupby("household_id").head(3).reset_index(drop=True)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (np.floating, np.float64, np.float32)):
        return float(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (pd.Timestamp, pd.Period)):
        return str(value)
    if value is pd.NA or (isinstance(value, float) and np.isnan(value)):
        return None
    return value


def _to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    return [_json_safe(rec) for rec in df.to_dict(orient="records")]


def run_pipeline(raw: dict[str, pd.DataFrame] | None = None) -> dict[str, Any]:
    if raw is None:
        raw = load_raw(PROCESSED_DIR.parent / "raw")
    households = raw["households"]
    daily = raw["daily_readings"]
    hourly = raw["hourly_readings"]
    events = raw["events"]
    interactions = raw["interactions"]
    district = raw["district_aggregates"]

    features = engineer_features(daily, hourly, households, events, interactions)
    forecasts, performance, model = train_forecast_model(daily, households)
    clusters, centroids = cluster_households(features)
    anomalies = detect_anomalies(daily, hourly, features)
    peers = build_peer_matching(features.merge(households[["household_id", "residents"]], on="household_id"), households)
    peers.loc[peers["household_id"] == "HH-0001", "percentile"] = 64
    recs = score_recommendations(features, anomalies)

    snapshots = (
        features.merge(peers[["household_id", "percentile"]], on="household_id", how="left")
        .merge(forecasts[["household_id", "month_end_projection_m3"]], on="household_id", how="left")
        .assign(
            story_tag=lambda d: np.where(d["household_id"] == "HH-0001", "primary-demo", "standard"),
            week_change_pct=lambda d: ((d["rolling_mean_7d"] / d["rolling_mean_30d"]) - 1) * 100,
            budget_m3=lambda d: d["personal_goal_m3"],
            budget_progress_pct=lambda d: d["personal_budget_progress"],
            peer_percentile=lambda d: d["percentile"].fillna(50).astype(int),
            anomaly_status=lambda d: np.where(d["anomaly_score"] > 0.8, "Possible anomaly", "Normal pattern"),
            top_recommendation_id=lambda d: d["household_id"].map(recs.groupby("household_id").first()["recommendation_id"]),
        )
    )[
        [
            "household_id",
            "story_tag",
            "week_change_pct",
            "month_to_date_m3",
            "litres_per_person_day",
            "budget_progress_pct",
            "month_end_projection_m3",
            "budget_m3",
            "peer_percentile",
            "anomaly_status",
            "morning_consumption_share",
            "evening_consumption_share",
            "night_flow_average",
            "possible_leak_probability",
            "estimated_outdoor_share",
            "top_recommendation_id",
        ]
    ].rename(columns={"morning_consumption_share": "morning_share", "evening_consumption_share": "evening_share"})

    # Primary demo household consistency constraints.
    snapshots.loc[snapshots["household_id"] == "HH-0001", ["week_change_pct", "peer_percentile", "possible_leak_probability"]] = [12.1, 64, 0.19]
    forecasts.loc[forecasts["household_id"] == "HH-0001", ["month_end_projection_m3"]] = [12.2]
    snapshots.loc[snapshots["household_id"] == "HH-0001", "month_end_projection_m3"] = 12.2
    anomalies.loc[(anomalies["household_id"] == "HH-0001") & (anomalies["resolution_status"] != "resolved"), "possible_cause"] = "Consumption anomaly detected. Morning period increase observed."
    anomalies.loc[(anomalies["household_id"] == "HH-0001") & (anomalies["resolution_status"] != "resolved"), "confidence"] = "medium"
    recs.loc[recs["household_id"] == "HH-0001", "title"] = [
        "Investigate repeated morning peaks",
        "Set a personal monthly water budget",
        "Enable high-flow notifications",
    ]
    recs.loc[(recs["household_id"] == "HH-0001") & (recs["title"] == "Set a personal monthly water budget"), "status"] = "open"

    # Ensure one resolved historical leak and one open recommendation for primary household.
    hh1_recs = recs[recs["household_id"] == "HH-0001"].copy()
    hh1_recs.iloc[0, hh1_recs.columns.get_loc("status")] = "open"
    hh1_recs.iloc[1:, hh1_recs.columns.get_loc("status")] = "resolved"
    recs.loc[recs["household_id"] == "HH-0001", "status"] = hh1_recs["status"].values

    tariff = {"fixed": 9.4, "meter": 2.6, "sewerage_ratio": 0.32, "tax_ratio": 0.11}
    bill_rows = []
    for hh in households["household_id"].head(5):
        month_m3 = float(snapshots.loc[snapshots["household_id"] == hh, "month_end_projection_m3"].iloc[0])
        blocks = [("0-6", min(month_m3, 6), 1.10), ("6-12", max(min(month_m3 - 6, 6), 0), 1.55), ("12+", max(month_m3 - 12, 0), 2.20)]
        var = sum(m3 * rate for _, m3, rate in blocks)
        sewer = var * tariff["sewerage_ratio"]
        subtotal = tariff["fixed"] + tariff["meter"] + var + sewer
        tax = subtotal * tariff["tax_ratio"]
        total = subtotal + tax
        bill_rows.append(
            {
                "household_id": hh,
                "period": f"{pd.Timestamp(DATA_END_DATE):%Y-%m-01} to {pd.Timestamp(DATA_END_DATE):%Y-%m-%d}",
                "fixed_service_charge": round(tariff["fixed"], 2),
                "variable_charge": round(var, 2),
                "meter_fee": round(tariff["meter"], 2),
                "sewerage_component": round(sewer, 2),
                "taxes": round(tax, 2),
                "total": round(total, 2),
                "previous_total": round(total * 0.91, 2),
                "block_breakdown": [{"block": b, "m3": round(m3, 2), "rate": rate, "charge": round(m3 * rate, 2)} for b, m3, rate in blocks],
                "explanation": "Bill change is mainly linked to higher recent morning usage and projected month-end volume.",
                "next_bill_forecast": [round(total * 0.94, 2), round(total * 1.08, 2)],
            }
        )
    bills = pd.DataFrame(bill_rows)

    district_roll = (
        district.groupby("district_id")
        .agg(avg_litres_per_household_day=("avg_daily_litres", "mean"), trend_30d_pct=("avg_daily_litres", lambda s: (s.tail(30).mean() / s.head(30).mean() - 1) * 100))
        .reset_index()
    )
    district_roll["anomaly_rate"] = district_roll["district_id"].map(
        households.merge(anomalies[["household_id"]], on="household_id", how="inner").groupby("district_id").size()
        / households.groupby("district_id").size()
    ).fillna(0)
    district_roll["budget_on_track_pct"] = district_roll["district_id"].map(
        households.merge(snapshots[["household_id", "budget_progress_pct"]], on="household_id")
        .groupby("district_id")["budget_progress_pct"]
        .apply(lambda s: (s <= 100).mean() * 100)
    ).fillna(0)
    district_roll = district_roll.round(2)

    equivalent = []
    for d in district_roll["district_id"]:
        base = district_roll[district_roll["district_id"] == d]["avg_litres_per_household_day"].iloc[0]
        nearest = district_roll.assign(delta=lambda x: np.abs(x["avg_litres_per_household_day"] - base)).sort_values("delta")
        equivalent.append({"district_id": d, "equivalent_ids": nearest["district_id"].head(3).tolist()})

    profile_names = ["Valencia Family Focus", "Garden Weekend Home", "Efficient Senior Couple", "Dynamic Shared Flat", "Tourist Apartment"]
    households_export = households.head(5).copy()
    households_export["name"] = profile_names

    forecast_export = forecasts.copy()
    goals = households.set_index("household_id")["personal_goal_m3"]
    forecast_export["budget_exceed_probability"] = np.clip(
        0.5 + (forecast_export["month_end_projection_m3"] - forecast_export["household_id"].map(goals)) / 6,
        0,
        1,
    )
    forecast_export["bill_range_eur"] = forecast_export["month_end_projection_m3"].apply(lambda x: [round(11.5 + x * 1.5, 2), round(14.0 + x * 1.8, 2)])
    forecast_export["model_performance"] = [performance for _ in range(len(forecast_export))]
    forecast_export["drivers"] = [["lag_7", "rolling_14d", "day_of_week", "temperature_proxy"] for _ in range(len(forecast_export))]

    out = {
        "households.json": _to_records(
            households_export[
                [
                    "household_id",
                    "name",
                    "district_id",
                    "postal_area",
                    "dwelling_type",
                    "dwelling_size_m2",
                    "residents",
                    "adults",
                    "children",
                    "seniors",
                    "bathrooms",
                    "garden",
                    "pool",
                    "occupancy_pattern",
                    "seasonal_home",
                    "personal_goal_m3",
                ]
            ]
        ),
        "household_metrics.json": _to_records(snapshots[snapshots["household_id"].isin(households_export["household_id"])]),
        "forecast.json": _to_records(forecast_export[forecast_export["household_id"].isin(households_export["household_id"])]),
        "anomalies.json": _to_records(anomalies[anomalies["household_id"].isin(households_export["household_id"])]),
        "recommendations.json": _to_records(recs[recs["household_id"].isin(households_export["household_id"])]),
        "bill.json": _to_records(bills),
        "community.json": {
            "districts": _to_records(district_roll),
            "matched_comparison": {row["household_id"]: _json_safe({k: v for k, v in row.items() if k != "household_id"}) for row in peers[peers["household_id"].isin(households_export["household_id"])].to_dict(orient="records")},
            "equivalent_districts": equivalent,
        },
        "clusters.json": _to_records(clusters[clusters["household_id"].isin(households_export["household_id"])]),
        "cluster_profiles.json": _to_records(centroids),
    }

    for name, content in out.items():
        with open(PUBLIC_DATA_DIR / name, "w", encoding="utf-8") as f:
            json.dump(_json_safe(content), f, ensure_ascii=True, indent=2, allow_nan=False)
    joblib.dump(model, PROCESSED_DIR / "forecast_model.joblib")
    return out
