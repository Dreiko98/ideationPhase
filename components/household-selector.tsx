"use client";

import { usePathname, useRouter } from "next/navigation";
import { HouseholdProfile } from "@/lib/types";

export function HouseholdSelector({ profiles, selectedId }: { profiles: HouseholdProfile[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Demo household</span>
      <select
        value={selectedId}
        onChange={(e) => {
          router.push(`${pathname}?household=${encodeURIComponent(e.target.value)}`);
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
      >
        {profiles.map((p) => (
          <option key={p.household_id} value={p.household_id}>
            {p.name} ({p.household_id})
          </option>
        ))}
      </select>
    </label>
  );
}
