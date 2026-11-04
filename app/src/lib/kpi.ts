import { RADAR } from "@/radar.config";

/** KPI values: one line per KPI, "Name | Current | Expected | Unit | CurrentNum | ExpectedNum | SavingNum | Primary | Basis". */
export const KPI_UNITS = ["h/yr", "USD/yr", "EUR/yr", "%", "count/yr", "days", "min", "other"] as const;
export type KpiUnit = (typeof KPI_UNITS)[number];

/** Fixed planning assumption to show euro figures in dollars. */
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
      };
    })
    .filter((k) => k.name);
}

const clean = (s: string) => s.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
export function serializeKpis(list: Kpi[]): string {
  return list
    .map((k) =>
      [k.name, k.current, k.expected, k.unit, k.currentNum ?? "", k.expectedNum ?? "", k.savingNum ?? "", k.primary ? "Y" : "N", k.basis]
        .map((x) => clean(String(x)))
        .join(" | "),
    )
    .join("\n");
}

/** Converts a KPI amount (hours or money per year) into USD per year. */
export function toUsd(unit: KpiUnit, n: number | undefined, rate: number): number | undefined {
  if (typeof n !== "number") return undefined;
  if (unit === "h/yr") return n * rate;
  if (unit === "USD/yr") return n;
  if (unit === "EUR/yr") return n * EUR_TO_USD;
  return undefined;
}

export function savingUsd(k: Kpi, rate: number) {
  const s = typeof k.savingNum === "number" ? k.savingNum : typeof k.currentNum === "number" && typeof k.expectedNum === "number" ? k.currentNum - k.expectedNum : undefined;
  return toUsd(k.unit, s, rate);
}

/** Annual saving of a use case = the primary KPI's saving (never summed, to avoid double counting). */
export function caseSavingUsd(kpiValues: string | undefined, rate: number): number | undefined {
  const list = parseKpis(kpiValues);
  const p = list.find((k) => k.primary) ?? list.find((k) => typeof savingUsd(k, rate) === "number");
  return p ? savingUsd(p, rate) : undefined;
}

export const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
