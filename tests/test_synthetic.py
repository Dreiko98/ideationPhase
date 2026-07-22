import pandas as pd
from pandas.testing import assert_frame_equal

from analytics.config import DATA_END_DATE, SEED
from analytics.synthetic import _build_households, _daily_consumption, _hourly_from_daily, _weather_for_dates


def test_seeded_generation_is_reproducible_and_fixed_in_time():
    dates = pd.date_range(end=pd.Timestamp(DATA_END_DATE), periods=40, freq="D")
    first = _build_households(8, SEED)
    second = _build_households(8, SEED)
    assert_frame_equal(first, second)
    assert dates.max() == pd.Timestamp("2026-07-21")


def test_primary_story_has_twelve_percent_week_change_and_morning_peak():
    households = _build_households(8, SEED)
    dates = pd.date_range(end=pd.Timestamp(DATA_END_DATE), periods=40, freq="D")
    weather = _weather_for_dates(dates, SEED)
    daily = _daily_consumption(households, weather, SEED)
    hh1 = daily[daily.household_id == "HH-0001"]
    assert hh1.tail(7).daily_consumption_litres.mean() / hh1.tail(14).head(7).daily_consumption_litres.mean() == pytest.approx(1.12)
    hourly = _hourly_from_daily(daily, households, weather, SEED)
    profile = hourly[hourly.household_id == "HH-0001"].groupby(hourly.timestamp.dt.hour).litres.mean()
    assert profile.loc[6:8].mean() > profile.loc[0:4].mean()


import pytest
