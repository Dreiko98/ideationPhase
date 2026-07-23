"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const tips: Record<string, string[]> = {
  "/my-water": ["Small routine changes are easier to keep than one big promise.", "Your forecast helps you act before the bill arrives."],
  "/bill-explainer": ["Variable charges change with use; fixed charges usually do not.", "Set a bill goal after checking your recent history."],
  "/community": ["Similar homes make a fairer comparison than nearby streets.", "Peer figures are anonymous aggregates, never individual readings."],
  "/copilot": ["Ask me why a metric changed, not only whether it changed.", "I can turn your water data into practical next steps."]
};

export function WaterMascot() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setVisible(window.localStorage.getItem("waterlens:mascot-visible") !== "false");
    const listener = (event: Event) => setSpeaking((event as CustomEvent<boolean>).detail);
    window.addEventListener("waterlens:mascot-speaking", listener);
    return () => window.removeEventListener("waterlens:mascot-speaking", listener);
  }, []);

  const setMascotVisible = (next: boolean) => {
    setVisible(next);
    window.localStorage.setItem("waterlens:mascot-visible", String(next));
  };
  const pageTips = tips[pathname] ?? tips["/my-water"];

  if (!visible) {
    return <button onClick={() => setMascotVisible(true)} className="fixed bottom-4 right-4 z-30 rounded-full bg-water-600 px-4 py-2 text-sm font-semibold text-white shadow-lg" aria-label="Show Aqua mascot">Show Aqua</button>;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-30 flex max-w-[19rem] items-end gap-2" aria-label="Aqua, your water guide">
      <div className="mascot-bubble rounded-2xl bg-white p-3 text-xs leading-5 text-slate-700 shadow-card">
        <button onClick={() => setMascotVisible(false)} className="float-right ml-2 text-slate-400 hover:text-slate-700" aria-label="Hide Aqua">×</button>
        <p className="font-semibold text-water-700">Aqua says</p>
        <p className="mt-1">{speaking ? "I’m working on your answer…" : pageTips[tipIndex % pageTips.length]}</p>
        {!speaking && <button onClick={() => setTipIndex((value) => value + 1)} className="mt-2 font-semibold text-water-600">Another tip →</button>}
      </div>
      <div className={`water-mascot ${speaking ? "is-speaking" : ""}`} aria-hidden="true">
        <div className="mascot-shine" />
        <div className="mascot-eye mascot-eye-left" /><div className="mascot-eye mascot-eye-right" />
        <div className="mascot-mouth" />
      </div>
    </aside>
  );
}
