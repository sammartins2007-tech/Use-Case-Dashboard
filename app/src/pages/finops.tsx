import { RADAR } from "@/radar.config";
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { tokensFmt, usd, useAiTotals } from "@/components/ai-meter";
import { LIVE_READ_ONLY } from "@/lib/read-only";
import { useUseCases } from "@/data/repo";
import { ACCOUNTS } from "@/data/types";
import { usd0 as eur } from "@/lib/kpi";
import { cn } from "@/lib/utils";

const fmtDate = (d?: string) => {
  if (!d) return "";
  try {
    return format(parseISO(d), "d MMM yyyy");
  } catch {
    return d;
  }
};

export function FinOpsPage() {
  const ai = useAiTotals();
  const q = useUseCases();
  const [open, setOpen] = useState<number | null>(null);

  const sized = useMemo(
    () => (q.data?.rows ?? []).filter((u) => !u.discarded && (typeof u.monthlyCost === "number" || typeof u.monthlyValue === "number")),
    [q.data],
  );
  const byCustomer = ACCOUNTS.map((a) => {
    const l = sized.filter((u) => (u.account ?? "Internal") === a);
    return { a, n: l.length, cost: l.reduce((s, u) => s + (u.monthlyCost ?? 0), 0), value: l.reduce((s, u) => s + (u.monthlyValue ?? 0), 0) };
  }).filter((x) => x.n > 0);
  const byKind = useMemo(() => {
    const m = new Map<string, { cost: number; tokens: number; runs: number }>();
    for (const r of ai.rows) {
      const k = r.kind ?? "Other";
      const v = m.get(k) ?? { cost: 0, tokens: 0, runs: 0 };
      v.cost += r.costUSD;
      v.tokens += r.inputTokens + r.outputTokens;
      v.runs += 1;
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[1].cost - a[1].cost);
  }, [ai.rows]);
  const maxKind = Math.max(1, ...byKind.map(([, v]) => v.cost));

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top_left,#F3E6CB_0%,#F7F5F0_50%)]">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-12">
          <p className="text-sm text-[#8A6420]">AI FinOps</p>
          <h1 className="mt-1 max-w-3xl font-[family-name:var(--font-serif)] text-4xl leading-tight tracking-tight">
            Scale AI while staying in financial control,
            <span className="italic text-[#0E7C86]"> and know it creates value.</span>
          </h1>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Cost per token", "What the model charges. Falling fast, but tokens are not tasks.", "#B8892B"],
              ["Cost per task", "Agents call models many times per task. Measure the whole run.", "#0E7C86"],
              ["Value per outcome", "Minutes saved, errors avoided, revenue gained. This funds the next dollar.", "#2A9D78"],
            ].map(([t, d, c]) => (
              <div key={t} className="rounded-2xl border border-border bg-white/80 p-5">
                <span className="block h-1 w-10 rounded-full" style={{ backgroundColor: c }} aria-hidden="true" />
                <h2 className="mt-3 font-[family-name:var(--font-serif)] text-lg">{t}</h2>
                <p className="mt-1 text-sm text-[#3D4757]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] space-y-10 px-6 py-10">
        {!RADAR.customerEdition && !LIVE_READ_ONLY && (
        <section id="consumption" aria-labelledby="cons-title" className="scroll-mt-20">
          <h2 id="cons-title" className="font-[family-name:var(--font-serif)] text-2xl">
            AI consumed by this radar
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every refresh, import and analysis is logged with its tokens and cost. Rows marked estimated are computed from the number of
            agent steps and their working context at an illustrative list price, not read from a billing meter.
          </p>
          {ai.q.isLoading ? (
            <LoadingState rows={4} className="mt-4" />
          ) : ai.q.isError ? (
            <ConnectorErrorState error={ai.q.error} connector="SharePoint" />
          ) : ai.rows.length === 0 ? (
            <EmptyState title="No AI runs logged yet" />
          ) : (
            <div className="mt-5 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E8D9B8] bg-[#FBF4E4] p-5">
                  <p className="text-sm text-[#8A6420]">Total so far</p>
                  <p className="font-[family-name:var(--font-serif)] text-4xl tabular-nums">{usd.format(ai.cost)}</p>
                  <p className="text-sm text-muted-foreground">
                    {tokensFmt(ai.tokens)} tokens · {ai.runs} runs
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium">By activity</h3>
                  <ul className="mt-3 space-y-3">
                    {byKind.map(([k, v]) => (
                      <li key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{k}</span>
                          <span className="tabular-nums">{usd.format(v.cost)}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-[#F1ECE2]">
                          <div className="h-full rounded-full bg-[#B8892B]" style={{ width: `${(v.cost / maxKind) * 100}%` }} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {v.runs} runs · {tokensFmt(v.tokens)} tokens
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">AI runs, newest first</caption>
                  <thead>
                    <tr className="border-b border-border bg-[#FBF9F5] text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2 font-medium">Date</th>
                      <th scope="col" className="px-4 py-2 font-medium">Run</th>
                      <th scope="col" className="px-4 py-2 font-medium">Status</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Tokens</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ai.rows.map((r) => (
                      <Fragment key={r.id}>
                        <tr className="border-b border-border last:border-b-0">
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(r.runDate)}</td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              aria-expanded={open === r.id}
                              onClick={() => setOpen(open === r.id ? null : r.id)}
                              className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              {r.title}
                            </button>
                            <span className="block text-xs text-muted-foreground">
                              {r.kind}
                              {r.estimated ? " · estimated" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs",
                                r.status === "Completed" ? "bg-[#E8F3EF] text-[#1E6F55]" : r.status === "Stalled" ? "bg-[#FBF4E4] text-[#7A5718]" : "bg-[#F8E6EA] text-[#8F2E44]",
                              )}
                            >
                              {r.status ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{tokensFmt(r.inputTokens + r.outputTokens)}</td>
                          <td className="px-4 py-2.5 text-right font-medium tabular-nums">{usd.format(r.costUSD)}</td>
                        </tr>
                        {open === r.id && r.basis && (
                          <tr className="border-b border-border bg-[#FBF9F5]">
                            <td colSpan={5} className="px-4 py-2.5 text-xs text-[#3D4757]">
                              {r.basis}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        )}

        <section aria-labelledby="uc-title">
          <h2 id="uc-title" className="font-[family-name:var(--font-serif)] text-2xl">
            Use case economics
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Sizing is done on each use case page. AI run cost is the sum of every AI cost line: Copilot Credits, Microsoft 365 Copilot
            licences, Foundry model tokens, Fabric capacity, Power Platform licences, other Azure services and amortised build. Value is the
            counted KPI saving ÷ 12, with hours valued at the customer’s cost per hour.
          </p>
          {q.isLoading ? (
            <LoadingState rows={3} className="mt-4" />
          ) : q.isError ? (
            <ConnectorErrorState error={q.error} connector="SharePoint" />
          ) : sized.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#D9D2C4] bg-card p-6 text-sm">
              No use case is sized yet. Open a use case, fill in its volumes and use the FinOps sizing panel; it will appear here.
            </div>
          ) : (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <ul className="space-y-2">
                {byCustomer.map((c) => (
                  <li key={c.a} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex justify-between">
                      <span className="font-medium">{c.a}</span>
                      <span className="text-sm text-muted-foreground">{c.n} sized</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Run cost / month</dt>
                        <dd className="tabular-nums">{eur.format(c.cost)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Value / month</dt>
                        <dd className="tabular-nums">{eur.format(c.value)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Net / month</dt>
                        <dd className="font-medium tabular-nums">{eur.format(c.value - c.cost)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {sized.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                    <Link to={`/use-case/${u.id}`} className="min-w-0 truncate hover:underline">
                      {u.title}
                    </Link>
                    <span className="shrink-0 tabular-nums">{eur.format((u.monthlyValue ?? 0) - (u.monthlyCost ?? 0))} net</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="ctl-title" className="rounded-2xl border border-border bg-card p-6">
          <h2 id="ctl-title" className="font-[family-name:var(--font-serif)] text-2xl">
            Controls that make scale safe
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              ["Scope", "Who may consume, through which agent, in which environment."],
              ["Limit", "A budget envelope per use case, enforced, not just reported."],
              ["Alert", "A threshold that warns the owner before the envelope is reached."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl bg-[#FBF9F5] p-4">
                <h3 className="font-medium">{t}</h3>
                <p className="mt-1 text-sm text-[#3D4757]">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
