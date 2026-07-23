"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { runCopilot, suggestedQuestions } from "@/lib/copilot";
import { AiChatResponse } from "@/lib/ai/contracts";
import { Anomaly, ForecastEntry, Recommendation, HouseholdSnapshot } from "@/lib/types";
import { defaultPrototypeState, loadPrototypeState, savePrototypeState } from "@/lib/prototypeState";
import { AiStatus } from "./ai-status";

type Props = {
  snapshot: HouseholdSnapshot;
  forecast: ForecastEntry;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  matchedComparison: { cohort_size: number; median_lppd: number; percentile: number };
};

type Message = { role: "user" | "assistant"; text: string; facts?: string[]; followUp?: string; provider?: "openai" | "local" };

export function CopilotChat({ snapshot, forecast, anomalies, recommendations, matchedComparison }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I’m Water Copilot. Ask me to interpret your usage, forecast, budget, peer comparison, anomaly signals, bill or next best action." }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<"openai" | "local" | undefined>();
  const [model, setModel] = useState<string>();
  const [fallbackReason, setFallbackReason] = useState<string>();
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);

  const localContext = useMemo(() => ({ snapshot, forecast, anomalies, recommendations, matchedComparison }), [snapshot, forecast, anomalies, recommendations, matchedComparison]);

  const applyPrototypeAction = (text: string) => {
    const result = runCopilot(text, localContext);
    const persisted = loadPrototypeState(snapshot.household_id) ?? defaultPrototypeState();
    if (result.intent === "support") savePrototypeState(snapshot.household_id, { ...persisted, ticketStatus: "Support request drafted in this browser." });
    if (result.intent === "update_context") savePrototypeState(snapshot.household_id, { ...persisted, contextNote: text });
    return result;
  };

  const send = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || sending) return;
    const deterministic = applyPrototypeAction(text);
    const history = [...messages, { role: "user" as const, text }];
    setMessages(history);
    setInput("");
    setSending(true);
    setFallbackReason(undefined);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: snapshot.household_id,
          messages: history.slice(-12).map((item) => ({ role: item.role, content: item.text }))
        })
      });
      if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
      const answer = await response.json() as AiChatResponse;
      setProvider(answer.provider);
      setModel(answer.model);
      setFallbackReason(answer.fallbackReason);
      setDynamicSuggestions(answer.suggestedActions);
      setMessages((current) => [...current, { role: "assistant", text: answer.message, facts: answer.facts, followUp: answer.followUp, provider: answer.provider }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "AI request failed";
      setProvider("local");
      setModel("deterministic-fallback");
      setFallbackReason(reason);
      setMessages((current) => [...current, { role: "assistant", text: deterministic.message, facts: deterministic.facts, followUp: deterministic.followUp, provider: "local" }]);
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const questions = dynamicSuggestions.length ? dynamicSuggestions : suggestedQuestions;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-water-50 p-3">
          <div>
            <p className="text-sm font-medium text-water-800">AI grounded in this household’s synthetic data</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-water-700">OpenAI receives the selected profile, calculated metrics, forecasts, anomaly signals and aggregate comparisons. It cannot read other files or change your analytical data.</p>
          </div>
          <AiStatus provider={provider} model={model} loading={sending} />
        </div>
        {fallbackReason && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Fallback reason: {fallbackReason}</p>}
        <div className="h-[28rem] space-y-3 overflow-y-auto" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "assistant" ? "rounded-xl bg-slate-100 p-3" : "ml-8 rounded-xl bg-water-600 p-3 text-white"}>
              {message.role === "assistant" ? <ProgressiveText text={message.text} animate={index === messages.length - 1} /> : <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>}
              {message.facts && message.facts.length > 0 && (
                <details className="mt-2 text-xs opacity-80">
                  <summary className="cursor-pointer font-medium">Metrics used ({message.facts.length})</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{message.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
                </details>
              )}
              {message.followUp && <p className="mt-2 text-xs font-medium">Follow-up: {message.followUp}</p>}
            </div>
          ))}
          {sending && <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">Reviewing the household metrics…</div>}
        </div>
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label htmlFor="copilot-input" className="sr-only">Ask Water Copilot</label>
          <input id="copilot-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question about this household’s water data…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2" maxLength={2000} />
          <button disabled={sending || !input.trim()} className="rounded-lg bg-water-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Thinking…" : "Send"}</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">AI advice is informational. Possible leak signals should be confirmed through a physical check or utility support.</p>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold">Suggested questions</h3>
          <ul className="mt-2 space-y-2">{questions.slice(0, 6).map((question) => <li key={question}><button onClick={() => void send(question)} disabled={sending} className="w-full rounded-lg bg-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-200 disabled:opacity-50">{question}</button></li>)}</ul>
        </div>
        <div className="card p-4 text-sm">
          <h3 className="font-semibold">Helpful conversations</h3>
          <p className="mt-1 text-xs text-slate-500">Use your household data to explore causes, goals and practical routines.</p>
          <div className="mt-3 space-y-2">
            <button onClick={() => void send("Explain my latest anomaly signal and give me a safe checklist")} disabled={sending} className="w-full rounded-lg bg-teal-500 px-3 py-2 text-white disabled:opacity-50">Review an anomaly</button>
            <button onClick={() => void send("Guests stayed over; explain whether that could fit the recent change and update my context")} disabled={sending} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white disabled:opacity-50">Update household context</button>
            <button onClick={() => void send("Help me choose a realistic new monthly water goal from my metrics")} disabled={sending} className="w-full rounded-lg bg-water-700 px-3 py-2 text-white disabled:opacity-50">Discuss a personal goal</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ProgressiveText({ text, animate }: { text: string; animate: boolean }) {
  const [visible, setVisible] = useState(animate ? "" : text);
  useEffect(() => {
    if (!animate) { setVisible(text); return; }
    let index = 0;
    window.dispatchEvent(new CustomEvent("waterlens:mascot-speaking", { detail: true }));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + 3); setVisible(text.slice(0, index));
      if (index >= text.length) { window.clearInterval(timer); window.dispatchEvent(new CustomEvent("waterlens:mascot-speaking", { detail: false })); }
    }, 18);
    return () => { window.clearInterval(timer); window.dispatchEvent(new CustomEvent("waterlens:mascot-speaking", { detail: false })); };
  }, [text, animate]);
  return <p className="whitespace-pre-wrap text-sm leading-6">{visible}<span className={visible.length < text.length ? "animate-pulse" : "hidden"}>▍</span></p>;
}
