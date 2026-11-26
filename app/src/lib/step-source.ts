import type { Signal } from "@/data/types";
import type { EvidenceLine, InputRef } from "@/components/input-context";
import type { Step } from "@/lib/people-steps";

/**
 * Where a next step comes from: the input (signal or evidence-trail line) of the same use case
 * that best matches the step's words. Matching is local to the use case, so it only ever points
 * to a real input of that use case.
 */
export type SourceKind = "Email" | "Teams" | "Meeting" | "Document" | "Web" | "Feature" | "Owner" | "Source";

export const KIND_LABEL: Record<SourceKind, string> = {
  Email: "Email",
  Teams: "Teams chat",
  Meeting: "Meeting",
  Document: "Document",
  Web: "Web page",
  Feature: "Product news",
  Owner: "Owner answer",
  Source: "Source",
};

export interface StepSource {
  kind: SourceKind;
  label: string;
  date?: string;
  title: string;
  sender?: string;
  excerpt?: string;
  input: InputRef;
}

interface Candidate extends StepSource {
  text: string;
  boost: number;
  signal: boolean;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_WORDS = /\(?\b(\d{1,2})(?:[–-]\d{1,2})?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\)?/i;

/** The first date in a line: an ISO date at the start, else "5 Nov 2026" anywhere. */
export function dateIn(text: string): string | undefined {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1];
  if (iso) return iso;
  const m = DATE_WORDS.exec(text);
  if (!m) return undefined;
  const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
  return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

const KIND_WORDS: [RegExp, SourceKind][] = [
  [/\bmeeting|\bcall\b|\bsync\b|\bworkshop|\binterview|\btranscript|\bnotes\b|\blabs?\b/i, "Meeting"],
  [/\bteams\b|\bchat\b|\bchannel\b/i, "Teams"],
  [/\be-?mail\b|\bmail\b/i, "Email"],
  [/\bdocument|\bdeck\b|\bworkbook|\breport\b|\.xlsx\b|\.pptx\b|\.docx\b|\.pdf\b|\.md\b|\bpipeline\b|\bbrief\b|\breview\b|\bprd\b|\bspec/i, "Document"],
  [/\bfeature\b|\blearn\b/i, "Feature"],
  [/\bweb\b/i, "Web"],
  [/\bowner\b/i, "Owner"],
];

/** The kind of an input: its recorded type first, else words in its heading. */
export function kindOf(type?: string, head?: string): SourceKind {
  const t = (type ?? "").toLowerCase();
  if (t.startsWith("meeting")) return "Meeting";
  if (t.startsWith("teams") || t.startsWith("chat")) return "Teams";
  if (t.startsWith("email") || t.startsWith("mail")) return "Email";
  if (t.startsWith("document")) return "Document";
  if (t.startsWith("web")) return "Web";
  if (t.startsWith("feature")) return "Feature";
  if (t.startsWith("owner")) return "Owner";
  for (const [re, k] of KIND_WORDS) if (re.test(head ?? "")) return k;
  return "Source";
}

/** A readable title from a free-text evidence heading: no dates, no trailing status. */
function cleanTitle(raw: string): string {
  let t = raw.replace(/^\d{4}-\d{2}-\d{2}\s+\S+\s*/, "");
  t = t.replace(new RegExp(DATE_WORDS.source, "gi"), "");
  t = t.split(/\.\s/)[0];
  t = t
    .replace(/\(\s*\)/g, "")
    .replace(/\s+,/g, ",")
    .replace(/,(\s*,)+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;.:–—-]+|[\s,;.:–—-]+$/g, "");
  return t.length > 90 ? `${t.slice(0, 88).replace(/\s+\S*$/, "")}…` : t;
}

/** "Teams chat 'X'" or "Email, X" read as just X: the kind is shown next to it. */
function displayTitle(raw: string): string {
  const q = /^(?:teams chat|teams meeting|teams|chat|e-?mail|meeting|document)\s+['‘"“]([^'’"”]{3,})['’"”]\s*$/i.exec(raw.trim());
  if (q) return q[1];
  return raw.replace(/^(?:teams chat|teams|chat|e-?mail|meeting|document|feature)\s*[,:]\s*/i, "").trim() || raw;
}

/** Title of a dated trail line: the quoted name up to the quote that closes it, else the heading. */
function isoTitle(text: string): string | undefined {
  const m = /^\d{4}-\d{2}-\d{2}\s+(\S+)\s+(.*)$/.exec(text);
  if (!m) return undefined;
  const q = /(?:^|\s)['‘"“](.+?)['’"”](?=\s*[(:,]|\s*$)/.exec(m[2]);
  if (q) return q[1];
  return `${m[1]} ${m[2].split(/:\s+\d+\s+statements?|:\s|\s[—–]\s/)[0]}`.trim();
}

const clipTitle = (t: string) => {
  const x = t.replace(/^[^\p{L}\p{N}'"‘“(]+/u, "").trim();
  return x.length > 90 ? `${x.slice(0, 88).replace(/\s+\S*$/, "")}…` : x;
};

const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

/** Every input of one use case that a step could come from. */
export function sourceCandidates(signals: Signal[], evidence: EvidenceLine[]): Candidate[] {
  const out: Candidate[] = [];
  for (const s of signals) {
    const ref = s.sourceRef?.trim() || s.title;
    const title = clipTitle(displayTitle(ref));
    const kind = kindOf(s.sourceType, ref);
    out.push({
      signal: true,
      boost: 0,
      kind,
      label: KIND_LABEL[kind],
      date: s.signalDate?.slice(0, 10),
      title,
      sender: s.sender,
      excerpt: clip(s.insight, 260),
      text: [s.title, s.insight, s.sourceRef, s.sender].filter(Boolean).join(" "),
      input: { title, date: s.signalDate, type: s.sourceType, sender: s.sender, kind: s.kind, insight: s.insight, sourceRef: s.sourceRef },
    });
  }
  for (const e of evidence) {
    if (/^\d{4}-\d{2}-\d{2}\s+(rebuild|refresh)/i.test(e.text)) continue;
    const head = e.text.split(/:\s|\s[—–]\s/)[0];
    const kind = kindOf(e.type, head);
    const date = e.date ?? dateIn(e.text);
    const title = clipTitle(displayTitle(e.date ? isoTitle(e.text) ?? e.source ?? head : cleanTitle(e.source || head)));
    if (!title) continue;
    const said = e.facts ?? (e.text.includes(": ") ? e.text.slice(e.text.indexOf(": ") + 2) : undefined);
    out.push({
      signal: false,
      boost: /Impact:.*\bSteps?\b/i.test(e.text) ? 0.08 : 0,
      kind,
      label: KIND_LABEL[kind],
      date,
      title,
      excerpt: clip(said?.replace(/\s*Impact:.*$/i, ""), 260),
      text: e.text,
      input: { title, date, type: e.type ?? (kind === "Source" ? undefined : kind), sourceRef: e.source },
    });
  }
  return out;
}

const STOP = new Set(
  "the and for with from that this these those into over under than then also not only via per before after about across between within without will would should could can may might must shall their there they them his her our your who what when where which how one two three four new open done next step steps more most other each any all some same such own are was were been being its use case cases".split(
    " ",
  ),
);

function stem(w: string) {
  for (const suf of ["ings", "ing", "ies", "es", "ed", "s"]) if (w.length > 5 && w.endsWith(suf)) return w.slice(0, -suf.length);
  return w;
}

function tokens(s: string, skip: Set<string>): Set<string> {
  const out = new Set<string>();
  const words = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+/g);
  for (const w of words ?? []) if (w.length >= 3 && !STOP.has(w) && !skip.has(w)) out.add(stem(w));
  return out;
}

/** Share of a step's weighted words an input must carry to count as its source. */
const MIN_SCORE = 0.18;

/**
 * Best source per step. Words common to every input of the use case (the account name, the
 * project name) weigh little; names, products and specific facts weigh most.
 */
export function matchStepSources(steps: Step[], candidates: Candidate[], account?: string): (StepSource | undefined)[] {
  const skip = new Set((account ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const docs = candidates.map((c) => tokens(c.text, skip));
  const stepWords = steps.map((s) => tokens([s.action, s.detail, s.who].join(" "), skip));
  const df = new Map<string, number>();
  for (const d of [...docs, ...stepWords]) for (const t of d) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length + stepWords.length;
  const idf = (t: string) => Math.log(1 + n / (df.get(t) ?? 1));
  return stepWords.map((words) => {
    let total = 0;
    for (const t of words) total += idf(t);
    if (!total) return undefined;
    let best: { score: number; c: Candidate } | undefined;
    candidates.forEach((c, i) => {
      let shared = 0;
      let weight = 0;
      for (const t of words)
        if (docs[i].has(t)) {
          shared += 1;
          weight += idf(t);
        }
      if (shared < 2) return;
      const score = weight / total + c.boost;
      if (!best || score > best.score + 1e-6 || (Math.abs(score - best.score) <= 1e-6 && c.signal && !best.c.signal)) best = { score, c };
    });
    if (!best || best.score < MIN_SCORE) return undefined;
    const { kind, label, date, title, sender, excerpt, input } = best.c;
    return { kind, label, date, title, sender, excerpt, input };
  });
}
