import { useEffect, useState } from "react";

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
export type ChapterId = "demo" | "story" | "journey" | "architecture" | "needs" | "plan" | "value";
export type Layout = "cinematic" | "editorial" | "blueprint" | "storyboard" | "console" | "dashboard";
export interface SolDemo { type: string; title: string; intro: string; note: string; data: Record<string, unknown> }
export interface SolExperience {
  layout: Layout;
  tagline: string;
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

const solMods = import.meta.glob<{ default: Solution }>("../data/solutions/*.json");
const waveMods = import.meta.glob<{ default: WavePlan }>("../data/wave-plans/*.json");

const solKey = (id: string) => `../data/solutions/${id}.json`;
export const SOLUTION_IDS = new Set(Object.keys(solMods).map((k) => k.replace(/^.*\/(\d+)\.json$/, "$1")));
export const hasSolution = (id?: string | number) => id != null && SOLUTION_IDS.has(String(id));

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const waveKey = (account: string, wave: string) => `../data/wave-plans/${slug(account)}-${slug(wave)}.json`;
export const hasWavePlan = (account: string, wave: string) => waveKey(account, wave) in waveMods;

function useLoad<T>(loader: (() => Promise<{ default: T }>) | undefined, key: string) {
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean }>({ key, data: null, loading: Boolean(loader) });
  useEffect(() => {
    let alive = true;
    if (!loader) {
      setState({ key, data: null, loading: false });
      return;
    }
    setState({ key, data: null, loading: true });
    loader().then(
      (m) => alive && setState({ key, data: m.default, loading: false }),
      () => alive && setState({ key, data: null, loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state.key === key ? state : { key, data: null, loading: Boolean(loader) };
}

export function useSolution(id?: string) {
  const k = id ? solKey(id) : "";
  return useLoad<Solution>(k ? solMods[k] : undefined, k);
}

export function useWavePlan(account: string, wave: string) {
  const k = waveKey(account, wave);
  return useLoad<WavePlan>(waveMods[k], k);
}

/** Loads the solutions of a set of use case ids (for wave pages). */
export function useSolutions(ids: string[]) {
  const key = ids.join(",");
  const [data, setData] = useState<Record<string, Solution>>({});
  useEffect(() => {
    let alive = true;
    void Promise.allSettled(ids.filter((i) => solMods[solKey(i)]).map((i) => solMods[solKey(i)]().then((m) => [i, m.default] as const))).then((rs) => {
      if (alive) setData(Object.fromEntries(rs.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))));
    });
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}

const heroMods = import.meta.glob<string>("../assets/solutions/*.webp", { import: "default" });
/** Lazily loads the use case's own hero image, if it has one. */
export function useHeroImage(id: string, fallbackTheme?: string) {
  const key = `../assets/solutions/${id}.webp`;
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let alive = true;
    const l = heroMods[key];
    if (!l) {
      setSrc(themeImage(fallbackTheme));
      return;
    }
    l().then((u) => alive && setSrc(u), () => alive && setSrc(themeImage(fallbackTheme)));
    return () => {
      alive = false;
    };
  }, [key, fallbackTheme]);
  return src;
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
