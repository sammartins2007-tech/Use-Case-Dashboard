import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useMeterReadings, type ConsumptionRow } from "@/data/repo";
import { usd } from "@/components/ai-meter";
import { LoadingState } from "@/components/states";
import { cn } from "@/lib/utils";

const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const day = (d: string) => {
  try {
    return format(parseISO(d), "EEE d MMM");
  } catch {
    return d;
  }
};

/**
 * Measured Cowork credits (entered from the Usage screen) next to the estimated cost logged per day.
 * A day whose credits per logged dollar is far above the usual ratio has work that was never logged.
 */
export function MeasuredCredits({ rows }: { rows: ConsumptionRow[] }) {
  const q = useMeterReadings();
  const data = useMemo(() => {
    const readings = q.data ?? [];
    const byDay = new Map<string, { cost: number; runs: number }>();
    for (const r of rows) {
      const d = (r.runDate ?? "").slice(0, 10);
      if (!d) continue;
      const v = byDay.get(d) ?? { cost: 0, runs: 0 };
      v.cost += r.costUSD;
      v.runs += 1;
      byDay.set(d, v);
    }
    const lines = readings.map((m) => {
      const l = byDay.get(m.date) ?? { cost: 0, runs: 0 };
      return { ...m, cost: l.cost, runs: l.runs, ratio: l.cost > 0 ? m.credits / l.cost : Infinity };
    });
    const finite = lines.map((l) => l.ratio).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    const median = finite.length ? finite[Math.floor(finite.length / 2)] : 0;
    const credits = lines.reduce((s, l) => s + l.credits, 0);
    const cost = lines.reduce((s, l) => s + l.cost, 0);
    return { lines, median, credits, cost, max: Math.max(1, ...lines.map((l) => l.credits)) };
  }, [q.data, rows]);

  if (q.isLoading) return <LoadingState rows={2} className="mt-6" />;
  if (q.isError) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-serif)] text-xl">Measured Cowork credits vs logged estimate</h3>
        {data.lines.length > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">
            {int.format(data.credits)} credits measured · {usd.format(data.cost)} logged · {data.lines.length} days
          </p>
        )}
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Credits are the real meter, read from the Cowork Usage screen; they cover all Cowork work, not only this radar. Dollars are the
        estimates logged per run. A day well above the usual credits-per-dollar ratio had work that was never logged.
      </p>
      {data.lines.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#D9D2C4] p-4 text-sm">
          No measured credits recorded for this period yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Measured credits and logged estimate per day</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Day</th>
                <th scope="col" className="w-[40%] py-2 pr-3 font-medium">Credits measured</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Logged runs</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Logged estimate</th>
                <th scope="col" className="py-2 text-right font-medium">Credits per $</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => {
                const gap = !Number.isFinite(l.ratio) || (data.median > 0 && l.ratio > data.median * 1.3);
                return (
                  <tr key={l.id} className="border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap py-2 pr-3">
                      {day(l.date)}
                      {l.origin?.includes("in progress") && <span className="block text-xs text-muted-foreground">day in progress</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-[#EEF0FB]">
                          <div className="h-full rounded-full bg-[#4F67E8]" style={{ width: `${(l.credits / data.max) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right tabular-nums">{int.format(l.credits)}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{l.runs}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{usd.format(l.cost)}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={cn("rounded-full px-2 py-0.5", gap ? "bg-[#F8E6EA] text-[#8F2E44]" : "bg-[#E8F3EF] text-[#1E6F55]")}>
                        {Number.isFinite(l.ratio) ? int.format(l.ratio) : "no runs"}
                        <span className="sr-only">{gap ? ", unlogged work likely" : ", in line"}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Usual ratio: about {int.format(data.median)} credits per logged dollar. Red = more than 30% above it, so part of that day is not
            logged yet.
          </p>
        </div>
      )}
    </div>
  );
}
