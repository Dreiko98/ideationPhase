import { OnboardingFlow } from "@/components/onboarding-flow";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h1 className="text-2xl font-semibold text-water-700">Onboarding</h1>
        <p className="text-sm text-slate-600 mt-2">Short setup to personalise insights, recommendations, and privacy-safe comparisons.</p>
      </section>
      <OnboardingFlow />
    </div>
  );
}
