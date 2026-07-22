import { CommunityData } from "@/lib/types";

export function CommunityView({ community, selectedDistrict }: { community: CommunityData; selectedDistrict: string }) {
  const maxUse = Math.max(...community.districts.map((item) => item.avg_litres_per_household_day), 1);

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">District comparison</h2>
      <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">These bars compare anonymous district averages. Blue shows average litres used per household per day; teal shows the share of households currently on track with their personal budget. Your district is outlined.</p>
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <BarPanel title="Average household consumption" unit="L/household/day" explanation="A shorter bar means lower average district consumption. Household composition is not adjusted here.">
          {community.districts.map((district) => (
            <DistrictBar key={district.district_id} label={district.district_id} value={district.avg_litres_per_household_day} width={(district.avg_litres_per_household_day / maxUse) * 100} color="bg-water-500" selected={district.district_id === selectedDistrict} suffix=" L" />
          ))}
        </BarPanel>
        <BarPanel title="Households on budget track" unit="percent" explanation="A longer bar means a larger share of district households are currently within their chosen budget trajectory.">
          {community.districts.map((district) => (
            <DistrictBar key={district.district_id} label={district.district_id} value={district.budget_on_track_pct} width={district.budget_on_track_pct} color="bg-teal-500" selected={district.district_id === selectedDistrict} suffix="%" />
          ))}
        </BarPanel>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs text-slate-500">Full aggregate values. Anomaly rate is the share of households with an anomaly signal, not confirmed leaks.</caption>
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">District</th><th>Average use</th><th>30-day trend</th><th>On budget</th><th>Anomaly signals</th></tr></thead>
          <tbody>{community.districts.map((district) => <tr key={district.district_id} className={district.district_id === selectedDistrict ? "bg-water-50 font-medium" : "border-b border-slate-100"}><td className="py-3">{district.district_id}{district.district_id === selectedDistrict && <span className="ml-2 text-xs text-water-700">Your district</span>}</td><td>{district.avg_litres_per_household_day.toFixed(1)} L/day</td><td>{district.trend_30d_pct >= 0 ? "+" : ""}{district.trend_30d_pct.toFixed(1)}%</td><td>{district.budget_on_track_pct.toFixed(1)}%</td><td>{(district.anomaly_rate * 100).toFixed(1)}%</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function BarPanel({ title, unit, explanation, children }: { title: string; unit: string; explanation: string; children: React.ReactNode }) {
  return <div><div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{title}</h3><span className="text-xs text-slate-500">{unit}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{explanation}</p><div className="mt-4 space-y-3">{children}</div></div>;
}

function DistrictBar({ label, value, width, color, selected, suffix }: { label: string; value: number; width: number; color: string; selected: boolean; suffix: string }) {
  return <div className={selected ? "rounded-lg border-2 border-water-500 p-2" : "px-2"}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><strong>{value.toFixed(1)}{suffix}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full min-w-[3px] rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(width, 100))}%` }} /></div></div>;
}
