import { HouseholdSelector } from "@/components/household-selector";
import { ActConnectPanel } from "@/components/act-connect-panel";
import { getAnomalies, getProfiles, getRecommendations, pickHousehold } from "@/lib/data";

export default async function ActConnectPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const anomalies = getAnomalies().filter((a) => a.household_id === householdId);
  const recommendations = getRecommendations().filter((r) => r.household_id === householdId);

  return (
    <div className="space-y-6">
      <HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} />
      <section className="card p-4">
        <h1 className="text-2xl font-semibold text-water-700">Act & Connect</h1>
        <p className="text-sm text-slate-600 mt-2">Resolve alerts, contact the utility, manage recommendations, and update household context.</p>
      </section>
      <ActConnectPanel householdId={householdId} anomalies={anomalies} recommendations={recommendations} />
    </div>
  );
}
