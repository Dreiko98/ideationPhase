"use client";

import { useEffect, useState } from "react";

export function CampaignBanner({ weeklyChange }: { weeklyChange: number }) {
  const [joined, setJoined] = useState(false);
  useEffect(() => setJoined(window.localStorage.getItem("waterlens:challenge:july") === "joined"), []);
  const progress = joined ? Math.max(8, Math.min(100, Math.round(55 - weeklyChange * 3))) : 0;
  const join = () => { window.localStorage.setItem("waterlens:challenge:july", "joined"); setJoined(true); };

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-700 via-water-600 to-teal-500 p-5 text-white shadow-card">
      <div className="grid items-center gap-5 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Global Omnium community challenge · July</p>
          <h2 className="mt-2 text-xl font-semibold">Move one water-heavy task away from 19:00–21:00</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50">A light, voluntary challenge to reduce demand during the evening peak. Your individual readings are never published.</p>
          {joined && <div className="mt-3 max-w-xl"><div className="mb-1 flex justify-between text-xs"><span>Your challenge progress</span><strong>{progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} /></div></div>}
        </div>
        <button onClick={join} disabled={joined} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-water-700 disabled:bg-white/20 disabled:text-white">{joined ? "Challenge joined ✓" : "Join challenge"}</button>
      </div>
    </section>
  );
}
