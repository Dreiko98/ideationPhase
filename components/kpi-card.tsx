export function KpiCard({
  label,
  value,
  status,
  explain,
  description
}: {
  label: string;
  value: string;
  status: string;
  explain: string;
  description?: string;
}) {
  return (
    <div className="card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-brand-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-brand-800">{value}</p>
      <p className="mt-2 inline-flex rounded-full bg-water-50 px-2 py-1 text-xs font-medium text-water-700">{status}</p>
      {description && <p className="mt-3 text-sm leading-5 text-slate-600">{description}</p>}
      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">How is this calculated?</summary>
        <p className="mt-2 text-sm leading-5 text-slate-600">{explain}</p>
      </details>
    </div>
  );
}
