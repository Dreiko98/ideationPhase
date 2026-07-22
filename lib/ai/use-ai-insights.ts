"use client";

import { useCallback, useEffect, useState } from "react";
import { AiInsights } from "./contracts";

export function useAiInsights(householdId: string) {
  const [data, setData] = useState<AiInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, refresh })
      });
      if (!response.ok) throw new Error(`AI request failed (${response.status})`);
      setData(await response.json() as AiInsights);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load AI insights");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => { void load(false); }, [load]);
  return { data, loading, error, refresh: () => load(true) };
}
