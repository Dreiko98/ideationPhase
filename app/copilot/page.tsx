import { HouseholdSelector } from "@/components/household-selector";
import { CopilotChat } from "@/components/copilot-chat";
import { getAnomalies, getCommunity, getForecasts, getProfiles, getRecommendations, getSnapshots, pickHousehold } from "@/lib/data";

export default async function CopilotPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const snapshot = getSnapshots().find((s) => s.household_id === householdId)!;
  const forecast = getForecasts().find((f) => f.household_id === householdId)!;
  const anomalies = getAnomalies().filter((a) => a.household_id === householdId);
  const recommendations = getRecommendations().filter((r) => r.household_id === householdId);
  const matched = getCommunity().matched_comparison[householdId];

  return (
    <div className="space-y-6">
      <HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} />
      <CopilotChat
        snapshot={snapshot}
        forecast={forecast}
        anomalies={anomalies}
        recommendations={recommendations}
        matchedComparison={{ cohort_size: matched.cohort_size, median_lppd: matched.median_lppd, percentile: matched.percentile }}
      />
    </div>
  );
}
