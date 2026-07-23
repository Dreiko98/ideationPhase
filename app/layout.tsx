import "./globals.css";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { WaterMascot } from "@/components/water-mascot";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "WaterLens",
  description: "Personal water intelligence prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
          <Navigation />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <WaterMascot />
      </body>
    </html>
  );
}
