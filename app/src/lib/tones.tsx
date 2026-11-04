import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "gray";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  amber: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  red: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  blue: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  gray: "bg-muted text-foreground border-border",
};

const DOT_CLASS: Record<Tone, string> = {
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  red: "bg-rose-600",
  blue: "bg-sky-600",
  gray: "bg-zinc-400",
};

const DECISION_TONE: Record<string, Tone> = {
  Fund: "green",
  Test: "blue",
  Hold: "amber",
  Stop: "red",
  Undecided: "gray",
};
const STAGE_TONE: Record<string, Tone> = {
  Signal: "gray",
  Qualified: "blue",
  Shaping: "blue",
  Pilot: "amber",
  Scale: "green",
  Parked: "gray",
  Stopped: "red",
};
const CONFIDENCE_TONE: Record<string, Tone> = { High: "green", Medium: "amber", Low: "gray" };
const KIND_TONE: Record<string, Tone> = {
  "New use case": "blue",
  Enrichment: "gray",
  Risk: "red",
  "Next step": "amber",
  FinOps: "green",
  Feature: "blue",
};
const STATUS_TONE: Record<string, Tone> = { GA: "green", "Public preview": "amber" };

const MAPS = {
  decision: DECISION_TONE,
  stage: STAGE_TONE,
  confidence: CONFIDENCE_TONE,
  kind: KIND_TONE,
  status: STATUS_TONE,
} as const;

export type ToneField = keyof typeof MAPS;

export function toneOf(field: ToneField, value?: string): Tone {
  return (value && MAPS[field][value]) || "gray";
}

export function ToneBadge({
  field,
  value,
  label,
  className,
}: {
  field: ToneField;
  value?: string;
  label?: string;
  className?: string;
}) {
  if (!value) return null;
  const tone = toneOf(field, value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full forced-colors:bg-[CanvasText]", DOT_CLASS[tone])} aria-hidden="true" />
      {label ? `${label}: ${value}` : value}
    </span>
  );
}

export function ToneDot({ field, value }: { field: ToneField; value?: string }) {
  const tone = toneOf(field, value);
  return <span className={cn("inline-block size-2 shrink-0 rounded-full forced-colors:bg-[CanvasText]", DOT_CLASS[tone])} aria-hidden="true" />;
}

export const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
