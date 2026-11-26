import { useRef, useState } from "react";
import { ArrowRight, BatteryMedium, Bell, Bot, Calculator, Check, ClipboardCopy, Coins, Database, FileText, Gauge, KeyRound, Layers, ListChecks, MessageSquare, MousePointerClick, Plug, Ruler, Scale, ShieldCheck, Smartphone, Sparkles, Table2, Timer, Users, Wifi, WifiOff, Workflow, Zap, type LucideIcon } from "lucide-react";
import { routeLoose as routeOf } from "@/lib/routes";
import { externalUrl } from "@/lib/safe-url";
import type { Blueprint, Solution } from "@/lib/solutions";
import { cn } from "@/lib/utils";

// Designs are validated JSON documents read loosely.
type Loose = ReturnType<typeof JSON.parse>;

/* eslint-disable @typescript-eslint/no-explicit-any */
const serif = "font-[family-name:var(--font-serif)]";
const card = "rounded-2xl border border-border bg-white p-5";
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? v : []);
const usd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const txt = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          window.setTimeout(() => setOk(false), 1600);
        });
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-xs font-medium hover:bg-muted"
      data-pdf-exclude
    >
      {ok ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <ClipboardCopy className="size-3.5" aria-hidden />}
      {ok ? "Copied" : label}
    </button>
  );
}

/** A ready-to-use text artefact (prompt, instructions, brief) shown as a document, with a copy button. */
function Artefact({ title, kicker, text, icon: Icon = FileText }: { title: string; kicker?: string; text: string; icon?: LucideIcon }) {
  // highlight [placeholders]
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-[#F7FBFE] px-4 py-2.5">
        <Icon className="size-4" style={{ color: "var(--sol)" }} aria-hidden />
        <div className="min-w-0 flex-1">
          {kicker && <p className="text-[11px] text-muted-foreground">{kicker}</p>}
          <p className="truncate text-sm font-medium">{title}</p>
        </div>
        <Copy text={text} />
      </div>
      <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap px-5 py-4 font-[family-name:var(--font-sans)] text-[13.5px] leading-relaxed text-foreground/90">
        {parts.map((p, i) =>
          /^\[[^\]]+\]$/.test(p) ? (
            <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900">
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </pre>
    </div>
  );
}

function H({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h3 className={cn(serif, "mb-3 flex items-center gap-2 text-lg")}>
      <Icon className="size-4" style={{ color: "var(--sol)" }} aria-hidden />
      {children}
    </h3>
  );
}

function Rows({ items, cols }: { items: Loose[]; cols: { key: string; label: string; strong?: boolean }[] }) {
  if (!items.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-[#F7FBFE] text-left text-xs text-muted-foreground">
          <tr>{cols.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {cols.map((c) => (
                <td key={c.key} className={cn("px-3 py-2", c.strong && "font-medium")}>
                  {Array.isArray(r[c.key]) ? r[c.key].join(", ") : txt(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium text-white" style={{ background: "var(--sol)" }}>
            {i + 1}
          </span>
          <span className="pt-0.5">{x}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- The answer band shown on top of the build chapter ---------- */
export function BlueprintAnswer({ b, s }: { b: Blueprint; s: Solution }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-l-4 bg-white p-5 shadow-sm" style={{ borderColor: "var(--sol)" }}>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground">THE ANSWER</p>
        <p className={cn(serif, "mt-1 text-2xl leading-snug")}>{b.answer}</p>
        <p className="mt-2 max-w-4xl text-[15px] leading-relaxed text-foreground/80">{b.whatItIs}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[#F7FBFE] p-3">
            <p className="text-xs text-muted-foreground">Effort</p>
            <p className="text-lg font-medium">
              {b.effort.value} {b.effort.value === 1 ? b.effort.unit.replace(/s$/, "") : b.effort.unit}
            </p>
            <p className="text-xs text-muted-foreground">{b.effort.who}</p>
          </div>
          <div className="rounded-xl bg-[#F7FBFE] p-3">
            <p className="text-xs text-muted-foreground">Run cost</p>
            <p className="text-lg font-medium">{b.runCost.monthlyUSD != null ? `$${usd(b.runCost.monthlyUSD)} / month` : b.runCost.model}</p>
            <p className="text-xs text-muted-foreground">{b.runCost.monthlyUSD != null ? b.runCost.model : /included|existing|covered/i.test(b.runCost.model + b.runCost.basis) ? "No extra run cost" : "Monthly total depends on volumes still to confirm"}</p>
          </div>
          <div className="rounded-xl bg-[#F7FBFE] p-3">
            <p className="text-xs text-muted-foreground">What we do not build</p>
            <p className="text-sm">{b.notThis}</p>
          </div>
        </div>
      </div>
      {s.routeCheck?.verdict === "Challenge" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Specialist challenge:</span> {s.routeCheck.why}
          {s.routeCheck.suggested && <> Suggested route: <span className="font-medium">{routeOf(s.routeCheck.suggested).short}</span>.</>}
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-tabs: every kit is a set of short panels, never a long scroll ---------- */
export interface KitPanel {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  node: React.ReactNode;
}
export function SubTabs({ panels, initial }: { panels: KitPanel[]; initial?: string }) {
  const list = panels.filter(Boolean);
  const [cur, setCur] = useState(initial ?? list[0]?.id);
  const barRef = useRef<HTMLDivElement>(null);
  const pick = (id: string) => {
    setCur(id);
    requestAnimationFrame(() => {
      const el = barRef.current;
      if (el && el.getBoundingClientRect().top > 150) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const p = list.find((x) => x.id === cur) ?? list[0];
  if (!p) return null;
  return (
    <div>
      <div ref={barRef} role="tablist" aria-label="Solution views" className="scroll-mt-[124px] mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-white/80 p-1.5 shadow-sm backdrop-blur">
        {list.map((x) => {
          const on = x.id === p.id;
          const Icon = x.icon;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-label={x.label}
              aria-selected={on}
              onClick={() => pick(x.id)}
              className={cn("group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all", on ? "font-medium text-white shadow-md" : "text-foreground/70 hover:bg-[color-mix(in_srgb,var(--sol)_8%,white)] hover:text-foreground")}
              style={on ? { background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" } : undefined}
            >
              <Icon className={cn("size-4", !on && "opacity-70")} style={on ? undefined : { color: "var(--sol)" }} aria-hidden />
              {x.label}
              {x.badge != null && x.badge !== "" && (
                <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", on ? "bg-white/25" : "bg-muted text-muted-foreground")}>{x.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      <div key={p.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300" data-pdf-panel>
        {p.node}
      </div>
    </div>
  );
}

/* ---------- Automations, drawn like flows ---------- */
type Flow = { name: string; trigger: string; does: string; kind?: string };
function flowType(t: string): { label: string; icon: LucideIcon; tone: string } {
  if (/recurr|schedul|every|daily|weekly|monthly|shift end|cron/i.test(t)) return { label: "Scheduled", icon: Timer, tone: "#7A5AF8" };
  if (/manual|button|on demand|instant|one-off/i.test(t)) return { label: "Instant", icon: MousePointerClick, tone: "#0E7490" };
  return { label: "Automated", icon: Zap, tone: "#B45309" };
}
export function FlowCards({ flows, empty }: { flows: Flow[]; empty?: string }) {
  if (!flows.length) return <p className="text-sm text-muted-foreground">{empty ?? "No automation flow in this design."}</p>;
  return (
    <div className={cn("grid gap-4", flows.length > 1 && "md:grid-cols-2", flows.length > 2 && "xl:grid-cols-3")}>
      {flows.map((f, i) => {
        const t = flowType(`${f.kind ?? ""} ${f.trigger}`);
        const TI = t.icon;
        return (
          <div key={i} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: "color-mix(in srgb, var(--sol) 7%, white)" }}>
              <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-white" style={{ background: t.tone }}>
                <TI className="size-3" aria-hidden /> {f.kind || t.label}
              </span>
            </div>
            <div className="space-y-0 p-4">
              <div className="flex gap-3 rounded-xl border border-border bg-[#F7FBFE] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: t.tone }}>
                  <TI className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="text-[10.5px] font-medium tracking-wider text-muted-foreground">WHEN</p>
                  <p className="leading-snug">{f.trigger}</p>
                </div>
              </div>
              <div className="ml-7 h-5 w-px border-l-2 border-dashed" style={{ borderColor: "var(--sol)" }} />
              <div className="flex gap-3 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--sol) 35%, white)" }}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: "var(--sol)" }}>
                  <Workflow className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="text-[10.5px] font-medium tracking-wider text-muted-foreground">THEN</p>
                  <p className="leading-snug">{f.does}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Pick-one list on the left, detail on the right ---------- */
function Picker<T>({ items, label, render, title }: { items: T[]; label: (x: T, i: number) => string; title?: string; render: (x: T, i: number) => React.ReactNode }) {
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const cur = Math.min(i, items.length - 1);
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-1.5">
        {title && <p className="px-1 text-xs text-muted-foreground">{title}</p>}
        {items.map((x, j) => (
          <button
            key={j}
            type="button"
            onClick={() => setI(j)}
            className={cn("flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all", j === cur ? "border-transparent bg-white font-medium shadow-md" : "border-border/60 bg-white/50 hover:bg-white")}
            style={j === cur ? { boxShadow: "0 0 0 2px var(--sol)" } : undefined}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] text-white" style={{ background: j === cur ? "var(--sol)" : "#A9B9CB" }}>
              {j + 1}
            </span>
            <span className="line-clamp-2">{label(x, j)}</span>
          </button>
        ))}
      </div>
      <div key={cur} className="min-w-0 animate-in fade-in duration-300">
        {render(items[cur], cur)}
      </div>
    </div>
  );
}

/* ---------- Overview panel ---------- */
function Overview({ b, s, extra }: { b: Blueprint; s: Solution; extra?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <BlueprintAnswer b={b} s={s} />
      {extra}
    </div>
  );
}

/* ---------- Microsoft 365 Copilot ---------- */
function m365Panels(k: Loose): KitPanel[] {
  const prompts = arr(k.prompts);
  return [
    {
      id: "prompts",
      label: "Prompts",
      icon: MessageSquare,
      badge: prompts.length,
      node: (
        <Picker
          items={prompts}
          title="Pick a prompt"
          label={(p) => txt(p.title)}
          render={(p, i) => (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Artefact icon={MessageSquare} kicker={`Prompt ${i + 1} · ${txt(p.app)}`} title={txt(p.title)} text={txt(p.prompt)} />
              <div className={cn(card, "space-y-3 text-sm")}>
                <div><p className="text-xs text-muted-foreground">When to use it</p><p>{txt(p.when)}</p></div>
                {arr(p.attach).length > 0 && (
                  <div><p className="text-xs text-muted-foreground">Reference these files</p><ul className="list-disc pl-5">{arr(p.attach).map((a, j) => <li key={j}>{txt(a)}</li>)}</ul></div>
                )}
                <div><p className="text-xs text-muted-foreground">What you get</p><p>{txt(p.output)}</p></div>
                <div><p className="text-xs text-muted-foreground">What you check</p><p>{txt(p.check)}</p></div>
              </div>
            </div>
          )}
        />
      ),
    },
    {
      id: "share",
      label: "Share and tips",
      icon: Layers,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}>
            <H icon={Layers}>Share it with the team</H>
            <p className="text-sm">{txt(k.shareAs)}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {arr(k.tips).map((t, i) => (
                <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />{txt(t)}</li>
              ))}
            </ul>
          </div>
          {k.sampleOutput && <Artefact icon={FileText} kicker="Illustrative output" title="What Copilot returns" text={txt(k.sampleOutput)} />}
        </div>
      ),
    },
  ];
}

/* ---------- Copilot Cowork ---------- */
function coworkPanels(k: Loose): KitPanel[] {
  const d = k.deliverable ?? {};
  return [
    { id: "brief", label: "Task brief", icon: Bot, node: <Artefact icon={Bot} kicker={`Copilot Cowork · ${txt(k.cadence)}`} title={k.skill?.name ? `Task brief · ${txt(k.skill.name)}` : "Task brief"} text={txt(k.brief)} /> },
    {
      id: "steps",
      label: "How it runs",
      icon: Workflow,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}><H icon={Workflow}>What Cowork does</H><Steps items={arr(k.steps).map(txt)} /></div>
          <div className={card}>
            <H icon={ListChecks}>Where a person checks</H>
            <Steps items={arr(k.review).map(txt)} />
            {k.skill?.purpose && <p className="mt-4 text-sm text-muted-foreground">Saved as a reusable skill: {txt(k.skill.purpose)}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "io",
      label: "Inputs and deliverable",
      icon: FileText,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}><H icon={Database}>Inputs it reads</H><Rows items={arr(k.inputs)} cols={[{ key: "name", label: "Input", strong: true }, { key: "where", label: "Where" }]} /></div>
          <div className={card}>
            <H icon={FileText}>The deliverable</H>
            <p className="text-sm font-medium">{txt(d.name)} <span className="text-muted-foreground">· {txt(d.format)}</span></p>
            <ul className="mt-2 list-disc pl-5 text-sm">{arr(d.sections).map((x, i) => <li key={i}>{txt(x)}</li>)}</ul>
          </div>
        </div>
      ),
    },
  ];
}

/* ---------- Copilot Studio ---------- */
function Chat({ sample }: { sample: Loose[] }) {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5" style={{ background: "color-mix(in srgb, var(--sol) 8%, white)" }}>
        <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: "var(--sol)" }}><Bot className="size-4" aria-hidden /></span>
        <p className="text-sm font-medium">Conversation preview</p>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> illustrative</span>
      </div>
      <div className="max-h-[440px] space-y-3 overflow-auto bg-[#F7FBFE] p-4">
        {sample.map((m, i) => {
          const agent = /agent|system|bot/i.test(txt(m.who));
          return (
            <div key={i} className={cn("flex gap-2", agent ? "justify-start" : "justify-end")}>
              {agent && <span className="mt-4 grid size-7 shrink-0 place-items-center rounded-full text-white" style={{ background: "var(--sol)" }}><Bot className="size-3.5" aria-hidden /></span>}
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", agent ? "rounded-tl-sm bg-white" : "rounded-tr-sm text-white")} style={agent ? undefined : { background: "var(--sol)" }}>
                <p className={cn("mb-0.5 text-[10px] font-medium", agent ? "text-muted-foreground" : "text-white/75")}>{txt(m.who)}</p>
                <p className="whitespace-pre-wrap leading-relaxed">{txt(m.text)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function studioPanels(k: Loose): KitPanel[] {
  const triggers: Flow[] = arr(k.triggers).map((t) => ({ name: txt(t.name), trigger: txt(t.event), does: txt(t.does), kind: "Trigger" }));
  const flowTools: Flow[] = arr(k.tools)
    .filter((t) => /flow|automate|connector|action/i.test(txt(t.kind)))
    .map((t) => ({ name: txt(t.name), trigger: "Called by the agent when it decides it needs this step", does: txt(t.does), kind: txt(t.kind) || "Agent flow" }));
  const autos = [...triggers, ...flowTools];
  const cr = k.credits;
  const perMonth = cr && Number(cr.perRun) && Number(cr.runsPerMonth) ? Number(cr.perRun) * Number(cr.runsPerMonth) : null;
  return [
    { id: "conv", label: "Conversation", icon: MessageSquare, node: <Chat sample={arr(k.sample)} /> },
    { id: "instr", label: "Instructions", icon: FileText, node: <Artefact icon={Bot} kicker={`${txt(k.pattern)} · ${arr(k.channels).join(", ")}`} title={`${txt(k.agentName)} · instructions`} text={txt(k.instructions)} /> },
    { id: "auto", label: "Automations", icon: Zap, badge: autos.length, node: <FlowCards flows={autos} /> },
    {
      id: "tools",
      label: "Tools and knowledge",
      icon: Plug,
      node: (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}><H icon={Plug}>Tools and actions</H><Rows items={arr(k.tools)} cols={[{ key: "name", label: "Tool", strong: true }, { key: "kind", label: "Kind" }, { key: "does", label: "Does" }]} /></div>
          <div className="space-y-4">
            <div className={card}><H icon={Database}>Knowledge</H><Rows items={arr(k.knowledge)} cols={[{ key: "source", label: "Source", strong: true }, { key: "type", label: "Type" }, { key: "note", label: "Note" }]} /></div>
            {arr(k.topics).length > 0 && <div className={card}><H icon={Workflow}>Topics</H><Rows items={arr(k.topics)} cols={[{ key: "name", label: "Topic", strong: true }, { key: "when", label: "When" }, { key: "does", label: "Does" }]} /></div>}
          </div>
        </div>
      ),
    },
    {
      id: "control",
      label: "Control and credits",
      icon: Gauge,
      node: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className={cn(card, "md:col-span-2")}><H icon={ShieldCheck}>Human in the loop</H><p className="text-[15px] leading-relaxed">{txt(k.humanInLoop)}</p></div>
          {cr && (
            <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" }}>
              <p className="text-xs text-white/75">Copilot Credits</p>
              <p className={cn(serif, "mt-1 text-4xl tabular-nums")}>{txt(cr.perRun)}</p>
              <p className="text-sm text-white/85">per run</p>
              {perMonth != null && <p className="mt-3 text-sm">× {Number(cr.runsPerMonth).toLocaleString("en-US")} runs = <span className="font-semibold">{perMonth.toLocaleString("en-US")} credits a month</span></p>}
              <p className="mt-3 text-xs text-white/75">{txt(cr.basis)}</p>
            </div>
          )}
        </div>
      ),
    },
  ];
}

/* ---------- Fabric ---------- */
function fabricPanels(k: Loose): KitPanel[] {
  const sm = k.semanticModel ?? {};
  const da = k.dataAgent ?? {};
  const alerts: Flow[] = arr(k.alerts).map((a) => ({ name: txt(a.name), trigger: txt(a.condition), does: txt(a.action), kind: "Activator" }));
  return [
    {
      id: "flow",
      label: "Data flow",
      icon: Layers,
      node: (
        <div className={card}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)]">
            <div className="space-y-2">
              {arr(k.sources).map((x, i) => (
                <div key={i} className="rounded-xl border border-border bg-[#F7FBFE] px-3 py-2 text-sm">
                  <p className="font-medium">{txt(x.system)} <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-muted-foreground">{txt(x.ingest)}</span></p>
                  <p className="text-xs text-muted-foreground">{txt(x.data)}</p>
                </div>
              ))}
            </div>
            <ArrowRight className="hidden size-5 self-center text-muted-foreground lg:block" aria-hidden />
            <div className="space-y-2">
              {arr(k.medallion).map((x, i) => (
                <div key={i} className="rounded-xl border-2 px-3 py-2 text-sm" style={{ borderColor: ["#C8962E", "#9AA6B2", "#E3B341"][i] ?? "#ddd" }}>
                  <p className="font-medium">{txt(x.layer)}</p>
                  <p className="text-xs text-muted-foreground">{txt(x.content)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "agent",
      label: "Data agent",
      icon: Bot,
      node: (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Artefact icon={Bot} kicker="Fabric data agent · instructions" title={txt(da.name)} text={txt(da.instructions)} />
          <div className={card}>
            <H icon={MessageSquare}>Questions people ask</H>
            <ul className="space-y-2 text-sm">{arr(da.questions).map((q, i) => <li key={i} className="rounded-xl bg-[#E8F2FB] px-3 py-2">“{txt(q)}”</li>)}</ul>
          </div>
        </div>
      ),
    },
    {
      id: "model",
      label: "Semantic model",
      icon: Table2,
      node: (
        <div className={card}>
          <H icon={Table2}>{txt(sm.name)}</H>
          <p className="mb-3 text-xs text-muted-foreground">Tables: {arr(sm.tables).join(" · ")}</p>
          <Rows items={arr(sm.measures)} cols={[{ key: "name", label: "Measure", strong: true }, { key: "definition", label: "Definition" }]} />
        </div>
      ),
    },
    { id: "auto", label: "Alerts and automations", icon: Bell, badge: alerts.length, node: <FlowCards flows={alerts} /> },
    {
      id: "report",
      label: "Report and capacity",
      icon: Gauge,
      node: (
        <div className={card}>
          <Rows items={arr(k.report?.pages)} cols={[{ key: "name", label: "Page", strong: true }, { key: "shows", label: "Shows" }]} />
          {k.capacity && <p className="mt-3 text-sm"><span className="font-medium">Capacity: {txt(k.capacity.sku)}</span> <span className="text-muted-foreground">· {txt(k.capacity.basis)}</span></p>}
        </div>
      ),
    },
  ];
}

/* ---------- Foundry ---------- */
function Pipeline({ items }: { items: Loose[] }) {
  const [i, setI] = useState(0);
  const cur = items[Math.min(i, items.length - 1)];
  return (
    <div className="space-y-4">
      <div className="relative flex items-stretch gap-0 overflow-x-auto pb-1">
        {items.map((p, j) => (
          <button key={j} type="button" onClick={() => setI(j)} className="group relative flex min-w-[150px] flex-1 flex-col items-center px-1 text-center">
            <span className="absolute top-5 left-1/2 h-0.5 w-full" style={{ background: j < items.length - 1 ? (j < i ? "var(--sol)" : "#D9D2C5") : "transparent" }} />
            <span
              className={cn("relative z-10 grid size-10 place-items-center rounded-full border-2 text-sm font-medium transition-all", j === i ? "scale-110 text-white shadow-lg" : j < i ? "text-white" : "bg-white text-foreground/70")}
              style={{ borderColor: "var(--sol)", background: j <= i ? "var(--sol)" : undefined }}
            >
              {j + 1}
            </span>
            <span className={cn("mt-2 text-sm leading-tight", j === i ? "font-medium" : "text-muted-foreground")}>{txt(p.stage)}</span>
            <span className="text-[11px]" style={{ color: "var(--sol)" }}>{txt(p.product)}</span>
          </button>
        ))}
      </div>
      {cur && (
        <div key={i} className="animate-in fade-in rounded-2xl border-l-4 bg-white p-5 shadow-sm duration-300" style={{ borderColor: "var(--sol)" }}>
          <p className="text-xs text-muted-foreground">Stage {Math.min(i, items.length - 1) + 1} of {items.length} · {txt(cur.product)}</p>
          <p className={cn(serif, "mt-1 text-xl")}>{txt(cur.stage)}</p>
          <p className="mt-2 text-[15px] leading-relaxed">{txt(cur.what)}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40">Previous stage</button>
            <button type="button" disabled={i >= items.length - 1} onClick={() => setI(i + 1)} className="rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-40" style={{ background: "var(--sol)" }}>Next stage</button>
          </div>
        </div>
      )}
    </div>
  );
}
function foundryPanels(k: Loose): KitPanel[] {
  const ap = k.approach ?? {};
  const ev = k.evaluation ?? {};
  const dep = k.deployment ?? {};
  const tone: Record<string, string> = { Chosen: "border-emerald-300 bg-emerald-50", Fallback: "border-amber-300 bg-amber-50", Rejected: "border-border bg-muted/40 opacity-75" };
  return [
    {
      id: "approach",
      label: "Approach",
      icon: Ruler,
      node: (
        <div className="space-y-4">
          <div className={card}><p className="text-xs text-muted-foreground">Problem type</p><p className={cn(serif, "mt-1 text-lg")}>{txt(k.problemType)}</p><p className="mt-2 text-sm">{txt(ap.summary)}</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {arr(ap.candidates).map((c, i) => (
              <div key={i} className={cn("rounded-2xl border p-4 text-sm", tone[txt(c.verdict)] ?? "border-border")}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{txt(c.verdict)}</p>
                <p className="font-medium">{txt(c.option)}</p>
                <p className="mt-1 text-xs text-foreground/80">{txt(c.why)}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    { id: "pipeline", label: "Pipeline", icon: Workflow, badge: arr(k.pipeline).length, node: <Pipeline items={arr(k.pipeline)} /> },
    {
      id: "data",
      label: "Data and evaluation",
      icon: Database,
      node: (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className={card}><H icon={Database}>Data</H><Rows items={arr(k.data)} cols={[{ key: "source", label: "Source", strong: true }, { key: "content", label: "Content" }, { key: "volume", label: "Volume" }, { key: "labels", label: "Labels" }]} /></div>
          <div className={card}>
            <H icon={Gauge}>Evaluation</H>
            <Rows items={arr(ev.metrics)} cols={[{ key: "name", label: "Metric", strong: true }, { key: "target", label: "Target" }]} />
            <p className="mt-3 text-sm"><span className="text-muted-foreground">Test set:</span> {txt(ev.dataset)}</p>
            <p className="mt-1 text-sm"><span className="text-muted-foreground">Go-live rule:</span> {txt(ev.acceptance)}</p>
          </div>
        </div>
      ),
    },
    {
      id: "deploy",
      label: "Deployment and guardrails",
      icon: ShieldCheck,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}>
            <H icon={Plug}>Deployment</H>
            <p className="text-sm">{txt(dep.pattern)}</p>
            <p className="mt-2 text-sm"><span className="text-muted-foreground">Used by:</span> {txt(dep.consumers)}</p>
            <p className="mt-1 text-sm"><span className="text-muted-foreground">Monitoring:</span> {txt(dep.monitoring)}</p>
          </div>
          <div className={card}>
            <H icon={ListChecks}>Guardrails and compute</H>
            <ul className="list-disc space-y-1 pl-5 text-sm">{arr(k.guardrails).map((g, i) => <li key={i}>{txt(g)}</li>)}</ul>
            {k.compute && <p className="mt-3 text-sm"><span className="font-medium">{txt(k.compute.estimate)}</span> <span className="text-muted-foreground">· {txt(k.compute.basis)}</span></p>}
          </div>
        </div>
      ),
    },
  ];
}

/* ---------- Code App ---------- */
function Phone({ sc, appName }: { sc: Loose; appName: string }) {
  const els = arr(sc.elements).map(txt);
  return (
    <div className="mx-auto w-[290px] shrink-0 rounded-[2.6rem] bg-[#141A23] p-2.5 shadow-2xl ring-1 ring-black/20">
      <div className="overflow-hidden rounded-[2.1rem] bg-[#F7FBFE]">
        <div className="flex items-center justify-between px-6 pt-2.5 pb-1 text-[10px] font-medium text-foreground/70">
          <span>22:20</span>
          <span className="h-4 w-16 rounded-full bg-[#141A23]" />
          <span className="flex items-center gap-1"><Wifi className="size-3" aria-hidden /><BatteryMedium className="size-3.5" aria-hidden /></span>
        </div>
        <div className="px-4 pt-2 pb-3 text-white" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" }}>
          <p className="text-[10px] text-white/75">{appName}</p>
          <p className="text-[15px] font-medium leading-tight">{txt(sc.name)}</p>
        </div>
        <div className="h-[380px] space-y-2 overflow-hidden p-3">
          {els.map((e, j) => {
            const btn = /\bbutton\b/i.test(e) && e.length < 60;
            return btn ? (
              <div key={j} className="rounded-xl py-2 text-center text-[12px] font-medium text-white shadow-sm" style={{ background: "var(--sol)" }}>{e}</div>
            ) : (
              <div key={j} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] shadow-sm ring-1 ring-black/5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: j % 3 === 0 ? "var(--sol)" : j % 3 === 1 ? "#E3B341" : "#9AA6B2" }} />
                <span className="line-clamp-2">{e}</span>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-foreground/25" />
      </div>
    </div>
  );
}
function codeAppPanels(k: Loose): KitPanel[] {
  const flows: Flow[] = arr(k.flows).map((f) => ({ name: txt(f.name), trigger: txt(f.trigger), does: txt(f.does) }));
  const screens = arr(k.screens);
  return [
    {
      id: "screens",
      label: "Screens",
      icon: Smartphone,
      badge: screens.length,
      node: (
        <Picker
          items={screens}
          title={`For ${txt(k.users)}`}
          label={(sc) => txt(sc.name)}
          render={(sc) => (
            <div className="flex flex-col items-center gap-6 rounded-3xl p-5 md:flex-row md:items-start" style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--sol) 14%, white), #FAFDFF 70%)" }}>
              <Phone sc={sc} appName={txt(k.appName)} />
              <div className="min-w-0 flex-1 space-y-3 pt-2">
                <p className="text-xs tracking-[0.14em] text-muted-foreground">{txt(k.appType).toUpperCase()}</p>
                <p className={cn(serif, "text-2xl")}>{txt(sc.name)}</p>
                <p className="text-[15px] leading-relaxed text-foreground/85">{txt(sc.purpose)}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {arr(sc.elements).map((e, j) => (
                    <span key={j} className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs">{txt(e)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        />
      ),
    },
    {
      id: "data",
      label: "Data model",
      icon: Table2,
      badge: arr(k.tables).length,
      node: (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {arr(k.tables).map((t, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <p className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white" style={{ background: i % 2 ? "var(--sol2, var(--sol))" : "var(--sol)" }}>
                <Table2 className="size-3.5" aria-hidden /> {txt(t.name)}
              </p>
              <ul className="max-h-[260px] space-y-0.5 overflow-auto px-3 py-2 font-mono text-[11.5px]">
                {arr(t.columns).map((c, j) => (
                  <li key={j} className="flex items-center gap-1.5">
                    {j === 0 ? <KeyRound className="size-3 text-amber-600" aria-hidden /> : <span className="size-3" />}
                    {txt(c)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ),
    },
    { id: "auto", label: "Automations", icon: Zap, badge: flows.length, node: <FlowCards flows={flows} /> },
    {
      id: "roles",
      label: "Roles and integrations",
      icon: Users,
      node: (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}><H icon={Users}>Who can do what</H><Rows items={arr(k.roles)} cols={[{ key: "role", label: "Role", strong: true }, { key: "can", label: "Can" }]} /></div>
          <div className={card}><H icon={Plug}>Integrations</H><Rows items={arr(k.integrations)} cols={[{ key: "system", label: "System", strong: true }, { key: "how", label: "How" }]} /></div>
        </div>
      ),
    },
    {
      id: "ops",
      label: "Offline and ALM",
      icon: WifiOff,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}><H icon={WifiOff}>Works without signal</H><p className="text-[15px] leading-relaxed">{txt(k.offline)}</p></div>
          <div className={card}><H icon={Layers}>Application lifecycle</H><p className="text-[15px] leading-relaxed">{txt(k.alm)}</p></div>
        </div>
      ),
    },
  ];
}

/* ---------- No AI, with the platform challenge ---------- */
export function LicenceCalc({ p }: { p: Loose }) {
  const lic = p.licence ?? {};
  const nm = txt(p.name) || "their platform";
  const acc = txt(p.account) || "The customer";
  const [celonis, setCelonis] = useState<string>("");
  const [users, setUsers] = useState<number>(Number(lic.defaultUsers) || 10);
  const [have, setHave] = useState(false);
  const addOn = Number(lic.addOnMonthly) * 12;
  const seats = have ? 0 : users * Number(lic.premiumUserMonthly) * 12;
  const ms = addOn + seats;
  const cel = Number(celonis.replace(/[^0-9.]/g, "")) || 0;
  const save = cel - ms;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={cn(card, "space-y-4")}>
        <H icon={Calculator}>Licence calculator</H>
        <label className="block text-sm">
          <span className="text-muted-foreground">{acc}'s {nm} contract, $ per year</span>
          <input value={celonis} onChange={(e) => setCelonis(e.target.value)} inputMode="numeric" placeholder="Enter the contract value" className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm tabular-nums" />
        </label>
        <div className="text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Analysts who need Power Automate Premium</span><span className="font-medium tabular-nums">{users}</span></p>
          <input type="range" min={1} max={100} value={users} onChange={(e) => setUsers(Number(e.target.value))} className="mt-2 w-full accent-[var(--sol)]" aria-label="Premium users" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={have} onChange={(e) => setHave(e.target.checked)} className="size-4 accent-[var(--sol)]" />
          These users already have Power Automate Premium
        </label>
        <p className="text-xs text-muted-foreground">{txt(lic.basis)}</p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
            <p className="text-xs text-muted-foreground">Microsoft, list, per year</p>
            <p className={cn(serif, "text-3xl tabular-nums")}>${usd(ms)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Add-on ${usd(addOn)}{seats ? ` + seats $${usd(seats)}` : ""}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
            <p className="text-xs text-muted-foreground">{nm}, per year</p>
            <p className={cn(serif, "text-3xl tabular-nums")}>{cel ? `$${usd(cel)}` : "?"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{cel ? "As entered" : `Not shared by ${acc} yet`}</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 text-white" style={{ background: cel ? (save >= 0 ? "linear-gradient(135deg,#047857,#0F766E)" : "linear-gradient(135deg,#B45309,#9A3412)") : "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" }}>
          <p className="text-xs text-white/80">Licence gain if {acc} exits {nm}</p>
          <p className={cn(serif, "mt-1 text-4xl tabular-nums")}>{cel ? `${save >= 0 ? "" : "−"}$${usd(Math.abs(save))} / year` : `Break-even at $${usd(ms)}`}</p>
          <p className="mt-2 text-sm text-white/85">{cel ? "Before the one-off migration effort and any parallel-run months." : `Any ${nm} contract above this list cost becomes a yearly saving, before the one-off migration effort.`}</p>
        </div>
        <p className="text-xs text-muted-foreground">{txt(p.licenceNote)}</p>
      </div>
    </div>
  );
}
const FIT_TONE: Record<string, string> = { Native: "bg-emerald-50 text-emerald-800 border-emerald-200", Partial: "bg-amber-50 text-amber-800 border-amber-200", Plan: "bg-sky-50 text-sky-800 border-sky-200", Gap: "bg-rose-50 text-rose-800 border-rose-200" };
export function PlatformChallenge({ p }: { p: Loose }) {
  const nm = txt(p.name) || "their platform";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">{p.todayLabel ? txt(p.todayLabel) : "Today"}</p>
          <p className="font-medium">{txt(p.today)}</p>
        </div>
        <ArrowRight className="hidden size-5 self-center md:block" style={{ color: "var(--sol)" }} aria-hidden />
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" }}>
          <p className="text-xs text-white/75">What if on Microsoft</p>
          <p className="font-medium">{txt(p.microsoft)}</p>
        </div>
      </div>
      <div className="rounded-2xl border-l-4 bg-white p-4 shadow-sm" style={{ borderColor: "var(--sol)" }}>
        <p className="text-xs text-muted-foreground">Verdict</p>
        <p className={cn(serif, "text-lg")}>{txt(p.verdict)}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F7FBFE] text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 font-medium">What it needs</th><th className="px-3 py-2 font-medium">{nm}</th><th className="px-3 py-2 font-medium">Microsoft</th><th className="px-3 py-2 font-medium">Fit</th></tr>
            </thead>
            <tbody>
              {arr(p.fit).map((r, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">{txt(r.need)}</td>
                  <td className="px-3 py-2">{txt(r.theirs ?? r.celonis)}</td>
                  <td className="px-3 py-2">{txt(r.microsoft)}</td>
                  <td className="px-3 py-2"><span className={cn("rounded-full border px-2 py-0.5 text-[11px]", FIT_TONE[txt(r.fit)] ?? "")}>{txt(r.fit)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={card}>
          <H icon={Sparkles}>What AI it opens up</H>
          <ul className="space-y-2 text-sm">
            {arr(p.aiUnlock).map((a, i) => (
              <li key={i} className="flex gap-2"><Sparkles className="mt-0.5 size-3.5 shrink-0" style={{ color: "var(--sol)" }} aria-hidden /><span><span className="font-medium">{txt(a.what)}</span> <span className="text-muted-foreground">· {txt(a.status)}</span></span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
function noAiPanels(k: Loose): KitPanel[] {
  const a = k.automation ?? {};
  const steps = arr(a.steps).map(txt);
  const flows: Flow[] = arr(k.flows).length
    ? arr(k.flows).map((f) => ({ name: txt(f.name), trigger: txt(f.trigger), does: txt(f.does) }))
    : steps.length
      ? [{ name: "Main automation", trigger: txt(a.trigger), does: steps.join(" → ") }]
      : [];
  const out: KitPanel[] = [
    {
      id: "rules",
      label: "The rules",
      icon: ListChecks,
      badge: arr(k.rules).length,
      node: (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: "color-mix(in srgb, var(--sol) 7%, #FAFDFF)" }}>
            <p className="text-xs text-muted-foreground">Why no AI</p>
            <p className={cn(serif, "mt-1 text-lg")}>{txt(k.whyNoAI)}</p>
            <p className="mt-2 text-sm">Tool: <span className="font-medium">{txt(k.tool)}</span></p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {arr(k.rules).map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white p-4 text-sm shadow-sm">
                <p className="font-mono text-[11px] tracking-wider" style={{ color: "var(--sol)" }}>RULE {String(i + 1).padStart(2, "0")}</p>
                <p className="mt-1 font-medium">{txt(r.rule)}</p>
                <p className="mt-2 text-xs"><span className="rounded bg-[#E8F2FB] px-1.5 py-0.5 font-mono">IF</span> {txt(r.threshold)}</p>
                <p className="mt-1 text-xs"><span className="rounded px-1.5 py-0.5 font-mono text-white" style={{ background: "var(--sol)" }}>THEN</span> {txt(r.action)}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "auto",
      label: "Automations",
      icon: Zap,
      badge: flows.length,
      node: steps.length && !arr(k.flows).length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <FlowCards flows={[{ name: "Main automation", trigger: txt(a.trigger), does: `${steps.length} steps, from data load to follow-up` }]} />
          <div className={card}><H icon={Workflow}>Step by step</H><Steps items={steps} /></div>
        </div>
      ) : (
        <FlowCards flows={flows} />
      ),
    },
    {
      id: "out",
      label: "Output and later AI",
      icon: FileText,
      node: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}><H icon={FileText}>What people get</H><p className="text-[15px]"><span className="font-medium">{txt(k.output?.what)}</span> <span className="text-muted-foreground">for {txt(k.output?.who)}</span></p></div>
          <div className={card}><H icon={Sparkles}>When AI could add value later</H><p className="text-[15px]">{txt(k.aiLater)}</p></div>
        </div>
      ),
    },
  ];
  if (k.platform) {
    out.push({ id: "platform", label: "What if Microsoft?", icon: Scale, node: <PlatformChallenge p={k.platform} /> });
    out.push({ id: "licence", label: "Licence impact", icon: Coins, node: <LicenceCalc p={k.platform} /> });
  }
  return out;
}

const PANELS: Record<string, (k: Loose) => KitPanel[]> = {
  m365: m365Panels,
  cowork: coworkPanels,
  studio: studioPanels,
  fabric: fabricPanels,
  foundry: foundryPanels,
  codeapp: codeAppPanels,
  noai: noAiPanels,
};

export function BlueprintKit({ b, s }: { b: Blueprint; s: Solution }) {
  const k = b.kit ?? {};
  const kind = PANELS[b.kind];
  const panels: KitPanel[] = [{ id: "answer", label: "The answer", icon: Sparkles, node: <Overview b={b} s={s} /> }, ...(kind ? kind(k) : [])];
  if (!kind) panels.push({ id: "none", label: "Open questions", icon: ListChecks, node: <p className="text-sm text-muted-foreground">The route is not decided yet; see the open questions.</p> });
  return <SubTabs panels={panels} />;
}

/* ---------- A hero visual drawn from the use case's own design ---------- */
export function KindHero({ b, s }: { b: Blueprint; s: Solution }) {
  const k = (b.kit ?? {}) as Loose;
  const glass = "rounded-2xl bg-white/90 text-[#14202B] shadow-xl ring-1 ring-black/5 backdrop-blur";
  if (b.kind === "codeapp") {
    const sc = arr(k.screens)[0];
    return sc ? <div className="origin-center scale-[0.5]"><Phone sc={sc} appName={txt(k.appName)} /></div> : null;
  }
  if (b.kind === "studio") {
    const m = arr(k.sample).slice(0, 3);
    return (
      <div className="w-[340px] space-y-2">
        {m.map((x, i) => {
          const agent = /agent|system|bot/i.test(txt(x.who));
          return (
            <div key={i} className={cn("max-w-[88%] rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-lg", agent ? "bg-white text-[#14202B]" : "ml-auto text-white")} style={agent ? undefined : { background: "var(--sol)" }}>
              <span className="line-clamp-3">{txt(x.text)}</span>
            </div>
          );
        })}
      </div>
    );
  }
  if (b.kind === "foundry") {
    const pts = [42, 44, 41, 45, 43, 46, 44, 47, 52, 58, 66, 79];
    const path = pts.map((v, i) => `${i ? "L" : "M"} ${i * 26} ${100 - v}`).join(" ");
    return (
      <div className={cn(glass, "w-[340px] p-4")}>
        <p className="text-[11px] text-muted-foreground">Signal · {txt(arr(k.data)[0]?.source) || "sensor"}</p>
        <svg viewBox="0 0 290 80" className="mt-1 h-24 w-full">
          <path d={path} fill="none" stroke="var(--sol)" strokeWidth="2.5" className="sol-draw" />
          <line x1="0" x2="290" y1="40" y2="40" stroke="#E3B341" strokeDasharray="4 4" />
          <circle cx={11 * 26} cy={100 - 79} r="5" fill="#DC2626" className="animate-pulse" />
        </svg>
        <p className="text-[12px] font-medium">Early warning before the failure</p>
      </div>
    );
  }
  if (b.kind === "noai") {
    const r = arr(k.rules).slice(0, 3);
    return (
      <div className="w-[360px] space-y-2">
        {r.map((x, i) => (
          <div key={i} className={cn(glass, "px-3 py-2 text-[12px]")} style={{ marginLeft: i * 18 }}>
            <span className="mr-1 rounded bg-[#E8F2FB] px-1 font-mono text-[10px]">IF</span>
            <span className="line-clamp-1 inline">{txt(x.threshold)}</span>
            <span className="ml-1 rounded px-1 font-mono text-[10px] text-white" style={{ background: "var(--sol)" }}>THEN</span>
            <span className="line-clamp-1"> {txt(x.action)}</span>
          </div>
        ))}
        {k.platform && <div className="ml-12 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[#14202B] shadow"><Scale className="size-3" aria-hidden /> {(txt(k.platform.name) || "Their platform").split(" (")[0]} or Microsoft?</div>}
      </div>
    );
  }
  if (b.kind === "fabric") {
    return (
      <div className="w-[300px] space-y-1.5">
        {arr(k.medallion).map((x, i) => (
          <div key={i} className={cn(glass, "border-l-4 px-3 py-2 text-[12px]")} style={{ borderColor: ["#C8962E", "#9AA6B2", "#E3B341"][i] ?? "#ddd", marginLeft: i * 20 }}>
            <span className="font-medium">{txt(x.layer)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (b.kind === "m365" || b.kind === "cowork") {
    const t = b.kind === "m365" ? txt(arr(k.prompts)[0]?.prompt) : txt(k.brief);
    return (
      <div className={cn(glass, "w-[340px] p-4")}>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MessageSquare className="size-3" aria-hidden /> {b.kind === "m365" ? txt(arr(k.prompts)[0]?.app) || "Copilot" : "Copilot Cowork"}</p>
        <p className="mt-1 line-clamp-5 text-[12.5px] leading-snug">{t}</p>
      </div>
    );
  }
  void s;
  return null;
}

/* ---------- Get it live chapter ---------- */
const PRE_TONE: Record<string, string> = {
  "In place": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "To set up": "bg-amber-50 text-amber-800 border-amber-200",
  "To confirm": "bg-sky-50 text-sky-800 border-sky-200",
};
export function GoLiveSection({ b, s }: { b: Blueprint; s: Solution }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className={card}>
          <H icon={Workflow}>Steps to go live</H>
          <ol className="space-y-3">
            {b.golive.map((g, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium text-white" style={{ background: "var(--sol)" }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p>{g.step}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.who} · {g.time}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Effort basis: {b.effort.basis}</p>
        </div>
        <div className="space-y-4">
          <div className={card}>
            <H icon={ListChecks}>What must be in place</H>
            <ul className="space-y-2">
              {b.prerequisites.map((p, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span>{p.item}</span>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", PRE_TONE[p.status] ?? "")}>{p.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <H icon={Gauge}>Run cost</H>
            <p className="text-sm font-medium">{b.runCost.model}{b.runCost.monthlyUSD != null ? ` · about $${usd(b.runCost.monthlyUSD)} a month` : ""}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.runCost.basis}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-white/60 p-5">
            <p className="text-xs text-muted-foreground">When to step up to {routeOf(b.stepUp.to).short}</p>
            <p className="mt-1 text-sm">{b.stepUp.when}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.stepUp.what}</p>
          </div>
        </div>
      </div>
      {s.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Grounded in:</span>
          {s.sources.map((l, i) => {
            const u = externalUrl(l.url);
            return u ? (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-white px-2.5 py-0.5 hover:underline">
                {l.title}
              </a>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
