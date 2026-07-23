"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLogo } from "./brand-logo";

const links = [
  { href: "/my-water", label: "My Water" },
  { href: "/copilot", label: "Water Copilot" },
  { href: "/community", label: "My Community" },
  { href: "/bill-explainer", label: "Bill Explainer" }
];

export function Navigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const hh = params.get("household") ?? "HH-0001";

  return (
    <nav className="sticky top-0 z-20 border-b border-brand-100/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={`/my-water?household=${hh}`} className="shrink-0 transition-transform hover:scale-[1.02]">
          <BrandLogo className="text-[2rem]" />
        </Link>
        <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-2xl bg-brand-50 p-1.5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={`${link.href}?household=${hh}`}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-white text-brand-700 shadow-brand-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-brand-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
