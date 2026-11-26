import type { ComponentType } from "react";
import type { ConsumptionRow } from "@/data/repo";
import type { Feature, Signal, UseCase } from "@/data/types";
import type { DesignView, LedgerLine, RunFacts } from "@/lib/story";

export interface StoryStats {
  active: number;
  discarded: number;
  customers: number;
  perAccount: { account: string; count: number }[];
  signals: number;
  bySource: { source: string; count: number }[];
  byKind: { kind: string; count: number }[];
  designs: { current: number; proposed: number; rejected: number; archived: number; requests: number };
  clarifyCases: number;
  features: number;
  runs: number;
  runsCompleted: number;
  runsFailed: number;
  totalCost: number;
  duplicates: number;
}

/** Everything a slide may show. All of it comes from the radar's live lists. */
export interface StoryCtx {
  /** Show mode: hides customer and people names. Every data string goes through it. */
  m: (t?: string) => string;
  showMode: boolean;
  stats: StoryStats;
  discard: { reason: string; count: number }[];
  uc?: UseCase;
  ucSignals: Signal[];
  ledger: LedgerLine[];
  design: DesignView | null;
  designLoading: boolean;
  features: Feature[];
  latestRun?: ConsumptionRow;
  runFacts: RunFacts;
  recentRuns: ConsumptionRow[];
  runTimes: string[];
  zone: string;
  clarifyExample?: string;
  owner: string;
  /** Date of the first refresh run logged. */
  firstRun?: string;
  /** Back to the first slide. */
  restart: () => void;
}

export interface SlideDef {
  key: string;
  chapter: number;
  name: string;
  Render: ComponentType<{ ctx: StoryCtx }>;
  link?: (ctx: StoryCtx) => { to: string; label: string } | null;
}

export const CHAPTERS = [
  "What a use case is",
  "How it is detected",
  "How it learns",
  "Solved by 8 SE agents",
  "Humans decide",
  "Twice a day, by itself",
  "Make it yours",
] as const;
