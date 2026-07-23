import { HouseholdProfile } from "@/lib/types";

type Matched = { cohort_size: number; median_lppd: number; efficient_range: [number, number]; percentile: number; diff_from_median_pct: number; diff_from_personal_best_pct: number };

export function PeerComparisonView({ profile, matched, userLppd }: { profile: HouseholdProfile; matched: Matched; userLppd: number }) {
  const values = [
    { label: "Your recent use", value: userLppd, color: "bg-water-600" },
    { label: "Similar-home median", value: matched.median_lppd, color: "bg-teal-500" },
    { label: "Efficient range", value: matched.efficient_range[1], color: "bg-emerald-400" }
  ];
  const max = Math.max(...values.map((item) => item.value), 1) * 1.12;
  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <article className="card p-5"><h2 className="text-lg font-semibold">Your use compared with similar homes</h2><p className="mt-1 text-sm leading-6 text-slate-600">The cohort contains {matched.cohort_size} anonymous homes with comparable household and property characteristics. Lower use generally means greater water efficiency.</p><div className="mt-6 space-y-5">{values.map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><strong>{item.value.toFixed(1)} L/person/day</strong></div><div className="h-5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value / max * 100}%` }} /></div></div>)}</div><div className="mt-6 rounded-xl bg-water-50 p-4 text-sm leading-6 text-water-900">You are at the <strong>{matched.percentile}th percentile</strong>: your recent use is higher than approximately {matched.percentile}% of similar homes. This is context, not a score or judgement.</div></article>
      <aside className="card p-5"><h2 className="font-semibold">What makes a home “similar”?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Matching avoids the misleading assumption that everyone living in the same district has the same needs.</p><dl className="mt-4 space-y-3 text-sm"><Row label="Residents" value={String(profile.residents)} /><Row label="Home type" value={profile.dwelling_type} /><Row label="Approx. size" value={`${profile.dwelling_size_m2} m²`} /><Row label="Bathrooms" value={String(profile.bathrooms)} /><Row label="Garden" value={profile.garden ? "Yes" : "No"} /><Row label="Occupancy" value={profile.occupancy_pattern.replaceAll("_", " ")} /></dl><p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Only aggregated statistics are returned. No neighbour, address, coordinates or individual meter readings are exposed.</p></aside>
    </section>
  );
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium capitalize">{value}</dd></div>; }
