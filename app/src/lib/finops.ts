/** All-AI FinOps sizing: a list of monthly cost lines covering every AI consumption model. */
export type CostKind = "credits" | "m365" | "tokens" | "fabric" | "power" | "azure" | "build";

export interface CostLine {
  kind: CostKind;
  a: number; // first driver (runs, users, CU price…)
  b: number; // second driver
  c: number; // price
  d?: number; // extra (output tokens / output price)
  e?: number;
}

export interface CostKindDef {
  kind: CostKind;
  label: string;
  covers: string;
  fields: { key: "a" | "b" | "c" | "d" | "e"; label: string; step: string; def: number; prefix?: string }[];
  monthly: (l: CostLine) => number;
  formula: string;
}

export const COST_KINDS: CostKindDef[] = [
  {
    kind: "credits",
    label: "Copilot Credits (Copilot Studio agents & flows)",
    covers: "Copilot Studio agents, agent flows, pay-as-you-go or credit packs",
    fields: [
      { key: "a", label: "Runs per month", step: "1", def: 0 },
      { key: "b", label: "Credits per run", step: "0.5", def: 0 },
      { key: "c", label: "Price per credit", step: "0.001", def: 0.01, prefix: "$" },
    ],
    monthly: (l) => l.a * l.b * l.c,
    formula: "runs × credits per run × price per credit",
  },
  {
    kind: "m365",
    label: "Microsoft 365 Copilot licences",
    covers: "M365 Copilot and Copilot Cowork users",
    fields: [
      { key: "a", label: "Licensed users", step: "1", def: 0 },
      { key: "c", label: "Price per user / month", step: "1", def: 30, prefix: "$" },
      { key: "b", label: "Share for this use case (%)", step: "5", def: 100 },
    ],
    monthly: (l) => (l.a * l.c * l.b) / 100,
    formula: "users × price per user × share attributed",
  },
  {
    kind: "tokens",
    label: "Model tokens (Microsoft Foundry / Azure OpenAI)",
    covers: "Custom agents, RAG, document processing on Foundry models",
    fields: [
      { key: "a", label: "Runs per month", step: "1", def: 0 },
      { key: "b", label: "Input tokens per run (k)", step: "1", def: 10 },
      { key: "c", label: "Input price per M tokens", step: "0.1", def: 2.5, prefix: "$" },
      { key: "d", label: "Output tokens per run (k)", step: "0.5", def: 1 },
      { key: "e", label: "Output price per M tokens", step: "0.5", def: 10, prefix: "$" },
    ],
    monthly: (l) => (l.a * ((l.b * 1000 * l.c) / 1e6 + ((l.d ?? 0) * 1000 * (l.e ?? 0)) / 1e6)),
    formula: "runs × (input tokens × input price + output tokens × output price)",
  },
  {
    kind: "fabric",
    label: "Microsoft Fabric capacity",
    covers: "Data agents, Real-Time Intelligence, semantic models, ML on Fabric",
    fields: [
      { key: "c", label: "Capacity price / month", step: "10", def: 262, prefix: "$" },
      { key: "b", label: "Share for this use case (%)", step: "5", def: 100 },
    ],
    monthly: (l) => (l.c * l.b) / 100,
    formula: "capacity price × share attributed",
  },
  {
    kind: "power",
    label: "Power Platform licences",
    covers: "Power Apps / Power Automate premium users or per-app plans",
    fields: [
      { key: "a", label: "Users", step: "1", def: 0 },
      { key: "c", label: "Price per user / month", step: "1", def: 20, prefix: "$" },
    ],
    monthly: (l) => l.a * l.c,
    formula: "users × price per user",
  },
  {
    kind: "azure",
    label: "Other Azure services",
    covers: "AI Search, Document Intelligence, compute, storage, monitoring",
    fields: [{ key: "c", label: "Monthly amount", step: "10", def: 0, prefix: "$" }],
    monthly: (l) => l.c,
    formula: "monthly amount",
  },
  {
    kind: "build",
    label: "Build & run effort (amortised)",
    covers: "Partner or internal build cost spread over its life",
    fields: [
      { key: "c", label: "One-off build cost", step: "1000", def: 0, prefix: "$" },
      { key: "a", label: "Amortise over (months)", step: "1", def: 36 },
    ],
    monthly: (l) => (l.a > 0 ? l.c / l.a : 0),
    formula: "build cost ÷ months",
  },
];

export const kindDef = (k: CostKind) => COST_KINDS.find((x) => x.kind === k)!;

export function newLine(kind: CostKind): CostLine {
  const l: CostLine = { kind, a: 0, b: 0, c: 0 };
  for (const f of kindDef(kind).fields) (l as unknown as Record<string, number>)[f.key] = f.def;
  return l;
}

/** Default first line from the platform route. */
export function defaultKind(classification?: string): CostKind {
  const c = classification ?? "";
  if (c.startsWith("3") || c.startsWith("4")) return "m365";
  if (c.startsWith("6")) return "fabric";
  if (c.startsWith("7")) return "tokens";
  if (c.startsWith("2") || c.startsWith("1")) return "power";
  return "credits";
}

export const lineCost = (l: CostLine) => {
  const v = kindDef(l.kind).monthly(l);
  return Number.isFinite(v) ? v : 0;
};

export function parseLines(s?: string): CostLine[] | null {
  if (!s) return null;
  try {
    const j = JSON.parse(s) as { v?: number; lines?: CostLine[] };
    if (j && j.v === 2 && Array.isArray(j.lines)) return j.lines.filter((l) => COST_KINDS.some((k) => k.kind === l.kind));
  } catch {
    /* legacy */
  }
  const m = new Map<string, number>();
  for (const part of s.split(";")) {
    const [k, v] = part.split("=");
    const n = Number(v);
    if (k && Number.isFinite(n)) m.set(k.trim(), n);
  }
  if (m.has("runs") && m.has("credits")) return [{ kind: "credits", a: m.get("runs")!, b: m.get("credits")!, c: m.get("eurPerCredit") ?? 0.01 }];
  return null;
}

export const serializeLines = (lines: CostLine[]) => JSON.stringify({ v: 2, lines });
