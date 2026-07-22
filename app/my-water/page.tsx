import { HouseholdSelector } from "@/components/household-selector";
import { MyWaterView } from "@/components/my-water-view";
import { getAnomalies, getForecasts, getProfiles, getRecommendations, getSnapshots, pickHousehold } from "@/lib/data";

export default async function MyWaterPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const profile = profiles.find((p) => p.household_id === householdId)!;
  const snapshot = getSnapshots().find((s) => s.household_id === householdId)!;
  const forecast = getForecasts().find((f) => f.household_id === householdId)!;
  const recommendations = getRecommendations().filter((r) => r.household_id === householdId);
  const anomalies = getAnomalies().filter((a) => a.household_id === householdId);

  return (
    <div className="space-y-6">
      <HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} />
      <MyWaterView profile={profile} snapshot={snapshot} forecast={forecast} recommendations={recommendations} anomalies={anomalies} />
    </div>
  );
}
