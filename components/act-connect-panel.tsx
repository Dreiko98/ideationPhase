"use client";

import { useEffect, useMemo, useState } from "react";
import { Anomaly, Recommendation } from "@/lib/types";
import { defaultPrototypeState, loadPrototypeState, PrototypeState, savePrototypeState } from "@/lib/prototypeState";

export function ActConnectPanel({
  anomalies,
  recommendations,
  householdId
}: {
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  householdId: string;
}) {
  const [state, setState] = useState<PrototypeState>(defaultPrototypeState);
  const [goal, setGoal] = useState("");

  useEffect(() => {
    const sync = () => setState(loadPrototypeState(householdId) ?? defaultPrototypeState());
    sync();
    window.addEventListener("waterlens:prototype-state", sync);
    return () => window.removeEventListener("waterlens:prototype-state", sync);
  }, [householdId]);

  const update = (next: PrototypeState) => {
    setState(next);
    savePrototypeState(householdId, next);
  };

  const localAnomalies = useMemo(
    () => anomalies.map((a) => ({ ...a, resolution_status: state.anomalyStatuses[a.anomaly_id] ?? a.resolution_status })),
    [anomalies, state.anomalyStatuses]
  );
  const localRecommendations = useMemo(
    () => recommendations.map((r) => ({ ...r, status: state.recommendationStatuses[r.recommendation_id] ?? r.status })),
    [recommendations, state.recommendationStatuses]
  );

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Notification centre</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {localAnomalies.map((a) => (
            <li key={a.anomaly_id} className="rounded-lg bg-slate-50 p-2">
              <p>{a.possible_cause}</p>
              <p className="text-slate-600">Status: {a.resolution_status}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() =>
                    update({ ...state, anomalyStatuses: { ...state.anomalyStatuses, [a.anomaly_id]: "downgraded" } })
                  }
                  className="rounded bg-water-600 px-2 py-1 text-white"
                >
                  Confirm or downgrade
                </button>
                <button
                  onClick={() =>
                    update({ ...state, anomalyStatuses: { ...state.anomalyStatuses, [a.anomaly_id]: "resolved" } })
                  }
                  className="rounded bg-teal-500 px-2 py-1 text-white"
                >
                  Report repaired
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Recommendations workflow</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {localRecommendations.map((r) => (
            <li key={r.recommendation_id} className="rounded-lg bg-slate-50 p-2">
              <p className="font-medium">{r.title}</p>
              <p>{r.explanation}</p>
              <p className="text-slate-600">Status: {r.status}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => update({ ...state, recommendationStatuses: { ...state.recommendationStatuses, [r.recommendation_id]: "accepted" } })} className="rounded bg-water-600 px-2 py-1 text-white">Accept</button>
                <button onClick={() => update({ ...state, recommendationStatuses: { ...state.recommendationStatuses, [r.recommendation_id]: "dismissed" } })} className="rounded bg-slate-200 px-2 py-1">Dismiss</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Support ticket creation</h2>
        <button onClick={() => update({ ...state, ticketStatus: "Support request drafted in this browser." })} className="mt-2 rounded bg-slate-900 px-3 py-2 text-white">
          Create support request
        </button>
        <p className="mt-2 text-sm text-slate-700">{state.ticketStatus}</p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Personal goals</h2>
        <div className="mt-2 flex gap-2">
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Set monthly goal in m3" className="rounded border border-slate-300 px-3 py-2" />
          <button
            onClick={() => {
              const value = Number(goal);
              if (Number.isFinite(value) && value > 0) {
                update({ ...state, goalM3: value });
                setGoal("");
              }
            }}
            className="rounded bg-water-700 px-3 py-2 text-white"
          >
            Save goal
          </button>
        </div>
        {state.goalM3 && <p className="mt-2 text-sm text-slate-700">Saved goal: {state.goalM3} m3/month</p>}
      </section>
      <p className="text-xs text-slate-500">Prototype-only: actions persist in this browser and are not sent to a utility backend.</p>
    </div>
  );
}
