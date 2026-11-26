import { useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Globe,
  Layers,
  Monitor,
  Network,
  ShieldCheck,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { LayerId, TechComponent, TechViews } from "@/lib/solutions";
import { safeUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

const LAYER: Record<LayerId, { label: string; hint: string; icon: LucideIcon; tint: string; ink: string }> = {
  experience: { label: "Experience", hint: "Where people work", icon: Monitor, tint: "#EEF4FF", ink: "#1F4FA8" },
  intelligence: { label: "Intelligence", hint: "Agents and AI models", icon: Bot, tint: "#F3EEFB", ink: "#5B3A9E" },
  orchestration: { label: "Orchestration & integration", hint: "Flows, connectors, APIs", icon: Workflow, tint: "#EAF6F1", ink: "#1E6B4E" },
  data: { label: "Data & knowledge", hint: "Sources of record and stores", icon: Database, tint: "#FFF5E6", ink: "#8A5A12" },
  platform: { label: "Platform, security & operations", hint: "Identity, governance, ALM, monitoring", icon: ShieldCheck, tint: "#F1F3F6", ink: "#34465E" },
};
const STATUS: Record<TechComponent["status"], { label: string; cls: string }> = {
  existing: { label: "In place", cls: "border-[#B9DCC8] bg-[#E9F5EE] text-[#1E5B3E]" },
  new: { label: "New", cls: "border-[#C9D7F2] bg-[#EEF4FF] text-[#1F4FA8]" },
  "to-confirm": { label: "To confirm", cls: "border-[#F0D9A8] bg-[#FFF7E6] text-[#8A5A12]" },
};
const CLASS_TONE: Record<string, string> = {
  Public: "bg-[#E9F5EE] text-[#1E5B3E]",
  Internal: "bg-[#EEF4FF] text-[#1F4FA8]",
  Confidential: "bg-[#FFF1E0] text-[#8A4B0F]",
  "Highly confidential": "bg-[#FDECEC] text-[#9B2C2C]",
};

type View = "layers" | "context" | "data" | "decisions";
const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "layers", label: "Layers", icon: Layers },
  { id: "context", label: "System context", icon: Network },
  { id: "data", label: "Data", icon: Database },
  { id: "decisions", label: "Decisions & requirements", icon: CheckCircle2 },
];

function Headline({ text }: { text: string }) {
  return <h3 className="mb-4 max-w-4xl font-[family-name:var(--font-serif)] text-[22px] leading-snug text-[#0D2847]">{text}</h3>;
}

function LayersView({ v }: { v: TechViews["layers"] }) {
  return (
    <div>
      <Headline text={v.headline} />
      <div className="space-y-2">
        {v.layers.map((l, i) => {
          const m = LAYER[l.id] ?? LAYER.platform;
          const Icon = m.icon;
          return (
            <div key={l.id}>
              <div className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[220px_1fr]" style={{ background: m.tint, borderColor: `color-mix(in srgb, ${m.ink} 18%, transparent)` }}>
                <div className="flex items-start gap-2.5 p-1">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: m.ink }}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold" style={{ color: m.ink }}>
                      {m.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {(l.components ?? []).map((c) => (
                    <div key={c.name} className="rounded-xl border border-white bg-white/90 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug">{c.name}</span>
                        <span className={cn("shrink-0 rounded-full border px-1.5 py-px text-[10px]", (STATUS[c.status] ?? STATUS["to-confirm"]).cls)}>{(STATUS[c.status] ?? STATUS["to-confirm"]).label}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-medium" style={{ color: m.ink }}>
                        {c.product}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.role}</p>
                    </div>
                  ))}
                </div>
              </div>
              {i < v.layers.length - 1 && (
                <div className="flex justify-center py-0.5 text-[#A9B9CB]" aria-hidden="true">
                  <ArrowDown className="size-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KIND: Record<string, { icon: LucideIcon; label: string; cls: string }> = {
  customer: { icon: Building2, label: "Customer system", cls: "border-[#F0D9A8] bg-[#FFF9EE]" },
  microsoft: { icon: Cloud, label: "Microsoft service", cls: "border-[#C9D7F2] bg-[#F4F8FF]" },
  external: { icon: Globe, label: "External", cls: "border-[#E3DED4] bg-[#FAF8F4]" },
};

function ContextView({ v }: { v: TechViews["context"] }) {
  const Dir = ({ d }: { d: string }) => {
    const I = d === "both" ? ArrowLeftRight : ArrowRight;
    return <I className={cn("size-4 shrink-0 text-[#8A6420]", d === "in" && "rotate-180")} aria-label={d === "in" ? "into the solution" : d === "out" ? "from the solution" : "both ways"} />;
  };
  return (
    <div>
      <Headline text={v.headline} />
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">People</div>
          {v.actors.map((a) => (
            <div key={a.name} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0D2847] text-white">
                <User className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{a.interaction}</span>
              </span>
              <ArrowRight className="hidden size-4 shrink-0 text-[#8A6420] lg:block" aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="mx-auto grid size-44 place-items-center rounded-full border-4 border-double p-4 text-center" style={{ borderColor: "var(--sol, #0D2847)" }}>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">The solution</div>
            <div className="mt-1 font-[family-name:var(--font-serif)] text-lg leading-tight">{v.system}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Systems</div>
          {v.systems.map((sy) => {
            const k = KIND[sy.kind] ?? KIND.external;
            const I = k.icon;
            return (
              <div key={sy.name} className={cn("flex items-center gap-3 rounded-xl border p-3", k.cls)}>
                <Dir d={sy.direction} />
                <I className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{sy.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {k.label} · {sy.exchange}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DataView({ v }: { v: TechViews["data"] }) {
  return (
    <div>
      <Headline text={v.headline} />
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#F3F8FD] text-left text-xs text-muted-foreground">
            <tr>
              {["Data set", "Lives in", "Format", "Classification", "Volume", "How it is read"].map((h) => (
                <th key={h} className="border-b border-border px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.sources.map((r) => (
              <tr key={r.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.system}</td>
                <td className="px-3 py-2">{r.format}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", CLASS_TONE[r.classification] ?? "bg-muted text-muted-foreground")}>{r.classification}</span>
                </td>
                <td className="px-3 py-2">{r.volume}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.access}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Data pipeline</div>
      <ol className="mt-2 flex flex-wrap items-stretch gap-2">
        {v.pipeline.map((p, i) => (
          <li key={`${p.stage}-${i}`} className="flex items-stretch gap-2">
            <div className="w-[190px] rounded-xl border border-border bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-[#0D2847] text-[10px] text-white">{i + 1}</span>
                <span className="text-sm font-semibold">{p.stage}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{p.what}</p>
              <p className="mt-1 text-[11px] font-medium text-[#8A6420]">{p.product}</p>
            </div>
            {i < v.pipeline.length - 1 && <ArrowRight className="size-4 self-center text-[#A9B9CB]" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What it produces</div>
          <ul className="mt-2 space-y-2 text-sm">
            {v.outputs.map((o) => (
              <li key={o.name}>
                <span className="font-medium">{o.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {o.store} · {o.retention}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#C9D7F2] bg-[#F4F8FF] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[#1F4FA8]">Where the data stays</div>
          <p className="mt-2 text-sm leading-relaxed">{v.residency}</p>
        </div>
      </div>
    </div>
  );
}

function DecisionsView({ d, n }: { d: TechViews["decisions"]; n: TechViews["nfr"] }) {
  return (
    <div>
      <Headline text="The design choices, and what they commit us to" />
      <div className="grid gap-3 lg:grid-cols-2">
        {d.map((x) => {
          const href = x.ref ? safeUrl(x.ref) : null;
          return (
            <div key={x.question} className="rounded-2xl border border-border bg-white p-4">
              <div className="text-sm font-semibold">{x.question}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {x.options.map((o) => (
                  <span key={o} className={cn("rounded-full border px-2.5 py-0.5 text-xs", o === x.choice ? "border-[#0D2847] bg-[#0D2847] text-white" : "border-border text-muted-foreground line-through decoration-[#A9B9CB]")}>
                    {o}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.why}</p>
              {href && (
                <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#1F4FA8] hover:underline">
                  Microsoft Learn <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Non-functional requirements</div>
      <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-white">
        {n.map((r, i) => (
          <div key={`${r.area}-${i}`} className="grid gap-1 border-b border-border px-4 py-2.5 text-sm last:border-0 sm:grid-cols-[160px_1fr]">
            <span className="font-medium">{r.area}</span>
            <span className="text-muted-foreground">{r.point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Multi-view technical architecture: layers, system context, data and decisions. */
export function ArchViews({ v }: { v: TechViews }) {
  const [view, setView] = useState<View>("layers");
  return (
    <div>
      <div role="tablist" aria-label="Architecture view" className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((x) => {
          const I = x.icon;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={view === x.id}
              onClick={() => setView(x.id)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors", view === x.id ? "border-[#0D2847] bg-[#0D2847] text-white" : "border-border bg-white hover:bg-muted")}
            >
              <I className="size-4" aria-hidden="true" />
              {x.label}
            </button>
          );
        })}
      </div>
      {view === "layers" && <LayersView v={v.layers} />}
      {view === "context" && <ContextView v={v.context} />}
      {view === "data" && <DataView v={v.data} />}
      {view === "decisions" && <DecisionsView d={v.decisions} n={v.nfr} />}
    </div>
  );
}
