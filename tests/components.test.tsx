import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/components/kpi-card";
import { ActConnectPanel } from "@/components/act-connect-panel";
import { ForecastChart } from "@/components/forecast-chart";
import { CommunityView } from "@/components/community-view";

describe("critical UI components", () => {
  it("reveals a KPI explanation", () => {
    render(<KpiCard label="Forecast" value="12.2 m3" status="Estimated" explain="Model-backed estimate" />);
    expect(screen.getByText("12.2 m3")).toBeInTheDocument();
    expect(screen.getByText("Model-backed estimate")).toBeInTheDocument();
  });

  it("renders forecast charts without relying on measured container dimensions", () => {
    const data = [
      { date: "2026-07-22", litres: 120, lower: 90, upper: 150 },
      { date: "2026-07-23", litres: 140, lower: 100, upper: 180 }
    ];
    const { rerender } = render(<ForecastChart data={data} variant="band" />);
    expect(screen.getByRole("img", { name: /forecast with uncertainty/i })).toBeInTheDocument();
    expect(screen.getByTestId("forecast-band-chart").querySelector("path")).toBeInTheDocument();
    rerender(<ForecastChart data={data} variant="bars" />);
    expect(screen.getByRole("img", { name: /expected daily water consumption/i })).toBeInTheDocument();
    expect(screen.getByTestId("forecast-bars-chart").querySelectorAll("rect")).toHaveLength(2);
  });

  it("renders community comparisons without a measured chart container", () => {
    render(<CommunityView selectedDistrict="D-2" community={{
      districts: [
        { district_id: "D-1", avg_litres_per_household_day: 120, anomaly_rate: 0.1, budget_on_track_pct: 70, trend_30d_pct: -2 },
        { district_id: "D-2", avg_litres_per_household_day: 150, anomaly_rate: 0.2, budget_on_track_pct: 60, trend_30d_pct: 3 }
      ],
      matched_comparison: {},
      equivalent_districts: []
    }} />);
    expect(screen.getByText("Average household consumption")).toBeInTheDocument();
    expect(screen.getAllByText("Your district")).toHaveLength(1);
    expect(screen.getByText("150.0 L/day")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("persists anomaly and goal actions locally", async () => {
    render(<ActConnectPanel householdId="HH-TEST" anomalies={[{ anomaly_id: "A1", household_id: "HH-TEST", start_time: "", end_time: "", severity: "low", anomaly_score: 0.2, possible_cause: "Test anomaly", confidence: "low", estimated_excess_litres: 0, recommended_check: "Check", resolution_status: "open" }]} recommendations={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Report repaired" }));
    fireEvent.change(screen.getByPlaceholderText("Set monthly goal in m3"), { target: { value: "9.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));
    await waitFor(() => expect(screen.getByText("Status: resolved")).toBeInTheDocument());
    expect(screen.getByText("Saved goal: 9.5 m3/month")).toBeInTheDocument();
    expect(window.localStorage.getItem("waterlens:prototype:HH-TEST")).toContain('"goalM3":9.5');
  });
});
