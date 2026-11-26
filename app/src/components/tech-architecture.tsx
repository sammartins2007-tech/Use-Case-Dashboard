import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { placeBadges, roundedPath, routeEdges, type Badge, type EdgeOut, type Rect } from "@/lib/orthogonal-router";
import {
  AppWindow,
  Bot,
  Boxes,
  Brain,
  Building2,
  Cable,
  Cloud,
  Database,
  Fingerprint,
  Globe,
  KeyRound,
  Library,
  Lock,
  MessageSquare,
  Network,
  Plug,
  Radar,
  Server,
  ShieldCheck,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { SolComponent, SolConnection, SolTechnical } from "@/lib/solutions";
import { cn } from "@/lib/utils";

const ZONE: Record<string, { color: string; label: string; icon: LucideIcon }> = {
  m365: { color: "#0F6CBD", label: "Microsoft 365", icon: Building2 },
  powerplatform: { color: "#742774", label: "Power Platform", icon: Boxes },
  azure: { color: "#0078D4", label: "Azure", icon: Cloud },
  fabric: { color: "#117865", label: "Microsoft Fabric", icon: Database },
  onprem: { color: "#55657A", label: "On-premises", icon: Server },
  saas: { color: "#B8892B", label: "SaaS", icon: Globe },
  external: { color: "#8A8F98", label: "External", icon: Globe },
};
const KIND: Record<string, LucideIcon> = {
  user: User,
  channel: MessageSquare,
  agent: Bot,
  flow: Workflow,
  model: Brain,
  knowledge: Library,
  data: Database,
  connector: Plug,
  gateway: Network,
  api: Cable,
  identity: Fingerprint,
  security: ShieldCheck,
  monitoring: Radar,
  app: AppWindow,
  system: Server,
};
const CC: { key: keyof SolTechnical["crossCutting"]; label: string; icon: LucideIcon }[] = [
  { key: "identity", label: "Identity", icon: KeyRound },
  { key: "security", label: "Security & compliance", icon: Lock },
  { key: "networking", label: "Networking", icon: Network },
  { key: "alm", label: "ALM & release", icon: Workflow },
  { key: "monitoring", label: "Monitoring", icon: Radar },
  { key: "dataResidency", label: "Data residency", icon: Globe },
];

const COL_MIN = 210;
const COL_GAP = 64;

interface Drawn {
  key: string;
  edges: EdgeOut[];
  badges: Badge[];
  w: number;
  h: number;
}

/** Deployment view: zones side by side, connections routed around the boxes and numbered, the numbered list below. */
export function TechArchitecture({ t }: { t: SolTechnical }) {
  const wrap = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const zoneRefs = useRef<Record<string, HTMLElement | null>>({});
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [selC, setSelC] = useState<string | null>(null);
  const [selL, setSelL] = useState<number | null>(null);
  const [hovL, setHovL] = useState<number | null>(null);

  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const box = w.getBoundingClientRect();
    const rel = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
    };
    const boxes = new Map<string, Rect>();
    for (const c of t.components) {
      const el = boxRefs.current[c.id];
      if (el) boxes.set(c.id, rel(el));
    }
    const labels = Object.values(labelRefs.current).flatMap((el) => (el ? [rel(el)] : []));
    const frames = Object.values(zoneRefs.current).flatMap((el) => (el ? [rel(el)] : []));
    const key = [Math.round(box.width), Math.round(box.height), ...[...boxes.values()].map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.h)}`)].join("|");
    setDrawn((cur) => {
      if (cur?.key === key) return cur;
      const edges = routeEdges({ w: box.width, h: box.height }, boxes, labels, t.connections.map((c, i) => ({ id: i, from: c.from, to: c.to })), frames);
      return { key, edges, badges: placeBadges(edges, [...boxes.values(), ...labels]), w: box.width, h: box.height };
    });
  }, [t.components, t.connections]);

  useLayoutEffect(() => {
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (wrap.current) ro.observe(wrap.current);
    Object.values(boxRefs.current).forEach((el) => el && ro.observe(el));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  const comp = (id: string) => t.components.find((c) => c.id === id);
  const focusL = hovL ?? selL;
  const activeLines = new Set(
    focusL !== null ? [focusL] : selC ? t.connections.map((c, i) => (c.from === selC || c.to === selC ? i : -1)).filter((i) => i >= 0) : [],
  );
  const activeComps = new Set<string>(
    focusL !== null && t.connections[focusL]
      ? [t.connections[focusL].from, t.connections[focusL].to]
      : selC
        ? [selC, ...t.connections.filter((c) => c.from === selC || c.to === selC).flatMap((c) => [c.from, c.to])]
        : [],
  );
  const anySel = selC !== null || focusL !== null;
  const cols = t.zones.length <= 5 ? Math.max(1, t.zones.length) : Math.ceil(t.zones.length / 2);
  const minWidth = cols * COL_MIN + (cols - 1) * COL_GAP + 48;
  const selComp: SolComponent | undefined = selC ? comp(selC) : undefined;
  const selConn: SolConnection | undefined = selL !== null ? t.connections[selL] : undefined;
  const pick = (i: number) => {
    setSelC(null);
    setSelL(selL === i ? null : i);
  };

  return (
    <div className="space-y-4">
      <p className="max-w-4xl text-sm text-muted-foreground">{t.summary}</p>
      <div className="isolate overflow-x-auto rounded-3xl border border-border bg-[#FAFCFE] bg-[radial-gradient(rgba(13,40,71,0.07)_1px,transparent_1px)] [background-size:16px_16px]">
        <div ref={wrap} className="relative p-6" style={{ minWidth }}>
          <div className="relative z-10 grid items-start gap-y-12" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: COL_GAP }}>
            {t.zones.map((z) => {
              const zs = ZONE[z.kind] ?? ZONE.external;
              const ZIcon = zs.icon;
              return (
                <section
                  key={z.id}
                  ref={(el) => {
                    zoneRefs.current[z.id] = el;
                  }}
                  aria-label={z.label}
                  className="rounded-2xl border-2 border-dashed px-4 pb-5 pt-3" style={{ borderColor: `${zs.color}50`, background: `${zs.color}07` }}>
                  <p
                    ref={(el) => {
                      labelRefs.current[z.id] = el;
                    }}
                    className="mb-5 flex w-fit items-start gap-1.5 text-[11px] font-semibold leading-snug tracking-wide"
                    style={{ color: zs.color }}
                  >
                    <ZIcon className="mt-px size-3.5 shrink-0" aria-hidden /> {z.label}
                  </p>
                  <div className="flex flex-col gap-7">
                    {t.components
                      .filter((c) => c.zone === z.id)
                      .map((c) => {
                        const Icon = KIND[c.kind] ?? Server;
                        const on = activeComps.has(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            data-comp={c.id}
                            ref={(el) => {
                              boxRefs.current[c.id] = el;
                            }}
                            aria-pressed={selC === c.id}
                            onClick={() => {
                              setSelL(null);
                              setSelC(selC === c.id ? null : c.id);
                            }}
                            className={cn(
                              "flex w-full items-start gap-2.5 rounded-xl border bg-white p-2.5 text-left shadow-[0_2px_8px_rgba(13,40,71,0.06)] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sol)]",
                              on ? "border-[color:var(--sol)] ring-2 ring-[color:var(--sol)]/25" : "border-[#DCE6F0] hover:border-[#A9B9CB] hover:shadow-md",
                              anySel && !on && "opacity-35",
                            )}
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: zs.color }}>
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold leading-tight">{c.name}</span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{c.service}</span>
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </section>
              );
            })}
          </div>
          {drawn && (
            <svg className="pointer-events-none absolute inset-0 z-20" width={drawn.w} height={drawn.h} aria-hidden>
              <defs>
                <marker id="ta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#7D93AB" />
                </marker>
                <marker id="ta-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sol)" />
                </marker>
              </defs>
              {drawn.edges.map((e) => {
                const on = activeLines.has(e.id);
                return (
                  <path
                    key={e.id}
                    data-edge={e.id}
                    data-points={e.points.map((p) => p.map((v) => Math.round(v)).join(",")).join(" ")}
                    d={roundedPath(e.points)}
                    fill="none"
                    stroke={on ? "var(--sol)" : "#93A7BD"}
                    strokeWidth={on ? 2.6 : 1.5}
                    strokeDasharray={e.routed ? undefined : "4 4"}
                    markerEnd={on ? "url(#ta-on)" : "url(#ta)"}
                    opacity={anySel && !on ? 0.14 : 1}
                    className="transition-[opacity,stroke-width] duration-200"
                  />
                );
              })}
            </svg>
          )}
          {drawn?.badges.map((b) => {
            const on = activeLines.has(b.id);
            const c = t.connections[b.id];
            return (
              <button
                key={b.id}
                type="button"
                aria-label={`Connection ${b.id + 1}: ${comp(c.from)?.name ?? c.from} to ${comp(c.to)?.name ?? c.to}`}
                aria-pressed={selL === b.id}
                onClick={() => pick(b.id)}
                onMouseEnter={() => setHovL(b.id)}
                onMouseLeave={() => setHovL(null)}
                className={cn(
                  "absolute z-30 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[10px] font-bold tabular-nums transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sol)]",
                  on ? "scale-110 border-transparent text-white" : "border-[#93A7BD] bg-white text-[#34465E] hover:border-[color:var(--sol)]",
                  anySel && !on && "opacity-30",
                )}
                style={{ left: b.x, top: b.y, ...(on ? { background: "var(--sol)" } : {}) }}
              >
                {b.id + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-h-[150px] rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 7%, #FAFDFF)" }}>
          {selComp ? (
            <div className="animate-in fade-in">
              <p className="text-xs tracking-[0.14em] text-muted-foreground">COMPONENT</p>
              <p className="mt-1 font-medium">
                {selComp.name} <span className="font-normal text-muted-foreground">· {selComp.service}</span>
              </p>
              <p className="mt-1 text-sm">{selComp.detail}</p>
              <ul className="mt-3 space-y-1 text-xs">
                {t.connections
                  .map((c, i) => ({ c, i }))
                  .filter(({ c }) => c.from === selComp.id || c.to === selComp.id)
                  .map(({ c, i }) => (
                    <li key={i}>
                      <span className="mr-1 inline-grid size-4 place-items-center rounded-full bg-white text-[9px] font-bold tabular-nums">{i + 1}</span>
                      {c.from === selComp.id ? "→ " + (comp(c.to)?.name ?? c.to) : "← " + (comp(c.from)?.name ?? c.from)} · <span className="font-medium">{c.protocol}</span> · {c.auth}
                    </li>
                  ))}
              </ul>
            </div>
          ) : selConn && selL !== null ? (
            <div className="animate-in fade-in text-sm">
              <p className="text-xs tracking-[0.14em] text-muted-foreground">CONNECTION {selL + 1}</p>
              <p className="mt-1 font-medium">
                {comp(selConn.from)?.name} → {comp(selConn.to)?.name}
              </p>
              <dl className="mt-2 grid grid-cols-[80px_1fr] gap-y-1">
                <dt className="text-muted-foreground">Protocol</dt>
                <dd>{selConn.protocol}</dd>
                <dt className="text-muted-foreground">Auth</dt>
                <dd>{selConn.auth}</dd>
                <dt className="text-muted-foreground">Data</dt>
                <dd>{selConn.data}</dd>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a component or a numbered connection to see its configuration, protocol and authentication.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How the parts connect</p>
          <ol className="max-h-[320px] overflow-y-auto py-1" aria-label="Connections">
            {t.connections.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={selL === i}
                  onClick={() => pick(i)}
                  onMouseEnter={() => setHovL(i)}
                  onMouseLeave={() => setHovL(null)}
                  onFocus={() => setHovL(i)}
                  onBlur={() => setHovL(null)}
                  className={cn("flex w-full items-start gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50", selL === i && "bg-[color-mix(in_srgb,var(--sol)_10%,white)]")}
                >
                  <span
                    className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold tabular-nums", activeLines.has(i) ? "border-transparent text-white" : "border-[#93A7BD] text-[#34465E]")}
                    style={activeLines.has(i) ? { background: "var(--sol)" } : undefined}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-xs">
                    <span className="block text-[13px] font-medium leading-snug">
                      {comp(c.from)?.name ?? c.from} → {comp(c.to)?.name ?? c.to}
                    </span>
                    <span className="block text-muted-foreground">{[c.protocol, c.auth].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CC.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Icon className="size-4" style={{ color: "var(--sol)" }} aria-hidden /> {label}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.crossCutting[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
