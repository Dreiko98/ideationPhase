"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const links = [
  { href: "/my-water", label: "My Water" },
  { href: "/copilot", label: "Water Copilot" },
  { href: "/community", label: "My Community" },
  { href: "/act-connect", label: "Act & Connect" },
  { href: "/bill-explainer", label: "Bill Explainer" },
  { href: "/onboarding", label: "Onboarding" }
];

export function Navigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const hh = params.get("household") ?? "HH-0001";

  return (
    <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={`${link.href}?household=${hh}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                active ? "bg-water-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
