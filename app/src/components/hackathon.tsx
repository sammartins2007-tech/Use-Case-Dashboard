import { useState } from "react";
import { AlertTriangle, ArrowRight, Bot, CalendarDays, Check, ClipboardList, Coins, Flag, Gauge, Layers, ListChecks, MapPin, MessageSquareQuote, PlayCircle, Rocket, Target, Users, Workflow, type LucideIcon } from "lucide-react";
import { SubTabs } from "@/components/blueprint";
import { iconOf } from "@/components/solution-creative";
import { safeUrl } from "@/lib/safe-url";
import type { Solution } from "@/lib/solutions";
import { cn } from "@/lib/utils";

// Designs are validated JSON documents read loosely.
type Loose = ReturnType<typeof JSON.parse>;

/* eslint-disable @typescript-eslint/no-explicit-any */
const serif = "font-[family-name:var(--font-serif)]";
const card = "rounded-2xl border border-border bg-white p-5";
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? v : []);
const SCOPE: Record<string, { label: string; color: string }> = {
  build: { label: "Built at the hackathon", color: "#0F7B5F" },
  stretch: { label: "Stretch goal", color: "#B7791F" },
  later: { label: "After the hackathon", color: "#6B7280" },
};
const KIND_COLOR: Record<string, string> = { parent: "var(--sol)", child: "#5B3FA8", topic: "#0E7490", flow: "#B45309" };
const kindKey = (k: string) => (/parent/i.test(k) ? "parent" : /child/i.test(k) ? "child" : /topic/i.test(k) ? "topic" : "flow");

export function hasHackathon(s: Solution) {
  return Boolean((s as Loose).hackathon);
}

function Countdown({ dates }: { dates: string }) {
  const m = /(\d{1,2})[–-]\d{1,2}\s+(\w{3})\w*\s+(\d{4})/.exec(dates);
  if (!m) return null;
  const start = new Date(`${m[1]} ${m[2]} ${m[3]}`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - today.getTime()) / 86400000);
  const label = days > 1 ? `${days} days to go` : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "Done";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium tabular-nums" style={{ color: "var(--sol)" }}>
      <Flag className="size-3.5" aria-hidden /> {label}
    </span>
  );
}

function SignalToDeal({ stages }: { stages: Loose[] }) {
  const [sel, setSel] = useState(0);
  const st = stages[sel] ?? stages[0];
  if (!st) return null;
  const sc = SCOPE[st.scope] ?? SCOPE.later;
  const Icon = iconOf(st.icon);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-[860px] items-stretch gap-1.5">
          {stages.map((x, i) => {
            const on = i === sel;
            const I = iconOf(x.icon);
            const c = (SCOPE[x.scope] ?? SCOPE.later).color;
            return (
              <li key={x.id} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  aria-pressed={on}
                  aria-label={`Stage ${i + 1}: ${x.name}`}
                  className={cn("group flex w-full flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all hover:-translate-y-0.5", on ? "border-transparent text-white shadow-md" : "border-border bg-white hover:shadow-sm")}
                  style={on ? { background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" } : undefined}
                >
                  <span className={cn("grid size-9 place-items-center rounded-full", on ? "bg-white/20" : "")} style={on ? undefined : { background: "color-mix(in srgb, var(--sol) 10%, white)", color: "var(--sol)" }}>
                    <I className="size-4.5" aria-hidden />
                  </span>
                  <span className="text-[12px] leading-tight font-medium">{x.name}</span>
                  <span className="h-1 w-8 rounded-full" style={{ background: on ? "rgba(255,255,255,.7)" : c }} />
                </button>
                {i < stages.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {Object.values(SCOPE).map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-5 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div key={st.id} className="grid animate-in gap-4 fade-in duration-300 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className={cn(card, "flex flex-col gap-3")}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: "var(--sol)" }}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] tracking-wider text-muted-foreground">STAGE {sel + 1} OF {stages.length} · {st.who}</p>
              <p className={cn(serif, "text-2xl leading-tight")}>{st.name}</p>
            </div>
          </div>
          <span className="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white" style={{ background: sc.color }}>
            {sc.label}
          </span>
          <div className="rounded-xl bg-[#FBF4F1] p-3 text-sm">
            <p className="text-[10.5px] font-medium tracking-wider text-rose-800/80">TODAY</p>
            <p className="mt-0.5 leading-snug">{st.today}</p>
          </div>
          {st.evidence && <p className="mt-auto text-[11px] text-muted-foreground">Evidence: {st.evidence}</p>}
        </div>
        <div className={cn(card, "grid gap-3 sm:grid-cols-2")}>
          <div className="sm:col-span-2 rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--sol) 7%, white)" }}>
            <p className="text-[10.5px] font-medium tracking-wider" style={{ color: "var(--sol)" }}>
              WHAT THE AGENT DOES
            </p>
            <p className="mt-0.5 leading-snug">{st.agent}</p>
          </div>
          <Mini icon={Layers} label="Microsoft building blocks" text={st.tech} />
          <Mini icon={Users} label="Human in the loop" text={st.human} />
          <div className="sm:col-span-2">
            <Mini icon={Gauge} label="Measured by" text={st.kpi} />
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button type="button" disabled={sel === 0} onClick={() => setSel((v) => Math.max(0, v - 1))} className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm disabled:opacity-40">
          Previous stage
        </button>
        <button type="button" disabled={sel === stages.length - 1} onClick={() => setSel((v) => Math.min(stages.length - 1, v + 1))} className="rounded-full px-3.5 py-1.5 text-sm text-white disabled:opacity-40" style={{ background: "var(--sol)" }}>
          Next stage
        </button>
      </div>
    </div>
  );
}

function Mini({ icon: I, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-border p-3 text-sm">
      <I className="mt-0.5 size-4 shrink-0" style={{ color: "var(--sol)" }} aria-hidden />
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
        <p className="leading-snug">{text}</p>
      </div>
    </div>
  );
}

function WhyPanel({ h }: { h: Loose }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={card}>
        <p className={cn(serif, "text-xl")}>Why this is the hackathon case</p>
        <ul className="mt-3 space-y-2.5">
          {arr(h.why).map((w, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium text-white" style={{ background: "var(--sol)" }}>
                {i + 1}
              </span>
              <span>
                <span className="font-medium">{w.t}.</span> <span className="text-foreground/80">{w.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(card, "relative overflow-hidden")} style={{ background: "color-mix(in srgb, var(--sol) 5%, white)" }}>
        <MessageSquareQuote className="absolute -top-2 -right-2 size-24 opacity-[.06]" aria-hidden />
        <p className={cn(serif, "text-xl")}>{String(h.voiceTitle || "What the account team asked for")}</p>
        {h.voiceSource && <p className="text-xs text-muted-foreground">{String(h.voiceSource)}</p>}
        <ul className="mt-3 space-y-2">
          {arr(h.voice ?? h.vadim).map((v, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--sol)" }} aria-hidden />
              <span>{v}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AgentTeam({ agents }: { agents: Loose[] }) {
  const parent = agents.find((a) => kindKey(a.kind) === "parent");
  const rest = agents.filter((a) => a !== parent);
  const Box = ({ a }: { a: Loose }) => {
    const c = KIND_COLOR[kindKey(a.kind)];
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: `color-mix(in srgb, ${c} 10%, white)` }}>
          <p className="truncate text-sm font-medium" title={a.name}>{a.name}</p>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-white" style={{ background: c }}>
            {a.kind}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
          <p className="leading-snug">{a.does}</p>
          <div className="flex flex-wrap gap-1">
            {arr(a.tools).map((t: string) => (
              <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{t}</span>
            ))}
          </div>
          <p className="mt-auto text-[11.5px] text-muted-foreground">Guardrail: {a.guard}</p>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {parent && (
        <div className="mx-auto max-w-2xl">
          <Box a={parent} />
        </div>
      )}
      <div className="mx-auto h-5 w-px border-l-2 border-dashed" style={{ borderColor: "var(--sol)" }} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rest.map((a) => (
          <Box key={a.name} a={a} />
        ))}
      </div>
    </div>
  );
}

function ScopePanel({ scope }: { scope: Loose }) {
  const cols: { k: string; t: string; c: string; icon: LucideIcon }[] = [
    { k: "build", t: "Build in two days", c: "#0F7B5F", icon: Rocket },
    { k: "stretch", t: "Stretch goals", c: "#B7791F", icon: Target },
    { k: "out", t: "Deliberately out", c: "#6B7280", icon: AlertTriangle },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cols.map(({ k, t, c, icon: I }) => (
        <div key={k} className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: c }}>
            <I className="size-4" aria-hidden />
            <p className="font-medium">{t}</p>
          </div>
          <ul className="space-y-2 p-4 text-sm">
            {arr(scope?.[k]).map((x: string) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: c }} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DemoScript({ steps, note }: { steps: Loose[]; note?: string }) {
  const [sel, setSel] = useState(0);
  const st = steps[sel];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setSel(i)}
              aria-pressed={i === sel}
              className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all", i === sel ? "border-transparent text-white shadow-md" : "border-border bg-white hover:shadow-sm")}
              style={i === sel ? { background: "var(--sol)" } : undefined}
            >
              <span className="font-mono text-xs tabular-nums opacity-80">{s.t}</span>
              <span className="font-medium">{s.who}</span>
              <span className={cn("truncate", i === sel ? "text-white/80" : "text-muted-foreground")}>{s.what}</span>
            </button>
          </li>
        ))}
      </ol>
      {st && (
        <div key={sel} className={cn(card, "flex animate-in flex-col justify-center gap-3 fade-in duration-300")} style={{ background: "color-mix(in srgb, var(--sol) 5%, white)" }}>
          <p className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground">
            <PlayCircle className="size-4" style={{ color: "var(--sol)" }} aria-hidden /> JURY DEMO · {st.t}
          </p>
          <p className={cn(serif, "text-2xl")}>{st.who}</p>
          <p className="text-[15px] leading-relaxed">{st.what}</p>
          {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
        </div>
      )}
    </div>
  );
}

function PrepPanel({ prep, team }: { prep: Loose[]; team: Loose[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-[11px] tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">BY</th>
              <th className="px-3 py-2 font-medium">WHAT MUST BE READY</th>
              <th className="px-3 py-2 font-medium">OWNER</th>
              <th className="px-3 py-2 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {prep.map((p, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium whitespace-nowrap tabular-nums" style={{ color: "var(--sol)" }}>{p.due}</td>
                <td className="px-3 py-2 leading-snug">{p.item}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.owner}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap", /in place/i.test(p.status) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={card}>
        <p className={cn(serif, "text-xl")}>The hackathon team</p>
        <ul className="mt-3 space-y-2.5">
          {team.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: i % 2 ? "var(--sol2, var(--sol))" : "var(--sol)" }}>
                <Users className="size-4" aria-hidden />
              </span>
              <span>
                <span className="font-medium">{t.role}</span> · {t.who}
                <span className="block text-xs text-muted-foreground">{t.why}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AgendaPanel({ agenda }: { agenda: Loose[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {agenda.map((d, di) => (
        <div key={di} className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: di ? "var(--sol2, var(--sol))" : "var(--sol)" }}>
            <CalendarDays className="size-4" aria-hidden />
            <p className="font-medium">{d.day}</p>
          </div>
          <ol className="relative space-y-3 p-4 pl-6">
            <span className="absolute top-5 bottom-5 left-[29px] w-px bg-border" />
            {arr(d.blocks).map((b, i) => (
              <li key={i} className="relative flex gap-3 text-sm">
                <span className="z-10 mt-0.5 size-3 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: "var(--sol)" }} />
                <div className="min-w-0">
                  <p>
                    <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">{b.time}</span>
                    {b.what}
                  </p>
                  <p className="text-xs" style={{ color: "var(--sol)" }}>→ {b.out}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function MeasurePanel({ h }: { h: Loose }) {
  const c = h.cost ?? {};
  const b = h.buyVsBuild;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-[11px] tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">SUCCESS MEASURE</th>
              <th className="px-3 py-2 font-medium">TODAY</th>
              <th className="px-3 py-2 font-medium">TARGET</th>
              <th className="px-3 py-2 font-medium">HOW</th>
            </tr>
          </thead>
          <tbody>
            {arr(h.measures).map((m, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{m.kpi}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.today}</td>
                <td className="px-3 py-2">{m.target}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3">
        <div className={card}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Coins className="size-4" style={{ color: "var(--sol)" }} aria-hidden /> Run cost after the hackathon · about {c.perLead} credits a lead
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {arr(c.scenarios).map((s, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <p className="text-[11px] leading-snug text-muted-foreground">{s.label}</p>
                <p className={cn(serif, "mt-1 text-2xl tabular-nums")} style={{ color: "var(--sol)" }}>
                  ${Number(s.usd).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{s.hours}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{c.basis}</p>
        </div>
        {b && (
          <div className={card} style={{ background: "color-mix(in srgb, var(--sol) 5%, white)" }}>
            <p className="text-sm font-medium">Buy benchmark: {b.name}</p>
            <p className="mt-1 text-sm text-foreground/80">{b.fit}</p>
            <p className="mt-1 text-sm text-foreground/80">
              <span className="font-medium">Gap:</span> {b.gap}
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--sol)" }}>{b.verdict}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RisksAfter({ h }: { h: Loose }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className={card}>
        <p className={cn(serif, "text-xl")}>Risks and fallbacks</p>
        <ul className="mt-3 space-y-2.5">
          {arr(h.risks).map((r, i) => (
            <li key={i} className="grid gap-1 rounded-xl border border-border p-3 text-sm sm:grid-cols-2 sm:gap-3">
              <span className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /> {r.risk}
              </span>
              <span className="text-foreground/80">{r.fix}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <div className={card}>
          <p className={cn(serif, "text-xl")}>After the hackathon</p>
          <ol className="mt-3 space-y-2">
            {arr(h.after).map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 font-medium" style={{ color: "var(--sol)" }}>{a.when}</span>
                <span>{a.what}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className={card}>
          <p className="text-sm font-medium">Microsoft Learn</p>
          <ul className="mt-2 space-y-1 text-sm">
            {arr(h.sources).map((s, i) => (
              <li key={i}>
                <a href={safeUrl(s.url)} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-[var(--sol)]">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HackathonChapter({ s }: { s: Solution }) {
  const h = (s as Loose).hackathon;
  if (!h) return null;
  const ev = h.event ?? {};
  const panels = [
    { id: "journey", label: "Signal to deal", icon: Workflow, badge: arr(h.stages).length, node: <SignalToDeal stages={arr(h.stages)} /> },
    { id: "why", label: "Why this case", icon: MessageSquareQuote, node: <WhyPanel h={h} /> },
    { id: "agents", label: "Agent team", icon: Bot, badge: arr(h.agents).length, node: <AgentTeam agents={arr(h.agents)} /> },
    { id: "scope", label: "Scope", icon: ListChecks, node: <ScopePanel scope={h.scope} /> },
    { id: "demo", label: "Jury demo", icon: PlayCircle, node: <DemoScript steps={arr(h.demo)} note={h.demoNote ? String(h.demoNote) : undefined} /> },
    { id: "prep", label: "Prep checklist", icon: ClipboardList, badge: arr(h.prep).length, node: <PrepPanel prep={arr(h.prep)} team={arr(h.team)} /> },
    { id: "days", label: "Two days", icon: CalendarDays, node: <AgendaPanel agenda={arr(h.agenda)} /> },
    { id: "measure", label: "Measure and cost", icon: Gauge, node: <MeasurePanel h={h} /> },
    { id: "risks", label: "Risks and next", icon: AlertTriangle, node: <RisksAfter h={h} /> },
  ];
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl px-6 py-4 text-white" style={{ background: "linear-gradient(120deg, var(--sol), var(--sol2, var(--sol)))" }}>
        <div className="pointer-events-none absolute -right-10 -bottom-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xs tracking-wider text-white/80">
              <Rocket className="size-4" aria-hidden /> ROUTE TO HACKATHON
              <Countdown dates={ev.dates ?? ""} />
            </p>
            <p className={cn(serif, "mt-1.5 text-xl leading-snug md:text-[22px]")}>{h.challenge}</p>
          </div>
          <div className="space-y-1 rounded-2xl bg-white/12 px-4 py-3 text-sm backdrop-blur">
            <p className="font-medium">{ev.name}</p>
            <p className="flex items-center gap-2 text-white/85">
              <CalendarDays className="size-4" aria-hidden /> {ev.dates}
            </p>
            <p className="flex items-center gap-2 text-white/85">
              <MapPin className="size-4" aria-hidden /> {ev.place}
            </p>
            <p className="text-[11px] leading-snug text-white/70">{ev.source}</p>
          </div>
        </div>
        <p className="relative mt-2 max-w-4xl text-sm text-white/90">{h.pitch}</p>
      </div>
      <SubTabs panels={panels} />
    </div>
  );
}
