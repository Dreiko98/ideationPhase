import "./globals.css";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { WaterMascot } from "@/components/water-mascot";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "GOTA",
  description: "Your personal water intelligence companion"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="brand-orb brand-orb-one" aria-hidden="true" />
        <div className="brand-orb brand-orb-two" aria-hidden="true" />
        <Suspense fallback={<div className="h-[4.5rem] border-b border-brand-100 bg-white/90" />}>
          <Navigation />
        </Suspense>
        <main className="relative z-[1] mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">{children}</main>
        <WaterMascot />
      </body>
    </html>
  );
}
