"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { AiStatus } from "./ai-status";
import { BillBreakdown } from "@/lib/types";
import { defaultPrototypeState, loadPrototypeState, savePrototypeState } from "@/lib/prototypeState";

type Charge = { label: string; amount: number; category: string; meaning: string; changesWithUse: boolean };
type Analysis = { supplier: string; billingPeriod: string; total: number; consumptionM3: number | null; charges: Charge[]; summary: string; nextStep: string; confidenceNote: string };

const colors: Record<string, string> = { water: "#0f6fb6", service: "#38bdf8", meter: "#14b8a6", wastewater: "#6366f1", tax: "#f59e0b", other: "#94a3b8" };

export function BillExplainerWorkspace({ householdId, bill, peerMedianLppd }: { householdId: string; bill: BillBreakdown; peerMedianLppd: number }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [analysis, setAnalysis] = useState<Analysis>(() => fromDemoBill(bill));
  const [provider, setProvider] = useState<"openai" | "local">("local");
  const [model, setModel] = useState("included demo bill");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("The included demonstration bill is shown. Upload yours to replace it.");
  const [budget, setBudget] = useState("");
  const [savedBudget, setSavedBudget] = useState<number>();
  const [history, setHistory] = useState<Array<{ label: string; value: number }>>([
    { label: "Previous", value: bill.previous_total }, { label: "Demo current", value: bill.total }
  ]);

  useEffect(() => {
    const saved = loadPrototypeState(householdId)?.billBudgetEur;
    setSavedBudget(saved); setBudget(saved ? String(saved) : "");
    try {
      const stored = window.localStorage.getItem(`waterlens:bill-history:${householdId}`);
      if (stored) setHistory(JSON.parse(stored) as Array<{ label: string; value: number }>);
      else setHistory([{ label: "Previous", value: bill.previous_total }, { label: "Demo current", value: bill.total }]);
    } catch { setHistory([{ label: "Previous", value: bill.previous_total }, { label: "Demo current", value: bill.total }]); }
  }, [householdId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected)); setMessage("Ready to analyse. Your bill is sent securely to the AI only when you press Analyse bill.");
  };
  const analyse = async () => {
    if (!file || loading) return;
    setLoading(true); setMessage("Reading labels, amounts and tariff components…");
    try {
      const form = new FormData(); form.append("bill", file); form.append("householdId", householdId);
      const response = await fetch("/api/ai/bill-upload", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Analysis failed (${response.status})`);
      setAnalysis(body.analysis); setProvider(body.provider); setModel(body.model); setMessage(body.fallbackReason ?? "Bill analysed. Select any component to understand it.");
      if (body.provider === "openai") {
        setHistory((current) => {
          const next = [...current.filter((item) => item.label !== body.analysis.billingPeriod), { label: body.analysis.billingPeriod, value: body.analysis.total }].slice(-6);
          window.localStorage.setItem(`waterlens:bill-history:${householdId}`, JSON.stringify(next));
          return next;
        });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "The bill could not be analysed."); }
    finally { setLoading(false); }
  };
  const saveBudget = () => {
    const value = Number(budget);
    if (!Number.isFinite(value) || value <= 0) return;
    const state = loadPrototypeState(householdId) ?? defaultPrototypeState();
    savePrototypeState(householdId, { ...state, billBudgetEur: value }); setSavedBudget(value);
  };

  const maxHistory = Math.max(...history.map((item) => item.value), savedBudget ?? 0, 1);
  const categoryTotals = analysis.charges.reduce<Record<string, number>>((totals, charge) => ({ ...totals, [charge.category]: (totals[charge.category] ?? 0) + charge.amount }), {});

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-water-600">Your bill, translated</p><h1 className="mt-1 text-2xl font-semibold text-water-700">Bill Explainer</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload a water bill to see the original document and an AI-assisted explanation side by side. We separate what changes with use from what funds the wider service.</p></div><AiStatus provider={provider} model={model} loading={loading} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-xl bg-water-600 px-4 py-2 text-sm font-semibold text-white"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={selectFile} className="sr-only" />Choose PDF or image</label><button onClick={() => void analyse()} disabled={!file || loading} className="rounded-xl border border-water-300 px-4 py-2 text-sm font-semibold text-water-700 disabled:opacity-40">{loading ? "Analysing…" : "Analyse bill with AI"}</button><span className="text-xs text-slate-500">Maximum 10 MB · PDF, PNG, JPG or WEBP</span></div>
        <p className="mt-2 text-xs leading-5 text-slate-500">When you analyse, the document is sent to the configured OpenAI service. WaterLens does not save the file; only the extracted period and total are kept in this browser for comparison.</p>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{message}</p>
      </section>

      <section className="grid min-h-[38rem] gap-4 lg:grid-cols-2">
        <article className="card overflow-hidden"><div className="border-b border-slate-100 p-4"><h2 className="font-semibold">1. Original bill</h2><p className="text-xs text-slate-500">Keep the source visible while you check the explanation.</p></div>{preview ? (file?.type === "application/pdf" ? <object data={preview} type="application/pdf" className="h-[34rem] w-full"><a href={preview} target="_blank" rel="noreferrer" className="m-5 inline-block text-water-700 underline">Open PDF in a new tab</a></object> : <img src={preview} alt="Uploaded water bill" className="h-[34rem] w-full object-contain bg-slate-100 p-3" />) : <DemoInvoice analysis={analysis} />}</article>
        <article className="card p-5"><div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs uppercase tracking-wide text-slate-500">{analysis.supplier}</p><h2 className="mt-1 font-semibold">2. Plain-language breakdown</h2><p className="mt-1 text-xs text-slate-500">{analysis.billingPeriod}</p></div><p className="text-3xl font-semibold text-water-700">€{analysis.total.toFixed(2)}</p></div><div className="mt-4 space-y-3">{analysis.charges.map((charge, index) => <details key={`${charge.label}-${index}`} className="group rounded-xl border border-slate-200 p-3" open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: colors[charge.category] ?? colors.other }} />{charge.label}</span><span>€{charge.amount.toFixed(2)}</span></summary><p className="mt-3 text-sm leading-5 text-slate-600">{charge.meaning}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${charge.changesWithUse ? "bg-water-50 text-water-700" : "bg-slate-100 text-slate-600"}`}>{charge.changesWithUse ? "Changes with water use" : "Usually fixed or indirect"}</span></details>)}</div><div className="mt-4 rounded-xl bg-water-50 p-4 text-sm leading-6 text-water-900"><strong>AI summary:</strong> {analysis.summary}<p className="mt-2"><strong>Next step:</strong> {analysis.nextStep}</p><p className="mt-2 text-xs text-water-700">{analysis.confidenceNote}</p></div></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card p-5"><h2 className="text-lg font-semibold">How are my bills changing?</h2><p className="mt-1 text-sm text-slate-600">Each successfully analysed bill adds its period and total to this browser. The document itself is not stored.</p><div className="mt-6 flex h-56 items-end gap-4 overflow-x-auto border-b border-slate-200 px-2">{history.map((item, index) => <div key={`${item.label}-${index}`} className="flex h-full min-w-16 flex-1 flex-col justify-end text-center"><span className="mb-2 text-xs font-semibold">€{item.value.toFixed(2)}</span><div className={`mx-auto w-full max-w-20 rounded-t-lg ${index === history.length - 1 ? "bg-water-600" : "bg-water-200"}`} style={{ height: `${Math.max(8, item.value / maxHistory * 82)}%` }} /><span className="mt-2 truncate pb-2 text-xs text-slate-500" title={item.label}>{item.label}</span></div>)}</div>{history.length > 1 && <p className="mt-4 text-sm"><strong>{history.at(-1)!.value >= history.at(-2)!.value ? "Increase" : "Decrease"} of €{Math.abs(history.at(-1)!.value - history.at(-2)!.value).toFixed(2)}</strong> versus the previous bill.</p>}</article>
        <article className="card p-5"><h2 className="text-lg font-semibold">Set a bill budget</h2><p className="mt-1 text-sm leading-5 text-slate-600">Choose a spending target with your bill history and peer context visible. Similar households use a median of <strong>{peerMedianLppd.toFixed(1)} L/person/day</strong>; their individual bills remain private.</p><label className="mt-5 block text-sm font-medium" htmlFor="bill-budget">Target per bill (€)</label><div className="mt-2 flex gap-2"><input id="bill-budget" type="number" min="1" step="0.5" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. 35" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" /><button onClick={saveBudget} className="rounded-lg bg-water-600 px-4 py-2 font-semibold text-white">Save target</button></div>{savedBudget && <div className={`mt-4 rounded-xl p-4 text-sm ${analysis.total <= savedBudget ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>€{savedBudget.toFixed(2)} target:</strong> this bill is €{Math.abs(savedBudget - analysis.total).toFixed(2)} {analysis.total <= savedBudget ? "under" : "over"} it.</div>}<p className="mt-4 text-xs leading-5 text-slate-500">A peer consumption median is context, not a recommended spending target: tariffs, household circumstances and billing periods differ.</p></article>
      </section>

      <section className="card p-5"><h2 className="text-lg font-semibold">Where is my money going?</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Your payment supports more than the water coming from the tap. This view groups the labelled charges so the purpose of each euro is clearer.</p><div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.4fr]"><div className="flex min-h-56 items-center justify-center"><div className="relative h-48 w-48 rounded-full" style={{ background: moneyGradient(categoryTotals, analysis.total) }}><div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl text-water-700">€{analysis.total.toFixed(2)}</strong><span className="text-xs text-slate-500">total bill</span></div></div></div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(categoryTotals).map(([category, amount]) => <div key={category} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: colors[category] ?? colors.other }} /><p className="font-semibold capitalize">{category}</p></div><p className="mt-2 text-2xl font-semibold">€{amount.toFixed(2)}</p><p className="text-xs text-slate-500">{analysis.total ? (amount / analysis.total * 100).toFixed(0) : 0}% of this bill</p></div>)}</div></div><p className="mt-5 rounded-xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-900"><strong>Why this matters:</strong> transparent charges make it easier to see which behaviours can affect the next bill and which payments maintain shared infrastructure, water quality and wastewater treatment.</p></section>
    </div>
  );
}

function fromDemoBill(bill: BillBreakdown): Analysis { return { supplier: "Demo water utility", billingPeriod: bill.period, total: bill.total, consumptionM3: bill.block_breakdown.reduce((sum, row) => sum + row.m3, 0), charges: [{ label: "Fixed service", amount: bill.fixed_service_charge, category: "service", meaning: "Keeps the water service available, regardless of this period’s consumption.", changesWithUse: false }, { label: "Water consumption", amount: bill.variable_charge, category: "water", meaning: "The volume used, charged across tariff blocks.", changesWithUse: true }, { label: "Meter", amount: bill.meter_fee, category: "meter", meaning: "Supports meter operation and maintenance.", changesWithUse: false }, { label: "Wastewater treatment", amount: bill.sewerage_component, category: "wastewater", meaning: "Supports sewerage collection and water treatment.", changesWithUse: true }, { label: "Taxes", amount: bill.taxes, category: "tax", meaning: "Taxes applied to the bill subtotal.", changesWithUse: false }], summary: bill.explanation, nextStep: "Compare the variable charge with your previous bill before setting a target.", confidenceNote: "Synthetic demonstration bill; tariffs and charges are not real." }; }
function DemoInvoice({ analysis }: { analysis: Analysis }) { return <div className="m-5 min-h-[31rem] bg-slate-50 p-7 text-sm shadow-inner"><div className="flex justify-between"><div><p className="text-xl font-bold text-water-700">WATER UTILITY</p><p className="text-xs text-slate-500">Demonstration invoice</p></div><p className="font-mono">#WL-2026-071</p></div><div className="mt-10 grid grid-cols-2 gap-4"><div><p className="text-xs uppercase text-slate-400">Period</p><p>{analysis.billingPeriod}</p></div><div><p className="text-xs uppercase text-slate-400">Consumption</p><p>{analysis.consumptionM3?.toFixed(2) ?? "—"} m³</p></div></div><div className="mt-8 border-y border-slate-300 py-3">{analysis.charges.map((charge) => <div key={charge.label} className="flex justify-between py-2"><span>{charge.label}</span><span>€{charge.amount.toFixed(2)}</span></div>)}</div><div className="mt-5 flex justify-between text-xl font-bold"><span>TOTAL</span><span>€{analysis.total.toFixed(2)}</span></div><p className="mt-12 text-xs leading-5 text-slate-400">Upload your own PDF or image to replace this sample. Always verify extracted values against the original document.</p></div>; }
function moneyGradient(totals: Record<string, number>, total: number) { let current = 0; const stops = Object.entries(totals).map(([category, value]) => { const start = current; current += total ? value / total * 100 : 0; return `${colors[category] ?? colors.other} ${start}% ${current}%`; }); return `conic-gradient(${stops.join(",")})`; }
