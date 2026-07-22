import Link from "next/link";
import { BillAiExplanation } from "@/components/bill-ai-explanation";
import { HouseholdSelector } from "@/components/household-selector";
import { getBills, getProfiles, pickHousehold } from "@/lib/data";

function Tip({ title, text }: { title: string; text: string }) {
  return <details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-medium">{title}</summary><p className="mt-2 text-sm leading-5 text-slate-600">{text}</p></details>;
}

export default async function BillExplainerPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const params = await searchParams;
  const profiles = getProfiles();
  const householdId = pickHousehold(params.household);
  const bill = getBills().find((item) => item.household_id === householdId)!;

  return (
    <div className="space-y-6">
      <HouseholdSelector profiles={profiles.slice(0, 5)} selectedId={householdId} />
      <section className="card p-5"><h1 className="text-2xl font-semibold text-water-700">Synthetic Bill Explainer</h1><p className="mt-2 text-sm text-slate-600">See how each synthetic charge contributes to the total, then use AI to connect the bill with this household’s measured use and forecast.</p><p className="mt-1 text-xs text-slate-500">All tariffs and charges are demonstration data; this is not a real utility bill.</p></section>
      <BillAiExplanation householdId={householdId} />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-end justify-between border-b border-slate-100 pb-4"><div><p className="text-xs uppercase tracking-wide text-slate-500">Billing period</p><p className="mt-1 font-medium">{bill.period}</p></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Total</p><p className="mt-1 text-3xl font-semibold text-water-700">€{bill.total.toFixed(2)}</p></div></div>
          <dl className="mt-4 space-y-3 text-sm"><Charge label="Fixed service charge" value={bill.fixed_service_charge} /><Charge label="Variable consumption charge" value={bill.variable_charge} /><Charge label="Meter fee" value={bill.meter_fee} /><Charge label="Sewerage and treatment" value={bill.sewerage_component} /><Charge label="Taxes" value={bill.taxes} /></dl>
          <div className="mt-5 rounded-xl bg-water-50 p-4 text-sm"><p><strong>Previous bill:</strong> €{bill.previous_total.toFixed(2)}</p><p className="mt-1"><strong>Next bill forecast:</strong> €{bill.next_bill_forecast[0].toFixed(2)}–€{bill.next_bill_forecast[1].toFixed(2)}</p><p className="mt-2 text-xs leading-5 text-water-800">The forecast is a range based on projected consumption. It is not a guaranteed charge.</p></div>
          <Link href={`/act-connect?household=${householdId}`} className="mt-4 inline-block rounded bg-water-600 px-3 py-2 text-sm text-white">Contact support</Link>
        </div>
        <div className="card space-y-3 p-5"><h2 className="font-semibold">What each component means</h2><p className="text-sm text-slate-600">Open a component to understand whether it changes with water use.</p><Tip title="Fixed service charge" text="A baseline service availability fee that does not change with this month’s consumption." /><Tip title="Variable consumption charge" text="The usage-based amount calculated from synthetic consumption blocks and rates." /><Tip title="Consumption blocks" text="Tiered pricing: each portion of water use is charged at the rate for its block." /><Tip title="Meter fee" text="A synthetic smart-meter operation and maintenance component." /><Tip title="Sewerage and treatment" text="A synthetic wastewater network and treatment component linked to the variable charge." /><Tip title="Taxes" text="Synthetic local taxes applied to the bill subtotal." /></div>
      </section>
    </div>
  );
}

function Charge({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt className="text-slate-600">{label}</dt><dd className="font-medium">€{value.toFixed(2)}</dd></div>;
}
