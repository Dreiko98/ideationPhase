"use client";

import { usePathname } from "next/navigation";
import { HouseholdProfile } from "@/lib/types";

export function HouseholdSelector({ profiles, selectedId }: { profiles: HouseholdProfile[]; selectedId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex justify-end">
      <label className="flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white/80 p-2 pl-4 shadow-card backdrop-blur sm:w-auto">
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Demo home</span>
        <select
          value={selectedId}
          onChange={(e) => {
            // This demo intentionally performs a full server navigation. Every
            // household has a different server-rendered dashboard preset, and
            // a reload prevents a stale App Router payload from leaving the
            // previous household's widgets on screen.
            window.location.assign(`${pathname}?household=${encodeURIComponent(e.target.value)}`);
          }}
          className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-300 sm:min-w-64"
        >
          {profiles.map((p) => (
            <option key={p.household_id} value={p.household_id}>
              {p.name} ({p.household_id})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
