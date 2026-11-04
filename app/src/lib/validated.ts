import type { UseCase } from "@/data/types";

/** Validated = qualified or further (Qualified, Shaping, Pilot, Scale) or a Fund/Test decision, and not discarded. */
export const VALIDATED_STAGES = ["Qualified", "Shaping", "Pilot", "Scale"] as const;
export function isValidated(u: UseCase) {
  if (u.discarded) return false;
  return (VALIDATED_STAGES as readonly string[]).includes(u.stage ?? "") || u.decision === "Fund" || u.decision === "Test";
}

export const stripRef = (t: string) => t.replace(/\s*\[[A-Z]{2,}\d+\]\s*/, " ").trim();
