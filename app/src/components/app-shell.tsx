import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { AiMeter } from "@/components/ai-meter";
import { cn } from "@/lib/utils";
import { RADAR } from "@/radar.config";
import { SINGLE_CUSTOMER } from "@/lib/brands";

const NAV = [
  { to: "/", label: "Welcome", end: true },
  SINGLE_CUSTOMER
    ? { to: `/customer/${encodeURIComponent(SINGLE_CUSTOMER)}`, label: `${SINGLE_CUSTOMER} use cases`, end: false }
    : { to: "/customers", label: "Customers", end: false },
  { to: "/finops", label: "FinOps", end: false },
  { to: "/method", label: "How it works", end: false },
  { to: "/features", label: "Feature radar", end: false },
];

export function AppShell() {
  const { pathname } = useLocation();
  const inCustomer = pathname.startsWith("/customer/") || pathname.startsWith("/use-case/");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-[#F7F5F0]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-6 px-6">
          <NavLink to="/" className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <RadarMark />
            <span className="leading-tight">
              <span className="block font-[family-name:var(--font-serif)] text-[18px] tracking-tight">{RADAR.appTitle}</span>
              <span className="block text-[11px] text-muted-foreground">{RADAR.owner} · {RADAR.team}</span>
            </span>
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive || (n.label !== "Welcome" && n.to.startsWith("/customer") && inCustomer)
                      ? "bg-[#1B2A41] text-white"
                      : "text-[#3D4757] hover:bg-[#EFEBE3]",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <AiMeter className="ml-auto" />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1"
        >
          <Outlet />
        </motion.div>
      </main>
      <Toaster />
    </div>
  );
}

function RadarMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="16" fill="#1B2A41" />
      <circle cx="17" cy="17" r="11" fill="none" stroke="#E8D9B8" strokeWidth="1" opacity="0.6" />
      <circle cx="17" cy="17" r="6" fill="none" stroke="#E8D9B8" strokeWidth="1" opacity="0.6" />
      <path d="M17 17 L28 9" stroke="#D9B26A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="12" r="2.2" fill="#D9B26A" />
      <circle cx="11" cy="21" r="1.6" fill="#7FC4C9" />
    </svg>
  );
}

export default AppShell;
