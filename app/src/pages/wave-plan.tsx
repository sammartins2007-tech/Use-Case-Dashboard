import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronRight, Flag, Users } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/states";
import { brandOf, inkOf } from "@/lib/brands";
import { useUseCases } from "@/data/repo";
import { ValueMetrics } from "@/components/value-metrics";
import { themeImage, useSolutions, useWavePlan } from "@/lib/solutions";
import { cn } from "@/lib/utils";

const serif = "font-[family-name:var(--font-serif)]";
const card = "rounded-3xl border border-border bg-card p-5 md:p-6";

export function WavePlanPage() {
  const { account = "", wave = "" } = useParams();
  const name = decodeURIComponent(account);
  const w = decodeURIComponent(wave);
  const plan = useWavePlan(name, w);
  const brand = brandOf(name);
  const ids = useMemo(() => plan.data?.schedule.map((x) => x.id) ?? [], [plan.data]);
  const sols = useSolutions(ids);
  const ucq = useUseCases();
  const waveCases = useMemo(() => (ucq.data?.rows ?? []).filter((u) => (u.account ?? "Internal") === name && u.wave === w && !u.discarded), [ucq.data, name, w]);
  const [area, setArea] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  if (plan.loading) return <div className="mx-auto max-w-5xl p-8"><LoadingState rows={6} /></div>;
  if (!plan.data)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <EmptyState title="No delivery plan for this wave yet" description="Delivery plans are built once the wave's use cases have been through the specialist board." />
      </div>
    );
  const p = plan.data;
  const weeks = Math.max(p.totals.durationWeeks, ...p.schedule.map((x) => x.endWeek), 1);
  const tracks = Array.from(new Set(p.schedule.map((x) => x.track)));
  const maxRole = Math.max(...p.effortByRole.map((r) => r.days), 1);
  const fa = p.foundations[Math.min(area, p.foundations.length - 1)];
  const pct = (wk: number) => ((wk - 1) / weeks) * 100;
  const step = weeks > 30 ? 4 : weeks > 16 ? 2 : 1;

  return (
    <div className="pb-24" style={{ ["--sol" as string]: inkOf(brand.primary ?? "#0F6CBD") }}>
      <header className="relative isolate overflow-hidden">
        <img src={themeImage("plant")} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#F3F8FD] via-[#F3F8FD]/92 to-[#F3F8FD]/20" />
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <Link to={`/customer/${encodeURIComponent(name)}/roadmap`} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-sm backdrop-blur hover:bg-white">
            <ArrowLeft className="size-4" aria-hidden /> Roadmap
          </Link>
          <div className="mt-10 max-w-3xl">
            <p className="text-sm text-muted-foreground">
              {name} · {w} delivery plan
            </p>
            <h1 className={cn(serif, "mt-2 text-5xl leading-tight")} style={{ color: "var(--sol)" }}>
              {p.title}
            </h1>
            <p className={cn(serif, "mt-4 text-xl leading-relaxed")}>{p.summary}</p>
          </div>
          <dl className="mt-8 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Use cases", p.totals.useCases, ""],
              ["Effort", p.totals.effortDays, "person-days"],
              ["Duration", p.totals.durationWeeks, "weeks"],
              ["Peak team", p.totals.peakTeam, "FTE"],
            ].map(([l, v, u]) => (
              <div key={String(l)} className="rounded-2xl bg-white/85 p-4 backdrop-blur">
                <dt className="text-sm text-muted-foreground">{l}</dt>
                <dd>
                  <span className={cn(serif, "text-3xl tabular-nums")} style={{ color: "var(--sol)" }}>
                    {Number(v).toLocaleString("en-GB")}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">{u}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-16 px-5 pt-12 md:px-8">
        <ValueMetrics useCases={waveCases} scope={`${name} · ${w}`} />
        {p.outcomes.length > 0 && (
          <section>
            <h2 className={cn(serif, "text-3xl")}>What the wave delivers</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {p.outcomes.map((o, i) => (
                <li key={i} className="flex gap-3 rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 8%, #FAFDFF)" }}>
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: "var(--sol)" }} aria-hidden />
                  <span className="text-[15px] leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className={cn(serif, "text-3xl")}>What we need to set up</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">The shared foundations the use cases depend on. Each item shows when it is needed and which use cases wait for it.</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col">
              {p.foundations.map((f, i) => (
                <button
                  key={f.area}
                  onClick={() => setArea(i)}
                  aria-pressed={area === i}
                  className={cn("flex items-center justify-between gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-left text-sm", area === i ? "border-transparent text-white shadow-md" : "border-border bg-card hover:bg-muted")}
                  style={area === i ? { background: "var(--sol)" } : undefined}
                >
                  <span className="font-medium">{f.area}</span>
                  <span className={cn("rounded-full px-2 text-xs", area === i ? "bg-white/20" : "bg-muted")}>{f.items.length}</span>
                </button>
              ))}
            </div>
            {fa && (
              <ol key={fa.area} className="space-y-3">
                {[...fa.items]
                  .sort((a, b) => a.week - b.week)
                  .map((it, i) => (
                    <li key={i} className={cn(card, "animate-in fade-in fill-mode-both p-4 md:p-5")} style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-medium">{it.item}</p>
                        <span className="rounded-full bg-[#0D2847] px-2.5 py-0.5 text-xs text-white">Needed by W{it.week}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{it.why}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Owner: {it.owner} ·</span>
                        {it.useCases.map((id) => (
                          <Link key={id} to={`/use-case/${id}/solution`} className="rounded-full border border-border px-2 py-0.5 hover:bg-muted">
                            {sols[id]?.solutionName ?? `#${id}`}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </section>

        <section>
          <h2 className={cn(serif, "text-3xl")}>Timeline</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">Relative weeks from the wave kick-off. Select a bar to open the use case's solution experience.</p>
          <div className={cn(card, "mt-5 overflow-x-auto")}>
            <div className="min-w-[860px]">
              <div className="ml-[260px] flex text-[11px] text-muted-foreground">
                {Array.from({ length: weeks }, (_, i) => (
                  <span key={i} className={cn("flex-1", i % step === 0 && "border-l border-border/70 pl-1")}>
                    {i % step === 0 ? `W${i + 1}` : ""}
                  </span>
                ))}
              </div>
              <div className="relative mt-1">
                {p.milestones.map((m, i) => (
                  <span key={i} className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-[#B8892B]/60" style={{ left: `calc(260px + (100% - 260px) * ${pct(Math.min(m.week, weeks)) / 100})` }} />
                ))}
                {p.workstreams.length > 0 && (
                  <div className="mb-3">
                    {p.workstreams.map((ws) => (
                      <div key={ws.name} className="flex items-center py-1">
                        <span className="w-[260px] pr-3 text-sm font-medium">{ws.name}</span>
                        <span className="relative h-5 flex-1">
                          <span className="absolute top-1 h-3 rounded-full bg-[#0D2847]/80" style={{ left: `${pct(ws.startWeek)}%`, width: `${((ws.endWeek - ws.startWeek + 1) / weeks) * 100}%` }} title={ws.note} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {tracks.map((t) => (
                  <div key={t} className="border-t border-border py-2">
                    <p className="mb-1 text-xs tracking-[0.14em] text-muted-foreground">{t.toUpperCase()}</p>
                    {p.schedule
                      .filter((x) => x.track === t)
                      .sort((a, b) => a.startWeek - b.startWeek)
                      .map((x) => {
                        const s = sols[x.id];
                        const dep = hover && p.schedule.find((y) => y.id === hover)?.dependsOn.includes(x.id);
                        return (
                          <div key={x.id} className="flex items-center py-0.5">
                            <Link to={`/use-case/${x.id}/solution`} className="w-[260px] truncate pr-3 text-sm hover:underline" title={x.title}>
                              {s?.solutionName ?? x.title}
                            </Link>
                            <span className="relative h-7 flex-1">
                              <Link
                                to={`/use-case/${x.id}/solution`}
                                onMouseEnter={() => setHover(x.id)}
                                onMouseLeave={() => setHover(null)}
                                className={cn("absolute top-1 bottom-1 rounded-md transition-all hover:brightness-110", dep && "ring-2 ring-[#B8892B]")}
                                style={{
                                  left: `${pct(x.startWeek)}%`,
                                  width: `${Math.max(((x.endWeek - x.startWeek + 1) / weeks) * 100, 2)}%`,
                                  background: x.readiness.startsWith("Ready to") ? "var(--sol)" : x.readiness.startsWith("Ready") ? "color-mix(in srgb, var(--sol) 55%, white)" : "#C9C1B2",
                                }}
                                title={`${x.title} · W${x.startWeek}–W${x.endWeek} · ${x.effortDays} person-days · ${x.readiness}${x.dependsOn.length ? ` · depends on ${x.dependsOn.join(", ")}` : ""}`}
                                aria-label={`${x.title}, weeks ${x.startWeek} to ${x.endWeek}`}
                              />
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                {p.milestones.map((m, i) => (
                  <li key={i}>
                    <Flag className="mr-1 inline size-3 text-[#B8892B]" aria-hidden />W{m.week} · {m.name}
                  </li>
                ))}
                <li><span className="mr-1 inline-block h-2 w-4 rounded" style={{ background: "var(--sol)" }} />ready to build</li>
                <li><span className="mr-1 inline-block h-2 w-4 rounded" style={{ background: "color-mix(in srgb, var(--sol) 55%, white)" }} />after discovery</li>
                <li><span className="mr-1 inline-block h-2 w-4 rounded bg-[#C9C1B2]" />blocked</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <h2 className={cn(serif, "text-2xl")}>Effort by role</h2>
            <ul className="mt-4 space-y-2.5">
              {[...p.effortByRole].sort((a, b) => b.days - a.days).map((r) => (
                <li key={r.role}>
                  <div className="flex justify-between text-sm">
                    <span>{r.role}</span>
                    <span className="tabular-nums text-muted-foreground">{r.days.toLocaleString("en-GB")} days</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(r.days / maxRole) * 100}%`, background: "var(--sol)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <h2 className={cn(serif, "flex items-center gap-2 text-2xl")}>
              <Users className="size-5" style={{ color: "var(--sol)" }} aria-hidden /> Team
            </h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-normal">Role</th>
                  <th className="pb-2 text-right font-normal">FTE</th>
                  <th className="pb-2 pl-4 font-normal">Note</th>
                </tr>
              </thead>
              <tbody>
                {p.team.map((t) => (
                  <tr key={t.role} className="border-t border-border align-top">
                    <td className="py-2 pr-2">{t.role}</td>
                    <td className="py-2 text-right tabular-nums">{t.fte}</td>
                    <td className="py-2 pl-4 text-muted-foreground">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {p.workstreams.length > 0 && (
          <section>
            <h2 className={cn(serif, "text-3xl")}>Workstreams</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {p.workstreams.map((ws) => (
                <div key={ws.name} className={card}>
                  <p className="text-xs text-muted-foreground">W{ws.startWeek}–W{ws.endWeek} · lead {ws.lead}</p>
                  <p className={cn(serif, "mt-1 text-xl")}>{ws.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{ws.note}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ws.useCases.map((id) => (
                      <Link key={id} to={`/use-case/${id}/solution`} className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted">
                        {sols[id]?.solutionName ?? `#${id}`}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className={card}>
            <h2 className={cn(serif, "text-2xl")}>Governance</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {p.governance.map((g, i) => (
                <li key={i}>· {g}</li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <h2 className={cn(serif, "text-2xl")}>Decisions needed</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {p.decisionsNeeded.map((d, i) => (
                <li key={i}>
                  <p className="font-medium">{d.decision}</p>
                  <p className="text-muted-foreground">
                    {d.owner} · by {d.by}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <h2 className={cn(serif, "text-2xl")}>Risks</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {p.risks.map((r, i) => (
                <li key={i}>
                  <p className="font-medium">
                    {r.risk} <span className="text-xs font-normal text-muted-foreground">· {r.impact}</span>
                  </p>
                  <p className="text-muted-foreground">{r.mitigation}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className={cn(serif, "text-3xl")}>The use cases</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.schedule.map((x) => {
              const s = sols[x.id];
              return (
                <Link key={x.id} to={`/use-case/${x.id}/solution`} className="group overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-lg">
                  <div className="relative h-28 overflow-hidden">
                    <img src={themeImage(s?.theme)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <p className={cn(serif, "absolute bottom-2 left-4 right-4 text-lg leading-tight text-white")}>{s?.solutionName ?? x.title}</p>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm">{x.title}</p>
                    <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {x.effortDays} days · W{x.startWeek}–W{x.endWeek}
                      </span>
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
