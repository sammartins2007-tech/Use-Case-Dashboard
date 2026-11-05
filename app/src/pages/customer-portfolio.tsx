import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { Pager, usePageTokens } from "@/components/pager";
import { CustomerHeader } from "@/components/customer-header";
import { fitsOf, useCustomerSettings, useUseCases } from "@/data/repo";
import { caseDollars, caseValue, fmtHours, usd0 } from "@/lib/kpi";
import { ValueMetrics } from "@/components/value-metrics";
import { isValidated, stripRef } from "@/lib/validated";
import { CLOSED_STAGES, PIPELINE_STAGES, type UseCase } from "@/data/types";
import { GATES, gatesMet } from "@/lib/readiness";
import { ROUTES, UNCLASSIFIED, onRoute, routeOf } from "@/lib/routes";
import { ToneDot } from "@/lib/tones";
import { cn } from "@/lib/utils";

const COLUMNS = [...PIPELINE_STAGES, "Parked"] as const;
type Column = (typeof COLUMNS)[number];
const columnOf = (u: UseCase): Column =>
  u.stage && (CLOSED_STAGES as readonly string[]).includes(u.stage) ? "Parked" : ((u.stage as Column) ?? "Signal");

export function CustomerPortfolioPage() {
  const { account = "" } = useParams();
  const name = decodeURIComponent(account);
  const [params, setParams] = useSearchParams();
  const routeKey = params.get("route") ?? "";
  const showDiscarded = params.get("discarded") === "1";
  const onlyValidated = params.get("validated") === "1";
  const dept = params.get("dept") ?? "";
  const priority = params.get("priority") ?? "";
  const settings = useCustomerSettings();
  const prios = settings.data?.find((c) => c.account === name)?.priorities ?? [];
  const prio = prios.find((p) => p.id === priority);
  const pages = usePageTokens();
  const q = useUseCases(pages.token);

  const forCustomer = useMemo(() => (q.data?.rows ?? []).filter((u) => (u.account ?? "Internal") === name), [q.data, name]);
  const list = useMemo(
    () =>
      forCustomer
        .filter((u) => (showDiscarded ? u.discarded : !u.discarded))
        .filter((u) => !routeKey || routeOf(u.classification).key === routeKey)
        .filter((u) => !onlyValidated || isValidated(u))
        .filter((u) => !dept || (u.department ?? "Not set") === dept)
        .filter((u) => !priority || (priority === "any" ? fitsOf(u.priorityFit).length > 0 : fitsOf(u.priorityFit).includes(priority)))
        .sort((a, b) => gatesMet(b) - gatesMet(a) || a.title.localeCompare(b.title)),
    [forCustomer, routeKey, showDiscarded, onlyValidated, dept, priority],
  );
  const route = routeKey ? routeOf(routeKey) : null;

  const clearParam = (k: string) => {
    const p = new URLSearchParams(params);
    p.delete(k);
    setParams(p, { replace: true });
  };
  const setRoute = (k: string) => {
    const p = new URLSearchParams(params);
    if (k) p.set("route", k);
    else p.delete("route");
    setParams(p, { replace: true });
  };

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <CustomerHeader name={name} />
      <div className="mx-auto w-full max-w-[1440px] px-6 pb-14 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/customer/${encodeURIComponent(name)}`} className="text-sm text-[#0E7C86] hover:underline">
            ← Back to the map
          </Link>
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          <h2 className="font-[family-name:var(--font-serif)] text-2xl">
            {showDiscarded ? "Discarded use cases" : `${onlyValidated ? "Validated · " : ""}${route ? `${route.short} portfolio` : "Full portfolio"}`}
          </h2>
          <span className="text-sm tabular-nums text-muted-foreground">{list.length} use cases</span>
          <button
            type="button"
            aria-pressed={onlyValidated}
            onClick={() => {
              const p = new URLSearchParams(params);
              if (onlyValidated) p.delete("validated");
              else p.set("validated", "1");
              setParams(p, { replace: true });
            }}
            className={cn("ml-auto rounded-full border px-3 py-1 text-sm", onlyValidated ? "border-[#2F9461] bg-[#2F9461] text-white" : "border-[#D9D2C4] bg-white hover:bg-[#FBF9F5]")}
          >
            Validated only
          </button>
        </div>

        <ValueMetrics
          className="mt-4"
          useCases={list}
          scope={[onlyValidated ? "Validated" : "", route ? route.short : "", dept, priority ? (priority === "any" ? "Fits a leadership priority" : `Fits ${priority}`) : ""].filter(Boolean).join(" · ") || "All use cases shown"}
        />

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Platform route">
          <Chip active={!routeKey} onClick={() => setRoute("")} label="All routes" />
          {[...ROUTES, UNCLASSIFIED].map((r) => (
            <Chip key={r.key} active={routeKey === r.key} onClick={() => setRoute(r.key)} label={r.short} color={r.color} />
          ))}
        </div>

        {(dept || priority) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {dept && <FilterTag label={`Department: ${dept}`} onClear={() => clearParam("dept")} />}
            {priority && <FilterTag label={priority === "any" ? "Fits a leadership priority" : `Leadership priority ${priority}${prio ? ` · ${prio.title}` : ""}`} onClear={() => clearParam("priority")} />}
          </div>
        )}
        {prio && (
          <p className="mt-3 max-w-3xl rounded-xl border border-[#E8D9B8] bg-[#FBF6EA] px-4 py-3 text-sm">
            <span className="font-medium">
              {prio.id} · {prio.title}:
            </span>{" "}
            {prio.summary}
          </p>
        )}
        {route && route.key !== "none" && (
          <p className="mt-4 max-w-3xl rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <span className="font-medium">{route.short}:</span> {route.definition}{" "}
            <Link to="/method#routes" className="text-[#0E7C86] hover:underline">
              How we classify
            </Link>
          </p>
        )}

        <div className="mt-6">
          {q.isLoading ? (
            <LoadingState rows={8} />
          ) : q.isError ? (
            <ConnectorErrorState error={q.error} connector="SharePoint" />
          ) : list.length === 0 ? (
            <EmptyState title="No use cases for this selection" />
          ) : (
            <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-6">
              {COLUMNS.map((col) => {
                const items = list.filter((u) => columnOf(u) === col);
                return (
                  <section key={col} aria-label={`${col}: ${items.length}`} className="min-w-[220px] rounded-2xl bg-[#F1ECE2]/70 p-3">
                    <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                      {col}
                      <span className="tabular-nums text-muted-foreground">{items.length}</span>
                    </h3>
                    <ul className="space-y-2">
                      {items.map((u) => (
                        <li key={u.id}>
                          <Card u={u} saving={caseDollars(u.kpiValues)} hours={caseValue(u.kpiValues).hours} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
        <Pager canPrev={pages.canPrev} nextToken={q.data?.nextToken} busy={q.isFetching} onPrev={pages.prev} onNext={() => pages.next(q.data?.nextToken)} />
      </div>
    </div>
  );
}

function FilterTag({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C4] bg-white py-0.5 pl-3 pr-1">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove filter ${label}`} className="rounded-full px-1.5 text-muted-foreground hover:bg-[#F1ECE2] hover:text-foreground">
        ×
      </button>
    </span>
  );
}

function Chip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "border-[#1B2A41] bg-[#1B2A41] text-white" : "border-[#D9D2C4] bg-white hover:bg-[#FBF9F5]",
      )}
    >
      {color && <span className="size-2.5 rounded-full ring-1 ring-white" style={{ backgroundColor: color }} aria-hidden="true" />}
      {label}
    </button>
  );
}

function Card({ u, saving, hours }: { u: UseCase; saving?: number; hours?: number }) {
  const r = routeOf(u.classification);
  const met = gatesMet(u);
  return (
    <Link
      to={`/use-case/${u.id}`}
      className="block rounded-xl border border-border bg-white p-3 text-[13px] leading-snug shadow-[0_1px_2px_rgba(27,42,65,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: r.color, color: onRoute(r) }}>
        {r.short}
      </span>
      <span className="line-clamp-3 block font-medium">{stripRef(u.title)}</span>
      {fitsOf(u.priorityFit).length > 0 && (
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#8A6420]">
          <span className="size-2 rounded-full ring-2 ring-[#C8962E]" aria-hidden="true" /> Leadership fit {fitsOf(u.priorityFit).join(", ")}
        </span>
      )}
      {((typeof saving === "number" && saving > 0) || (typeof hours === "number" && hours > 0)) && (
        <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] tabular-nums text-[#1E5B3E]">
          {typeof hours === "number" && hours > 0 && <span>{fmtHours(hours, true)} / year</span>}
          {typeof saving === "number" && saving > 0 && <span>{usd0.format(saving)} / year</span>}
        </span>
      )}
      <span className="mt-2 flex items-center gap-1" aria-label={`${met} of ${GATES.length} gates evidenced`}>
        {GATES.map((g, i) => (
          <span key={g.key} aria-hidden="true" className={cn("h-1 flex-1 rounded-full", i < met ? "bg-[#0E7C86]" : "bg-[#E4DED3]")} />
        ))}
      </span>
      <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ToneDot field="decision" value={u.decision ?? "Undecided"} />
        {u.decision ?? "Undecided"} · {met}/{GATES.length} gates
        {u.flag ? <span className="ml-auto truncate text-amber-800">{u.flag}</span> : null}
      </span>
    </Link>
  );
}
