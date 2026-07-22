"use client";

import { useAiInsights } from "@/lib/ai/use-ai-insights";
import { AiStatus } from "./ai-status";

export function CommunityAiSummary({ householdId }: { householdId: string }) {
  const { data, loading, error, refresh } = useAiInsights(householdId);
  const summary = data?.communitySummary;
  return (
    <section className="card border-l-4 border-l-water-500 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">AI interpretation of your comparison</h2><AiStatus provider={data?.provider} model={data?.model} loading={loading} /></div>
      {summary ? <div className="mt-3 grid gap-4 text-sm md:grid-cols-3"><div><p className="font-medium">In one sentence</p><p className="mt-1 text-slate-600">{summary.headline}</p></div><div><p className="font-medium">What it means</p><p className="mt-1 text-slate-600">{summary.interpretation} {summary.comparison}</p></div><div><p className="font-medium">Privacy context</p><p className="mt-1 text-slate-600">{summary.privacyNote}</p></div></div> : <p className="mt-3 text-sm text-slate-500">Preparing a grounded interpretation from cohort and district aggregates…</p>}
      <button onClick={() => void refresh()} disabled={loading} className="mt-4 rounded-lg border border-water-200 px-3 py-2 text-xs font-medium text-water-700 disabled:opacity-50">Regenerate interpretation</button>
      {data?.fallbackReason && <p className="mt-2 text-xs text-amber-700">{data.fallbackReason}</p>}{error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
