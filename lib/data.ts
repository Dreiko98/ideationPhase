import fs from "fs";
import path from "path";
import {
  Anomaly,
  BillBreakdown,
  CommunityData,
  ForecastEntry,
  HouseholdProfile,
  HouseholdSnapshot,
  Recommendation
} from "./types";

const dataDir = path.join(process.cwd(), "public", "data");

function readJson<T>(fileName: string): T {
  const filePath = path.join(dataDir, fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `WaterLens could not load ${fileName}. Run "python scripts/generate_synthetic_data.py" and "python scripts/run_analytics.py". Cause: ${reason}`
    );
  }
}

export function getProfiles(): HouseholdProfile[] {
  return readJson<HouseholdProfile[]>("households.json");
}

export function getSnapshots(): HouseholdSnapshot[] {
  return readJson<HouseholdSnapshot[]>("household_metrics.json");
}

export function getForecasts(): ForecastEntry[] {
  return readJson<ForecastEntry[]>("forecast.json");
}

export function getAnomalies(): Anomaly[] {
  return readJson<Anomaly[]>("anomalies.json");
}

export function getRecommendations(): Recommendation[] {
  return readJson<Recommendation[]>("recommendations.json");
}

export function getCommunity(): CommunityData {
  return readJson<CommunityData>("community.json");
}

export function getBills(): BillBreakdown[] {
  return readJson<BillBreakdown[]>("bill.json");
}

export function pickHousehold(householdId?: string): string {
  const profiles = getProfiles();
  const ids = new Set(profiles.map((p) => p.household_id));
  if (householdId && ids.has(householdId)) {
    return householdId;
  }
  return "HH-0001";
}
