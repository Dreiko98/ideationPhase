"use client";

import { useState } from "react";

const steps = ["Home", "Household", "Goals", "Privacy"] as const;

export function OnboardingFlow() {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ dwelling: "apartment", size: "", bathrooms: "1", residents: "1", occupancy: "mixed", goal: "", personalise: true, community: true });
  const field = (name: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));

  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">Step {index + 1} of {steps.length}</p>
      <h2 className="text-xl font-semibold mt-1">{steps[index]}</h2>
      <div className="mt-4 space-y-3 text-sm">
        {index === 0 && (
          <>
            <label className="block">Dwelling type<select aria-label="Dwelling type" value={form.dwelling} onChange={(e) => field("dwelling", e.target.value)} className="mt-1 block rounded border p-2"><option>apartment</option><option>house</option><option>duplex</option></select></label>
            <label className="block">Approximate size (m²)<input aria-label="Approximate size" type="number" min="20" value={form.size} onChange={(e) => field("size", e.target.value)} className="mt-1 block rounded border p-2" /></label>
            <label className="block">Bathrooms<input aria-label="Bathrooms" type="number" min="1" value={form.bathrooms} onChange={(e) => field("bathrooms", e.target.value)} className="mt-1 block rounded border p-2" /></label>
            <p className="text-slate-600">Optional fields can be skipped in this prototype.</p>
          </>
        )}
        {index === 1 && (
          <>
            <label className="block">Residents<input aria-label="Residents" type="number" min="1" value={form.residents} onChange={(e) => field("residents", e.target.value)} className="mt-1 block rounded border p-2" /></label>
            <label className="block">Occupancy pattern<select aria-label="Occupancy pattern" value={form.occupancy} onChange={(e) => field("occupancy", e.target.value)} className="mt-1 block rounded border p-2"><option value="daytime_out">Daytime out</option><option value="mixed">Mixed</option><option value="mostly_home">Mostly home</option></select></label>
            <p className="text-slate-600">Used for fair household matching and more relevant recommendations.</p>
          </>
        )}
        {index === 2 && (
          <>
            <label className="block">Monthly budget (m³)<input aria-label="Monthly budget" type="number" min="1" step="0.1" value={form.goal} onChange={(e) => field("goal", e.target.value)} className="mt-1 block rounded border p-2" /></label>
            <p className="text-slate-600">Used for forecast-based alerts and budget status.</p>
          </>
        )}
        {index === 3 && (
          <>
            <label className="flex gap-2"><input type="checkbox" checked={form.personalise} onChange={(e) => field("personalise", e.target.checked)} />Personalised insights</label>
            <label className="flex gap-2"><input type="checkbox" checked={form.community} onChange={(e) => field("community", e.target.checked)} />Anonymised community aggregation</label>
            <p className="text-slate-600">No exact household data is shared in community views.</p>
          </>
        )}
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => setIndex((v) => Math.max(0, v - 1))} className="rounded bg-slate-200 px-3 py-2 text-sm">
          Back
        </button>
        <button onClick={() => {
          if (index < steps.length - 1) setIndex((v) => v + 1);
          else {
            window.localStorage.setItem("waterlens:onboarding", JSON.stringify(form));
            setSaved(true);
          }
        }} className="rounded bg-water-600 px-3 py-2 text-sm text-white">
          {index === steps.length - 1 ? "Save profile" : "Next"}
        </button>
      </div>
      {saved && <p role="status" className="mt-3 text-sm text-teal-700">Profile saved in this browser for the prototype.</p>}
    </div>
  );
}
