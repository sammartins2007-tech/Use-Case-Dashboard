import { useState } from "react";
import { READ_ONLY } from "@/lib/read-only";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Clock, Database, DollarSign, Expand, Pencil, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { UseCase } from "@/data/types";
import { ELEMENTS, STATUS_LABEL, statusOf, type Status } from "@/lib/readiness";
import { caseValue, fmtHours, kindOf, kpiGain, parseKpis, usd0 } from "@/lib/kpi";
import { LAYER_LABEL, LAYER_ORDER, type Solution } from "@/lib/solutions";
import type { Route } from "@/lib/routes";
import { RADAR } from "@/radar.config";
import { cn } from "@/lib/utils";

const serif = "font-[family-name:var(--font-serif)]";
export const STATUS_DOT: Record<Status, string> = { G: "#2F9461", O: "#E08A1E", R: "#C94141" };
const STATUS_BG: Record<Status, string> = { G: "#E9F5EE", O: "#FDF0DD", R: "#FBE9E8" };

/** A header chip that opens a small popover (value, meaning and how to change it). */
export function FactChip({ label, value, dot, children, wide }: { label: string; value: string; dot?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:border-foreground/30 hover:bg-[#FBF9F5]">
          {dot && <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden="true" />}
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
          <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("space-y-2 text-sm", wide ? "w-[420px]" : "w-72")}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

const WHERE: Record<string, string> = {
  process: "Problem & outcome",
  users: "Problem & outcome",
  pain: "Problem & outcome",
  outcome: "Problem & outcome",
  flow: "Landscape & value",
  data: "Landscape & value",
  volumes: "Landscape & value",
  kpis: "Problem & outcome",
  owner: "Participants",
  sizing: "FinOps",
};

/** Business case readiness, always on top: ten dots, each opens what is there or what is missing. */
export function ReadinessStrip({ u, onCoach, onGo }: { u: UseCase; onCoach?: () => void; onGo: (where: string) => void }) {
  const st = ELEMENTS.map((e) => ({ e, s: statusOf(e, u) }));
  const g = st.filter((x) => x.s === "G").length;
  const pct = Math.round((st.reduce((n, x) => n + (x.s === "G" ? 1 : x.s === "O" ? 0.5 : 0), 0) / st.length) * 100);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-white px-3 py-2" aria-label="Business case readiness">
      <div className="flex items-center gap-2">
        <div className="relative size-9" aria-hidden>
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#EDE9E1" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke={pct >= 80 ? "#2F9461" : pct >= 50 ? "#E08A1E" : "#C94141"} strokeWidth="4" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold">Business case readiness</p>
          <p className="text-[11px] text-muted-foreground">{g} of {st.length} evidenced</p>
        </div>
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {st.map(({ e, s }) => {
          const v = e.value(u)?.trim();
          return (
            <li key={e.key}>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ background: STATUS_BG[s], borderColor: `${STATUS_DOT[s]}55` }}>
                    <span className="size-2 rounded-full" style={{ background: STATUS_DOT[s] }} aria-hidden />
                    {e.label}
                    <span className="sr-only">: {STATUS_LABEL[s]}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 space-y-2 text-sm">
                  <p className="font-medium">
                    {e.label} · <span style={{ color: STATUS_DOT[s] }}>{STATUS_LABEL[s]}</span>
                    {e.group === "gate" && <span className="ml-1 text-xs font-normal text-muted-foreground">qualification gate</span>}
                  </p>
                  <p className="line-clamp-5 text-muted-foreground">{e.key === "sizing" ? (v ? "AI run cost and value are sized." : "Not sized yet.") : v || "Nothing yet."}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-7" onClick={() => onGo(WHERE[e.key])}>
                      Open {WHERE[e.key]}
                    </Button>
                    {onCoach && s !== "G" && (
                      <Button size="sm" className="h-7" onClick={onCoach}>
                        Complete with AI
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Short text editor in a dialog. */
export function EditTextDialog({ open, onOpenChange, title, hint, value, busy, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; hint: string; value?: string; busy: boolean; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(value ?? "");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} aria-label={title} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => onSave(draft.trim())}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A titled card with an icon: the text clamped to a few lines, the rest in a pop-up, editing in a dialog. */
export function TextCard({
  icon: Icon,
  title,
  value,
  hint,
  tone = "#1B2A41",
  lines = 5,
  busy,
  onSave,
  children,
}: {
  icon: LucideIcon;
  title: string;
  value?: string;
  hint: string;
  tone?: string;
  lines?: number;
  busy: boolean;
  onSave?: (v: string, done: () => void) => void;
  children?: React.ReactNode;
}) {
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  const text = value?.trim();
  const long = (text?.length ?? 0) > lines * 95;
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white p-4" aria-label={title}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: tone }} aria-hidden>
          <Icon className="size-4" />
        </span>
        <h3 className="flex-1 text-sm font-semibold">{title}</h3>
        {onSave && !RADAR.customerEdition && !READ_ONLY && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEdit(true)} aria-label={`${text ? "Edit" : "Add"} ${title}`}>
            <Pencil className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
      {children}
      {text ? (
        <>
          <p className={cn("mt-2 whitespace-pre-line text-sm leading-relaxed text-[#2B3445]", !full && long && `line-clamp-${lines}`)} style={!full && long ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
            {text}
          </p>
          {long && (
            <button type="button" onClick={() => setFull((v) => !v)} className="mt-1 inline-flex items-center gap-1 self-start text-xs font-medium text-[#0E7C86] hover:underline">
              <Expand className="size-3" aria-hidden /> {full ? "Show less" : "Show all"}
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm italic text-amber-800">Missing · {hint}</p>
      )}
      {onSave && <EditTextDialog open={edit} onOpenChange={setEdit} title={title} hint={hint} value={value} busy={busy} onSave={(v) => onSave(v, () => setEdit(false))} />}
    </section>
  );
}

/** Split a free-text field into short items (numbered lines, bullets or sentences). */
export function itemsOf(s?: string, max = 12): string[] {
  const t = (s ?? "").trim();
  if (!t) return [];
  let parts = t
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim())
    .filter((l) => l && !/^(today|target|tomorrow)\s*:?\s*$/i.test(l));
  if (parts.length <= 1) parts = t.split(/(?<=[.;])\s+(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
  return parts.slice(0, max);
}

/** Split a flow into its "today" and "with the solution" parts when the text has those headings. */
export function flowParts(text?: string): { label: string; steps: string[] }[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  const re = /^(today|current|as-is|target|tomorrow|to-be|with the solution|future)\b[^:\n]{0,30}:\s*/gim;
  const marks = [...t.matchAll(re)];
  if (!marks.length) return [{ label: "", steps: itemsOf(t, 14) }];
  return marks
    .map((m, i) => {
      const start = (m.index ?? 0) + m[0].length;
      const end = i + 1 < marks.length ? marks[i + 1].index ?? t.length : t.length;
      const body = t.slice(start, end).trim();
      const today = /^(today|current|as-is)/i.test(m[1]);
      return { label: today ? "Today" : "With the solution", steps: itemsOf(body, 14) };
    })
    .filter((x) => x.steps.length);
}

function Chain({ steps, tone }: { steps: string[]; tone: string }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((s, i) => {
        const m = /^([^:]{3,40}):\s*(.+)$/.exec(s);
        return (
          <li key={i} className="relative flex gap-2.5 rounded-xl border border-border bg-white p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: tone }}>
              {i + 1}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0 text-left text-sm leading-snug hover:text-[#0E7C86]">
                  {m ? <span className="font-medium">{m[1]}</span> : <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm leading-relaxed">{s}</PopoverContent>
            </Popover>
            {i < steps.length - 1 && <ArrowRight className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 rounded-full bg-[#F7F5F0] text-muted-foreground xl:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** The functional flow as numbered chains: today, and with the solution when the text describes both. */
export function FlowChain({ text, accent }: { text?: string; accent: string }) {
  const parts = flowParts(text);
  if (!parts.length) return <p className="text-sm italic text-amber-800">Missing · step by step, including where a person decides</p>;
  return (
    <div className="space-y-4">
      {parts.map((p, i) => (
        <div key={i} className="space-y-2">
          {p.label && (
            <p className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: p.label === "Today" ? "#8A2B2B" : accent }}>
              {p.label}
            </p>
          )}
          <Chain steps={p.steps} tone={p.label === "Today" ? "#8A2B2B" : accent} />
        </div>
      ))}
    </div>
  );
}

/** Systems as {name, detail}: one per top-level line (or per ";"), sub-bullets go into the detail. */
export function systemsOf(text?: string): { name: string; detail: string }[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  const rows = t.includes("\n") ? t.split(/\r?\n/) : t.split(/;\s*/);
  const out: { name: string; detail: string }[] = [];
  for (const raw of rows) {
    const l = raw.trim();
    if (!l) continue;
    if (/^[-•*]\s/.test(l) && out.length) {
      out[out.length - 1].detail += `${out[out.length - 1].detail ? "\n" : ""}• ${l.replace(/^[-•*]\s*/, "")}`;
      continue;
    }
    const clean = l.replace(/^[-•*]\s*/, "").replace(/\.$/, "");
    const m = /^(.{2,48}?)(?:\s*[(,:]|\s+(?:with|whose|where|which|for|run by)\s)/.exec(clean);
    const name = (m ? m[1] : clean.length > 48 ? `${clean.slice(0, 45)}…` : clean).trim();
    out.push({ name, detail: clean.length > name.length + 2 ? clean : "" });
  }
  return out.slice(0, 14);
}

/** Systems and data as chips; the detail opens on click. */
export function SystemChips({ text }: { text?: string }) {
  const items = systemsOf(text);
  if (!items.length) return <p className="text-sm italic text-amber-800">Missing · the customer's systems, data and tools</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((x, i) => (
        <li key={i}>
          {x.detail ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#FBF9F5]">
                  <Database className="size-3.5 text-[#0E7C86]" aria-hidden /> {x.name}
                  <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 whitespace-pre-line text-sm">{x.detail}</PopoverContent>
            </Popover>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-medium">
              <Database className="size-3.5 text-[#0E7C86]" aria-hidden /> {x.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const NUM = /(~|about |roughly |over |more than |up to )?[$€]?\d[\d,.]*\s?(?:k|m|%|h|hours?|days?|min(?:utes)?|FTE|users?|leads?|cases?|tickets?|requests?|a (?:day|week|month|year)|per (?:day|week|month|year)|\/(?:day|week|month|year|yr))?(?:[–-]\d[\d,.]*\s?\w*)?/i;

/** Volumes as tiles: the first figure of each item is shown big. */
export function VolumeTiles({ text }: { text?: string }) {
  const items = itemsOf(text, 8);
  if (!items.length) return <p className="text-sm italic text-amber-800">Missing · transactions, cases or runs per month, number of users</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((x, i) => {
        const m = NUM.exec(x);
        return (
          <li key={i} className="rounded-xl border border-border bg-white p-3">
            {m && <p className={cn(serif, "text-2xl leading-none tabular-nums")}>{m[0].trim()}</p>}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="mt-1 text-left text-xs leading-snug text-muted-foreground hover:text-foreground" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {x}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm">{x}</PopoverContent>
            </Popover>
          </li>
        );
      })}
    </ul>
  );
}

/** The three value measures as big tiles. */
export function ValueTiles({ u }: { u: UseCase }) {
  const cv = caseValue(u.kpiValues);
  const tiles: { icon: LucideIcon; label: string; value?: string; tone: string }[] = [
    { icon: Clock, label: "Time saved / year", value: cv.hours ? fmtHours(cv.hours) : undefined, tone: "#0E7C86" },
    { icon: DollarSign, label: "Cost savings / year", value: cv.costUsd ? usd0.format(cv.costUsd) : undefined, tone: "#2F9461" },
    { icon: TrendingUp, label: "Revenue gain / year", value: cv.revenueUsd ? usd0.format(cv.revenueUsd) : undefined, tone: "#B8892B" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: t.tone }} aria-hidden>
            <t.icon className="size-5" />
          </span>
          <div>
            <p className={cn(serif, "text-2xl leading-none tabular-nums", !t.value && "text-muted-foreground")}>{t.value ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** KPIs as from → to cards. */
export function KpiCards({ value }: { value?: string }) {
  const list = parseKpis(value);
  if (!list.length) return <p className="text-sm italic text-amber-800">Missing · measurable targets with today's baseline</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {list.map((k, i) => {
        const kind = kindOf(k);
        const gain = kpiGain(k);
        return (
          <li key={i} className={cn("rounded-2xl border bg-white p-4", k.primary ? "border-[#2F9461]" : "border-border")}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{k.name}</p>
              {typeof gain === "number" && gain > 0 && (
                <span className="shrink-0 rounded-full bg-[#E9F5EE] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#1E5B3E]">+{kind === "Time" ? fmtHours(gain) : usd0.format(gain)} / yr</span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="rounded-xl bg-[#FBE9E8]/60 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A2B2B]">Today</p>
                <p className="text-sm leading-snug">{k.current || "Not stated"}</p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
              <div className="rounded-xl bg-[#E9F5EE] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1E5B3E]">Target</p>
                <p className="text-sm leading-snug">{k.expected || "Not stated"}</p>
              </div>
            </div>
            {k.basis && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="mt-2 text-[11px] text-muted-foreground hover:text-foreground">
                    Basis ›
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm">{k.basis}</PopoverContent>
              </Popover>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const LAYER_TONE: Record<string, string> = {
  experience: "#1B2A41",
  orchestration: "#5B3FA8",
  intelligence: "#0E7C86",
  knowledge: "#B45309",
  integration: "#2F6FB0",
  trust: "#6B7280",
};

/** The potential solution as one picture: what goes in, the Microsoft building blocks by layer, what comes out. */
export function SolutionVisual({ u, route, design, hasDesign }: { u: UseCase; route: Route; design?: Solution | null; hasDesign: boolean }) {
  const comps = (u.products ?? "")
    .split(/[,;\n]+|\s\+\s/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 10);
  const nodes = (design?.architecture?.nodes ?? []).filter((n) => !n.existing);
  const byLayer = LAYER_ORDER.map((l) => ({ l, ns: nodes.filter((n) => n.layer === l) })).filter((x) => x.ns.length);
  const inputs = systemsOf(u.dataSystems).map((x) => x.name).slice(0, 6);
  const journey = (design?.journey ?? []).slice(0, 9);
  const outcome = design?.headline || itemsOf(u.outcome, 1)[0];
  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.6fr)_auto_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What goes in</p>
          <ul className="mt-2 space-y-1.5">
            {(inputs.length ? inputs : ["To confirm"]).map((x) => (
              <li key={x} className="flex items-center gap-2 rounded-lg bg-[#F3F1EC] px-2.5 py-1.5 text-sm">
                <Database className="size-3.5 shrink-0 text-[#0E7C86]" aria-hidden /> <span className="truncate">{x}</span>
              </li>
            ))}
          </ul>
        </div>
        <ArrowRight className="hidden size-6 self-center text-muted-foreground lg:block" aria-hidden />
        <div className="rounded-2xl border-2 bg-white p-4" style={{ borderColor: route.color }}>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: route.color }}>
            <Sparkles className="size-3.5" aria-hidden /> {route.key || route.short}
          </p>
          {byLayer.length ? (
            <div className="mt-2 space-y-2">
              {byLayer.map(({ l, ns }) => (
                <div key={l} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">{LAYER_LABEL[l] ?? l}</span>
                  {ns.map((n) => (
                    <Popover key={n.id}>
                      <PopoverTrigger asChild>
                        <button type="button" className="rounded-lg px-2.5 py-1 text-xs font-medium text-white hover:opacity-90" style={{ background: LAYER_TONE[l] ?? route.color }}>
                          {n.label}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 space-y-1 text-sm">
                        <p className="font-medium">{n.product}</p>
                        <p className="text-muted-foreground">{n.role}</p>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {(comps.length ? comps : ["To define"]).map((c) => (
                <li key={c} className="rounded-lg px-2.5 py-1 text-xs font-medium text-white" style={{ background: route.color }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
        <ArrowRight className="hidden size-6 self-center text-muted-foreground lg:block" aria-hidden />
        <div className="rounded-2xl border border-[#B9DCC8] bg-[#E9F5EE] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1E5B3E]">What comes out</p>
          <p className="mt-2 text-sm leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {outcome || "To define"}
          </p>
        </div>
      </div>
      {journey.length > 0 && (
        <ol className="flex flex-wrap items-center gap-1.5" aria-label="How it runs">
          {journey.map((j, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={cn("rounded-full border px-3 py-1 text-xs font-medium hover:bg-[#FBF9F5]", j.aiMoment ? "border-transparent text-white" : "border-border bg-white")} style={j.aiMoment ? { background: route.color } : undefined}>
                    {j.stage}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-1.5 text-sm">
                  <p className="font-medium">{j.stage}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p>{j.before}</p>
                  <p className="text-xs text-muted-foreground">With the solution</p>
                  <p>{j.after}</p>
                </PopoverContent>
              </Popover>
              {i < journey.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />}
            </li>
          ))}
        </ol>
      )}
      {hasDesign && (
        <Link to={`/use-case/${u.id}/solution`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ background: route.color }}>
          <Sparkles className="size-4" aria-hidden /> Open the full solution experience
        </Link>
      )}
    </div>
  );
}
