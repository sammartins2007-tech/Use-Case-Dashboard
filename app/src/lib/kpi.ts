import { RADAR } from "@/radar.config";

/** KPI values: one line per KPI, "Name | Current | Expected | Unit | CurrentNum | ExpectedNum | SavingNum | Primary | Basis | Kind".
 * Kind (optional 10th field): Time, Cost or Revenue; inferred when missing. Money is in US dollars only. */
export const KPI_UNITS = ["h/yr", "USD/yr", "EUR/yr", "%", "count/yr", "days", "min", "other"] as const;
/** Units offered when editing (dollars only). EUR/yr is still read from old data and shown in dollars. */
export const KPI_EDIT_UNITS = ["h/yr", "USD/yr", "%", "count/yr", "days", "min", "other"] as const;
export type KpiUnit = (typeof KPI_UNITS)[number];
export type KpiKind = "Time" | "Cost" | "Revenue";
export const KPI_KINDS: KpiKind[] = ["Time", "Cost", "Revenue"];

/** Fixed planning assumption used only to convert old euro figures into dollars. */
export const EUR_TO_USD = 1.08;
export const DEFAULT_HOURLY_RATE = RADAR.defaultHourlyRateUSD;

export interface Kpi {
  name: string;
  current: string;
  expected: string;
  unit: KpiUnit;
  currentNum?: number;
  expectedNum?: number;
  savingNum?: number;
  primary: boolean;
  basis: string;
  /** Explicit kind from the 10th field; use kindOf() for the effective kind. */
  kind?: KpiKind;
}

const num = (s?: string) => {
  const t = (s ?? "").replace(/[,\s]/g, "");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

export function parseKpis(s?: string): Kpi[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const p = l.split("|").map((x) => x.trim());
      const unit = (KPI_UNITS as readonly string[]).includes(p[3]) ? (p[3] as KpiUnit) : "other";
      return {
        name: p[0] ?? "",
        current: p[1] ?? "",
        expected: p[2] ?? "",
        unit,
        currentNum: num(p[4]),
        expectedNum: num(p[5]),
        savingNum: num(p[6]),
        primary: (p[7] ?? "").toUpperCase() === "Y",
        basis: p[8] ?? "",
        kind: (KPI_KINDS as string[]).includes(p[9] ?? "") ? (p[9] as KpiKind) : undefined,
      };
    })
    .filter((k) => k.name);
}

const clean = (s: string) => s.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
export function serializeKpis(list: Kpi[]): string {
  return list
    .map((k) =>
      [k.name, k.current, k.expected, k.unit, k.currentNum ?? "", k.expectedNum ?? "", k.savingNum ?? "", k.primary ? "Y" : "N", k.basis, ...(k.kind ? [k.kind] : [])]
        .map((x) => clean(String(x)))
        .join(" | "),
    )
    .join("\n");
}

const REVENUE_RE = /revenue|sales|margin|turnover|top.?line|new customers|additional customers|upsell|cross.?sell|win rate|price realisation|price realization|market share|growth/i;
const NOT_CASH_RE = /productivity value|value of (time|hours)|not cashable/i;

const isMoney = (u: KpiUnit) => u === "USD/yr" || u === "EUR/yr";

/** Effective kind of a KPI: explicit, or inferred from its unit and name. Undefined when it carries no annual value. */
export function kindOf(k: Kpi): KpiKind | undefined {
  if (k.kind) return k.kind;
  if (k.unit === "h/yr") return "Time";
  if (isMoney(k.unit)) {
    if (NOT_CASH_RE.test(k.name)) return undefined; // hours expressed in money: never counted as dollars
    return REVENUE_RE.test(k.name) ? "Revenue" : "Cost";
  }
  return undefined;
}

/** Amount in dollars (money units only). */
export function toUsd(unit: KpiUnit, n: number | undefined): number | undefined {
  if (typeof n !== "number") return undefined;
  if (unit === "USD/yr") return n;
  if (unit === "EUR/yr") return Math.round(n * EUR_TO_USD);
  return undefined;
}

/** Annual gain of one KPI: hours for Time, dollars for Cost and Revenue. */
export function kpiGain(k: Kpi): number | undefined {
  const s = typeof k.savingNum === "number" ? k.savingNum : typeof k.currentNum === "number" && typeof k.expectedNum === "number" ? k.currentNum - k.expectedNum : undefined;
  if (typeof s !== "number" || !Number.isFinite(s)) return undefined;
  const kind = kindOf(k);
  if (!kind) return undefined;
  if (kind === "Time") return k.unit === "h/yr" ? s : undefined;
  return toUsd(k.unit, kind === "Revenue" && typeof k.savingNum !== "number" ? -s : s);
}

export interface CaseValue {
  hours?: number;
  costUsd?: number;
  revenueUsd?: number;
}

/** Value of one use case: per kind, the counted (primary) KPI of that kind, else the largest one — never summed within a kind, to avoid double counting. */
export function caseValue(kpiValues: string | undefined): CaseValue {
  const list = parseKpis(kpiValues);
  const pick = (kind: KpiKind) => {
    const ks = list.filter((k) => kindOf(k) === kind && typeof kpiGain(k) === "number" && kpiGain(k)! > 0);
    if (!ks.length) return undefined;
    const p = ks.find((k) => k.primary);
    return p ? kpiGain(p) : Math.max(...ks.map((k) => kpiGain(k)!));
  };
  return { hours: pick("Time"), costUsd: pick("Cost"), revenueUsd: pick("Revenue") };
}

export interface ValueTotals {
  hours: number;
  costUsd: number;
  revenueUsd: number;
  nHours: number;
  nCost: number;
  nRevenue: number;
  nQuantified: number;
  n: number;
}

export function totalsOf(kpiValuesList: (string | undefined)[]): ValueTotals {
  const t: ValueTotals = { hours: 0, costUsd: 0, revenueUsd: 0, nHours: 0, nCost: 0, nRevenue: 0, nQuantified: 0, n: kpiValuesList.length };
  for (const kv of kpiValuesList) {
    const v = caseValue(kv);
    if (v.hours) {
      t.hours += v.hours;
      t.nHours++;
    }
    if (v.costUsd) {
      t.costUsd += v.costUsd;
      t.nCost++;
    }
    if (v.revenueUsd) {
      t.revenueUsd += v.revenueUsd;
      t.nRevenue++;
    }
    if (v.hours || v.costUsd || v.revenueUsd) t.nQuantified++;
  }
  return t;
}

/** Dollar value of a use case (cost savings + revenue gain). Hours are never converted. Used for ranking. */
export function caseDollars(kpiValues: string | undefined): number | undefined {
  const v = caseValue(kpiValues);
  const d = (v.costUsd ?? 0) + (v.revenueUsd ?? 0);
  return d > 0 ? d : undefined;
}

export const hours0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const hoursCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export function fmtHours(h: number, compact = false) {
  return `${(compact ? hoursCompact : hours0).format(h)} h`;
}

export const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
