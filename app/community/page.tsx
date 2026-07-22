import { HouseholdSelector } from "@/components/household-selector";
import { CommunityView } from "@/components/community-view";
import { CommunityAiSummary } from "@/components/community-ai-summary";
import { getCommunity, getProfiles, pickHousehold } from "@/lib/data";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const profile = profiles.find((p) => p.household_id === householdId)!;
  const community = getCommunity();
  const matched = community.matched_comparison[householdId];
  const district = community.districts.find((item) => item.district_id === profile.district_id)!;
  const equivalents = community.equivalent_districts.find((item) => item.district_id === profile.district_id)?.equivalent_ids.filter((id) => id !== profile.district_id) ?? [];

  return (
    <div className="space-y-6">
      <HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} />
      <section className="card p-5">
        <h1 className="text-2xl font-semibold text-water-700">My Community</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Understand your consumption in two different ways: a <strong>matched cohort</strong> compares households with similar characteristics, while <strong>district aggregates</strong> show broad local patterns. Neither view reveals another household’s identity or readings.</p>
      </section>
      <CommunityAiSummary householdId={householdId} />
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-semibold">Matched household comparison</h2>
          <p className="mt-2 text-3xl font-semibold text-water-700">{matched.percentile}th <span className="text-sm font-normal text-slate-500">percentile</span></p>
          <p className="mt-2 text-sm leading-5 text-slate-600">Your use is higher than approximately {matched.percentile}% of the {matched.cohort_size} matched households. A lower consumption percentile generally means less water used.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">COHORT MEDIAN</dt><dd className="font-medium">{matched.median_lppd.toFixed(1)} L/person/day</dd></div><div><dt className="text-xs text-slate-500">EFFICIENT RANGE</dt><dd className="font-medium">{matched.efficient_range[0].toFixed(1)}–{matched.efficient_range[1].toFixed(1)} L</dd></div></dl>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Your district aggregate</h2>
          <p className="mt-2 text-3xl font-semibold text-water-700">{profile.district_id}</p>
          <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-600">Average household use</dt><dd className="font-medium">{district.avg_litres_per_household_day.toFixed(1)} L/day</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-600">30-day trend</dt><dd className="font-medium">{district.trend_30d_pct >= 0 ? "+" : ""}{district.trend_30d_pct.toFixed(1)}%</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-600">Budgets on track</dt><dd className="font-medium">{district.budget_on_track_pct.toFixed(1)}%</dd></div></dl>
          <p className="mt-3 text-xs leading-5 text-slate-500">These figures average all consenting synthetic households in the district and are not adjusted for household size.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Most similar districts</h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">Similarity here means their average daily household consumption is closest to {profile.district_id}; it does not mean the districts are demographically identical.</p>
          <ul className="mt-3 space-y-2 text-sm">{equivalents.map((id, index) => <li key={id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-water-100 text-xs font-semibold text-water-700">{index + 1}</span>{id}</li>)}</ul>
        </div>
      </section>
      <CommunityView community={community} selectedDistrict={profile.district_id} />
    </div>
  );
}
