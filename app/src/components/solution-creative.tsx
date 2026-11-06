import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Archive, Banknote, BarChart3, Bell, BookOpen, Bot, Brain, Calendar, CheckCircle2, ClipboardCheck, Clock, Compass, Database, Factory,
  FileSearch, FileText, FlaskConical, Gauge, GitBranch, Globe, GraduationCap, Handshake, Inbox, Languages, Layers, Leaf, Lightbulb, LineChart, Lock,
  Mail, Map as MapIcon, MessageSquare, Package, PenTool, Receipt, Repeat, Rocket, Scale, ScanLine, Search, Send, Server, Settings, Share2, ShieldCheck,
  Ship, Sparkles, Target, Timer, Trophy, Truck, UserCheck, Users, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import type { Solution } from "@/lib/solutions";
import { cn } from "@/lib/utils";

export const ICON: Record<string, LucideIcon> = {
  mail: Mail, inbox: Inbox, "file-text": FileText, "file-search": FileSearch, scan: ScanLine, search: Search, database: Database, server: Server, bot: Bot,
  sparkles: Sparkles, brain: Brain, "message-square": MessageSquare, users: Users, "user-check": UserCheck, "clipboard-check": ClipboardCheck,
  "check-circle": CheckCircle2, "alert-triangle": AlertTriangle, bell: Bell, gauge: Gauge, "line-chart": LineChart, "bar-chart": BarChart3, calendar: Calendar,
  clock: Clock, globe: Globe, languages: Languages, "shield-check": ShieldCheck, lock: Lock, factory: Factory, flask: FlaskConical, truck: Truck, ship: Ship,
  package: Package, receipt: Receipt, banknote: Banknote, scale: Scale, handshake: Handshake, "pen-tool": PenTool, "book-open": BookOpen,
  "graduation-cap": GraduationCap, leaf: Leaf, zap: Zap, wrench: Wrench, settings: Settings, send: Send, "share-2": Share2, archive: Archive, target: Target,
  trophy: Trophy, rocket: Rocket, lightbulb: Lightbulb, map: MapIcon, compass: Compass, layers: Layers, "git-branch": GitBranch, repeat: Repeat, timer: Timer,
};
export const iconOf = (n?: string): LucideIcon => (n && ICON[n]) || Sparkles;

/* ---------- Background motifs (subtle SVG patterns) ---------- */
const MOTIF: Record<string, (c: string) => string> = {
  molecules: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='104'><g fill='none' stroke='${c}' stroke-width='1.2'><path d='M30 20 L60 37 L60 71 L30 88 L0 71 L0 37 Z'/><circle cx='60' cy='37' r='3' fill='${c}'/><circle cx='30' cy='88' r='3' fill='${c}'/><path d='M60 37 L95 20'/><circle cx='95' cy='20' r='4'/></g></svg>`,
  waves: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='40'><path d='M0 20 Q20 5 40 20 T80 20 T120 20 T160 20' fill='none' stroke='${c}' stroke-width='1.2'/></svg>`,
  grid: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M32 0H0V32' fill='none' stroke='${c}' stroke-width='0.8'/></svg>`,
  dots: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><circle cx='3' cy='3' r='1.6' fill='${c}'/></svg>`,
  circuits: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><g fill='none' stroke='${c}' stroke-width='1.1'><path d='M0 20 H30 V50 H60 V90'/><path d='M90 30 H70 V10'/><circle cx='30' cy='20' r='3'/><circle cx='60' cy='50' r='3'/><circle cx='70' cy='10' r='3'/></g></svg>`,
  paper: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='28'><path d='M6 8 H54 M6 16 H40 M6 24 H48' stroke='${c}' stroke-width='1' /></svg>`,
  leaves: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><path d='M20 50 C20 25 40 15 55 15 C55 35 45 50 20 50 Z M20 50 L45 25' fill='none' stroke='${c}' stroke-width='1.1'/></svg>`,
  routes: (c) => `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='80'><path d='M0 60 C40 60 40 20 80 20 S120 60 140 40' fill='none' stroke='${c}' stroke-width='1.2' stroke-dasharray='4 5'/><circle cx='80' cy='20' r='3' fill='${c}'/></svg>`,
};
export function motifStyle(motif?: string, opacity = 0.09): React.CSSProperties {
  const f = MOTIF[motif ?? ""];
  if (!f) return {};
  const svg = f(`rgba(27,42,65,${opacity})`);
  return { backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` };
}

/* ---------- Animated numbers ---------- */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.3 });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return { ref, seen };
}
function CountUp({ to, decimals }: { to: number; decimals: number }) {
  const { ref, seen } = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
export function NumbersStrip({ s, onDark = false }: { s: Solution; onDark?: boolean }) {
  const n = s.creative?.numbers ?? [];
  if (!n.length) return null;
  return (
    <dl className="grid grid-cols-3 gap-2">
      {n.map((x, i) => (
        <div key={i} className={cn("rounded-2xl px-3 py-2.5", onDark ? "bg-white/12 ring-1 ring-white/25 backdrop-blur-sm" : "bg-white/85 ring-1 ring-border backdrop-blur")} title={x.basis === "Illustrative" ? "Illustrative figure" : "From the dossier"}>
          <dd className={cn("font-[family-name:var(--font-serif)] text-2xl leading-tight tabular-nums md:text-3xl", onDark ? "text-white" : "")} style={onDark ? undefined : { color: "var(--sol)" }}>
            {x.prefix}
            <CountUp to={x.value} decimals={Number.isInteger(x.value) ? 0 : 1} />
            <span className="text-base">{x.suffix}</span>
          </dd>
          <dt className={cn("text-[11px] leading-tight", onDark ? "text-white/80" : "text-muted-foreground")}>
            {x.label}
            {x.basis === "Illustrative" && <span className="opacity-70"> · illustrative</span>}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export function Signature({ s, onDark = false }: { s: Solution; onDark?: boolean }) {
  const sig = s.creative?.signature;
  if (!sig) return null;
  return (
    <div className={cn("flex items-start gap-3", onDark && "text-white")}>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-border" aria-hidden="true">
        {sig.emoji}
      </span>
      <div>
        <p className={cn("text-[11px] font-medium tracking-[0.16em]", onDark ? "text-white/75" : "text-muted-foreground")}>{sig.kicker.toUpperCase()}</p>
        <p className="font-[family-name:var(--font-serif)] text-lg leading-snug md:text-xl">“{sig.line}”</p>
      </div>
    </div>
  );
}

/* ---------- Day in the life as a clock timeline ---------- */
export function ClockStory({ s }: { s: Solution }) {
  const d = s.creative?.dayInTheLife ?? [];
  const [i, setI] = useState(0);
  if (!d.length) return null;
  const cur = d[i];
  const Icon = iconOf(cur.icon);
  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <p className="text-xs tracking-[0.14em] text-muted-foreground">A DAY IN THE LIFE · TOMORROW</p>
      <div className="relative mt-4">
        <div className="absolute top-5 right-4 left-4 h-0.5 rounded-full bg-border" />
        <div className="absolute top-5 left-4 h-0.5 rounded-full transition-all duration-500" style={{ width: `calc((100% - 2rem) * ${d.length > 1 ? i / (d.length - 1) : 0})`, background: "var(--sol)" }} />
        <ol className="relative flex justify-between">
          {d.map((m, k) => {
            const I = iconOf(m.icon);
            return (
              <li key={k}>
                <button onClick={() => setI(k)} aria-pressed={i === k} className="flex flex-col items-center gap-1">
                  <span className={cn("grid size-10 place-items-center rounded-full border-2 bg-white transition-all", k <= i ? "border-transparent text-white" : "border-border text-muted-foreground", k === i && "scale-110 shadow-md")} style={k <= i ? { background: "var(--sol)" } : undefined}>
                    <I className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className={cn("text-xs tabular-nums", k === i ? "font-semibold" : "text-muted-foreground")}>{m.time}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div key={i} className="mt-5 flex items-start gap-4 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ background: "color-mix(in srgb, var(--sol) 8%, #FFFDF8)" }}>
        <span className="font-[family-name:var(--font-serif)] text-3xl tabular-nums" style={{ color: "var(--sol)" }}>
          {cur.time}
        </span>
        <p className="flex-1 pt-1 font-[family-name:var(--font-serif)] text-lg leading-relaxed">{cur.scene}</p>
        <Icon className="mt-1 size-6 shrink-0 opacity-30" aria-hidden="true" />
      </div>
      <div className="mt-3 flex justify-end gap-2 text-sm">
        <button className="rounded-full px-3 py-1 hover:bg-muted disabled:opacity-40" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← Earlier
        </button>
        <button className="rounded-full px-3 py-1 text-white hover:opacity-90 disabled:opacity-40" style={{ background: "var(--sol)" }} disabled={i === d.length - 1} onClick={() => setI(i + 1)}>
          Later →
        </button>
      </div>
    </div>
  );
}

export function Challenge({ s }: { s: Solution }) {
  const c = s.creative?.challenge;
  const [pick, setPick] = useState<number | null>(null);
  if (!c) return null;
  return (
    <div className="rounded-3xl border-2 border-dashed p-5" style={{ borderColor: "color-mix(in srgb, var(--sol) 40%, white)" }}>
      <p className="text-xs font-medium tracking-[0.14em]" style={{ color: "var(--sol)" }}>
        QUICK CHALLENGE
      </p>
      <p className="mt-1 font-medium">{c.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {c.options.map((o, k) => {
          const right = pick !== null && k === c.answer;
          const wrong = pick === k && k !== c.answer;
          return (
            <button
              key={k}
              onClick={() => setPick(k)}
              disabled={pick !== null}
              className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-all", right ? "border-emerald-400 bg-emerald-50 font-medium" : wrong ? "border-rose-300 bg-rose-50" : "border-border bg-white hover:-translate-y-0.5 hover:shadow-sm")}
            >
              {o}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <p className="mt-3 text-sm animate-in fade-in">
          {pick === c.answer ? "Exactly. " : "Not quite. "}
          <span className="text-muted-foreground">{c.explain}</span>
        </p>
      )}
      {s.creative?.funFact && (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0" style={{ color: "var(--sol)" }} aria-hidden="true" />
          {s.creative.funFact}
        </p>
      )}
    </div>
  );
}

/* ---------- Journey visualisations ---------- */
type Step = Solution["journey"][number];

function StepDetail({ st }: { st: Step }) {
  return (
    <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
      <div className="text-sm">
        <p className="text-muted-foreground">Who</p>
        <p className="font-medium">{st.actor}</p>
        <p className="mt-2 text-muted-foreground">Where</p>
        <p className="font-medium">{st.touchpoint}</p>
        {st.aiMoment && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white" style={{ background: "var(--sol)" }}>
            <Sparkles className="size-3.5" aria-hidden="true" /> AI moment
          </p>
        )}
      </div>
      <div className="rounded-2xl bg-muted/60 p-4">
        <p className="text-xs tracking-[0.14em] text-muted-foreground">BEFORE</p>
        <p className="mt-1 text-[15px] leading-relaxed">{st.before}</p>
      </div>
      <div className="rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 10%, white)" }}>
        <p className="text-xs tracking-[0.14em]" style={{ color: "var(--sol)" }}>
          AFTER
        </p>
        <p className="mt-1 text-[15px] leading-relaxed">{st.after}</p>
      </div>
    </div>
  );
}

function Metro({ j, icons }: { j: Step[]; icons: string[] }) {
  const [sel, setSel] = useState(0);
  return (
    <div className="space-y-5">
      <div className="relative overflow-x-auto pb-2">
        <div className="relative flex min-w-[720px] items-start justify-between px-6 pt-4">
          <div className="absolute top-[38px] right-10 left-10 h-2.5 rounded-full" style={{ background: "var(--sol)" }} />
          {j.map((st, k) => {
            const I = iconOf(icons[k]);
            return (
              <button key={k} onClick={() => setSel(k)} className="relative z-10 flex w-28 flex-col items-center gap-2 text-center" aria-pressed={sel === k}>
                <span className={cn("grid size-12 place-items-center rounded-full border-4 bg-white transition-transform", sel === k && "scale-125 shadow-lg")} style={{ borderColor: "var(--sol)" }}>
                  <I className="size-5" style={{ color: "var(--sol)" }} aria-hidden="true" />
                </span>
                <span className={cn("text-xs leading-tight", sel === k ? "font-semibold" : "text-muted-foreground")}>{st.stage}</span>
                {st.aiMoment && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">AI stop</span>}
              </button>
            );
          })}
        </div>
      </div>
      <StepDetail st={j[sel]} />
    </div>
  );
}

function Swimlane({ j, icons }: { j: Step[]; icons: string[] }) {
  const actors = Array.from(new Set(j.map((s) => s.actor)));
  const [sel, setSel] = useState(0);
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <div className="min-w-[760px]">
          {actors.map((a, ai) => (
            <div key={a} className={cn("grid items-center", ai % 2 ? "bg-[#FBF9F5]" : "bg-white")} style={{ gridTemplateColumns: `170px repeat(${j.length}, minmax(0,1fr))` }}>
              <div className="border-r border-border px-3 py-4 text-xs font-medium">{a}</div>
              {j.map((st, k) => {
                const I = iconOf(icons[k]);
                return (
                  <div key={k} className="relative flex justify-center py-3">
                    {st.actor === a && (
                      <button onClick={() => setSel(k)} aria-pressed={sel === k} className={cn("flex w-[92%] items-center gap-1.5 rounded-xl border px-2 py-2 text-left text-[11px] leading-tight transition-all", sel === k ? "border-transparent text-white shadow-md" : "border-border bg-white hover:shadow-sm")} style={sel === k ? { background: "var(--sol)" } : undefined}>
                        <I className="size-4 shrink-0" aria-hidden="true" />
                        <span className="line-clamp-2">
                          {k + 1}. {st.stage}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <StepDetail st={j[sel]} />
    </div>
  );
}

function Split({ j, icons }: { j: Step[]; icons: string[] }) {
  const [show, setShow] = useState<"before" | "after">("after");
  return (
    <div className="space-y-4">
      <div role="tablist" className="inline-flex rounded-full bg-muted p-1 text-sm">
        {(["before", "after"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={show === k} onClick={() => setShow(k)} className={cn("rounded-full px-4 py-1.5", show === k ? "bg-white font-medium shadow-sm" : "text-muted-foreground")}>
            {k === "before" ? "The road today" : "The road tomorrow"}
          </button>
        ))}
      </div>
      <ol className="relative space-y-3 pl-10">
        <span className="absolute top-2 bottom-2 left-[18px] w-1 rounded-full transition-colors" style={{ background: show === "after" ? "var(--sol)" : "#C9C1B2" }} />
        {j.map((st, k) => {
          const I = iconOf(icons[k]);
          return (
            <li key={`${show}-${k}`} className="relative animate-in fade-in slide-in-from-left-2 fill-mode-both" style={{ animationDelay: `${k * 70}ms` }}>
              <span className="absolute top-2 -left-10 grid size-9 place-items-center rounded-full border-2 bg-white" style={{ borderColor: show === "after" ? "var(--sol)" : "#B9B1A3" }}>
                <I className="size-4" style={{ color: show === "after" ? "var(--sol)" : "#8A8F98" }} aria-hidden="true" />
              </span>
              <div className={cn("rounded-2xl border p-3.5", show === "after" ? "border-transparent" : "border-border bg-white")} style={show === "after" ? { background: "color-mix(in srgb, var(--sol) 8%, white)" } : undefined}>
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
                  {st.stage} <span className="text-xs font-normal text-muted-foreground">{st.actor} · {st.touchpoint}</span>
                </p>
                <p className="mt-1 text-[15px] leading-relaxed">{show === "after" ? st.after : st.before}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Cards({ j, icons }: { j: Step[]; icons: string[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Turn each card to see how the step changes.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {j.map((st, k) => {
          const I = iconOf(icons[k]);
          const f = flipped[k];
          return (
            <button key={k} onClick={() => setFlipped((m) => ({ ...m, [k]: !m[k] }))} className="group h-56 [perspective:1000px]" aria-pressed={!!f} aria-label={`${st.stage}: ${f ? "after" : "before"}`}>
              <span className={cn("relative block h-full w-full rounded-3xl transition-transform duration-700 [transform-style:preserve-3d]", f && "[transform:rotateY(180deg)]")}>
                <span className="absolute inset-0 flex flex-col rounded-3xl border border-border bg-white p-5 text-left [backface-visibility:hidden]">
                  <span className="flex items-center justify-between text-xs text-muted-foreground">
                    Step {k + 1} · today <I className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-2 font-[family-name:var(--font-serif)] text-xl">{st.stage}</span>
                  <span className="mt-2 line-clamp-4 text-sm text-muted-foreground">{st.before}</span>
                  <span className="mt-auto text-xs" style={{ color: "var(--sol)" }}>
                    Turn the card ↻
                  </span>
                </span>
                <span className="absolute inset-0 flex flex-col rounded-3xl p-5 text-left text-white [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ background: "var(--sol)" }}>
                  <span className="flex items-center justify-between text-xs text-white/80">
                    Step {k + 1} · tomorrow {st.aiMoment && <Sparkles className="size-4" aria-hidden="true" />}
                  </span>
                  <span className="mt-2 font-[family-name:var(--font-serif)] text-xl">{st.stage}</span>
                  <span className="mt-2 line-clamp-5 text-sm text-white/90">{st.after}</span>
                  <span className="mt-auto text-xs text-white/75">
                    {st.actor} · {st.touchpoint}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spiral({ j, icons }: { j: Step[]; icons: string[] }) {
  const [sel, setSel] = useState(0);
  const n = j.length;
  const R = 150, C = 190;
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[400px_1fr]">
      <div className="relative mx-auto size-[380px]">
        <svg viewBox="0 0 380 380" className="absolute inset-0" aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--sol)" strokeWidth="3" strokeDasharray="6 8" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="40s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="absolute inset-[110px] grid place-items-center rounded-full text-center text-sm" style={{ background: "color-mix(in srgb, var(--sol) 8%, white)" }}>
          <span>
            <Repeat className="mx-auto mb-1 size-6" style={{ color: "var(--sol)" }} aria-hidden="true" />
            Every cycle,
            <br />
            the same loop
          </span>
        </div>
        {j.map((st, k) => {
          const a = (k / n) * 2 * Math.PI - Math.PI / 2;
          const x = C + R * Math.cos(a), y = C + R * Math.sin(a);
          const I = iconOf(icons[k]);
          return (
            <button key={k} onClick={() => setSel(k)} aria-pressed={sel === k} className={cn("absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-white transition-all", sel === k ? "scale-125 border-transparent text-white shadow-lg" : "border-border")} style={{ left: x, top: y, ...(sel === k ? { background: "var(--sol)" } : {}) }} title={st.stage}>
              <I className="size-5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Step {sel + 1} of {n}
        </p>
        <p className="mb-3 font-[family-name:var(--font-serif)] text-2xl">{j[sel].stage}</p>
        <StepDetail st={j[sel]} />
      </div>
    </div>
  );
}

export function JourneyViz({ s, fallback }: { s: Solution; fallback: React.ReactNode }) {
  const style = s.creative?.journeyStyle;
  const icons = s.creative?.stepIcons ?? [];
  const j = s.journey;
  if (!style || style === "curve" || !j.length) return <>{fallback}</>;
  return (
    <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
      {style === "metro" && <Metro j={j} icons={icons} />}
      {style === "swimlane" && <Swimlane j={j} icons={icons} />}
      {style === "split" && <Split j={j} icons={icons} />}
      {style === "cards" && <Cards j={j} icons={icons} />}
      {style === "spiral" && <Spiral j={j} icons={icons} />}
    </div>
  );
}
