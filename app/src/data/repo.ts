import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FeatureRadar_704f56Service } from "../../generated/services/FeatureRadar_704f56Service";
import { Signals_704f56Service } from "../../generated/services/Signals_704f56Service";
import { UseCases_704f56Service } from "../../generated/services/UseCases_704f56Service";
import { AIConsumption_704f56Service } from "../../generated/services/AIConsumption_704f56Service";
import { Customers_704f56Service } from "../../generated/services/Customers_704f56Service";
import type { UseCases_704f56Read, UseCases_704f56Write } from "../../generated/models/UseCases_704f56Model";
import type { Signals_704f56Read } from "../../generated/models/Signals_704f56Model";
import type { FeatureRadar_704f56Read } from "../../generated/models/FeatureRadar_704f56Model";
import { TEXT_FIELDS, type Account, type Confidence, type Decision, type Feature, type Level, type Signal, type SignalKind, type SourceType, type Stage, type TextField, type UseCase, type UseCasePatch } from "./types";

import { RADAR } from "@/radar.config";

const PAGE_SIZE = 250;

export interface Page<T> {
  rows: T[];
  nextToken?: string;
}

const day = (v?: string) => (v ? v.slice(0, 10) : undefined);
const choice = <T extends string>(v?: { Value?: string } | null) => (v?.Value ? (v.Value as T) : undefined);

function toUseCase(r: UseCases_704f56Read): UseCase {
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
  };
}

function toSignal(r: Signals_704f56Read): Signal {
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

function toFeature(r: FeatureRadar_704f56Read): Feature {
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

export function useUseCases(skipToken?: string) {
  return useQuery({
    queryKey: ["useCases", { skipToken }],
    queryFn: async (): Promise<Page<UseCase>> => {
      const result = await UseCases_704f56Service.getAll({ top: PAGE_SIZE, orderBy: ["LastSignal desc"], skipToken });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return { rows: (result.data ?? []).map(toUseCase), nextToken: result.skipToken?.trim() || undefined };
    },
  });
}

export function useUseCase(id?: string) {
  return useQuery({
    queryKey: ["useCase", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<UseCase | null> => {
      const result = await UseCases_704f56Service.get(String(id));
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return result.data ? toUseCase(result.data) : null;
    },
  });
}

const odataText = (v: string) => v.replace(/'/g, "''");

export function useSignalsFor(title?: string) {
  return useQuery({
    queryKey: ["signalsFor", title],
    enabled: Boolean(title),
    queryFn: async (): Promise<Signal[]> => {
      const result = await Signals_704f56Service.getAll({ filter: `UseCaseRef eq '${odataText(title ?? "")}'`, top: 200 });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return (result.data ?? []).map(toSignal);
    },
  });
}

export function useSignals(skipToken?: string) {
  return useQuery({
    queryKey: ["signals", { skipToken }],
    queryFn: async (): Promise<Page<Signal>> => {
      const result = await Signals_704f56Service.getAll({ top: PAGE_SIZE, orderBy: ["SignalDate desc"], skipToken });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return { rows: (result.data ?? []).map(toSignal), nextToken: result.skipToken?.trim() || undefined };
    },
  });
}

export function useFeatures(skipToken?: string) {
  return useQuery({
    queryKey: ["features", { skipToken }],
    queryFn: async (): Promise<Page<Feature>> => {
      const result = await FeatureRadar_704f56Service.getAll({ top: PAGE_SIZE, orderBy: ["ReleaseDate desc"], skipToken });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return { rows: (result.data ?? []).map(toFeature), nextToken: result.skipToken?.trim() || undefined };
    },
  });
}

export function useUpdateUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: UseCasePatch }) => {
      const changed: Partial<Omit<UseCases_704f56Write, "ID">> = {};
      if (patch.stage) changed.Stage = { Value: patch.stage };
      if (patch.decision) changed.Decision = { Value: patch.decision };
      if (patch.complexity) changed.Complexity = { Value: patch.complexity };
      if (typeof patch.discarded === "boolean") changed.Discarded = patch.discarded;
      if (typeof patch.discardReason === "string") changed.DiscardReason = patch.discardReason;
      if (typeof patch.kpiValues === "string") changed.KPIValues = patch.kpiValues;
      if (patch.department) changed.Department = { Value: patch.department };
      if (patch.valueLevel) changed.ValueLevel = { Value: patch.valueLevel };
      if (patch.effort) changed.Effort = { Value: patch.effort };
      if (typeof patch.monthlyCost === "number") changed.MonthlyCostEUR = patch.monthlyCost;
      if (typeof patch.monthlyValue === "number") changed.MonthlyValueEUR = patch.monthlyValue;
      if (typeof patch.finOpsBasis === "string") changed.FinOpsBasis = patch.finOpsBasis;
      const text: Record<TextField, keyof UseCases_704f56Write> = {
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
      for (const k of TEXT_FIELDS) {
        const v = patch[k];
        if (typeof v === "string") (changed as Record<string, unknown>)[text[k]] = v;
      }
      const result = await UseCases_704f56Service.update(String(id), changed);
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
    queryFn: async (): Promise<ConsumptionRow[]> => {
      const rows: ConsumptionRow[] = [];
      let skipToken: string | undefined;
      for (let page = 0; page < 20; page++) {
        const result = await AIConsumption_704f56Service.getAll({ top: 500, orderBy: ["RunDate desc"], skipToken });
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
}

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
      const result = await Customers_704f56Service.getAll({ top: 100 });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
      return (result.data ?? []).map((r) => ({
        id: r.ID ?? 0,
        account: r.Title ?? "",
        hourlyRate: typeof r.HourlyRateUSD === "number" && r.HourlyRateUSD > 0 ? r.HourlyRateUSD : RADAR.defaultHourlyRateUSD,
        note: r.RateNote,
        reportTitle: r.ReportTitle,
        reportUrl: r.ReportUrl,
        reportYear: r.ReportYear,
        headline: r.Headline,
        priorities: parsePriorities(r.Priorities),
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
      const result = id
        ? await Customers_704f56Service.update(String(id), { HourlyRateUSD: rate, RateNote: "Set in the app" })
        : await Customers_704f56Service.create({ Title: account, HourlyRateUSD: rate, RateNote: "Set in the app" });
      if (!result.success) {
        console.error("connector error", result.error);
        throw result.error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customerSettings"] }),
  });
}
