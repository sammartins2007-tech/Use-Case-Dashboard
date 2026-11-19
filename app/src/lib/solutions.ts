import { useQueries } from "@tanstack/react-query";
import { fetchDoc, useContentIndex, useDoc } from "@/lib/content";

// Designs are validated JSON documents read loosely.
type Loose = ReturnType<typeof JSON.parse>;

/** A use case solved end to end by the L2 specialist board (static design artefact bundled with the app). */
export interface SolLink { title: string; url: string }
export interface SolNode { id: string; layer: string; label: string; product: string; role: string; existing: boolean }
export interface SolEdge { from: string; to: string; label: string }
export interface SolFlow { step: number; from: string; to: string; text: string }
export interface SolPhase { name: string; startWeek: number; endWeek: number; activities: string[]; deliverables: string[]; effortDays: number; roles: { role: string; days: number }[] }
export interface Solution {
  id: string;
  title: string;
  wave: string;
  headline: string;
  theme: string;
  solutionName: string;
  pattern: string;
  leadSpecialist?: string;
  story: { today: string[]; tomorrow: string[]; dayInTheLife: string };
  personas: { role: string; need: string; gain: string }[];
  journey: { stage: string; actor: string; before: string; after: string; touchpoint: string; feelBefore: number; feelAfter: number; aiMoment: boolean }[];
  architecture: { summary: string; layers: string[]; nodes: SolNode[]; edges: SolEdge[]; flow: SolFlow[]; decisions: { decision: string; choice: string; alternatives: string; why: string }[] };
  specialists?: { agent: string; involvement: string; verdict: string; findings: string[]; risks: string[]; learn: SolLink[] }[];
  needs?: SolNeed[];
  technical?: SolTechnical;
  experience?: SolExperience;
  creative?: SolCreative;
  techViews?: TechViews;
  /** Route-specific design (v3). When present the page shows route-true chapters. */
  route?: string;
  routeCheck?: { verdict: "Agree" | "Challenge"; suggested?: string; why: string };
  blueprint?: Blueprint;
  plan: {
    summary: string;
    prerequisites: string[];
    phases: SolPhase[];
    configure: string[];
    build: string[];
    deploy: string[];
    milestones: { week: number; name: string }[];
    totalEffortDays: number;
    durationWeeks: number;
    effortBasis: string;
    team: { role: string; fte: number }[];
  };
  runCost: { drivers: string[]; note: string };
  kpis: { name: string; baseline: string; target: string; measure: string }[];
  risks: { risk: string; impact: string; mitigation: string }[];
  openQuestions: string[];
  readinessVerdict: string;
  sources: SolLink[];
}

export interface SolCreative {
  journeyStyle: "metro" | "swimlane" | "split" | "cards" | "spiral" | "curve";
  stepIcons: string[];
  numbers: { value: number; prefix?: string; suffix?: string; label: string; basis: "Dossier" | "Illustrative" }[];
  dayInTheLife: { time: string; scene: string; icon: string }[];
  motif: string;
  signature: { kicker: string; line: string; emoji: string };
  funFact?: string;
  challenge?: { question: string; options: string[]; answer: number; explain: string };
}
export interface SolNeed { item: string; category: string; why: string; status: "In place" | "To set up" | "To confirm" }
export interface SolZone { id: string; label: string; kind: string }
export interface SolComponent { id: string; zone: string; name: string; service: string; detail: string; kind: string }
export interface SolConnection { from: string; to: string; protocol: string; auth: string; data: string }
export interface SolTechnical {
  summary: string;
  zones: SolZone[];
  components: SolComponent[];
  connections: SolConnection[];
  crossCutting: Record<"identity" | "security" | "networking" | "alm" | "monitoring" | "dataResidency", string>;
}
export type ChapterId = "demo" | "story" | "journey" | "architecture" | "needs" | "plan" | "value" | "build" | "golive" | "hackathon" | "pathway";
export type Layout = "cinematic" | "editorial" | "blueprint" | "storyboard" | "console" | "dashboard";
export interface SolDemo { type: string; title: string; intro: string; note: string; data: Record<string, unknown> }
export interface SolExperience {
  layout: Layout;
  tagline: string;
  /** Per-use-case look: colours, title type and header tone, so every solution feels its own. */
  look?: { accent?: string; accent2?: string; canvas?: string; type?: "serif" | "mono" | "sans"; tone?: "light" | "dark" | "tint"; mood?: string };
  hero: string;
  image?: string;
  chapters: { id: ChapterId; title: string; intro: string }[];
  demo: SolDemo;
}

/** Wave delivery plan synthesised from the solved use cases of one wave. */
export interface WavePlan {
  account: string;
  wave: string;
  title: string;
  summary: string;
  outcomes: string[];
  totals: { useCases: number; effortDays: number; durationWeeks: number; peakTeam: number };
  foundations: { area: string; items: { item: string; why: string; owner: string; week: number; useCases: string[] }[] }[];
  workstreams: { name: string; lead: string; useCases: string[]; startWeek: number; endWeek: number; note: string }[];
  schedule: { id: string; title: string; startWeek: number; endWeek: number; effortDays: number; track: string; dependsOn: string[]; readiness: string }[];
  milestones: { week: number; name: string }[];
  team: { role: string; fte: number; note: string }[];
  effortByRole: { role: string; days: number }[];
  governance: string[];
  risks: { risk: string; impact: string; mitigation: string }[];
  decisionsNeeded: { decision: string; owner: string; by: string }[];
}

/* All use-case-specific content is read from SharePoint (see lib/content.ts); nothing is bundled. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const waveRef = (account: string, wave: string) => `${slug(account)}-${slug(wave)}`;

/** Which use cases have a current design (from the content index). */
export function useHasSolution() {
  const { index } = useContentIndex();
  return (id?: string | number) => index.has("solution", id);
}

/** Which customer waves have a delivery plan. */
export function useHasWavePlan() {
  const { index } = useContentIndex();
  return (account: string, wave: string) => index.has("waveplan", waveRef(account, wave));
}

/** The design of one use case: the current one plus any redesign proposal waiting for review. */
export function useSolution(id?: string) {
  const q = useDoc<Solution>("solution", id);
  return { data: q.data?.current?.data ?? null, loading: q.isLoading, set: q.data, error: q.error };
}

export function useWavePlan(account: string, wave: string) {
  const q = useDoc<WavePlan>("waveplan", waveRef(account, wave));
  return { data: q.data?.current?.data ?? null, loading: q.isLoading };
}

/** Loads the current designs of a set of use case ids (for wave pages). */
export function useSolutions(ids: string[]) {
  const qs = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["doc", "solution", id],
      staleTime: 5 * 60_000,
      queryFn: () => fetchDoc<Solution>("solution", id),
    })),
  });
  const out: Record<string, Solution> = {};
  qs.forEach((q, i) => {
    const d = q.data?.current?.data;
    if (d) out[ids[i]] = d;
  });
  return out;
}

/** The use case's own hero image (stored as a data URL), else its theme image. */
export function useHeroImage(id: string, fallbackTheme?: string) {
  const q = useDoc<string>("image", id, false);
  const own = q.data?.current?.data;
  return own && own.startsWith("data:image/") ? own : q.isLoading ? "" : themeImage(fallbackTheme);
}

export const THEMES = ["lab", "plant", "finance", "procurement", "customer", "people", "compliance", "market", "sustainability", "communication", "logistics", "engineering"] as const;
const themeMods = import.meta.glob<string>("../assets/themes/*.webp", { eager: true, import: "default" });
export function themeImage(theme?: string): string {
  const t = THEMES.includes((theme ?? "") as (typeof THEMES)[number]) ? theme : "plant";
  return themeMods[`../assets/themes/${t}.webp`] ?? "";
}

export const LAYER_LABEL: Record<string, string> = {
  experience: "Experience",
  orchestration: "Orchestration",
  intelligence: "Intelligence",
  knowledge: "Knowledge & data",
  integration: "Integration",
  trust: "Trust & governance",
};
export const LAYER_ORDER = ["experience", "orchestration", "intelligence", "knowledge", "integration", "trust"];

export const SPECIALIST_SHORT: Record<string, string> = {
  "SE - Copilot Studio L2": "Copilot Studio",
  "SE - M365 Copilot & Co-Work L2": "M365 Copilot & Cowork",
  "SE - Power Platform - L2": "Power Platform",
  "SE - Azure AI / Foundry L2": "Azure AI & Foundry",
  "SE - Data & Knowledge Architecture L2": "Data & Knowledge",
  "SE - Integration & Tools L2": "Integration & Tools",
  "SE - Security & Compliance L2": "Security & Compliance",
  "SE - D365": "Dynamics 365",
};

export type LayerId = "experience" | "intelligence" | "orchestration" | "data" | "platform";
export interface TechComponent {
  name: string;
  product: string;
  role: string;
  status: "existing" | "new" | "to-confirm";
}
export interface TechViews {
  layers: { headline: string; layers: { id: LayerId; components: TechComponent[] }[] };
  context: {
    headline: string;
    system: string;
    actors: { name: string; interaction: string }[];
    systems: { name: string; kind: "customer" | "microsoft" | "external"; direction: "in" | "out" | "both"; exchange: string }[];
  };
  data: {
    headline: string;
    sources: { name: string; system: string; format: string; classification: string; volume: string; access: string }[];
    pipeline: { stage: string; what: string; product: string }[];
    outputs: { name: string; store: string; retention: string }[];
    residency: string;
  };
  decisions: { question: string; options: string[]; choice: string; why: string; ref: string }[];
  nfr: { area: string; point: string }[];
}

/* ---------- Route-specific blueprint (v3) ---------- */
export type BlueprintKind = "noai" | "codeapp" | "m365" | "cowork" | "studio" | "fabric" | "foundry" | "unknown";
export interface Blueprint {
  kind: BlueprintKind;
  answer: string;
  whatItIs: string;
  notThis: string;
  effort: { value: number; unit: "hours" | "days" | "weeks"; who: string; basis: string };
  runCost: { model: string; monthlyUSD: number | null; basis: string };
  prerequisites: { item: string; status: "In place" | "To set up" | "To confirm" }[];
  golive: { step: string; who: string; time: string }[];
  stepUp: { when: string; to: string; what: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kit: Record<string, Loose>;
}
export const KIND_BY_ROUTE: Record<string, BlueprintKind> = { "1": "noai", "2": "codeapp", "3": "m365", "4": "cowork", "5": "studio", "6": "fabric", "7": "foundry", "8": "unknown" };
export const BUILD_TITLE: Record<BlueprintKind, string> = {
  noai: "The rules and the automation",
  codeapp: "The app",
  m365: "The prompt",
  cowork: "The task brief",
  studio: "The agent",
  fabric: "The data product",
  foundry: "The model and pipeline",
  unknown: "What we still need",
};
