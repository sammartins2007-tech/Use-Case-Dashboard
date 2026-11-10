import type { UseCase } from "@/data/types";

export interface Element {
  key: string;
  label: string;
  group: "gate" | "input";
  value: (u: UseCase) => string | undefined;
}

/** The five qualification gates, then the inputs needed to size and assess. */
export const ELEMENTS: Element[] = [
  { key: "process", label: "Process", group: "gate", value: (u) => u.process },
  { key: "users", label: "Users", group: "gate", value: (u) => u.users },
  { key: "pain", label: "Pain", group: "gate", value: (u) => u.pain },
  { key: "outcome", label: "Outcome", group: "gate", value: (u) => u.outcome },
  { key: "flow", label: "Flow", group: "gate", value: (u) => u.functionalFlow },
  { key: "data", label: "Data & systems", group: "input", value: (u) => u.dataSystems },
  { key: "volumes", label: "Volumes", group: "input", value: (u) => u.volumes },
  { key: "kpis", label: "KPIs", group: "input", value: (u) => u.kpiValues || u.kpis },
  { key: "owner", label: "Owner", group: "input", value: (u) => u.owner },
  {
    key: "sizing",
    label: "FinOps sizing",
    group: "input",
    value: (u) => (typeof u.monthlyCost === "number" || typeof u.monthlyValue === "number" ? "Sized" : undefined),
  },
];

export const GATES = ELEMENTS.filter((e) => e.group === "gate");

export function has(e: Element, u: UseCase) {
  return Boolean(e.value(u)?.trim());
}

export function gatesMet(u: UseCase) {
  return GATES.filter((g) => has(g, u)).length;
}

export function missing(u: UseCase) {
  return ELEMENTS.filter((e) => !has(e, u));
}

/** Ready to assess = all five gates evidenced (the qualification rule). */
export function isReady(u: UseCase) {
  return gatesMet(u) === GATES.length;
}

const CLARIFY = /^CLARIFY\s*:\s*/i;

function questionLines(u: UseCase) {
  return (u.openQuestions ?? "")
    .split(/\r?\n/)
    .map((q) => q.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/** Questions for the customer (clarifications for the account team are excluded). */
export function questions(u: UseCase) {
  return questionLines(u).filter((q) => !CLARIFY.test(q));
}

/** Unclear or contradictory facts the account team must settle (lines starting "CLARIFY:"). */
export function clarifications(u: UseCase) {
  return questionLines(u).filter((q) => CLARIFY.test(q)).map((q) => q.replace(CLARIFY, "").trim()).filter(Boolean);
}

export type Status = "G" | "O" | "R";

/** Three-level status per element: from the analysed Readiness field when present, else from the field itself. */
export function statusOf(e: Element, u: UseCase): Status {
  const m = new RegExp(`(?:^|\\|)\\s*${e.key}\\s*:\\s*([GOR])`, "i").exec(u.readiness ?? "");
  if (m) return m[1].toUpperCase() as Status;
  const v = e.value(u)?.trim() ?? "";
  if (!v) return "R";
  if (v.length < 25 || /to be (better )?defined|tbd|not (yet )?(stated|named|known)|unknown/i.test(v)) return "O";
  return "G";
}

export const STATUS_LABEL: Record<Status, string> = { G: "Evidenced", O: "Partial", R: "Missing" };
