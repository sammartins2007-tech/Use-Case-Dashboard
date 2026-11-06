import { RADAR } from "@/radar.config";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { Pager, usePageTokens } from "@/components/pager";
import { CustomerHeader } from "@/components/customer-header";
import { CustomerSavings } from "@/components/customer-savings";
import { MatrixMap, placedCount, type MatrixAxis } from "@/components/matrix-map";
import { BarList } from "@/components/bar-list";
import { LeadershipPriorities } from "@/components/leadership-priorities";
import { fitsOf, useUseCases } from "@/data/repo";
import { DEPARTMENTS } from "@/data/types";
import { isReady } from "@/lib/readiness";
import { ROUTES, UNCLASSIFIED, routeOf } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { RoadmapTeaser } from "@/components/roadmap-teaser";

const card = "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]";

export function CustomerPage() {
  const { account = "" } = useParams();
  const name = decodeURIComponent(account);
  const pages = usePageTokens();
  const q = useUseCases(pages.token);
  const [axis, setAxis] = useState<MatrixAxis>("complexity");
  const [highlight, setHighlight] = useState(false);

  const all = useMemo(() => (q.data?.rows ?? []).filter((u) => (u.account ?? "Internal") === name), [q.data, name]);
  const active = useMemo(() => all.filter((u) => !u.discarded), [all]);
  const fitSet = useMemo(() => new Set(active.filter((u) => fitsOf(u.priorityFit).length > 0).map((u) => u.id)), [active]);
  const placed = placedCount(active, axis);
  const unplaced = active.length - placed;
  const base = `/customer/${encodeURIComponent(name)}/portfolio`;

  const routeBars = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of active) m.set(routeOf(u.classification).key, (m.get(routeOf(u.classification).key) ?? 0) + 1);
    return [...ROUTES, UNCLASSIFIED]
      .map((r) => ({ key: r.key, label: r.short, n: m.get(r.key) ?? 0, color: r.color, to: `${base}?route=${encodeURIComponent(r.key)}` }))
      .filter((b) => b.n > 0 || b.key !== "none");
  }, [active, base]);

  const deptBars = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of active) m.set(u.department ?? "Not set", (m.get(u.department ?? "Not set") ?? 0) + 1);
    return [...DEPARTMENTS, "Not set"]
      .map((d) => ({ key: d, label: d, n: m.get(d) ?? 0, color: "#0E7C86", to: `${base}?dept=${encodeURIComponent(d)}` }))
      .filter((b) => b.n > 0)
      .sort((a, b) => b.n - a.n);
  }, [active, base]);

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <CustomerHeader name={name}>
        <dl className="flex gap-6">
          {[
            ["Use cases", active.length],
            ["Ready to assess", active.filter(isReady).length],
            ["Fit leadership priorities", fitSet.size],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs text-white/75">{l}</dt>
              <dd className="font-[family-name:var(--font-serif)] text-3xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </CustomerHeader>

      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 pb-14 pt-6">
        {q.isLoading ? (
          <LoadingState rows={8} />
        ) : q.isError ? (
          <ConnectorErrorState error={q.error} connector="SharePoint" />
        ) : active.length === 0 ? (
          <EmptyState title={`No use cases for ${name} yet`} />
        ) : (
          <>
            <CustomerSavings name={name} useCases={active} />
            <RoadmapTeaser name={name} useCases={active} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
              <figure className={cn(card, "min-w-0")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div role="group" aria-label="Map" className="inline-flex rounded-full border border-[#D9D2C4] bg-[#FBF9F5] p-1">
                    {(
                      [
                        ["complexity", "Complexity × effort"],
                        ["value", "Value × effort"],
                      ] as [MatrixAxis, string][]
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={axis === k}
                        onClick={() => setAxis(k)}
                        className={cn(
                          "rounded-full px-4 py-1.5 font-[family-name:var(--font-serif)] text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                          axis === k ? "bg-[#1B2A41] text-white" : "text-[#3D4757] hover:bg-[#EFEBE3]",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {fitSet.size > 0 && (
                      <button
                        type="button"
                        aria-pressed={highlight}
                        onClick={() => setHighlight((h) => !h)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring",
                          highlight ? "border-[#C8962E] bg-[#C8962E] text-white" : "border-[#D9C9A3] bg-white hover:bg-[#FFFBF2]",
                        )}
                      >
                        <span className={cn("size-3 rounded-full ring-2", highlight ? "bg-white ring-white" : "bg-white ring-[#C8962E]")} aria-hidden="true" />
                        Leadership fit
                      </button>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {placed} placed{unplaced ? ` · ${unplaced} still need ${axis === "complexity" ? "complexity" : "value"} or effort` : ""}
                    </p>
                  </div>
                </div>
                {axis === "value" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Value: High ≥ $250k a year, Medium $50k–$250k, Low below $50k (counted KPI saving), or judged from the evidence when not quantified.{" "}
                    {!RADAR.customerEdition && (<Link to="/method#map" className="text-[#0E7C86] hover:underline">
                      How
                    </Link>)}
                  </p>
                )}
                <MatrixMap useCases={active} axis={axis} name={name} highlight={highlight ? fitSet : null} />
              </figure>

              <aside className="min-w-0 space-y-6">
                <section aria-labelledby="bars-title" className={card}>
                  <h2 id="bars-title" className="font-[family-name:var(--font-serif)] text-xl">
                    By platform route
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Click a bar to open those use cases.</p>
                  <BarList bars={routeBars} />
                </section>
                <section aria-labelledby="dept-title" className={card}>
                  <h2 id="dept-title" className="font-[family-name:var(--font-serif)] text-xl">
                    By department
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Which business function owns each use case.</p>
                  <BarList bars={deptBars} />
                </section>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
                  <Link to={base} className="font-medium text-[#0E7C86] hover:underline">
                    Open the full {name} portfolio →
                  </Link>
                  {all.length > active.length && (
                    <Link to={`${base}?discarded=1`} className="text-muted-foreground hover:underline">
                      {all.length - active.length} discarded
                    </Link>
                  )}
                </div>
              </aside>
            </div>

            <LeadershipPriorities name={name} useCases={active} highlighting={highlight} onToggleHighlight={() => setHighlight((h) => !h)} />
          </>
        )}
        <Pager canPrev={pages.canPrev} nextToken={q.data?.nextToken} busy={q.isFetching} onPrev={pages.prev} onNext={() => pages.next(q.data?.nextToken)} />
      </div>
    </div>
  );
}
