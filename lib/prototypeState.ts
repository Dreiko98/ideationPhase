import { Anomaly, Recommendation } from "./types";

export type PrototypeState = {
  anomalyStatuses: Record<string, Anomaly["resolution_status"]>;
  recommendationStatuses: Record<string, Recommendation["status"]>;
  ticketStatus: string;
  goalM3?: number;
  contextNote?: string;
};

export const prototypeStateKey = (householdId: string) => `waterlens:prototype:${householdId}`;

export function loadPrototypeState(householdId: string): PrototypeState | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(prototypeStateKey(householdId));
    return value ? (JSON.parse(value) as PrototypeState) : null;
  } catch {
    return null;
  }
}

export function savePrototypeState(householdId: string, state: PrototypeState) {
  window.localStorage.setItem(prototypeStateKey(householdId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("waterlens:prototype-state", { detail: householdId }));
}

export function defaultPrototypeState(): PrototypeState {
  return { anomalyStatuses: {}, recommendationStatuses: {}, ticketStatus: "No support request created" };
}
