import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, Compass, FlaskConical, Gavel, HelpCircle, Layers, Lightbulb, Route, Target, Users, Workflow, type LucideIcon } from "lucide-react";
import { SubTabs } from "@/components/blueprint";
import { iconOf } from "@/components/solution-creative";
import { externalUrl } from "@/lib/safe-url";
import type { Solution } from "@/lib/solutions";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const serif = "font-[family-name:var(--font-serif)]";
const card = "rounded-2xl border border-border bg-white p-5";
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const CONF: Record<string, { bg: string; fg: string }> = {
  Low: { bg: "#FDECEC", fg: "#B42318" },
  Medium: { bg: "#FEF4E2", fg: "#B54708" },
  High: { bg: "#E7F6EF", fg: "#0F7B5F" },
};
const SCOPE: Record<string, { label: string; color: string }> = {
  pilot: { label: "PoC / pilot", color: "#0F7B5F" },
  scale: { label: "Pilot with approvals", color: "#B7791F" },
  later: { label: "Scale", color: "#6B7280" },
};
const VERDICT: Record<string, string> = { Recommended: "#0F7B5F", "Do it now": "#1F6FB2", Hold: "#6B7280" };

export function hasPathway(s: Solution) {
  return Boolean((s as any).pathway);
}

function AssumptionTag({ id, conf, onClick }: { id: string; conf?: string; onClick?: () => void }) {
  const c = CONF[conf ?? "Medium"] ?? CONF.Medium;
  const body = (
    <>
      <FlaskConical className="size-3" aria-hidden /> {id}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold hover:shadow-sm" style={{ background: c.bg, color: c.fg, borderColor: c.fg + "33" }} aria-label={`Open assumption ${id}`}>
      {body}
    </button>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ background: c.bg, color: c.fg, borderColor: c.fg + "33" }}>
      {body}
    </span>
  );
}

function Bet({ p }: { p: any }) {
  const f = p.framing ?? {};
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className={cn(card, "flex flex-col gap-4")}>
        <p className={cn(serif, "text-xl leading-snug")}>&ldquo;{f.ask}&rdquo;</p>
        <p className="text-sm text-muted-foreground">{f.status}</p>
        <div className="mt-auto rounded-xl p-4 text-sm text-white" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" }}>
          <p className="text-[10.5px] font-medium tracking-wider opacity-80">OUR RECOMMENDATION</p>
          <p className="mt-1 leading-snug">{p.recommendation}</p>
        </div>
      </div>
      <div className="grid gap-3">
        <div className={card}>
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-4" aria-hidden /> What we know (evidence)
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {arr(f.known).map((x, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/70 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <HelpCircle className="size-4" aria-hidden /> What we do not know yet (so we assume)
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-950">
            {arr(f.unknown).map((x, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Flow({ p, openA }: { p: any; openA: (id: string) => void }) {
  const stages = arr(p.stages);
  const [sel, setSel] = useState(0);
  const st = stages[sel];
  if (!st) return null;
  const amap = Object.fromEntries(arr(p.assumptions).map((a) => [a.id, a]));
  const Icon = iconOf(st.icon);
  const sc = SCOPE[st.scope] ?? SCOPE.later;
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-[820px] items-stretch gap-1.5">
          {stages.map((x, i) => {
            const on = i === sel;
            const I = iconOf(x.icon);
            return (
              <li key={x.id} className="flex flex-1 items-center gap-1.5">
                <button type="button" onClick={() => setSel(i)} aria-pressed={on} aria-label={`Step ${i + 1}: ${x.name}`} className={cn("flex w-full flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all hover:-translate-y-0.5", on ? "border-transparent text-white shadow-md" : "border-border bg-white")} style={on ? { background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" } : undefined}>
                  <I className="size-4.5" style={on ? undefined : { color: "var(--sol)" }} aria-hidden />
                  <span className="text-[12px] leading-tight font-medium">{x.name}</span>
                  <span className="h-1 w-8 rounded-full" style={{ background: on ? "rgba(255,255,255,.7)" : (SCOPE[x.scope] ?? SCOPE.later).color }} />
                </button>
                {i < stages.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </div>
      <div key={st.id} className="grid animate-in gap-4 fade-in duration-300 lg:grid-cols-[1fr_1.4fr]">
        <div className={cn(card, "flex flex-col gap-3")}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: "var(--sol)" }}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] tracking-wider text-muted-foreground">
                STEP {sel + 1} OF {stages.length} · {st.who}
              </p>
              <p className={cn(serif, "text-2xl leading-tight")}>{st.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white" style={{ background: sc.color }}>
              {sc.label}
            </span>
            {st.assumption && <AssumptionTag id={st.assumption} conf={amap[st.assumption]?.confidence} onClick={() => openA(st.assumption)} />}
          </div>
          <div className="rounded-xl bg-[#FBF4F1] p-3 text-sm">
            <p className="text-[10.5px] font-medium tracking-wider text-rose-800/80">TODAY</p>
            <p className="mt-0.5 leading-snug">{st.today}</p>
          </div>
        </div>
        <div className={cn(card, "grid gap-3 sm:grid-cols-2")}>
          <div className="rounded-xl p-3 text-sm sm:col-span-2" style={{ background: "color-mix(in srgb, var(--sol) 7%, white)" }}>
            <p className="text-[10.5px] font-medium tracking-wider" style={{ color: "var(--sol)" }}>
              WHAT THE AGENT DOES
            </p>
            <p className="mt-0.5 leading-snug">{st.agent}</p>
          </div>
          <Mini icon={Layers} label="Microsoft building blocks" text={st.tech} />
          <Mini icon={Users} label="Human in the loop" text={st.human} />
          <div className="sm:col-span-2">
            <Mini icon={Target} label="Measured by" text={st.kpi} />
          </div>
        </div>
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

function Assumptions({ p, cur, setCur }: { p: any; cur: string; setCur: (id: string) => void }) {
  const all = arr(p.assumptions);
  const [filter, setFilter] = useState<"all" | "critical" | "Low">("all");
  const list = all.filter((a) => (filter === "all" ? true : filter === "critical" ? a.critical : a.confidence === "Low"));
  const a = all.find((x) => x.id === cur) ?? list[0] ?? all[0];
  if (!a) return null;
  const c = CONF[a.confidence] ?? CONF.Medium;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
        <AlertTriangle className="size-4 text-amber-600" aria-hidden />
        <span>
          <b>{all.length} working assumptions</b>, {all.filter((x) => x.critical).length} critical. Nothing here is confirmed by {String(p.party || "the customer")} yet; each one has an owner and a test.
        </span>
        <span className="ml-auto flex gap-1">
          {(
            [
              ["all", "All"],
              ["critical", "Critical"],
              ["Low", "Low confidence"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn("rounded-full px-2.5 py-0.5 text-xs", filter === k ? "bg-amber-600 text-white" : "bg-white text-amber-900 hover:bg-amber-100")}>
              {l}
            </button>
          ))}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {list.map((x) => {
            const on = x.id === a.id;
            const cc = CONF[x.confidence] ?? CONF.Medium;
            return (
              <button key={x.id} type="button" onClick={() => setCur(x.id)} aria-pressed={on} aria-label={`Assumption ${x.id} ${x.area}`} className={cn("flex items-start gap-2 rounded-xl border p-2.5 text-left text-sm transition-all", on ? "border-transparent shadow-md ring-2" : "border-border bg-white hover:shadow-sm")} style={on ? { background: cc.bg, ["--tw-ring-color" as any]: cc.fg } : undefined}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold" style={{ background: cc.bg, color: cc.fg }}>
                  {x.id}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    {x.area}
                    {x.critical && <span className="rounded bg-rose-600 px-1 text-[9.5px] font-semibold tracking-wide text-white">CRITICAL</span>}
                  </span>
                  <span className="text-[11px]" style={{ color: cc.fg }}>
                    {x.confidence} confidence
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div key={a.id} className="animate-in fade-in rounded-2xl border-2 p-5 duration-300" style={{ borderColor: c.fg + "55", background: `linear-gradient(180deg, ${c.bg}, white 55%)` }}>
          <div className="flex flex-wrap items-center gap-2">
            <AssumptionTag id={a.id} conf={a.confidence} />
            <span className="text-xs font-medium tracking-wider text-muted-foreground">{a.area.toUpperCase()} · {a.confidence.toUpperCase()} CONFIDENCE</span>
            {a.critical && <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">CRITICAL TO THE DESIGN</span>}
          </div>
          <p className={cn(serif, "mt-2 text-xl leading-snug")}>We assume: {a.statement}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Mini icon={Lightbulb} label="Why we assume it" text={a.why} />
            <Mini icon={AlertTriangle} label="If it is wrong" text={a.ifWrong} />
            <Mini icon={FlaskConical} label="How we test it" text={a.validate} />
            <Mini icon={Users} label="Owner · by when" text={`${a.owner} · ${a.by}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Options({ p }: { p: any }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {arr(p.options).map((o) => {
        const col = VERDICT[o.verdict] ?? "#6B7280";
        const rec = o.verdict === "Recommended";
        return (
          <div key={o.id} className={cn(card, "relative flex flex-col gap-3", rec && "ring-2")} style={rec ? { ["--tw-ring-color" as any]: "var(--sol)" } : undefined}>
            <span className="absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: col }}>
              {o.verdict}
            </span>
            <div>
              <p className="text-[11px] tracking-wider text-muted-foreground">{o.route}</p>
              <p className={cn(serif, "text-xl leading-tight")}>{o.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.tagline}</p>
            </div>
            <ul className="space-y-1 text-sm">
              {arr(o.does).map((x: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
            <ul className="space-y-1 text-[13px] text-muted-foreground">
              {arr(o.limits).map((x: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-[12px]">
              <div>
                <p className="text-muted-foreground">Effort</p>
                <p className="font-medium">{o.effort}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Run</p>
                <p className="font-medium">{o.run}</p>
              </div>
              <p className="col-span-2 text-muted-foreground">{o.fit}</p>
              {externalUrl(o.ref) && (
                <a href={externalUrl(o.ref)} target="_blank" rel="noreferrer" className="col-span-2 underline" style={{ color: "var(--sol)" }}>
                  Microsoft Learn
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Path({ p, openA }: { p: any; openA: (id: string) => void }) {
  const phases = arr(p.phases);
  const [sel, setSel] = useState(0);
  const ph = phases[sel];
  const amap = Object.fromEntries(arr(p.assumptions).map((a) => [a.id, a]));
  if (!ph) return null;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {phases.map((x, i) => {
          const on = i === sel;
          return (
            <button key={x.name} type="button" onClick={() => setSel(i)} aria-pressed={on} aria-label={x.name} className={cn("relative rounded-2xl border p-3 text-left transition-all", on ? "border-transparent text-white shadow-md" : "border-border bg-white hover:shadow-sm")} style={on ? { background: "linear-gradient(135deg, var(--sol), var(--sol2, var(--sol)))" } : undefined}>
              <p className={cn("text-[11px] tracking-wider", on ? "opacity-80" : "text-muted-foreground")}>{x.weeks}</p>
              <p className="text-sm leading-tight font-medium">{x.name}</p>
            </button>
          );
        })}
      </div>
      <div key={ph.name} className="grid animate-in gap-4 fade-in duration-300 lg:grid-cols-[1.3fr_1fr]">
        <div className={card}>
          <p className={cn(serif, "text-xl")}>{ph.goal}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {arr(ph.do).map((x: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: "var(--sol)" }}>
                  {i + 1}
                </span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-3">
          <div className="rounded-2xl border-2 p-4 text-sm" style={{ borderColor: "var(--sol)" }}>
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-wider" style={{ color: "var(--sol)" }}>
              <Gavel className="size-3.5" aria-hidden /> GATE
            </p>
            <p className="mt-1 leading-snug">{ph.gate}</p>
          </div>
          <div className={card}>
            <p className="text-[10.5px] font-medium tracking-wider text-muted-foreground">ASSUMPTIONS THIS PHASE TESTS</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {arr(ph.tests).map((id: string) => (
                <AssumptionTag key={id} id={id} conf={amap[id]?.confidence} onClick={() => openA(id)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
function Sizing({ p }: { p: any }) {
  const sz = p.sizing ?? {};
  const rows = arr(sz.rows);
  const [sel, setSel] = useState(Math.min(1, rows.length - 1));
  const r = rows[sel];
  const credits = arr(sz.credits);
  const max = Math.max(1, ...credits.map((c) => c.credits));
  if (!r) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
        <FlaskConical className="size-4 text-amber-600" aria-hidden /> Every input on this tab is an assumption (A5, A6, A11). {sz.basis}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className={card}>
          <div className="flex gap-1.5">
            {rows.map((x, i) => (
              <button key={x.case} type="button" onClick={() => setSel(i)} aria-pressed={i === sel} className={cn("rounded-full px-3 py-1 text-sm", i === sel ? "text-white" : "border border-border bg-white")} style={i === sel ? { background: "var(--sol)" } : undefined}>
                {x.case} case
              </button>
            ))}
          </div>
          <div key={r.case} className="mt-4 grid animate-in grid-cols-2 gap-3 fade-in duration-300">
            <Kpi label="Disputes a month" value={r.volume.toLocaleString("en-US")} note={`${r.hours} h each`} />
            <Kpi label="Handling hours a month" value={r.monthlyHours.toLocaleString("en-US")} note="today, assumed" />
            <Kpi label="Hours saved a month" value={r.savedHours.toLocaleString("en-US")} note={`≈ ${r.fte} FTE a year`} accent />
            <Kpi label="Agent run cost" value={`${usd(r.monthlyUSD)}/mo`} note={`${sz.perDispute} credits per dispute`} accent />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Not included: {sz.notIncluded}</p>
        </div>
        <div className={card}>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Coins className="size-4" style={{ color: "var(--sol)" }} aria-hidden /> Credits per dispute ({sz.perDispute})
          </p>
          <ul className="mt-3 space-y-2">
            {credits.map((c) => (
              <li key={c.item} className="text-[12.5px]">
                <div className="flex justify-between">
                  <span>{c.item}</span>
                  <span className="tabular-nums">{c.credits}</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full" style={{ width: `${(c.credits / max) * 100}%`, background: "var(--sol)" }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-3" style={accent ? { background: "color-mix(in srgb, var(--sol) 7%, white)" } : undefined}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn(serif, "text-2xl tabular-nums")} style={accent ? { color: "var(--sol)" } : undefined}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function Decisions({ p }: { p: any }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Gavel className="size-4" style={{ color: "var(--sol)" }} aria-hidden /> Decisions {String(p.party || "the customer")} needs to take
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {arr(p.decisions).map((d, i) => (
            <li key={i} className="rounded-xl border border-border p-2.5">
              <p className="font-medium leading-snug">{d.q}</p>
              <p className="text-[12px] text-muted-foreground">
                {d.who} · {d.when}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid content-start gap-4">
        <div className={card}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden /> Risks and how we handle them
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {arr(p.risks).map((r, i) => (
              <li key={i} className="grid grid-cols-[1fr_1.4fr] gap-3 border-b border-border pb-2 last:border-0">
                <span className="font-medium">{r.risk}</span>
                <span className="text-muted-foreground">{r.mitigation}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          <span className="text-muted-foreground">Microsoft Learn:</span>
          {arr(p.sources).map((s) =>
            externalUrl(s.url) ? (
              <a key={s.url} href={externalUrl(s.url)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--sol)" }}>
                {s.title}
              </a>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

export function PathwayChapter({ s }: { s: Solution }) {
  const p = (s as any).pathway;
  const [tab, setTab] = useState<{ key: number; id: string }>({ key: 0, id: "bet" });
  const [curA, setCurA] = useState<string>(arr(p?.assumptions)[0]?.id ?? "");
  if (!p) return null;
  const openA = (id: string) => {
    setCurA(id);
    setTab((t) => ({ key: t.key + 1, id: "assumptions" }));
  };
  const nA = arr(p.assumptions).length;
  return (
    <SubTabs
      key={tab.key}
      initial={tab.id}
      panels={[
        { id: "bet", label: "The ask", icon: Compass, node: <Bet p={p} /> },
        { id: "flow", label: "Target flow", icon: Workflow, node: <Flow p={p} openA={openA} /> },
        { id: "assumptions", label: "Assumptions", icon: FlaskConical, badge: nA, node: <Assumptions p={p} cur={curA} setCur={setCurA} /> },
        { id: "options", label: "Solution options", icon: Layers, node: <Options p={p} /> },
        { id: "path", label: "Path to it", icon: Route, node: <Path p={p} openA={openA} /> },
        { id: "sizing", label: "Sizing", icon: Coins, node: <Sizing p={p} /> },
        { id: "decisions", label: "Decisions and risks", icon: Gavel, node: <Decisions p={p} /> },
      ]}
    />
  );
}
