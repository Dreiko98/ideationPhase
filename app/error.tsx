"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card mx-auto max-w-2xl p-6" role="alert">
      <h1 className="text-xl font-semibold text-red-700">WaterLens data is unavailable</h1>
      <p className="mt-2 text-sm text-slate-700">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded bg-water-700 px-4 py-2 text-white">
        Try again
      </button>
    </section>
  );
}
