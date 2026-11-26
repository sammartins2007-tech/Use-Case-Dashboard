import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, Flag } from "lucide-react";
import type { WaveDef } from "@/data/repo";
import type { UseCase } from "@/data/types";
import { onRoute, routeOf, ROUTES } from "@/lib/routes";
import { useHasSolution, useHasWavePlan, useWavePlan, type WavePlan } from "@/lib/solutions";
import { stripRef } from "@/lib/validated";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]";
const LABEL_W = 210;
const ROW_H = 30;

type Mode = "plan" | "dates";

/** Roadmap timeline: the wave delivery plans as swimlanes, or the customer's own dates. */
export function RoadmapTimeline({ account, waves, useCases }: { account: string; waves: WaveDef[]; useCases: UseCase[] }) {
  const hasWavePlan = useHasWavePlan();
  const planned = waves.filter((w) => hasWavePlan(account, w.id));
  const dated = useCases.filter((u) => u.startDate || u.targetDate);
  const [mode, setMode] = useState<Mode>(planned.length ? "plan" : "dates");
  const byId = useMemo(() => new Map(useCases.map((u) => [String(u.id), u])), [useCases]);
  if (!planned.length && !dated.length) return null;
  const usedRoutes = new Set(useCases.filter((u) => u.wave && u.wave !== "Unplanned").map((u) => routeOf(u.classification).key));

  return (
    <section aria-labelledby="tl-title" className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="tl-title" className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-lg">
          <CalendarRange className="size-4 text-[#0F6CBD]" aria-hidden="true" /> Timeline
        </h3>
        <div role="tablist" aria-label="Timeline view" className="inline-flex rounded-full bg-muted p-0.5 text-xs" data-pdf-exclude>
          {(
            [
              ["plan", `Delivery plan${planned.length ? "" : " (none yet)"}`],
              ["dates", `Customer dates (${dated.length})`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={mode === k}
              disabled={k === "plan" && !planned.length}
              onClick={() => setMode(k)}
              className={cn("rounded-full px-3 py-1 transition-all disabled:opacity-40", mode === k ? "bg-white font-medium shadow-sm" : "text-muted-foreground")}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {ROUTES.filter((r) => usedRoutes.has(r.key)).map((r) => (
            <li key={r.key} className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm" style={{ background: r.color }} aria-hidden />
              {r.short}
            </li>
          ))}
        </ul>
      </div>

      {mode === "plan" ? (
        <div className="mt-4 space-y-6">
          {planned.map((w) => (
            <WaveLane key={w.id} account={account} wave={w} byId={byId} />
          ))}
          {waves.filter((w) => !hasWavePlan(account, w.id)).length > 0 && (
            <p className="text-xs text-muted-foreground">
              No delivery plan yet for {waves.filter((w) => !hasWavePlan(account, w.id)).map((w) => w.id).join(", ")}.
            </p>
          )}
        </div>
      ) : (
        <CustomerDates useCases={dated} waves={waves} />
      )}
    </section>
  );
}

function pack<T extends { startWeek: number; endWeek: number }>(items: T[]) {
  const lanes: number[] = [];
  return [...items]
    .sort((a, b) => a.startWeek - b.startWeek || b.endWeek - a.endWeek)
    .map((it) => {
      let lane = lanes.findIndex((end) => end < it.startWeek);
      if (lane < 0) {
        lane = lanes.length;
        lanes.push(it.endWeek);
      } else lanes[lane] = it.endWeek;
      return { it, lane };
    });
}

function WaveLane({ account, wave, byId }: { account: string; wave: WaveDef; byId: Map<string, UseCase> }) {
  const hasSolution = useHasSolution();
  const q = useWavePlan(account, wave.id);
  const [hover, setHover] = useState<string | null>(null);
  if (!q.data) return <div className="h-24 animate-pulse rounded-xl bg-muted/60" />;
  const p: WavePlan = q.data;
  const weeks = Math.max(p.totals.durationWeeks, ...p.schedule.map((s) => s.endWeek));
  const step = weeks > 36 ? 4 : weeks > 18 ? 2 : 1;
  const start = wave.start ? new Date(`${wave.start}-01T00:00:00`) : null;
  const weekLabel = (wk: number) => {
    if (!start) return `W${wk}`;
    const d = new Date(start.getTime() + (wk - 1) * 7 * 86400000);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const pct = (wk: number) => ((wk - 1) / weeks) * 100;
  const tracks = p.workstreams.length ? p.workstreams.map((w) => w.name) : Array.from(new Set(p.schedule.map((s) => s.track)));
  const extra = Array.from(new Set(p.schedule.map((s) => s.track))).filter((t) => !tracks.includes(t));
  const allTracks = [...tracks, ...extra];
  const todayWeek = start ? Math.floor((Date.now() - start.getTime()) / (7 * 86400000)) + 1 : null;
  const hovered = hover ? p.schedule.find((s) => s.id === hover) : null;

  return (
    <div className="rounded-xl border border-border">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-t-xl bg-[#0D2847] px-4 py-2.5 text-white">
        <span className="font-[family-name:var(--font-serif)] text-lg">
          {wave.id} · {wave.label}
        </span>
        <span className="text-xs text-white/75">
          {p.totals.useCases} use cases · {p.totals.durationWeeks} weeks · {Math.round(p.totals.effortDays).toLocaleString("en-GB")} person-days · peak {p.totals.peakTeam} FTE
          {start ? ` · from ${start.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : " · weeks from kick-off (set the wave start date to see calendar dates)"}
        </span>
        <Link to={`/customer/${encodeURIComponent(account)}/wave/${encodeURIComponent(wave.id)}`} className="ml-auto text-xs font-medium underline-offset-2 hover:underline" data-pdf-exclude>
          Open delivery plan →
        </Link>
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <div className="min-w-[900px]">
          {/* axis */}
          <div className="relative mt-2 h-7" style={{ marginLeft: LABEL_W }}>
            {Array.from({ length: weeks }, (_, i) => i + 1)
              .filter((wk) => (wk - 1) % step === 0)
              .map((wk) => (
                <span key={wk} className="absolute top-0 border-l border-border pl-1 text-[10px] text-muted-foreground" style={{ left: `${pct(wk)}%` }}>
                  {weekLabel(wk)}
                </span>
              ))}
            {p.milestones.map((m, i) => (
              <span
                key={i}
                title={`${weekLabel(m.week)} · ${m.name}`}
                className="absolute bottom-0 size-2.5 -translate-x-1/2 rotate-45 bg-[#B8892B]"
                style={{ left: `${pct(Math.min(m.week, weeks))}%` }}
              />
            ))}
          </div>
          <div className="relative">
            {/* grid + today */}
            <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: LABEL_W }}>
              {Array.from({ length: weeks }, (_, i) => i + 1)
                .filter((wk) => (wk - 1) % step === 0)
                .map((wk) => (
                  <span key={wk} className="absolute inset-y-0 border-l border-border/50" style={{ left: `${pct(wk)}%` }} />
                ))}
              {p.milestones.map((m, i) => (
                <span key={i} className="absolute inset-y-0 border-l border-dashed border-[#B8892B]/50" style={{ left: `${pct(Math.min(m.week, weeks))}%` }} />
              ))}
              {todayWeek && todayWeek >= 1 && todayWeek <= weeks && (
                <span className="absolute inset-y-0 border-l-2 border-rose-500" style={{ left: `${pct(todayWeek)}%` }}>
                  <span className="absolute -top-1 left-1 rounded bg-rose-500 px-1 text-[9px] text-white">today</span>
                </span>
              )}
            </div>
            {allTracks.map((t, ti) => {
              const items = pack(p.schedule.filter((s) => s.track === t));
              const lanes = Math.max(1, ...items.map((x) => x.lane + 1));
              return (
                <div key={t} className={cn("relative flex border-t border-border/70", ti % 2 && "bg-[#F7FBFE]")} style={{ height: lanes * ROW_H + 8 }}>
                  <div className="shrink-0 py-2 pr-3 text-xs font-medium leading-tight" style={{ width: LABEL_W }}>
                    {t}
                    <span className="block font-normal text-muted-foreground">{items.length} use cases</span>
                  </div>
                  <div className="relative flex-1">
                    {items.map(({ it, lane }) => {
                      const u = byId.get(it.id);
                      const r = routeOf(u?.classification);
                      const color = r.color;
                      const dim = hovered && hovered.id !== it.id && !hovered.dependsOn.includes(it.id);
                      return (
                        <Link
                          key={it.id}
                          to={hasSolution(it.id) ? `/use-case/${it.id}/solution` : `/use-case/${it.id}`}
                          onMouseEnter={() => setHover(it.id)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(it.id)}
                          onBlur={() => setHover(null)}
                          title={`${stripRef(it.title)} · ${weekLabel(it.startWeek)} – ${weekLabel(it.endWeek)} · ${it.effortDays} person-days · ${it.readiness}`}
                          className={cn(
                            "absolute flex items-center overflow-hidden rounded-md px-2 text-[11px] font-medium shadow-sm transition-all hover:z-10 hover:brightness-110",
                            !it.readiness.startsWith("Ready") && "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,.25)_6px_9px)]",
                            dim && "opacity-35",
                            hovered?.dependsOn.includes(it.id) && "ring-2 ring-[#B8892B]",
                          )}
                          style={{
                            top: 4 + lane * ROW_H,
                            height: ROW_H - 6,
                            left: `${pct(it.startWeek)}%`,
                            width: `calc(${((it.endWeek - it.startWeek + 1) / weeks) * 100}% - 3px)`,
                            backgroundColor: color,
                            color: onRoute(r),
                          }}
                        >
                          <span className="truncate">{stripRef(it.title)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground" style={{ marginLeft: LABEL_W }}>
            {p.milestones.map((m, i) => (
              <span key={i}>
                <Flag className="mr-0.5 inline size-3 text-[#B8892B]" aria-hidden />
                {weekLabel(m.week)} {m.name}
              </span>
            ))}
            <span>
              <span className="mr-1 inline-block h-2.5 w-5 rounded-sm bg-[repeating-linear-gradient(135deg,#8A8F98_0_4px,#C9C1B2_4px_6px)] align-middle" />
              blocked until a decision
            </span>
            <span>Hover a bar to highlight what it depends on · click to open the solution</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDates({ useCases, waves }: { useCases: UseCase[]; waves: WaveDef[] }) {
  const today = new Date();
  const rows = useCases
    .map((u) => {
      const s = new Date(`${(u.startDate ?? u.targetDate)!.slice(0, 10)}T00:00:00`);
      const e = new Date(`${(u.targetDate ?? u.startDate)!.slice(0, 10)}T00:00:00`);
      return { u, s, e: e < s ? s : e };
    })
    .sort((a, b) => a.s.getTime() - b.s.getTime());
  const min = new Date(Math.min(...rows.map((r) => r.s.getTime()), today.getTime()));
  const max = new Date(Math.max(...rows.map((r) => r.e.getTime()), today.getTime()));
  const from = new Date(min.getFullYear(), min.getMonth(), 1);
  const to = new Date(max.getFullYear(), max.getMonth() + 1, 1);
  const span = to.getTime() - from.getTime();
  const pct = (d: Date) => ((d.getTime() - from.getTime()) / span) * 100;
  const months: Date[] = [];
  for (let d = new Date(from); d < to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  const quarterOnly = months.length > 18;
  const groups = [...waves.map((w) => ({ id: w.id, label: `${w.id} · ${w.label}` })), { id: "", label: "Not in a wave" }]
    .map((g) => ({ ...g, rows: rows.filter((r) => (g.id ? r.u.wave === g.id : !waves.some((w) => w.id === r.u.wave))) }))
    .filter((g) => g.rows.length);
  const status = (r: (typeof rows)[number]) => {
    const pd = r.u.percentDone ?? 0;
    if (pd >= 100) return { c: "#2F9461", t: "done" };
    if (r.e < today) return { c: "#C94141", t: "past its target date" };
    if (r.s <= today) return { c: "#0F6CBD", t: "in progress" };
    return { c: "#8FB8BB", t: "not started" };
  };
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="relative h-6" style={{ marginLeft: LABEL_W }}>
          {months.map((m, i) =>
            !quarterOnly || m.getMonth() % 3 === 0 ? (
              <span key={i} className="absolute top-0 border-l border-border pl-1 text-[10px] text-muted-foreground" style={{ left: `${pct(m)}%` }}>
                {m.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
              </span>
            ) : null,
          )}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10" style={{ left: LABEL_W }}>
            <span className="absolute inset-y-0 border-l-2 border-rose-500" style={{ left: `${pct(today)}%` }}>
              <span className="absolute -top-1 left-1 rounded bg-rose-500 px-1 text-[9px] text-white">today</span>
            </span>
          </div>
          {groups.map((g) => (
            <div key={g.id || "none"} className="border-t border-border">
              <p className="py-1.5 text-xs font-medium text-muted-foreground">{g.label}</p>
              {g.rows.map((r) => {
                const st = status(r);
                return (
                  <div key={r.u.id} className="flex items-center" style={{ height: 24 }}>
                    <Link to={`/use-case/${r.u.id}`} className="shrink-0 truncate pr-3 text-xs hover:underline" style={{ width: LABEL_W }} title={stripRef(r.u.title)}>
                      {stripRef(r.u.title)}
                    </Link>
                    <div className="relative h-full flex-1">
                      <span
                        className="absolute top-1/2 flex h-4 -translate-y-1/2 items-center justify-end overflow-hidden rounded-full pr-1.5 text-[9px] text-white"
                        style={{ left: `${pct(r.s)}%`, width: `max(10px, ${pct(r.e) - pct(r.s)}%)`, background: st.c }}
                        title={`${stripRef(r.u.title)} · ${r.s.toLocaleDateString("en-GB")} – ${r.e.toLocaleDateString("en-GB")} · ${st.t}${r.u.percentDone != null ? ` · ${r.u.percentDone}% done` : ""}`}
                      >
                        {r.u.percentDone != null && pct(r.e) - pct(r.s) > 4 ? `${r.u.percentDone}%` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground" style={{ marginLeft: LABEL_W }}>
          {[
            ["#0F6CBD", "in progress"],
            ["#8FB8BB", "not started"],
            ["#C94141", "past its target date"],
            ["#2F9461", "done"],
          ].map(([c, t]) => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-full" style={{ background: c }} />
              {t}
            </span>
          ))}
          <span>Start and target dates as given by the customer.</span>
        </p>
      </div>
    </div>
  );
}
