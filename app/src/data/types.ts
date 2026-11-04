import { RADAR } from "@/radar.config";

/** Accounts come from radar.config.ts (customers, then the optional Internal bucket). */
export const ACCOUNTS: readonly string[] = [...RADAR.customers.map((c) => c.name), ...(RADAR.internal ? ["Internal"] : [])];
export type Account = string;

export const PIPELINE_STAGES = ["Signal", "Qualified", "Shaping", "Pilot", "Scale"] as const;
export const CLOSED_STAGES = ["Parked", "Stopped"] as const;
export const STAGES = [...PIPELINE_STAGES, ...CLOSED_STAGES] as const;
export type Stage = (typeof STAGES)[number];

export const DECISIONS = ["Undecided", "Fund", "Test", "Hold", "Stop"] as const;
export type Decision = (typeof DECISIONS)[number];

export type Confidence = "High" | "Medium" | "Low";

export interface FinOpsInputs {
  runsPerMonth: number;
  creditsPerRun: number;
  eurPerCredit: number;
  minutesSavedPerRun: number;
  eurPerHour: number;
}

export interface UseCase {
  id: number;
  title: string;
  account?: Account;
  pain?: string;
  process?: string;
  outcome?: string;
  stage?: Stage;
  products?: string;
  monthlyCost?: number;
  monthlyValue?: number;
  finOpsBasis?: string;
  owner?: string;
  nextStep?: string;
  featureUnlock?: string;
  confidence?: Confidence;
  decision?: Decision;
  lastSignal?: string;
  signalCount?: number;
  evidence?: string;
  users?: string;
  functionalFlow?: string;
  dataSystems?: string;
  volumes?: string;
  kpis?: string;
  openQuestions?: string;
  analysis?: string;
  complexity?: Level;
  effort?: Level;
  sizingBasis?: string;
  classification?: string;
  classificationConfidence?: Confidence;
  classificationWhy?: string;
  classificationNext?: string;
  flag?: string;
  discarded?: boolean;
  discardReason?: string;
  sources?: string;
  insights?: string;
  relatedUseCases?: string;
  internalRef?: string;
  description?: string;
  potentialSolution?: string;
  readiness?: string;
  kpiValues?: string;
  department?: string;
  valueLevel?: Level;
  valueBasis?: string;
  priorityFit?: string;
  priorityWhy?: string;
  wave?: string;
  customerDecision?: CustomerDecision;
  waveSource?: string;
  customerStatus?: string;
  startDate?: string;
  targetDate?: string;
  percentDone?: number;
  roadmapNote?: string;
}

export const CLASSIFICATIONS = [
  "1 · No AI",
  "2 · No AI – Code App (Power Platform)",
  "3 · M365 Copilot",
  "4 · Copilot Cowork",
  "5 · Copilot Studio",
  "6 · Microsoft Fabric (data agents & apps)",
  "7 · Microsoft Foundry",
  "8 · Unknown – not enough information",
] as const;

export interface SourceRef {
  type: string;
  title: string;
  date?: string;
  url?: string;
}

/** Lines "Type | Title | Date | URL". */
export function parseSources(s?: string): SourceRef[] {
  if (!s) return [];
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const line of s.split(/\r?\n/)) {
    const parts = line.split(" | ").map((x) => x.trim());
    if (parts.length < 2 || !parts[1]) continue;
    const [type, title, date, url] = parts;
    const key = (url || title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, title, date: date || undefined, url: url || undefined });
  }
  return out;
}

export interface RelatedRef {
  id: string;
  title: string;
  reason?: string;
}

/** Lines "id | title | reason". */
export function parseRelated(s?: string): RelatedRef[] {
  if (!s) return [];
  return s
    .split(/\r?\n/)
    .map((l) => l.split(" | ").map((x) => x.trim()))
    .filter((p) => p.length >= 2 && /^\d+$/.test(p[0]))
    .map(([id, title, reason]) => ({ id, title, reason }));
}

export const LEVELS = ["Low", "Medium", "High"] as const;
export type Level = (typeof LEVELS)[number];

export type SignalKind = "New use case" | "Enrichment" | "Risk" | "Next step" | "FinOps" | "Feature";
export type SourceType = "Email" | "Teams" | "Meeting" | "Document";

export interface Signal {
  id: number;
  title: string;
  account?: Account;
  useCaseRef?: string;
  sourceType?: SourceType;
  sender?: string;
  signalDate?: string;
  insight?: string;
  kind?: SignalKind;
  sourceRef?: string;
}

export interface Feature {
  id: number;
  title: string;
  product?: string;
  status?: "GA" | "Public preview";
  releaseDate?: string;
  summary?: string;
  finOpsImpact?: string;
  relevantUseCases?: string;
  link?: string;
}

export const TEXT_FIELDS = [
  "process",
  "users",
  "pain",
  "outcome",
  "functionalFlow",
  "dataSystems",
  "volumes",
  "kpis",
  "owner",
  "products",
  "nextStep",
  "description",
  "potentialSolution",
  "internalRef",
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type UseCasePatch = {
  wave?: string;
  customerDecision?: CustomerDecision;
  waveSource?: string;
  startDate?: string | null;
  targetDate?: string | null;
  roadmapNote?: string;
  department?: string;
  valueLevel?: Level;
  kpiValues?: string;
  discarded?: boolean;
  discardReason?: string;
  complexity?: Level;
  effort?: Level;
  stage?: Stage;
  decision?: Decision;
  monthlyCost?: number;
  monthlyValue?: number;
  finOpsBasis?: string;
} & Partial<Record<TextField, string>>;

/** FinOps sizing: cost = runs x credits per run x EUR per credit; value = runs x minutes saved / 60 x EUR per hour. */
export function sizeUseCase(i: FinOpsInputs) {
  const cost = i.runsPerMonth * i.creditsPerRun * i.eurPerCredit;
  const value = (i.runsPerMonth * i.minutesSavedPerRun * i.eurPerHour) / 60;
  return { cost, value };
}

export function serializeBasis(i: FinOpsInputs): string {
  return `runs=${i.runsPerMonth};credits=${i.creditsPerRun};eurPerCredit=${i.eurPerCredit};minutes=${i.minutesSavedPerRun};eurPerHour=${i.eurPerHour}`;
}

export function parseBasis(s?: string): FinOpsInputs | null {
  if (!s) return null;
  const map = new Map<string, number>();
  for (const part of s.split(";")) {
    const [k, v] = part.split("=");
    const n = Number(v);
    if (k && Number.isFinite(n)) map.set(k.trim(), n);
  }
  const keys = ["runs", "credits", "eurPerCredit", "minutes", "eurPerHour"];
  if (!keys.every((k) => map.has(k))) return null;
  return {
    runsPerMonth: map.get("runs")!,
    creditsPerRun: map.get("credits")!,
    eurPerCredit: map.get("eurPerCredit")!,
    minutesSavedPerRun: map.get("minutes")!,
    eurPerHour: map.get("eurPerHour")!,
  };
}

/** Business functions used for the department view (fixed list, same as the SharePoint choice column). */
export const DEPARTMENTS = [
  "Finance",
  "Procurement",
  "Supply Chain & Logistics",
  "Manufacturing & Operations",
  "Maintenance & Engineering",
  "Quality",
  "HSE & Sustainability",
  "R&I / R&D",
  "Sales & Marketing",
  "Customer Service",
  "HR",
  "IT & Digital",
  "Legal & Compliance",
  "Communication",
  "Strategy & Management",
  "Other",
] as const;

export const CUSTOMER_DECISIONS = ["Prioritised", "On hold", "Not yet decided", "Not prioritised", "Cancelled"] as const;
export type CustomerDecision = (typeof CUSTOMER_DECISIONS)[number];
export const UNPLANNED = "Unplanned";
