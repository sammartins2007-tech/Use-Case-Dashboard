import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, FileText, Mail, Pause, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SolDemo } from "@/lib/solutions";
import { cn } from "@/lib/utils";

// Demo payloads are validated when generated; read them as loosely typed records.
type D = ReturnType<typeof JSON.parse>;
const box = "rounded-2xl border border-border bg-card";
const accentBg = { background: "var(--sol)" } as const;
const tint = (pct: number) => ({ background: `color-mix(in srgb, var(--sol) ${pct}%, white)` });

export function SolutionDemo({ demo }: { demo: SolDemo }) {
  const d: D = demo.data;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] text-muted-foreground">
            <Sparkles className="size-3.5" style={{ color: "var(--sol)" }} aria-hidden /> INTERACTIVE DEMO
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-serif)] text-2xl">{demo.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{demo.intro}</p>
        </div>
        <span className="rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-muted-foreground">{demo.note}</span>
      </div>
      {demo.type === "inbox-triage" && <InboxTriage d={d} />}
      {demo.type === "document-extraction" && <DocExtraction d={d} />}
      {demo.type === "chat" && <ChatDemo d={d} />}
      {demo.type === "dashboard-alert" && <DashboardAlert d={d} />}
      {demo.type === "what-if" && <WhatIf d={d} />}
      {demo.type === "draft-compare" && <DraftCompare d={d} />}
      {demo.type === "process-race" && <ProcessRace d={d} />}
      {demo.type === "approval-flow" && <ApprovalFlow d={d} />}
    </div>
  );
}

const PRIO: Record<string, string> = { High: "bg-rose-100 text-rose-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-emerald-100 text-emerald-800" };

function InboxTriage({ d }: { d: D }) {
  const items: D[] = d.items ?? [];
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (done >= items.length) return setRunning(false);
    const t = setTimeout(() => setDone((v) => v + 1), 900);
    return () => clearTimeout(t);
  }, [running, done, items.length]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className={cn(box, "p-4")}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Mail className="size-4" aria-hidden /> {d.source}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="text-white hover:opacity-90" style={accentBg} onClick={() => (done >= items.length ? (setDone(0), setRunning(true)) : setRunning((v) => !v))}>
              {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {running ? "Pause" : done ? (done >= items.length ? "Run again" : "Resume") : "Run the agent"}
            </Button>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className={cn("rounded-xl border p-3 text-sm transition-all duration-500", i < done ? "border-transparent opacity-40" : i === done && running ? "border-[color:var(--sol)] shadow-md" : "border-border")}>
              <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{it.from}</span>
                {i < done && <Check className="size-3.5 text-emerald-600" aria-hidden />}
              </p>
              <p className="font-medium">{it.subject}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{it.snippet}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid content-start gap-3 sm:grid-cols-2">
        {(d.categories ?? []).map((c: string) => {
          const inCat = items.slice(0, done).filter((it) => it.category === c);
          return (
            <div key={c} className={cn(box, "min-h-[120px] p-3")} style={tint(5)}>
              <p className="flex items-center justify-between text-xs font-medium tracking-wide">
                {c} <span className="rounded-full bg-white px-2 tabular-nums">{inCat.length}</span>
              </p>
              <ul className="mt-2 space-y-2">
                {inCat.map((it, i) => (
                  <li key={i} className="animate-in fade-in slide-in-from-left-3 rounded-lg bg-white p-2 text-xs shadow-sm duration-500">
                    <p className="flex items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px]", PRIO[it.priority])}>{it.priority}</span>
                      <span className="truncate font-medium">{it.subject}</span>
                    </p>
                    <p className="mt-1 flex items-start gap-1 text-muted-foreground">
                      <Bot className="mt-0.5 size-3 shrink-0" style={{ color: "var(--sol)" }} aria-hidden /> {it.action}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CHECK = { ok: "text-emerald-700 bg-emerald-50", warn: "text-amber-800 bg-amber-50", fail: "text-rose-800 bg-rose-50" } as const;

function DocExtraction({ d }: { d: D }) {
  const fields: D[] = d.fields ?? [];
  const [n, setN] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    if (n === 0 || n > fields.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 550);
    return () => clearTimeout(t);
  }, [n, fields.length]);
  const shown = Math.min(Math.max(n - 1, 0), fields.length);
  const hl = sel !== null ? fields[sel] : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={cn(box, "relative overflow-hidden bg-[#FFFEFA] p-5 font-mono text-[12.5px] leading-relaxed shadow-inner")}>
        <p className="mb-3 flex items-center gap-2 font-sans text-sm font-medium">
          <FileText className="size-4" aria-hidden /> {d.docTitle}
        </p>
        {(d.docLines ?? []).map((l: string, i: number) => {
          const hit = hl && hl.value && l.toLowerCase().includes(String(hl.value).toLowerCase().slice(0, 12));
          return (
            <p key={i} className={cn("rounded px-1 transition-colors", hit && "bg-yellow-100")}>
              {l || "\u00a0"}
            </p>
          );
        })}
        {n > 0 && n <= fields.length && <div className="pointer-events-none absolute inset-x-0 h-8 animate-pulse" style={{ top: `${15 + (n / fields.length) * 75}%`, ...tint(25), opacity: 0.4 }} />}
      </div>
      <div className={cn(box, "p-4")}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Extracted and checked</p>
          <Button size="sm" className="text-white hover:opacity-90" style={accentBg} onClick={() => (setSel(null), setN(1))} disabled={n > 0 && n <= fields.length}>
            {shown ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {shown ? "Run again" : "Extract"}
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {fields.slice(0, shown).map((f, i) => (
            <li key={i}>
              <button onClick={() => setSel(i)} className={cn("w-full animate-in fade-in slide-in-from-right-2 rounded-xl border p-2.5 text-left text-sm", sel === i ? "border-[color:var(--sol)]" : "border-border hover:bg-muted/50")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CHECK[f.check as keyof typeof CHECK])}>
                    {f.check === "ok" ? "OK" : f.check === "warn" ? "Review" : "Fails check"} · {Math.round(f.confidence * 100)}%
                  </span>
                </span>
                <span className="mt-0.5 block font-medium">{f.value}</span>
                {sel === i && f.note && <span className="mt-1 block text-xs text-muted-foreground">{f.note}</span>}
              </button>
            </li>
          ))}
          {!shown && <li className="text-sm text-muted-foreground">Press “Extract” to watch the document being read.</li>}
        </ul>
      </div>
    </div>
  );
}

function ChatDemo({ d }: { d: D }) {
  const qs: D[] = d.questions ?? [];
  const [log, setLog] = useState<number[]>([]);
  const [typing, setTyping] = useState<number | null>(null);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (typing === null) return;
    const full = qs[typing].a.length;
    if (chars >= full) {
      setLog((l) => [...l, typing]);
      setTyping(null);
      return;
    }
    const t = setTimeout(() => setChars((c) => Math.min(full, c + 6)), 16);
    return () => clearTimeout(t);
  }, [typing, chars, qs]);
  const ask = (i: number) => {
    if (typing !== null) return;
    setChars(0);
    setTyping(i);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Ask {d.assistant}:</p>
        {qs.map((q, i) => (
          <button key={i} onClick={() => ask(i)} disabled={typing !== null} className={cn("w-full rounded-xl border p-3 text-left text-sm transition-all hover:shadow-sm disabled:opacity-60", log.includes(i) ? "border-border bg-muted/40" : "border-[color:var(--sol)] bg-white")}>
            {q.q}
          </button>
        ))}
      </div>
      <div className={cn(box, "min-h-[320px] space-y-4 p-4")} aria-live="polite">
        {[...log, ...(typing !== null ? [typing] : [])].map((i, k) => {
          const q = qs[i];
          const live = typing === i && k === log.length;
          return (
            <div key={k} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0D2847] px-3.5 py-2 text-sm text-white">{q.q}</p>
              <div className="flex gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full text-white" style={accentBg}>
                  <Bot className="size-4" aria-hidden />
                </span>
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-white px-3.5 py-2 text-sm leading-relaxed">
                  {live ? q.a.slice(0, chars) : q.a}
                  {!live && q.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.sources.map((s: string, j: number) => (
                        <span key={j} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          [{j + 1}] {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!log.length && typing === null && <p className="pt-20 text-center text-sm text-muted-foreground">Pick a question on the left.</p>}
      </div>
    </div>
  );
}

function DashboardAlert({ d }: { d: D }) {
  const s: number[] = d.series ?? [];
  const alerts: D[] = d.alerts ?? [];
  const [sel, setSel] = useState(0);
  const W = 900, H = 260, P = 34;
  const min = Math.min(...s, d.threshold), max = Math.max(...s, d.threshold);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, s.length - 1);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const path = s.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ");
  const a = alerts[sel];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className={cn(box, "p-4")}>
        <p className="text-sm font-medium">
          {d.metric} <span className="text-muted-foreground">({d.unit})</span>
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${d.metric} trend with alerts`}>
          <defs>
            <linearGradient id="dg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sol)" stopOpacity="0.25" />
              <stop offset="1" stopColor="var(--sol)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${x(s.length - 1)} ${H - P} L ${x(0)} ${H - P} Z`} fill="url(#dg)" />
          <line x1={P} x2={W - P} y1={y(d.threshold)} y2={y(d.threshold)} stroke="#C94141" strokeDasharray="6 5" />
          <text x={W - P} y={y(d.threshold) - 6} textAnchor="end" fontSize="11" fill="#C94141">
            threshold {d.threshold}
          </text>
          <path d={path} fill="none" stroke="var(--sol)" strokeWidth="2.5" className="sol-draw" />
          {alerts.map((al, i) => (
            <g key={i} onClick={() => setSel(i)} className="cursor-pointer">
              <circle cx={x(al.index)} cy={y(s[al.index])} r={sel === i ? 11 : 8} fill="#C94141" opacity={0.9}>
                <animate attributeName="r" values={sel === i ? "11;14;11" : "8;10;8"} dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={x(al.index)} y={y(s[al.index]) + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="space-y-2">
        {alerts.map((al, i) => (
          <button key={i} onClick={() => setSel(i)} className={cn("w-full rounded-xl border p-3 text-left text-sm", sel === i ? "border-rose-300 bg-rose-50" : "border-border bg-white hover:bg-muted/50")}>
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 text-rose-600" aria-hidden /> {i + 1}. {al.title}
            </span>
          </button>
        ))}
        {a && (
          <div key={sel} className={cn(box, "animate-in fade-in p-4 text-sm")}>
            <p className="text-xs tracking-[0.14em] text-muted-foreground">WHY IT FIRED</p>
            <p className="mt-1">{a.explanation}</p>
            <p className="mt-3 text-xs tracking-[0.14em] text-muted-foreground">SUGGESTED ACTION</p>
            <p className="mt-1 font-medium" style={{ color: "var(--sol)" }}>
              {a.action}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatIf({ d }: { d: D }) {
  const [v, setV] = useState<Record<string, number>>(() => Object.fromEntries((d.inputs ?? []).map((i: D) => [i.id, i.value])));
  const outs = useMemo(() => (d.outputs ?? []).map((o: D) => ({ ...o, val: o.coef * o.vars.reduce((p: number, k: string) => p * (v[k] ?? 0), 1) })), [d.outputs, v]);
  const fmt = (n: number, u: string) =>
    u === "$/yr" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n) + " / yr" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: u === "%" ? 1 : 0 }).format(n)} ${u}`;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className={cn(box, "space-y-5 p-5")}>
        {(d.inputs ?? []).map((i: D) => (
          <label key={i.id} className="block">
            <span className="flex justify-between text-sm">
              <span>{i.label}</span>
              <span className="font-medium tabular-nums">
                {v[i.id]} {i.unit}
              </span>
            </span>
            <input type="range" min={i.min} max={i.max} step={i.step} value={v[i.id]} onChange={(e) => setV((s) => ({ ...s, [i.id]: Number(e.target.value) }))} className="mt-2 w-full" style={{ accentColor: "var(--sol)" }} />
          </label>
        ))}
      </div>
      <div className="grid content-start gap-3">
        {outs.map((o: D, k: number) => (
          <div key={k} className="rounded-2xl p-5 text-white" style={k === 0 ? accentBg : { background: "#0D2847" }}>
            <p className="text-xs text-white/80">{o.label}</p>
            <p className="mt-1 font-[family-name:var(--font-serif)] text-3xl tabular-nums">{fmt(o.val, o.unit)}</p>
          </div>
        ))}
        {d.caveat && <p className="text-xs text-muted-foreground">{d.caveat}</p>}
      </div>
    </div>
  );
}

function DraftCompare({ d }: { d: D }) {
  const [after, setAfter] = useState(false);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <Button size="sm" className="text-white hover:opacity-90" style={accentBg} onClick={() => setAfter((v) => !v)}>
          {after ? <RotateCcw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />} {after ? "Show the input" : "Let the agent draft"}
        </Button>
        <span className="text-xs text-muted-foreground">{after ? d.outputTitle : d.inputTitle}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1.3fr]">
        <div className={cn(box, "bg-[#FFFEFA] p-4 font-mono text-[12.5px] leading-relaxed transition-opacity", after && "opacity-50")}>
          <p className="mb-2 font-sans text-sm font-medium">{d.inputTitle}</p>
          {(d.input ?? []).map((l: string, i: number) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        <div className="hidden items-center lg:flex">
          <ArrowRight className={cn("size-6 transition-all", after ? "translate-x-1" : "opacity-30")} style={{ color: "var(--sol)" }} aria-hidden />
        </div>
        <div className={cn(box, "p-5")}>
          {after ? (
            <div className="space-y-3">
              <p className="font-[family-name:var(--font-serif)] text-lg">{d.outputTitle}</p>
              {(d.output ?? []).map((o: D, i: number) => (
                <div key={i} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${i * 220}ms` }}>
                  <p className="text-xs font-medium tracking-wide" style={{ color: "var(--sol)" }}>
                    {o.heading}
                  </p>
                  <p className="text-sm leading-relaxed">{o.text}</p>
                </div>
              ))}
              <ul className="mt-3 space-y-1 border-t border-border pt-3">
                {(d.checks ?? []).map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs animate-in fade-in fill-mode-both" style={{ animationDelay: `${(d.output?.length ?? 0) * 220 + i * 150}ms` }}>
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden /> {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="pt-16 text-center text-sm text-muted-foreground">The draft appears here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessRace({ d }: { d: D }) {
  const before: D[] = d.before ?? [];
  const afterS: D[] = d.after ?? [];
  const tb = before.reduce((a, s) => a + s.dur, 0);
  const ta = afterS.reduce((a, s) => a + s.dur, 0);
  const [t, setT] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    if (t >= tb) return setRun(false);
    const id = setTimeout(() => setT((v) => Math.min(tb, v + tb / 120)), 40);
    return () => clearTimeout(id);
  }, [run, t, tb]);
  const lane = (steps: D[], total: number, label: string, color: string) => {
    let acc = 0;
    return (
      <div>
        <p className="mb-1 flex justify-between text-xs">
          <span className="font-medium">{label}</span>
          <span className="tabular-nums text-muted-foreground">
            {Math.min(t, total).toFixed(t < 10 ? 1 : 0)} / {total} {d.unit}
            {t >= total && <span className="ml-1 font-medium text-emerald-700">· done</span>}
          </span>
        </p>
        <div className="flex h-12 overflow-hidden rounded-xl bg-muted/60">
          {steps.map((s, i) => {
            const start = acc;
            acc += s.dur;
            const fill = Math.max(0, Math.min(1, (t - start) / s.dur));
            return (
              <div key={i} className="relative border-r border-white/70" style={{ width: `${(s.dur / tb) * 100}%` }} title={`${s.step} · ${s.actor} · ${s.dur} ${d.unit}`}>
                <div className="absolute inset-y-0 left-0 transition-[width] duration-75" style={{ width: `${fill * 100}%`, background: color }} />
                <span className={cn("relative z-10 block truncate px-1.5 pt-1 text-[10.5px]", fill > 0.5 ? "text-white" : "text-foreground")}>{s.step}</span>
                <span className={cn("relative z-10 block truncate px-1.5 text-[10px]", fill > 0.5 ? "text-white/80" : "text-muted-foreground")}>{s.actor}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (
    <div className={cn(box, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" className="text-white hover:opacity-90" style={accentBg} onClick={() => (t >= tb ? (setT(0), setRun(true)) : setRun((v) => !v))}>
          {run ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {run ? "Pause" : t >= tb ? "Race again" : "Start the race"}
        </Button>
        <span className="text-sm">
          <span className="font-[family-name:var(--font-serif)] text-2xl tabular-nums" style={{ color: "var(--sol)" }}>
            −{Math.round((1 - ta / tb) * 100)}%
          </span>{" "}
          <span className="text-muted-foreground">
            {tb} → {ta} {d.unit}
          </span>
        </span>
      </div>
      {lane(before, tb, "Today", "#9AA1AC")}
      {lane(afterS, ta, "With the solution", "var(--sol)")}
    </div>
  );
}

const DEC: Record<string, string> = { Approved: "bg-emerald-100 text-emerald-800", Returned: "bg-amber-100 text-amber-800", Escalated: "bg-rose-100 text-rose-800" };

function ApprovalFlow({ d }: { d: D }) {
  const stages: string[] = d.stages ?? [];
  const items: D[] = d.items ?? [];
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(false);
  const maxStep = Math.max(...items.map((it) => it.path.length));
  useEffect(() => {
    if (!run) return;
    if (step >= maxStep) return setRun(false);
    const id = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(id);
  }, [run, step, maxStep]);
  const where = (it: D) => (step === 0 ? null : it.path[Math.min(step, it.path.length) - 1]);
  const finished = (it: D) => step >= it.path.length;
  return (
    <div>
      <Button size="sm" className="mb-3 text-white hover:opacity-90" style={accentBg} onClick={() => (step >= maxStep ? (setStep(0), setRun(true)) : setRun((v) => !v))}>
        {run ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {run ? "Pause" : step >= maxStep ? "Replay" : "Run the flow"}
      </Button>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stages.length + 1}, minmax(150px, 1fr))` }}>
        {[{ s: "Incoming" }, ...stages.map((s) => ({ s }))].map(({ s }, ci) => (
          <div key={s} className={cn(box, "min-h-[200px] p-2.5")} style={ci ? tint(4) : undefined}>
            <p className="mb-2 text-xs font-medium tracking-wide">{s}</p>
            <ul className="space-y-2">
              {items
                .filter((it) => (ci === 0 ? where(it) === null : where(it) === s))
                .map((it) => (
                  <li key={it.title} className="animate-in fade-in zoom-in-95 rounded-lg border border-border bg-white p-2 text-xs shadow-sm">
                    <p className="font-medium">{it.title}</p>
                    {finished(it) && ci > 0 && (
                      <>
                        <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", DEC[it.decision])}>
                          {it.decision === "Approved" ? <Check className="mr-0.5 inline size-3" aria-hidden /> : it.decision === "Returned" ? <RotateCcw className="mr-0.5 inline size-3" aria-hidden /> : <X className="mr-0.5 inline size-3" aria-hidden />}
                          {it.decision}
                        </span>
                        <p className="mt-1 text-muted-foreground">{it.reason}</p>
                      </>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
