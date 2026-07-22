"use client";

import { useAiInsights } from "@/lib/ai/use-ai-insights";
import { AiStatus } from "./ai-status";

export function BillAiExplanation({ householdId }: { householdId: string }) {
  const { data, loading, error, refresh } = useAiInsights(householdId);
  const summary = data?.billSummary;
  return (
    <section className="card border-l-4 border-l-teal-500 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">AI bill explanation</h2><AiStatus provider={data?.provider} model={data?.model} loading={loading} /></div>
      {summary ? <div className="mt-3 grid gap-4 text-sm md:grid-cols-3"><div><p className="font-medium">Summary</p><p className="mt-1 text-slate-600">{summary.headline}</p></div><div><p className="font-medium">What influenced it</p><p className="mt-1 text-slate-600">{summary.explanation}</p></div><div><p className="font-medium">What to do next</p><p className="mt-1 text-slate-600">{summary.nextStep}</p></div></div> : <p className="mt-3 text-sm text-slate-500">Reviewing the synthetic bill against this household’s metrics and forecast…</p>}
      <button onClick={() => void refresh()} disabled={loading} className="mt-4 rounded-lg border border-water-200 px-3 py-2 text-xs font-medium text-water-700 disabled:opacity-50">Regenerate bill explanation</button>
      {data?.fallbackReason && <p className="mt-2 text-xs text-amber-700">{data.fallbackReason}</p>}{error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
