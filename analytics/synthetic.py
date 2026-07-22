from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
import numpy as np
import pandas as pd

from analytics.config import DATA_END_DATE, N_HOUSEHOLDS, RAW_DIR, SEED


@dataclass
class Archetype:
    name: str
    base_lpd: float
    variability: float
    morning_boost: float
    evening_boost: float
    weekend_factor: float
    weather_sensitivity: float
    irrigation_summer_boost: float


ARCHETYPES = [
    Archetype("Efficient apartment household", 105, 0.10, 1.20, 1.15, 1.04, 0.02, 0.0),
    Archetype("Large working family", 180, 0.15, 1.28, 1.22, 1.09, 0.03, 0.0),
    Archetype("Elderly couple with stable consumption", 92, 0.06, 1.10, 1.08, 1.02, 0.01, 0.0),
    Archetype("House with garden and seasonal irrigation", 210, 0.18, 1.18, 1.20, 1.12, 0.10, 0.30),
    Archetype("High-variability household", 165, 0.28, 1.25, 1.18, 1.10, 0.06, 0.08),
    Archetype("Secondary or tourist residence", 85, 0.45, 1.05, 1.05, 1.20, 0.03, 0.05),
]


def _season(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"


def _build_households(n_households: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    districts = ["D-VAL-01", "D-VAL-02", "D-VAL-03", "D-VAL-04", "D-VAL-05", "D-VAL-06"]
    dwellings = ["apartment", "house", "duplex"]
    occupancy = ["daytime_out", "mixed", "mostly_home"]

    rows = []
    for i in range(n_households):
        archetype = ARCHETYPES[rng.integers(0, len(ARCHETYPES))]
        residents = int(np.clip(rng.normal(3, 1.2), 1, 7))
        adults = max(1, residents - rng.integers(0, residents))
        children = max(0, residents - adults - rng.integers(0, 2))
        seniors = max(0, residents - adults - children)
        dwelling_type = rng.choice(dwellings, p=[0.58, 0.35, 0.07])
        bathrooms = int(np.clip(round(rng.normal(2, 0.8)), 1, 4))
        size = int(np.clip(rng.normal(95, 35), 45, 280))
        garden = bool(rng.random() < (0.55 if dwelling_type == "house" else 0.10))
        pool = bool(garden and rng.random() < 0.18)
        seasonal_home = bool(rng.random() < 0.10)
        remote_work = int(np.clip(rng.normal(2.5, 1.8), 0, 7))
        district = rng.choice(districts)
        rows.append(
            {
                "household_id": f"HH-{i + 1:04d}",
                "meter_id": f"M-{i + 1:04d}",
                "district_id": district,
                "postal_area": f"46{rng.integers(100, 999)}",
                "dwelling_type": dwelling_type,
                "dwelling_size_m2": size,
                "residents": residents,
                "adults": adults,
                "children": children,
                "seniors": seniors,
                "bathrooms": bathrooms,
                "garden": garden,
                "pool": pool,
                "pets": int(rng.integers(0, 3)),
                "occupancy_pattern": rng.choice(occupancy),
                "remote_work_days": remote_work,
                "seasonal_home": seasonal_home,
                "social_tariff": bool(rng.random() < 0.15),
                "personal_goal_m3": round(float(np.clip(rng.normal(11.5, 2.0), 7.0, 18.0)), 1),
                "preferred_language": "en",
                "consent_personalisation": bool(rng.random() < 0.95),
                "consent_community_aggregation": bool(rng.random() < 0.93),
                "archetype": archetype.name,
            }
        )

    households = pd.DataFrame(rows)
    households.loc[0, [
        "district_id", "postal_area", "dwelling_type", "dwelling_size_m2", "residents", "adults", "children", "seniors", "bathrooms",
        "garden", "pool", "occupancy_pattern", "remote_work_days", "seasonal_home", "personal_goal_m3"
    ]] = ["D-VAL-01", "46015", "apartment", 96, 4, 2, 2, 0, 2, False, False, "mixed", 2, False, 11.0]
    households.loc[1, "district_id"] = "D-VAL-02"
    households.loc[2, "district_id"] = "D-VAL-03"
    return households


def _build_meter_metadata(households: pd.DataFrame, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 11)
    install_start = pd.Timestamp("2019-01-01")
    return pd.DataFrame(
        {
            "meter_id": households["meter_id"],
            "reading_frequency": rng.choice(["hourly", "15min"], len(households), p=[0.92, 0.08]),
            "installation_date": [install_start + timedelta(days=int(v)) for v in rng.integers(0, 2200, len(households))],
            "meter_type": rng.choice(["ultrasonic", "mechanical_digital"], len(households), p=[0.68, 0.32]),
            "data_quality_score": np.clip(rng.normal(0.95, 0.03, len(households)), 0.80, 0.999).round(3),
            "last_sync": pd.Timestamp(DATA_END_DATE) + pd.Timedelta(hours=12),
            "estimated_reading_rate": np.clip(rng.normal(0.04, 0.02, len(households)), 0.0, 0.25).round(3),
        }
    )


def _weather_for_dates(dates: pd.DatetimeIndex, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 22)
    doy = dates.dayofyear.values
    temp = 19 + 9 * np.sin((doy / 365) * 2 * np.pi - 1.0) + rng.normal(0, 2.0, len(dates))
    rainfall = np.clip(rng.gamma(1.2, 2.0, len(dates)) - 1.3, 0, None)
    holidays = pd.Series(dates).dt.dayofweek.isin([5, 6]).astype(int).values
    return pd.DataFrame({"date": dates, "temperature": temp.round(2), "rainfall": rainfall.round(2), "holiday": holidays})


def _event_rows(households: pd.DataFrame, dates: pd.DatetimeIndex, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 33)
    event_types = [
        "holiday",
        "guest_visit",
        "move_in",
        "new_baby",
        "irrigation_start",
        "pool_filling",
        "known_leak",
        "repair",
        "appliance_installation",
        "resident_change",
    ]
    rows = []
    for hh in households["household_id"]:
        n = rng.integers(2, 6)
        event_dates = rng.choice(dates, n, replace=False)
        for d in event_dates:
            ev = rng.choice(event_types)
            rows.append({"household_id": hh, "event_time": pd.Timestamp(d), "event_type": ev, "impact": rng.choice(["low", "medium", "high"], p=[0.6, 0.3, 0.1])})
    rows.append({"household_id": "HH-0001", "event_time": dates[-12], "event_type": "guest_visit", "impact": "medium"})
    rows.append({"household_id": "HH-0001", "event_time": dates[-40], "event_type": "repair", "impact": "medium"})
    rows.append({"household_id": "HH-0001", "event_time": dates[-46], "event_type": "known_leak", "impact": "medium"})
    return pd.DataFrame(rows)


def _interaction_rows(households: pd.DataFrame, dates: pd.DatetimeIndex, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 44)
    interactions = [
        "dashboard_view",
        "alert_opened",
        "recommendation_opened",
        "recommendation_accepted",
        "recommendation_dismissed",
        "chatbot_question",
        "support_request",
        "profile_updated",
        "goal_created",
    ]
    rows = []
    for hh in households["household_id"]:
        n = rng.integers(5, 20)
        dts = rng.choice(dates, n, replace=True)
        for d in dts:
            rows.append({"household_id": hh, "timestamp": pd.Timestamp(d) + timedelta(hours=int(rng.integers(6, 22))), "event_type": rng.choice(interactions)})
    rows.extend(
        [
            {"household_id": "HH-0001", "timestamp": dates[-2] + timedelta(hours=8), "event_type": "chatbot_question"},
            {"household_id": "HH-0001", "timestamp": dates[-2] + timedelta(hours=9), "event_type": "profile_updated"},
            {"household_id": "HH-0001", "timestamp": dates[-1] + timedelta(hours=9), "event_type": "goal_created"},
        ]
    )
    return pd.DataFrame(rows)


def _daily_consumption(households: pd.DataFrame, weather: pd.DataFrame, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 55)
    archetype_lookup = {a.name: a for a in ARCHETYPES}
    rows = []
    for hh in households.itertuples(index=False):
        archetype = archetype_lookup[hh.archetype]
        seasonal_factor = 1.0 + (0.07 if hh.garden else 0.0)
        trend = rng.normal(0.02, 0.02)
        home_scale = 0.8 + hh.residents * 0.18 + hh.bathrooms * 0.08 + (0.22 if hh.pool else 0.0)
        for idx, w in weather.iterrows():
            dow = int(w["date"].dayofweek)
            month = int(w["date"].month)
            season = _season(month)
            weekend = 1 if dow >= 5 else 0
            weather_term = 1 + archetype.weather_sensitivity * (w["temperature"] - 18) / 10 - 0.03 * min(w["rainfall"], 5)
            irrigation = 1 + archetype.irrigation_summer_boost * (season == "summer") * (1 if hh.garden else 0)
            day_noise = rng.normal(0, archetype.variability)
            value = (
                archetype.base_lpd
                * home_scale
                * seasonal_factor
                * weather_term
                * irrigation
                * (archetype.weekend_factor if weekend else 1)
                * (1 + trend * (idx / len(weather)))
                * (1 + day_noise)
            )
            rows.append({"household_id": hh.household_id, "date": w["date"], "daily_consumption_litres": max(value, 35)})
    daily = pd.DataFrame(rows)

    # Primary demo story shaping: +12% over last week with morning concentration and no strong night leak.
    hh1 = daily["household_id"] == "HH-0001"
    ref_prev = daily.loc[hh1].tail(14).head(7)["daily_consumption_litres"].mean()
    target = ref_prev * 1.12
    last7_idx = daily.loc[hh1].tail(7).index
    daily.loc[last7_idx, "daily_consumption_litres"] *= target / daily.loc[last7_idx, "daily_consumption_litres"].mean()
    return daily


def _hourly_from_daily(daily: pd.DataFrame, households: pd.DataFrame, weather: pd.DataFrame, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 66)
    recent_days = sorted(daily["date"].unique())[-60:]
    recent_daily = daily[daily["date"].isin(recent_days)].copy()
    weather_map = weather.set_index("date")[["temperature", "rainfall", "holiday"]]
    rows = []
    for rec in recent_daily.itertuples(index=False):
        hh = households[households["household_id"] == rec.household_id].iloc[0]
        base_profile = np.array(
            [
                0.022, 0.019, 0.017, 0.016, 0.017, 0.024, 0.055, 0.062, 0.046, 0.035, 0.032, 0.031,
                0.032, 0.034, 0.036, 0.039, 0.043, 0.052, 0.061, 0.060, 0.049, 0.041, 0.030, 0.025
            ],
            dtype=float,
        )
        if rec.household_id == "HH-0001":
            base_profile[6:8] *= 1.2
            base_profile[0:5] *= 0.8
        if hh.garden:
            base_profile[20:22] *= 1.14
        if hh.pool:
            base_profile[15:18] *= 1.07
        profile = base_profile / base_profile.sum()
        hour_litres = rec.daily_consumption_litres * profile * (1 + rng.normal(0, 0.06, 24))
        hour_litres = np.clip(hour_litres, 0.2, None)
        wx = weather_map.loc[pd.Timestamp(rec.date)]
        for h in range(24):
            ts = pd.Timestamp(rec.date) + timedelta(hours=h)
            is_est = float(rng.random()) < 0.03
            reading_quality = float(np.clip(rng.normal(0.97, 0.03), 0.80, 1.0))
            rows.append(
                {
                    "household_id": rec.household_id,
                    "timestamp": ts,
                    "litres": float(hour_litres[h]),
                    "flow_rate": float(hour_litres[h] / 60.0),
                    "pressure": float(np.clip(rng.normal(3.5, 0.45), 2.1, 5.3)),
                    "reading_quality": reading_quality,
                    "estimated": is_est,
                    "temperature": float(wx["temperature"] + rng.normal(0, 0.8)),
                    "rainfall": float(wx["rainfall"]),
                    "holiday": int(wx["holiday"]),
                    "weekday": int(ts.dayofweek),
                    "season": _season(ts.month),
                }
            )
    hourly = pd.DataFrame(rows)

    # Inject continuous low-flow leak patterns for a subset.
    leak_households = [f"HH-{i:04d}" for i in range(40, 56)]
    mask = hourly["household_id"].isin(leak_households) & (hourly["timestamp"].dt.hour <= 4)
    hourly.loc[mask, "litres"] += 4.2
    hourly.loc[mask, "flow_rate"] = hourly.loc[mask, "litres"] / 60.0

    # Inject sudden high-volume events.
    sudden_households = [f"HH-{i:04d}" for i in range(90, 105)]
    spike_mask = hourly["household_id"].isin(sudden_households) & (hourly["timestamp"].dt.hour.isin([12, 13, 14]))
    hourly.loc[spike_mask, "litres"] *= 2.8
    hourly.loc[spike_mask, "flow_rate"] = hourly.loc[spike_mask, "litres"] / 60.0
    return hourly


def generate_synthetic_data(n_households: int = N_HOUSEHOLDS, seed: int = SEED) -> dict[str, pd.DataFrame]:
    end_date = pd.Timestamp(DATA_END_DATE)
    daily_dates = pd.date_range(end=end_date, periods=365, freq="D")
    households = _build_households(n_households, seed)
    meters = _build_meter_metadata(households, seed)
    weather_daily = _weather_for_dates(daily_dates, seed)
    events = _event_rows(households, daily_dates, seed)
    interactions = _interaction_rows(households, daily_dates[-90:], seed)
    daily = _daily_consumption(households, weather_daily, seed)
    hourly = _hourly_from_daily(daily, households, weather_daily, seed)

    district_agg = (
        daily.merge(households[["household_id", "district_id"]], on="household_id")
        .groupby(["district_id", "date"], as_index=False)["daily_consumption_litres"]
        .mean()
        .rename(columns={"daily_consumption_litres": "avg_daily_litres"})
    )

    result = {
        "households": households,
        "meters": meters,
        "weather_daily": weather_daily,
        "daily_readings": daily,
        "hourly_readings": hourly,
        "events": events,
        "interactions": interactions,
        "district_aggregates": district_agg,
    }
    for name, frame in result.items():
        frame.to_csv(RAW_DIR / f"{name}.csv", index=False)
    return result
