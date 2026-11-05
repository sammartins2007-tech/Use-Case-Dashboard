import { Link } from "react-router-dom";
import type { UseCase } from "@/data/types";
import { ValueMetrics } from "@/components/value-metrics";
import { caseValue, fmtHours, usdCompact } from "@/lib/kpi";
import { stripRef } from "@/lib/validated";

/** Customer-level value: the three metrics plus the largest contributors. */
export function CustomerSavings({ name, useCases }: { name: string; useCases: UseCase[] }) {
  const rows = useCases.map((u) => ({ u, v: caseValue(u.kpiValues) })).filter((x) => x.v.hours || x.v.costUsd || x.v.revenueUsd);
  const top = [...rows].sort((a, b) => (b.v.costUsd ?? 0) + (b.v.revenueUsd ?? 0) - ((a.v.costUsd ?? 0) + (a.v.revenueUsd ?? 0)) || (b.v.hours ?? 0) - (a.v.hours ?? 0)).slice(0, 4);
  return (
    <section aria-label={`${name} estimated value`} className="space-y-3">
      <ValueMetrics useCases={useCases} scope={`All ${useCases.length} active ${name} use cases`} />
      {top.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Largest contributors">
          {top.map(({ u, v }) => (
            <li key={u.id}>
              <Link to={`/use-case/${u.id}`} className="block rounded-xl border border-border bg-white px-3 py-2 text-sm hover:shadow-sm">
                <span className="line-clamp-1 font-medium">{stripRef(u.title)}</span>
                <span className="flex flex-wrap gap-x-3 text-xs tabular-nums text-[#1E5B3E]">
                  {v.hours ? <span>{fmtHours(v.hours, true)} saved</span> : null}
                  {v.costUsd ? <span>{usdCompact.format(v.costUsd)} cost</span> : null}
                  {v.revenueUsd ? <span>{usdCompact.format(v.revenueUsd)} revenue</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
