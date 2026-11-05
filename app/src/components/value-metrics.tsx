import { Clock, PiggyBank, TrendingUp } from "lucide-react";
import type { UseCase } from "@/data/types";
import { fmtHours, totalsOf, usd0, usdCompact } from "@/lib/kpi";
import { cn } from "@/lib/utils";

/** The three value metrics, always computed from the use cases currently shown (so they follow every filter). */
export function ValueMetrics({
  useCases,
  scope,
  variant = "light",
  compact = false,
  className,
}: {
  useCases: UseCase[];
  /** Short description of what is counted, e.g. "Wave 1 · Finance". */
  scope?: string;
  variant?: "light" | "onDark";
  compact?: boolean;
  className?: string;
}) {
  const t = totalsOf(useCases.map((u) => u.kpiValues));
  const items = [
    { label: "Estimated time saved", value: fmtHours(t.hours, true), full: `${fmtHours(t.hours)} per year`, unit: "/ year", n: t.nHours, icon: Clock },
    { label: "Estimated cost savings", value: usdCompact.format(t.costUsd), full: `${usd0.format(t.costUsd)} per year`, unit: "/ year", n: t.nCost, icon: PiggyBank },
    { label: "Estimated revenue gain", value: usdCompact.format(t.revenueUsd), full: `${usd0.format(t.revenueUsd)} per year`, unit: "/ year", n: t.nRevenue, icon: TrendingUp },
  ];
  const dark = variant === "onDark";
  return (
    <section aria-label="Estimated value" className={cn("w-full", className)}>
      <dl className={cn("grid gap-3", compact ? "grid-cols-3" : "sm:grid-cols-3")}>
        {items.map((it) => (
          <div
            key={it.label}
            title={it.full}
            className={cn(
              "flex items-start gap-3 rounded-2xl",
              compact ? "p-3" : "p-4",
              dark ? "bg-white/12 ring-1 ring-white/20 backdrop-blur-sm" : "border border-[#B9DCC8] bg-[#F1F8F3]",
            )}
          >
            <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", dark ? "bg-white/15" : "bg-white text-[#1E5B3E]")}>
              <it.icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className={cn("text-xs", dark ? "text-white/80" : "text-[#1E5B3E]")}>{it.label}</dt>
              <dd className={cn("font-[family-name:var(--font-serif)] tabular-nums leading-tight", compact ? "text-2xl" : "text-3xl", dark ? "text-white" : "text-[#1B2A41]")}>
                {it.value}
                <span className={cn("ml-1 text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{it.unit}</span>
              </dd>
              <dd className={cn("text-[11px]", dark ? "text-white/70" : "text-muted-foreground")}>
                from {it.n} of {t.n} use case{t.n === 1 ? "" : "s"}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      {!compact && (
        <p className={cn("mt-2 text-[11px]", dark ? "text-white/65" : "text-muted-foreground")}>
          {scope ? `${scope} · ` : ""}Estimates from each use case's KPIs. Hours stay hours; money is in US dollars. Per use case, one KPI per measure is counted to avoid double counting.
        </p>
      )}
    </section>
  );
}
