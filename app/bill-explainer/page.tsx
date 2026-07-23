import { BillExplainerWorkspace } from "@/components/bill-explainer-workspace";
import { HouseholdSelector } from "@/components/household-selector";
import { getBills, getCommunity, getProfiles, pickHousehold } from "@/lib/data";

export default async function BillExplainerPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const bill = getBills().find((item) => item.household_id === householdId)!;
  const matched = getCommunity().matched_comparison[householdId];
  return <div className="space-y-6"><HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} /><BillExplainerWorkspace householdId={householdId} bill={bill} peerMedianLppd={matched.median_lppd} /></div>;
}
