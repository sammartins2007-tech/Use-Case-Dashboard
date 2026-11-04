import { UNPLANNED, type UseCase } from "@/data/types";
import type { WaveDef } from "@/data/repo";
import { fitsOf } from "@/data/repo";
import { gatesMet } from "@/lib/readiness";

/** A use case is "customer-decided" when the customer's own pipeline or a person set a decision other than "Not yet decided". */
export const isCustomerDecided = (u: UseCase) => !!u.customerDecision && u.customerDecision !== "Not yet decided";

/** Who placed the use case in its wave. */
export function placementOf(u: UseCase): "customer" | "proposal" | "none" {
  if (!u.wave || u.wave === UNPLANNED) return "none";
  return (u.waveSource ?? "").toLowerCase().startsWith("customer") ? "customer" : "proposal";
}

const LV = { Low: 1, Medium: 2, High: 3 } as const;

/**
 * Suggestion score for unplanned candidates (0–10): value (0–3) + low effort (0–3, 1.5 when unknown)
 * + leadership-priority fit (2) + readiness (0–2 from the five gates).
 */
export function suggestionScore(u: UseCase) {
  const v = u.valueLevel ? LV[u.valueLevel] : 1;
  const e = u.effort ? 4 - LV[u.effort] : 1.5;
  const fit = fitsOf(u.priorityFit).length ? 2 : 0;
  const ready = (gatesMet(u) / 5) * 2;
  return Math.round((v + e + fit + ready) * 10) / 10;
}

/** Waves to show: defined waves, plus any wave id used by a use case but not yet defined. */
export function wavesFor(defs: WaveDef[], useCases: UseCase[]): WaveDef[] {
  const out = [...defs];
  for (const u of useCases) if (u.wave && u.wave !== UNPLANNED && !out.some((w) => w.id === u.wave)) out.push({ id: u.wave, label: u.wave });
  return out.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export const nextWaveId = (waves: WaveDef[]) => {
  const n = waves.map((w) => Number(/\d+/.exec(w.id)?.[0] ?? 0)).reduce((a, b) => Math.max(a, b), 0);
  return `W${n + 1}`;
};

/** Months between two YYYY-MM values, inclusive. */
export function monthsBetween(a: string, b: string) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  const out: string[] = [];
  let y = ya;
  let m = ma;
  while (y < yb || (y === yb && m <= mb)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (out.length > 60) break;
  }
  return out;
}
