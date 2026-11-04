import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { Pager, usePageTokens } from "@/components/pager";
import { CustomerHeader } from "@/components/customer-header";
import { CustomerSavings } from "@/components/customer-savings";
import { useUseCases } from "@/data/repo";
import { LEVELS, type Level, type UseCase } from "@/data/types";
import { isReady } from "@/lib/readiness";
import { ROUTES, UNCLASSIFIED, routeOf } from "@/lib/routes";
import { spreadPoints } from "@/lib/spread";

const W = 760;
const H = 560;
const PL = 74;
const PB = 54;
const PT = 10;
const PR = 10;
const CW = (W - PL - PR) / 3;
const CH = (H - PT - PB) / 3;
const idx = (l: Level) => LEVELS.indexOf(l);

export function CustomerPage() {
  const { account = "" } = useParams();
  const name = decodeURIComponent(account);
  const pages = usePageTokens();
  const q = useUseCases(pages.token);
  const navigate = useNavigate();
  const [hover, setHover] = useState<UseCase | null>(null);

  const all = useMemo(() => (q.data?.rows ?? []).filter((u) => (u.account ?? "Internal") === name), [q.data, name]);
  const active = useMemo(() => all.filter((u) => !u.discarded), [all]);
  const placed = useMemo(() => active.filter((u) => u.complexity && u.effort), [active]);
  const unplaced = active.length - placed.length;

  const dots = useMemo(() => {
    const out: { u: UseCase; x: number; y: number }[] = [];
    for (const c of LEVELS)
      for (const e of LEVELS) {
        const list = placed.filter((u) => u.complexity === c && u.effort === e);
        const box = { x: PL + idx(c) * CW + 18, y: PT + (2 - idx(e)) * CH + 36, w: CW - 36, h: CH - 52 };
        const pts = spreadPoints(list.map((u) => u.id), box);
        pts.forEach((p) => out.push({ u: list.find((u) => u.id === p.id)!, x: p.x, y: p.y }));
      }
    return out;
  }, [placed]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of active) {
      const k = routeOf(u.classification).key;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [active]);
  const bars = [...ROUTES, UNCLASSIFIED].map((r) => ({ r, n: counts.get(r.key) ?? 0 })).filter((b) => b.n > 0 || b.r.key !== "none");
  const maxBar = Math.max(1, ...bars.map((b) => b.n));
  const portfolioUrl = (key?: string) => `/customer/${encodeURIComponent(name)}/portfolio${key ? `?route=${encodeURIComponent(key)}` : ""}`;

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <CustomerHeader name={name}>
        <dl className="flex gap-6">
          {[
            ["Use cases", active.length],
            ["Ready to assess", active.filter(isReady).length],
            ["On the map", placed.length],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs text-white/75">{l}</dt>
              <dd className="font-[family-name:var(--font-serif)] text-3xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </CustomerHeader>

      <div className="mx-auto w-full max-w-[1440px] px-6 pb-14 pt-6">
        {q.isLoading ? (
          <LoadingState rows={8} />
        ) : q.isError ? (
          <ConnectorErrorState error={q.error} connector="SharePoint" />
        ) : active.length === 0 ? (
          <EmptyState title={`No use cases for ${name} yet`} />
        ) : (
          <>
          <div className="mb-6">
            <CustomerSavings name={name} useCases={active} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <figure className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-[family-name:var(--font-serif)] text-xl">Complexity × effort</h2>
                <p className="text-sm text-muted-foreground">
                  {placed.length} placed{unplaced ? ` · ${unplaced} still need complexity or effort` : ""}
                </p>
              </div>
              <div className="relative mt-3">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="map-t map-d">
                  <title id="map-t">{`${name} use cases by complexity and effort`}</title>
                  <desc id="map-d">
                    {`Nine cells: complexity low to high from left to right, effort low to high from bottom to top. Dots are coloured by platform route; the bar chart beside lists the same routes.`}
                  </desc>
                  {LEVELS.map((e, ei) =>
                    LEVELS.map((c, ci) => {
                      const x = PL + ci * CW;
                      const y = PT + (2 - ei) * CH;
                      const n = placed.filter((u) => u.complexity === c && u.effort === e).length;
                      const quick = ci === 0 && ei === 0;
                      return (
                        <g key={`${c}-${e}`}>
                          <rect x={x + 3} y={y + 3} width={CW - 6} height={CH - 6} rx={14} fill={quick ? "#E6F2F3" : "#F7F3EC"} />
                          <text x={x + 16} y={y + 26} fontSize="11" fill="#5B6474">
                            {quick ? "Quick wins" : `${c} complexity · ${e} effort`}
                          </text>
                          <text x={x + CW - 16} y={y + 26} textAnchor="end" fontSize="12" fontWeight="600" fill="#1B2A41">
                            {n || ""}
                          </text>
                        </g>
                      );
                    }),
                  )}
                  {LEVELS.map((c, ci) => (
                    <text key={c} x={PL + ci * CW + CW / 2} y={H - PB + 22} textAnchor="middle" fontSize="13" fill="#1B2A41">
                      {c}
                    </text>
                  ))}
                  <text x={PL + (W - PL - PR) / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#5B6474">
                    Complexity →
                  </text>
                  {LEVELS.map((e, ei) => (
                    <text key={e} x={PL - 12} y={PT + (2 - ei) * CH + CH / 2} textAnchor="end" dominantBaseline="middle" fontSize="13" fill="#1B2A41">
                      {e}
                    </text>
                  ))}
                  <text x={16} y={PT + (H - PT - PB) / 2} textAnchor="middle" fontSize="12" fill="#5B6474" transform={`rotate(-90 16 ${PT + (H - PT - PB) / 2})`}>
                    Effort →
                  </text>
                </svg>
                {dots.map(({ u, x, y }) => {
                  const r = routeOf(u.classification);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      title={u.title}
                      aria-label={`${u.title}. ${r.short}. ${u.complexity} complexity, ${u.effort} effort. Open use case`}
                      onClick={() => navigate(`/use-case/${u.id}`)}
                      onMouseEnter={() => setHover(u)}
                      onMouseLeave={() => setHover((h) => (h?.id === u.id ? null : h))}
                      onFocus={() => setHover(u)}
                      onBlur={() => setHover((h) => (h?.id === u.id ? null : h))}
                      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, backgroundColor: r.color }}
                      className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-transform hover:z-10 hover:scale-150 focus-visible:z-10 focus-visible:scale-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring forced-colors:border-[CanvasText]"
                    />
                  );
                })}
                {hover && (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(440px,90%)] -translate-x-1/2 rounded-xl border border-border bg-white/95 px-4 py-3 text-sm shadow-lg" role="status">
                    <p className="font-medium">{hover.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {routeOf(hover.classification).short} · {hover.stage ?? "Signal"} · click to open
                    </p>
                  </div>
                )}
              </div>
            </figure>

            <aside className="min-w-0 space-y-6">
              <section aria-labelledby="bars-title" className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]">
                <h2 id="bars-title" className="font-[family-name:var(--font-serif)] text-xl">
                  Use cases by platform route
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Click a bar to open the portfolio of that route.</p>
                <ul className="mt-4 space-y-2">
                  {bars.map(({ r, n }) => (
                    <li key={r.key}>
                      <button
                        type="button"
                        disabled={n === 0}
                        onClick={() => navigate(portfolioUrl(r.key))}
                        aria-label={`${r.short}: ${n} use cases. Open portfolio`}
                        className="group grid w-full grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[#F7F3EC] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="truncate text-sm">{r.short}</span>
                        <span className="h-6 rounded-md bg-[#F1ECE2]">
                          <span
                            className="block h-full rounded-md transition-all group-hover:brightness-110"
                            style={{ width: `${(n / maxBar) * 100}%`, backgroundColor: r.color, minWidth: n ? 6 : 0 }}
                          />
                        </span>
                        <span className="text-right text-sm font-semibold tabular-nums">{n}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <Link to={portfolioUrl()} className="mt-4 inline-flex text-sm font-medium text-[#0E7C86] hover:underline">
                  Open the full {name} portfolio →
                </Link>
              </section>
              {all.length > active.length && (
                <p className="px-1 text-sm text-muted-foreground">
                  {all.length - active.length} discarded use cases are hidden.{" "}
                  <Link to={`${portfolioUrl()}${"?discarded=1"}`} className="text-[#0E7C86] hover:underline">
                    Show them
                  </Link>
                </p>
              )}
            </aside>
          </div>
          </>
        )}
        <Pager canPrev={pages.canPrev} nextToken={q.data?.nextToken} busy={q.isFetching} onPrev={pages.prev} onNext={() => pages.next(q.data?.nextToken)} />
      </div>
    </div>
  );
}
