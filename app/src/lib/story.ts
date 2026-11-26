/**
 * "Inside the Radar" — the presenter story. Pure helpers that turn the radar's own lists into the
 * story's facts. Nothing here is specific to one customer or one use case: every number is read
 * from the live data, and the use case the story follows is chosen from that data.
 */
import type { ConsumptionRow } from "@/data/repo";
import type { Signal, UseCase } from "@/data/types";
import type { DocMeta } from "@/lib/content";

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v.replace(/[$,\s]/g, "")))) return Number(v.replace(/[$,\s]/g, ""));
  return undefined;
};

/* ------------------------------------------------------------------ SE agents and designs */

export interface AgentOpinion {
  agent: string;
  involvement: string;
  fit?: string;
  verdict: string;
  findings: string[];
  risks: string[];
  effortDays?: number;
  whatIf?: string;
  learn: { title: string; url: string }[];
}

/** A readable title for a Microsoft Learn link when the design stored only the URL. */
export function learnTitle(l: { title: string; url: string }): string {
  if (l.title && !/^https?:/i.test(l.title)) return l.title;
  const seg = (l.url || l.title).split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
  const t = decodeURIComponent(seg).replace(/[-_]+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Microsoft Learn";
}

export interface BoardView {
  agents: AgentOpinion[];
  lead?: string;
  summary?: string;
  pattern?: string;
  arbitration: { topic: string; decision: string }[];
  whatIfs: { scenario: string; verdict: string; why: string }[];
  effort?: { specialistSum?: number; planTotal?: number; removed?: string };
  runCost?: { low?: number; mid?: number; high?: number };
  learnTotal: number;
  /** A stored board from the full chain (rather than an older list of specialist opinions). */
  full: boolean;
}

export interface DesignView {
  solutionName: string;
  headline: string;
  pattern: string;
  readiness: string;
  board: BoardView;
  layers: string[];
  nodes: { id: string; layer: string; label: string; product: string; existing: boolean }[];
  flow: { step: number; from: string; to: string; text: string }[];
  decisions: { decision: string; choice: string }[];
  planDays?: number;
  planWeeks?: number;
  phases: number;
  phaseList: { name: string; start: number; end: number }[];
  version?: number;
  date?: string;
}

/** "SE - Copilot Studio L2" → "Copilot Studio": one short name per specialist, whatever the design's vintage. */
export function agentShort(name: string): string {
  let t = name.replace(/^SE\s*-\s*/i, "").replace(/\s*-?\s*L2\s*$/i, "").trim();
  if (/m365|microsoft 365/i.test(t) && /co-?work/i.test(t)) t = "M365 Copilot & Cowork";
  else if (/^d365$|^dynamics 365$/i.test(t)) t = "Dynamics 365";
  else if (/azure ai/i.test(t)) t = "Azure AI / Foundry";
  else if (/^data & knowledge$/i.test(t)) t = "Data & Knowledge Architecture";
  return t || name;
}

const involvementOf = (v: string) => {
  if (/lead/i.test(v)) return "Lead";
  if (/not needed/i.test(v)) return "Not needed";
  if (/review/i.test(v)) return "Reviewer";
  if (/contrib/i.test(v)) return "Contributor";
  return v || "Contributor";
};

function textList(v: unknown, key?: string): string[] {
  return arr(v)
    .map((x) => (typeof x === "string" ? x : isObj(x) ? str(key ? x[key] : x.text ?? x.risk ?? x.finding) : ""))
    .map((x) => x.trim())
    .filter(Boolean);
}

function opinionOf(x: unknown): AgentOpinion | null {
  if (typeof x === "string") return { agent: agentShort(x), involvement: "Contributor", verdict: "", findings: [], risks: [], learn: [] };
  if (!isObj(x)) return null;
  const agent = agentShort(str(x.agent ?? x.name ?? x.specialist));
  if (!agent) return null;
  const effort = isObj(x.effort) ? num(x.effort.days) : num(x.effort) ?? num(x.effortDays);
  return {
    agent,
    involvement: involvementOf(str(x.involvement)),
    fit: str(x.fitVerdict ?? x.fit) || undefined,
    verdict: str(x.verdict),
    findings: textList(x.findings ?? x.keyFindings),
    risks: textList(x.risks ?? x.topRisks, "risk"),
    effortDays: effort,
    whatIf: str(x.whatIf) || undefined,
    learn: arr(x.learn)
      .map((l) => (isObj(l) ? { title: str(l.title), url: str(l.url) } : { title: str(l), url: str(l) }))
      .filter((l) => l.title || l.url),
  };
}

/** Reads a design JSON loosely: older designs carry `specialists`, full-chain designs a `board`. */
export function designView(data: unknown, meta?: Pick<DocMeta, "version" | "origin" | "modified">): DesignView | null {
  if (!isObj(data)) return null;
  const b = isObj(data.board) ? data.board : undefined;
  const rawAgents = arr(b?.opinions).length ? arr(b?.opinions) : arr(b?.specialists).length ? arr(b?.specialists) : arr(data.specialists);
  const agents = rawAgents.map(opinionOf).filter((a): a is AgentOpinion => !!a);
  const lead = agentShort(str(data.leadSpecialist ?? b?.leadSpecialist)) || agents.find((a) => a.involvement === "Lead")?.agent;
  const fin = isObj(b?.finops) ? b?.finops : isObj(data.finops) ? data.finops : undefined;
  const mrc = isObj(fin?.monthlyRunCost) ? fin?.monthlyRunCost : undefined;
  const er = isObj(b?.effortReconciliation) ? b?.effortReconciliation : undefined;
  const arch = isObj(data.architecture) ? data.architecture : {};
  const plan = isObj(data.plan) ? data.plan : {};
  const date = (str(b?.date) || str(meta?.origin)).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? (meta?.modified ?? "").slice(0, 10);
  return {
    solutionName: str(data.solutionName) || str(data.title),
    headline: str(data.headline),
    pattern: str(data.pattern) || str(b?.targetPattern),
    readiness: str(data.readinessVerdict),
    board: {
      agents,
      lead: lead || undefined,
      summary: str(b?.summary) || undefined,
      pattern: str(b?.targetPattern) || undefined,
      arbitration: arr(b?.arbitration)
        .filter(isObj)
        .map((a) => ({ topic: str(a.topic), decision: str(a.decision) }))
        .filter((a) => a.topic || a.decision),
      whatIfs: arr(b?.whatIfVerdicts)
        .filter(isObj)
        .map((w) => ({ scenario: str(w.scenario), verdict: str(w.verdict), why: str(w.why) }))
        .filter((w) => w.scenario),
      effort: er ? { specialistSum: num(er.specialistSum), planTotal: num(er.planTotal), removed: str(er.removedOverlaps) || undefined } : undefined,
      runCost: mrc ? { low: num(mrc.low), mid: num(mrc.mid), high: num(mrc.high) } : undefined,
      learnTotal: agents.reduce((s, a) => s + a.learn.length, 0),
      full: !!b && agents.length > 0,
    },
    layers: textList(arch.layers),
    nodes: arr(arch.nodes)
      .filter(isObj)
      .map((x) => ({ id: str(x.id), layer: str(x.layer), label: str(x.label), product: str(x.product), existing: x.existing === true }))
      .filter((x) => x.id && x.label),
    flow: arr(arch.flow)
      .filter(isObj)
      .map((x, i) => ({ step: num(x.step) ?? i + 1, from: str(x.from), to: str(x.to), text: str(x.text) }))
      .filter((x) => x.text),
    decisions: arr(arch.decisions)
      .filter(isObj)
      .map((x) => ({ decision: str(x.decision), choice: str(x.choice) }))
      .filter((x) => x.decision),
    planDays: num(plan.totalEffortDays),
    planWeeks: num(plan.durationWeeks),
    phases: arr(plan.phases).length,
    phaseList: arr(plan.phases)
      .filter(isObj)
      .map((p) => ({ name: str(p.name), start: num(p.startWeek) ?? 0, end: num(p.endWeek) ?? 0 }))
      .filter((p) => p.name && p.end >= p.start && p.end > 0),
    version: meta?.version,
    date: date || undefined,
  };
}

/** Puts the lead specialist first so it sits at the top of the board, keeping the board's order. */
export function boardOrder(agents: AgentOpinion[], lead?: string): AgentOpinion[] {
  const i = agents.findIndex((a) => a.agent === lead || a.involvement === "Lead");
  return i <= 0 ? agents : [...agents.slice(i), ...agents.slice(0, i)];
}

/* ------------------------------------------------------------------ evidence ledger */

export interface LedgerLine {
  date?: string;
  kind?: string;
  title: string;
  statements?: number;
  used?: number;
  text: string;
}

/** Evidence lines written by the refresh: "<date> <Meeting|Email|…> '<title>': <n> statements, <k> used — …". */
export function parseEvidence(evidence?: string): LedgerLine[] {
  return (evidence ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const date = /^(\d{4}-\d{2}-\d{2})/.exec(line)?.[1];
      const kind = /^\d{4}-\d{2}-\d{2}\s+(Meeting|Email|Mail|Document|Teams chat|Teams channel|Teams|Chat|Channel|Transcript)\b/i.exec(line)?.[1];
      const title = /'([^']{3,160})'/.exec(line)?.[1] ?? /"([^"]{3,160})"/.exec(line)?.[1] ?? "";
      const m = /(\d+)\s+statements?\b[^0-9]{0,16}(\d+)\s+(?:used|on this use case|kept)/i.exec(line);
      return { date, kind, title, statements: m ? Number(m[1]) : undefined, used: m ? Number(m[2]) : undefined, text: line };
    });
}

/* ------------------------------------------------------------------ refresh runs */

export interface RunFacts {
  steps?: number;
  mails?: number;
  chats?: number;
  teams?: number;
  channels?: number;
  posts?: number;
  meetings?: number;
  documents?: number;
  signals?: number;
  updated?: number;
  specialists?: number;
}

const toNum = (x?: string) => (x ? Number(x.replace(/,/g, "")) : undefined);

/** Coverage numbers from a refresh row's Basis sentence (written by every run). Missing ones stay undefined. */
export function parseBasis(basis?: string): RunFacts {
  const t = basis ?? "";
  const g = (re: RegExp) => toNum(re.exec(t)?.[1]);
  const ch = /(\d[\d,]*)\s+teams\s*\/\s*(\d[\d,]*)\s+channels/i.exec(t);
  return {
    steps: g(/about\s+(\d+)\s+main steps/i),
    mails: g(/(\d[\d,]*)\s+mails?\b/i),
    chats: g(/(\d[\d,]*)\s+chats?\b/i),
    teams: toNum(ch?.[1]),
    channels: toNum(ch?.[2]),
    posts: g(/(\d[\d,]*)\s+posts\s+checked/i),
    meetings: g(/(\d[\d,]*)\s+(?:customer\s+)?meetings?\b/i),
    documents: g(/(\d[\d,]*)\s+recent documents/i),
    signals: g(/(\d[\d,]*)\s+signals?\s*(?:added|,|;)/i),
    updated: g(/(\d[\d,]*)\s+use cases?\s+updated/i),
    specialists: g(/(\d[\d,]*)\s+specialist\b/i),
  };
}

export const isRefresh = (r: ConsumptionRow) => /refresh/i.test(r.kind ?? "");

/** The two usual start times of the scheduled refresh, in the reader's own time zone (times seen at least twice). */
export function runTimes(rows: ConsumptionRow[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows.filter(isRefresh).slice(0, 20)) {
    if (!r.runDate) continue;
    const t = new Date(r.runDate).getTime();
    if (Number.isNaN(t)) continue;
    // A run logged a few minutes either side of the hour belongs to that hour's schedule.
    const d = new Date(Math.round(t / 3_600_000) * 3_600_000);
    const hh = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    counts.set(hh, (counts.get(hh) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([h]) => h)
    .sort();
}

export function zoneName(): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ which use case to follow */

export const sameTitle = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** The richest story: a use case with a current design, then the most signals, then the most recent signal. */
export function richest(useCases: UseCase[], hasDesign: (id: number) => boolean, signals: Signal[]): UseCase | undefined {
  const count = new Map<string, number>();
  for (const s of signals) {
    const k = (s.useCaseRef ?? "").trim().toLowerCase();
    if (k) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const score = (u: UseCase) => Math.max(u.signalCount ?? 0, count.get(u.title.trim().toLowerCase()) ?? 0);
  return [...useCases]
    .filter((u) => !u.discarded)
    .sort((a, b) => Number(hasDesign(b.id)) - Number(hasDesign(a.id)) || score(b) - score(a) || (b.lastSignal ?? "").localeCompare(a.lastSignal ?? ""))[0];
}

/* ------------------------------------------------------------------ Show mode */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Hides customer and people names for an audience outside the account: accounts become "Customer A", people a role. */
export function buildMask(accounts: string[], people: { name: string; microsoft: boolean }[]): (t?: string) => string {
  const acc = [...new Set(accounts.map((a) => a.trim()).filter((a) => a && a.toLowerCase() !== "internal"))].sort((a, b) => a.localeCompare(b));
  const rules: [RegExp, string][] = [];
  const seen = new Set<string>();
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const name = p.name.trim();
    if (name.length < 5 || !/\s/.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    rules.push([new RegExp(`(?<![\\p{L}])${esc(name)}(?![\\p{L}])`, "giu"), p.microsoft ? "a Microsoft specialist" : "a customer expert"]);
  }
  acc
    .map((a, i) => [a, `Customer ${String.fromCharCode(65 + (i % 26))}`] as const)
    .sort((x, y) => y[0].length - x[0].length)
    .forEach(([a, label]) => rules.push([new RegExp(`(?<![\\p{L}])${esc(a)}(?![\\p{L}])`, "giu"), label]));
  return (t?: string) => rules.reduce((s, [re, r]) => s.replace(re, r), t ?? "");
}

/** People named in a use case's People field ("Name | Title | Organisation | …") and in signal senders. */
export function peopleOf(useCases: UseCase[], signals: Signal[], owner?: string): { name: string; microsoft: boolean }[] {
  const out: { name: string; microsoft: boolean }[] = [];
  for (const u of useCases) {
    for (const line of (u.people ?? "").split(/\r?\n/)) {
      const f = line.split("|").map((x) => x.trim());
      if (f[0]) out.push({ name: f[0], microsoft: /microsoft/i.test(f[2] ?? "") });
    }
    if (u.owner) {
      const name = u.owner.split(/[(,–—-]/)[0].trim();
      if (name) out.push({ name, microsoft: /microsoft/i.test(u.owner) });
    }
  }
  for (const s of signals) {
    const raw = s.sender ?? "";
    const name = raw.replace(/\(.*?\)/g, "").split(/[,;]/)[0].trim();
    if (name && !/microsoft learn/i.test(name)) out.push({ name, microsoft: /microsoft/i.test(raw) });
  }
  if (owner) out.push({ name: owner, microsoft: true });
  return out;
}

/* ------------------------------------------------------------------ small formatters */

export const fmtDay = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtShortDay = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const int = new Intl.NumberFormat("en-GB");

/** Groups discard reasons that differ only by an id or a date. */
export function discardReasons(useCases: UseCase[]): { reason: string; count: number }[] {
  const m = new Map<string, { reason: string; count: number }>();
  for (const u of useCases.filter((x) => x.discarded)) {
    const raw = (u.discardReason ?? "").trim() || "No reason recorded";
    const key = raw
      .replace(/\(.*?\)/g, "")
      .replace(/#?\d+/g, "#")
      .replace(/\s+/g, " ")
      .replace(/[.\s]+$/, "")
      .trim()
      .toLowerCase();
    const cur = m.get(key) ?? { reason: raw.replace(/\s*\(.*?\)\s*/g, " ").replace(/\b(use case)\s+#?\d+/i, "$1 already tracked").replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim(), count: 0 };
    cur.count++;
    m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

/** Shortens text at a word boundary. */
export function clamp(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/[\s,;:.-]+\S*$/, "")}…`;
}

/** "a" or "an" before a word. */
export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
