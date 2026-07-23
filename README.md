# WaterLens MVP

WaterLens is a runnable, privacy-conscious water intelligence prototype. It combines deterministic synthetic smart-meter data, a Python analytics pipeline, and a Next.js dashboard for five demo households. OpenAI generates grounded explanations, personalised recommendation narratives and conversational advice; a deterministic fallback keeps the demo usable without an API key.

## Quick start

Prerequisites: Python 3.11+ and Node.js 20+.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/generate_synthetic_data.py
python scripts/run_analytics.py
npm install
Copy-Item .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY
npm run dev
```

Open `http://localhost:3000`. Generated JSON is committed under `public/data`; rerun both Python commands whenever analytics code or the synthetic seed changes.

Validation commands:

```bash
pytest
npm test
npm run build
```

## Architecture and data flow

```text
analytics/synthetic.py
  -> analytics/data/raw/*.csv (500 anonymous households)
  -> analytics/pipeline.py
  -> public/data/*.json + analytics/data/processed/forecast_model.joblib
  -> lib/data.ts (server-side typed loader)
  -> server-only OpenAI Responses API adapter
  -> grounded AI summaries, recommendations and Copilot
```

The fixed seed is `20260721` and the fixed data cut-off is `2026-07-21`. This makes generation reproducible, including meter sync times, bills, anomaly history, and forecast dates.

## Product modules

- **My Water:** five KPIs, 14-day forecast bands, AI weekly summary, personalised recommendations and a voluntary campaign challenge.
- **Water Copilot:** OpenAI conversation grounded in the selected profile and metrics, with progressive responses and an animated Aqua mascot.
- **My Community:** privacy-safe comparisons with similar households, AI interpretation, awareness content and campaigns; district ranking is deliberately not shown.
- **Bill Explainer:** PDF/image upload, side-by-side source and AI breakdown, historical totals, persistent spending budget and a visual explanation of where charges go.
- **Aqua:** optional persistent water-drop mascot with contextual tips across every screen.

Browser-persisted actions are explicitly prototype-only; they are not sent to a utility backend.

## OpenAI configuration and grounding

Create `.env.local` and add a server-side key:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
```

Restart `npm run dev` after changing environment variables. The key is read only by Node.js routes under `app/api/ai`; it is never included in browser JavaScript. The model receives only the selected synthetic household profile, calculated metrics, forecasts, anomaly signals, analytical recommendation candidates, matched-cohort aggregates and synthetic bill values.

The AI layer uses the OpenAI Responses API with strict structured outputs. Recommendation IDs must match candidates produced by the analytical pipeline, and household metrics are supplied as the source of truth. OpenAI may add clearly labelled advisory values such as observation periods, step counts, goals or indicative savings. Results are cached per household for five minutes and API routes have basic in-memory rate limits. If the key is missing, the API is unavailable or the structured response is invalid, the UI displays **Local fallback** and uses the deterministic templates.

## Analytics definitions

All volume inputs are litres unless stated otherwise.

| Metric | Definition |
|---|---|
| Month-to-date m³ | `sum(daily litres from month start) / 1000` |
| Litres/person/day | `mean(last 30 daily litres / max(residents, 1))` |
| Rolling 7/30-day mean | trailing arithmetic mean of daily litres, requiring 3/8 observations |
| Weekly change | `(rolling mean 7d / rolling mean 30d - 1) * 100` |
| Budget progress | `month-to-date m³ / personal goal m³ * 100` |
| Historical monthly baseline | median of completed historical monthly totals |
| Morning/evening share | litres in 06:00–08:00 / 18:00–21:00 divided by last-30-day hourly total |
| Night flow | mean hourly litres during 00:00–04:00 over the last 30 days |
| Weekend ratio | mean weekend daily litres / mean weekday daily litres |
| Seasonal index | mean summer daily litres / mean winter daily litres |
| Coefficient of variation | standard deviation / mean of daily litres |
| Trend slope | ordinary first-degree polynomial slope over ordered daily readings |
| Anomaly z-score | `(last-7-day mean - preceding-30-day mean) / daily standard deviation` |
| Leak probability | clipped blend: `0.6 * night flow / 18 + 0.4 * positive anomaly score / 3` |
| Outdoor share proxy | `0.20 * garden + 0.15 * pool`, clipped to 0–0.55 |
| Peer percentile | share of anonymous matched-cohort L/person/day values below the household value |

### Forecasting

The primary model is `HistGradientBoostingRegressor` using calendar fields, lags 1/2/7/14/28, rolling means 7/14/30, and household context. Evaluation uses the last 14 observed days. The comparison baseline is the seven-day seasonal lag. JSON exposes MAE and MAPE for both. Forecasts cover 7 and 14 days; the displayed 80% approximate interval is `prediction ± 1.28 * test residual standard deviation`, lower-bounded at zero.

### Clustering, anomalies, and recommendations

K-means evaluates K=3…7 after standardisation and selects the highest silhouette score. Labels are neutral descriptions derived from centroids.

The anomaly engine combines Isolation Forest with interpretable signals: elevated 00:00–04:00 use, repeated elevated night minima for at least seven days, sudden recent change, and isolated high-volume readings. Outputs include confidence, estimated excess, a recommended check, and resolution state. They indicate patterns, not diagnoses.

Recommendations are ranked from impact, confidence, response history, and effort. Scores are clipped to 0–1, and only the top three per household are exported.

## Demo story

Select **Valencia Family Focus (`HH-0001`)**:

1. My Water shows a 12.1% weekly increase concentrated around 06:00–08:00.
2. Month-end projection is 12.2 m³ versus an 11.0 m³ budget.
3. Night flow remains low, so the explanation does not claim a strong continuous leak.
4. Community shows the same 64th percentile used by the dashboard and Copilot.
5. Bill Explainer shows the source bill beside its explanation and lets you save a spending target.
6. Join the campaign or hide Aqua; refresh to verify browser persistence.

## Contracts and privacy

`public/data` contains household profiles, snapshots, forecasts, anomalies, recommendations, bills, community aggregates, and cluster profiles. Python tests validate ID coverage and cross-page values. The product UI exposes only cohort size and summary statistics for the selected demo household; it does not show another household’s identity, location or readings. All source data is synthetic.

## Limitations

- Forecast intervals are residual-based approximations, not calibrated probabilistic forecasts.
- Weather sensitivity and recommendation impacts are prototype signals, not causal estimates.
- Local browser state is not multi-device or authenticated.
- District visualisation is an aggregate comparison, not a geographic heatmap.
- AI output is informational and does not diagnose leaks or guarantee savings.
- Without `OPENAI_API_KEY`, summaries and chat deliberately use the narrower deterministic fallback.
- Production deployments should replace the in-memory limiter with authenticated, distributed per-user limits and add cost monitoring and persistent conversation storage.
