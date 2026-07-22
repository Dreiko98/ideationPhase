export function AiStatus({ provider, model, loading }: { provider?: "openai" | "local"; model?: string; loading?: boolean }) {
  if (loading) return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"><span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />Generating…</span>;
  if (!provider) return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"><span className="h-2 w-2 rounded-full bg-slate-400" />AI status pending</span>;
  if (provider === "openai") return <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />OpenAI · {model}</span>;
  return <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Local fallback</span>;
}
