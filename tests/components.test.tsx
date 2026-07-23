import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/components/kpi-card";
import { ForecastChart } from "@/components/forecast-chart";
import { PeerComparisonView } from "@/components/peer-comparison-view";
import { WaterMascot } from "@/components/water-mascot";

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

  it("renders a privacy-safe similar-household comparison", () => {
    render(<PeerComparisonView profile={{ household_id: "HH-TEST", name: "Test", district_id: "D-1", postal_area: "", dwelling_type: "flat", dwelling_size_m2: 80, residents: 2, adults: 2, children: 0, seniors: 0, bathrooms: 1, garden: false, pool: false, occupancy_pattern: "full_time", seasonal_home: false, personal_goal_m3: 8 }} matched={{ cohort_size: 160, median_lppd: 110.3, efficient_range: [59.2, 68.9], percentile: 40, diff_from_median_pct: -5, diff_from_personal_best_pct: 3 }} userLppd={105} />);
    expect(screen.getByText("Your use compared with similar homes")).toBeInTheDocument();
    expect(screen.getByText("110.3 L/person/day")).toBeInTheDocument();
    expect(screen.getByText(/No neighbour, address/)).toBeInTheDocument();
  });

  it("lets the user hide and restore the persistent mascot", () => {
    render(<WaterMascot />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Aqua" }));
    expect(screen.getByRole("button", { name: "Show Aqua mascot" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Aqua mascot" }));
    expect(screen.getByLabelText("Aqua, your water guide")).toBeInTheDocument();
  });
});
