import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AIConsumptionService,
  CustomersService,
  FeatureRadarService,
  HAS_AI_CONSUMPTION,
  SignalsService,
  UseCasesService,
  type FeatureRadarRead,
  type SignalsRead,
  type UseCasesRead,
  type UseCasesWrite,
} from "./services";
import { TEXT_FIELDS, type CustomerDecision, type Account, type Confidence, type Decision, type Feature, type Level, type Signal, type SignalKind, type SourceType, type Stage, type TextField, type UseCase, type UseCasePatch } from "./types";

import { RADAR } from "@/radar.config";
import { LIVE_READ_ONLY, ReadOnlyError } from "@/lib/read-only";

/** A row retired by the customer copy sync (SourceId 0); never present in the master lists. */
const isTombstone = (r: object) => (r as { SourceId?: unknown }).SourceId === 0;

const PAGE_SIZE = 250;

export interface Page<T> {
  rows: T[];
  nextToken?: string;
}

const day = (v?: string) => (v ? v.slice(0, 10) : undefined);
const choice = <T extends string>(v?: { Value?: string } | null) => (v?.Value ? (v.Value as T) : undefined);

function toUseCase(r: UseCasesRead): UseCase {
  return {
    id: r.ID ?? 0,
    title: r.Title ?? "",
    account: choice<Account>(r.Account),
    pain: r.Pain,
    process: r.Process,
    outcome: r.Outcome,
    stage: choice<Stage>(r.Stage),
    products: r.Products,
    monthlyCost: typeof r.MonthlyCostEUR === "number" ? r.MonthlyCostEUR : undefined,
    monthlyValue: typeof r.MonthlyValueEUR === "number" ? r.MonthlyValueEUR : undefined,
    finOpsBasis: r.FinOpsBasis,
    owner: r.Owner,
    nextStep: r.NextStep,
    people: r.People,
    steps: r.Steps,
    featureUnlock: r.FeatureUnlock,
    confidence: choice<Confidence>(r.Confidence),
    decision: choice<Decision>(r.Decision),
    lastSignal: day(r.LastSignal),
    signalCount: r.SignalCount,
    evidence: r.Evidence,
    users: r.Users,
    functionalFlow: r.FunctionalFlow,
    dataSystems: r.DataSystems,
    volumes: r.Volumes,
    kpis: r.KPIs,
    openQuestions: r.OpenQuestions,
    analysis: r.Analysis,
    complexity: choice<Level>(r.Complexity),
    effort: choice<Level>(r.Effort),
    sizingBasis: r.SizingBasis,
    classification: choice<string>(r.Classification),
    classificationConfidence: choice<Confidence>(r.ClassificationConfidence),
    classificationWhy: r.ClassificationWhy,
    classificationNext: r.ClassificationNext,
    flag: r.Flag,
    discarded: r.Discarded === true,
    discardReason: r.DiscardReason,
    sources: r.Sources,
    insights: r.Insights,
    relatedUseCases: r.RelatedUseCases,
    internalRef: r.InternalRef,
    description: r.Description,
    potentialSolution: r.PotentialSolution,
    readiness: r.Readiness,
    kpiValues: r.KPIValues,
    department: choice<string>(r.Department),
    valueLevel: choice<Level>(r.ValueLevel),
    valueBasis: r.ValueBasis,
    priorityFit: r.PriorityFit,
    priorityWhy: r.PriorityWhy,
    wave: r.Wave?.trim() || undefined,
    customerDecision: choice<CustomerDecision>(r.CustomerDecision),
    waveSource: r.WaveSource,
    customerStatus: r.CustomerStatus,
    startDate: day(r.StartDate),
    targetDate: day(r.TargetDate),
    percentDone: typeof r.PercentDone === "number" ? r.PercentDone : undefined,
    roadmapNote: r.RoadmapNote,
  };
}

function toSignal(r: SignalsRead): Signal {
  return {
    id: r.ID ?? 0,
    title: r.Title ?? "",
    account: choice<Account>(r.Account),
    useCaseRef: r.UseCaseRef,
    sourceType: choice<SourceType>(r.SourceType),
    sender: r.Sender,
    signalDate: day(r.SignalDate),
    insight: r.Insight,
    kind: choice<SignalKind>(r.Kind),
    sourceRef: r.SourceRef,
  };
}

function toFeature(r: FeatureRadarRead): Feature {
  return {
    id: r.ID ?? 0,
    title: r.Title ?? "",
    product: r.Product,
    status: choice<"GA" | "Public preview">(r.Status),
    releaseDate: day(r.ReleaseDate),
    summary: r.Summary,
    finOpsImpact: r.FinOpsImpact,
    relevantUseCases: r.RelevantUseCases,
    link: r.Link,
  };
}

/** Every page of a list, in order. Counts, customer pages and search must see ALL rows, never the first page only. */
async function readAll<T>(fetchPage: (skipToken?: string) => Promise<{ success: boolean; data?: T[]; error?: unknown; skipToken?: string }>): Promise<T[]> {
  const rows: T[] = [];
  let token: string | undefined;
  for (let i = 0; i < 100; i++) {
    const result = await fetchPage(token);
    if (!result.success) {
      console.error("connector error", result.error);
      throw result.error;
    }
    rows.push(...(result.data ?? []));
    token = result.skipToken?.trim() || undefined;
    if (!token) break;
  }
  return rows;
}

// The skipToken argument is kept for the pager components; every query now returns the complete list.
export function useUseCases(_skipToken?: string) {
  void _skipToken;
  return useQuery({
    queryKey: ["useCases", "all"],
    queryFn: async (): Promise<Page<UseCase>> => {
      const rows = await readAll((skipToken) => UseCasesService.getAll({ top: PAGE_SIZE, orderBy: ["LastSignal desc"], skipToken }));
      return { rows: rows.filter((r) => !isTombstone(r)).map(toUseCase), nextToken: undefined };
    },
  });
}

export function useUseCase(id?: string) {
  return useQuery({
    queryKey: ["useCase", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<UseCase | null> => {
      const result = await UseCasesService.get(String(id));
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return result.data && !isTombstone(result.data) ? toUseCase(result.data) : null;
    },
  });
}

const odataText = (v: string) => v.replace(/'/g, "''");

export function useSignalsFor(title?: string) {
  return useQuery({
    queryKey: ["signalsFor", title],
    enabled: Boolean(title),
    queryFn: async (): Promise<Signal[]> => {
      const result = await SignalsService.getAll({ filter: `UseCaseRef eq '${odataText(title ?? "")}'`, top: 200 });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return (result.data ?? []).filter((r) => !isTombstone(r)).map(toSignal);
    },
  });
}

export function useSignals(_skipToken?: string) {
  void _skipToken;
  return useQuery({
    queryKey: ["signals", "all"],
    queryFn: async (): Promise<Page<Signal>> => {
      const rows = await readAll((skipToken) => SignalsService.getAll({ top: PAGE_SIZE, orderBy: ["SignalDate desc"], skipToken }));
      return { rows: rows.filter((r) => !isTombstone(r)).map(toSignal), nextToken: undefined };
    },
  });
}

export function useFeatures(_skipToken?: string) {
  void _skipToken;
  return useQuery({
    queryKey: ["features", "all"],
    queryFn: async (): Promise<Page<Feature>> => {
      const rows = await readAll((skipToken) => FeatureRadarService.getAll({ top: PAGE_SIZE, orderBy: ["ReleaseDate desc"], skipToken }));
      return { rows: rows.filter((r) => !isTombstone(r)).map(toFeature), nextToken: undefined };
    },
  });
}

export function useUpdateUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: UseCasePatch }) => {
      if (LIVE_READ_ONLY) throw new ReadOnlyError();
      const changed: Partial<Omit<UseCasesWrite, "ID">> = {};
      if (patch.stage) changed.Stage = { Value: patch.stage };
      if (patch.decision) changed.Decision = { Value: patch.decision };
      if (patch.complexity) changed.Complexity = { Value: patch.complexity };
      if (typeof patch.discarded === "boolean") changed.Discarded = patch.discarded;
      if (typeof patch.discardReason === "string") changed.DiscardReason = patch.discardReason;
      if (typeof patch.kpiValues === "string") changed.KPIValues = patch.kpiValues;
      if (patch.department) changed.Department = { Value: patch.department };
      if (patch.valueLevel) changed.ValueLevel = { Value: patch.valueLevel };
      if (typeof patch.wave === "string") changed.Wave = patch.wave;
      if (patch.customerDecision) changed.CustomerDecision = { Value: patch.customerDecision };
      if (typeof patch.waveSource === "string") changed.WaveSource = patch.waveSource;
      if (patch.startDate !== undefined) (changed as Record<string, unknown>).StartDate = patch.startDate ? `${patch.startDate}T00:00:00Z` : null;
      if (patch.targetDate !== undefined) (changed as Record<string, unknown>).TargetDate = patch.targetDate ? `${patch.targetDate}T00:00:00Z` : null;
      if (typeof patch.roadmapNote === "string") changed.RoadmapNote = patch.roadmapNote;
      if (patch.effort) changed.Effort = { Value: patch.effort };
      if (typeof patch.monthlyCost === "number") changed.MonthlyCostEUR = patch.monthlyCost;
      if (typeof patch.monthlyValue === "number") changed.MonthlyValueEUR = patch.monthlyValue;
      if (typeof patch.finOpsBasis === "string") changed.FinOpsBasis = patch.finOpsBasis;
      const text: Record<TextField, keyof UseCasesWrite> = {
        process: "Process",
        users: "Users",
        pain: "Pain",
        outcome: "Outcome",
        functionalFlow: "FunctionalFlow",
        dataSystems: "DataSystems",
        volumes: "Volumes",
        kpis: "KPIs",
        owner: "Owner",
        products: "Products",
        nextStep: "NextStep",
        description: "Description",
        potentialSolution: "PotentialSolution",
        internalRef: "InternalRef",
      };
      if (typeof patch.readiness === "string") changed.Readiness = patch.readiness;
      if (typeof patch.people === "string") changed.People = patch.people;
      if (typeof patch.steps === "string") changed.Steps = patch.steps;
      if (typeof patch.openQuestions === "string") changed.OpenQuestions = patch.openQuestions;
      if (typeof patch.analysis === "string") changed.Analysis = patch.analysis;
      if (typeof patch.evidence === "string") changed.Evidence = patch.evidence;
      if (typeof patch.lastSignal === "string") changed.LastSignal = patch.lastSignal;
      if (typeof patch.sources === "string") changed.Sources = patch.sources;
      if (patch.classification) changed.Classification = { Value: patch.classification };
      if (patch.classificationConfidence) changed.ClassificationConfidence = { Value: patch.classificationConfidence };
      if (typeof patch.classificationWhy === "string") changed.ClassificationWhy = patch.classificationWhy;
      for (const k of TEXT_FIELDS) {
        const v = patch[k];
        if (typeof v === "string") (changed as Record<string, unknown>)[text[k]] = v;
      }
      const result = await UseCasesService.update(String(id), changed);
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["useCases"] });
      qc.invalidateQueries({ queryKey: ["useCase", String(v.id)] });
    },
  });
}

export interface ConsumptionRow {
  id: number;
  title: string;
  runDate?: string;
  kind?: string;
  status?: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  estimated: boolean;
  basis?: string;
}

/** AI consumption log. Small list (one row per run); pages are followed so totals are complete. */
export function useConsumption() {
  return useQuery({
    queryKey: ["consumption"],
    staleTime: 60_000,
    enabled: HAS_AI_CONSUMPTION && !LIVE_READ_ONLY,
    queryFn: async (): Promise<ConsumptionRow[]> => {
      const rows: ConsumptionRow[] = [];
      let skipToken: string | undefined;
      for (let page = 0; page < 20; page++) {
        const result = await AIConsumptionService.getAll({ top: 500, orderBy: ["RunDate desc"], skipToken });
        if (!result.success) {
          console.error("connector error", result.error);
          throw result.error;
        }
        for (const r of result.data ?? []) {
          rows.push({
            id: r.ID ?? 0,
            title: r.Title ?? "",
            runDate: r.RunDate,
            kind: choice<string>(r.Kind),
            status: choice<string>(r.Status),
            inputTokens: typeof r.InputTokens === "number" ? r.InputTokens : 0,
            outputTokens: typeof r.OutputTokens === "number" ? r.OutputTokens : 0,
            costUSD: typeof r.CostUSD === "number" ? r.CostUSD : 0,
            estimated: r.Estimated !== false,
            basis: r.Basis,
          });
        }
        skipToken = result.skipToken?.trim() || undefined;
        if (!skipToken) break;
      }
      return rows;
    },
  });
}

export interface MeterReading {
  id: number;
  date: string;
  credits: number;
  note?: string;
  origin?: string;
}

/** Measured Cowork credits per day (settings rows tagged DocKind = meter; entered from the Cowork Usage screen). */
export function useMeterReadings() {
  return useQuery({
    queryKey: ["meterReadings"],
    staleTime: 60_000,
    enabled: !LIVE_READ_ONLY,
    queryFn: async (): Promise<MeterReading[]> => {
      const result = await CustomersService.getAll({ top: 500, filter: "DocKind eq 'meter'" });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return (result.data ?? [])
        .map((r) => r as unknown as { ID?: number; DocKind?: string; DocRef?: string; DocSeq?: number; DocReason?: string; DocOrigin?: string })
        .filter((r) => r.DocKind === "meter" && /^\d{4}-\d{2}-\d{2}$/.test(r.DocRef ?? "") && typeof r.DocSeq === "number")
        .map((r) => ({ id: r.ID ?? 0, date: r.DocRef as string, credits: r.DocSeq as number, note: r.DocReason, origin: r.DocOrigin }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

export interface CustomerSetting {
  id: number;
  account: string;
  hourlyRate: number;
  note?: string;
  reportTitle?: string;
  reportUrl?: string;
  reportYear?: string;
  headline?: string;
  priorities: Priority[];
  waves: WaveDef[];
}

export interface WaveDef {
  id: string;
  label: string;
  /** YYYY-MM */
  start?: string;
  /** YYYY-MM */
  end?: string;
}

/** Waves field: one line per wave, "W1 | label | start YYYY-MM | end YYYY-MM". */
export function parseWaves(s?: string): WaveDef[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p[0])
    .map((p) => ({ id: p[0], label: p[1] || p[0], start: p[2] || undefined, end: p[3] || undefined }));
}
export const serializeWaves = (w: WaveDef[]) =>
  w.map((x) => [x.id, x.label, x.start ?? "", x.end ?? ""].map((v) => v.replace(/\|/g, "/")).join(" | ")).join("\n");

export interface Priority {
  id: string;
  title: string;
  summary: string;
  quote?: string;
  source?: string;
  aiAngle?: string;
}

/** Priorities field: one line per priority, "P1 | title | summary | quote | source URL | AI angle". */
export function parsePriorities(s?: string): Priority[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => /^P\d+$/.test(p[0] ?? ""))
    .map((p) => ({ id: p[0], title: p[1] ?? "", summary: p[2] ?? "", quote: p[3] || undefined, source: p[4] || undefined, aiAngle: p[5] || undefined }));
}

export const fitsOf = (s?: string) => (s ?? "").split(/[;,\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^P\d+$/.test(x));

export function useCustomerSettings() {
  return useQuery({
    queryKey: ["customerSettings"],
    staleTime: 60_000,
    queryFn: async (): Promise<CustomerSetting[]> => {
      // The list also holds the solution content (DocKind rows); customer settings are tagged DocKind = customer.
      const result = await CustomersService.getAll({ top: 100, filter: "DocKind eq 'customer'" });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return (result.data ?? []).filter((r) => { const k = (r as unknown as { DocKind?: string }).DocKind; return !k || k === "customer"; }).map((r) => ({
        id: r.ID ?? 0,
        account: r.Title ?? "",
        hourlyRate: typeof r.HourlyRateUSD === "number" && r.HourlyRateUSD > 0 ? r.HourlyRateUSD : RADAR.defaultHourlyRateUSD,
        note: r.RateNote,
        reportTitle: r.ReportTitle,
        reportUrl: r.ReportUrl,
        reportYear: r.ReportYear,
        headline: r.Headline,
        priorities: parsePriorities(r.Priorities),
        waves: parseWaves(r.Waves),
      }));
    },
  });
}

/** The customer's average loaded hourly cost in USD (default 50). */
export function useHourlyRate(account?: string) {
  const q = useCustomerSettings();
  const s = q.data?.find((c) => c.account === (account ?? "Internal"));
  return { rate: s?.hourlyRate ?? RADAR.defaultHourlyRateUSD, setting: s, q };
}

export function useSaveHourlyRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, account, rate }: { id?: number; account: string; rate: number }) => {
      if (LIVE_READ_ONLY) throw new ReadOnlyError();
      const result = id
        ? await CustomersService.update(String(id), { HourlyRateUSD: rate, RateNote: "Set in the app" })
        : await CustomersService.create({ Title: account, HourlyRateUSD: rate, RateNote: "Set in the app", DocKind: "customer" } as never);
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customerSettings"] }),
  });
}

export function useSaveWaves() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, account, waves }: { id?: number; account: string; waves: WaveDef[] }) => {
      if (LIVE_READ_ONLY) throw new ReadOnlyError();
      const result = id
        ? await CustomersService.update(String(id), { Waves: serializeWaves(waves) })
        : await CustomersService.create({ Title: account, Waves: serializeWaves(waves), DocKind: "customer" } as never);
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customerSettings"] }),
  });
}
