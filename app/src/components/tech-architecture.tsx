import { useCallback, useLayoutEffect, useRef, useState } from "react";
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
  onprem: { color: "#5B6474", label: "On-premises", icon: Server },
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

type Line = { i: number; d: string; mx: number; my: number };

export function TechArchitecture({ t }: { t: SolTechnical }) {
  const wrap = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selC, setSelC] = useState<string | null>(null);
  const [selL, setSelL] = useState<number | null>(null);

  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const box = w.getBoundingClientRect();
    setSize({ w: box.width, h: box.height });
    const out: Line[] = [];
    t.connections.forEach((c, i) => {
      const a = refs.current[c.from]?.getBoundingClientRect();
      const b = refs.current[c.to]?.getBoundingClientRect();
      if (!a || !b) return;
      const ax = a.left + a.width / 2 - box.left,
        ay = a.top + a.height / 2 - box.top,
        bx = b.left + b.width / 2 - box.left,
        by = b.top + b.height / 2 - box.top;
      const horizontal = Math.abs(bx - ax) > Math.abs(by - ay);
      const sx = horizontal ? (bx > ax ? a.right - box.left : a.left - box.left) : ax;
      const sy = horizontal ? ay : by > ay ? a.bottom - box.top : a.top - box.top;
      const ex = horizontal ? (bx > ax ? b.left - box.left : b.right - box.left) : bx;
      const ey = horizontal ? by : by > ay ? b.top - box.top : b.bottom - box.top;
      const d = horizontal
        ? `M ${sx} ${sy} C ${(sx + ex) / 2} ${sy}, ${(sx + ex) / 2} ${ey}, ${ex} ${ey}`
        : `M ${sx} ${sy} C ${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}`;
      out.push({ i, d, mx: (sx + ex) / 2, my: (sy + ey) / 2 });
    });
    setLines(out);
  }, [t.connections]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [measure]);

  const comp = (id: string) => t.components.find((c) => c.id === id);
  const activeLines = new Set(
    selL !== null ? [selL] : selC ? t.connections.map((c, i) => (c.from === selC || c.to === selC ? i : -1)).filter((i) => i >= 0) : [],
  );
  const activeComps = new Set<string>(selL !== null ? [t.connections[selL].from, t.connections[selL].to] : selC ? [selC, ...t.connections.filter((c) => c.from === selC || c.to === selC).flatMap((c) => [c.from, c.to])] : []);
  const anySel = selC !== null || selL !== null;
  const cols = Math.min(t.zones.length, 4);
  const selComp: SolComponent | undefined = selC ? comp(selC) : undefined;
  const selConn: SolConnection | undefined = selL !== null ? t.connections[selL] : undefined;

  return (
    <div className="space-y-4">
      <p className="max-w-4xl text-sm text-muted-foreground">{t.summary}</p>
      <div className="relative overflow-x-auto rounded-3xl border border-border bg-[repeating-linear-gradient(0deg,transparent_0_23px,rgba(27,42,65,0.04)_23px_24px),repeating-linear-gradient(90deg,transparent_0_23px,rgba(27,42,65,0.04)_23px_24px)] p-4">
        <div ref={wrap} className="relative min-w-[880px]">
          <div className="relative z-10 grid gap-x-10 gap-y-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {t.zones.map((z) => {
              const zs = ZONE[z.kind] ?? ZONE.external;
              const ZIcon = zs.icon;
              return (
                <section key={z.id} className="rounded-2xl border-2 border-dashed p-3" style={{ borderColor: `${zs.color}55`, background: `${zs.color}08` }}>
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide" style={{ color: zs.color }}>
                    <ZIcon className="size-3.5" aria-hidden /> {z.label}
                  </p>
                  <div className="space-y-4">
                    {t.components
                      .filter((c) => c.zone === z.id)
                      .map((c) => {
                        const Icon = KIND[c.kind] ?? Server;
                        const on = activeComps.has(c.id);
                        return (
                          <div
                            key={c.id}
                            ref={(el) => {
                              refs.current[c.id] = el;
                            }}
                            role="button"
                            tabIndex={0}
                            onClick={() => (setSelL(null), setSelC(selC === c.id ? null : c.id))}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-2.5 shadow-sm transition-all",
                              on ? "border-[color:var(--sol)] ring-2 ring-[color:var(--sol)]/30" : "border-border hover:shadow-md",
                              anySel && !on && "opacity-40",
                            )}
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: zs.color }}>
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold leading-tight">{c.name}</span>
                              <span className="block text-[11px] leading-snug text-muted-foreground">{c.service}</span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </section>
              );
            })}
          </div>
          <svg className="pointer-events-none absolute inset-0 z-20" width={size.w} height={size.h} aria-hidden>
            <defs>
              <marker id="ta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#8A8F98" />
              </marker>
              <marker id="ta-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sol)" />
              </marker>
            </defs>
            {lines.map((l) => {
              const on = activeLines.has(l.i);
              return (
                <g key={l.i} opacity={anySel && !on ? 0.12 : 1}>
                  <path d={l.d} fill="none" stroke={on ? "var(--sol)" : "#9AA1AC"} strokeWidth={on ? 2.5 : 1.3} markerEnd={on ? "url(#ta-on)" : "url(#ta)"} strokeDasharray={on ? undefined : "4 4"} />
                  {on && (
                    <g>
                      <rect x={l.mx - 4} y={l.my - 9} width={Math.min(220, t.connections[l.i].protocol.length * 6.2 + 12)} height="18" rx="9" fill="white" stroke="var(--sol)" />
                      <text x={l.mx + 2} y={l.my + 4} fontSize="10.5" fill="#1B2A41">
                        {t.connections[l.i].protocol.slice(0, 34)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-h-[150px] rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 7%, #FFFDF8)" }}>
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
                      {c.from === selComp.id ? "→ " + (comp(c.to)?.name ?? c.to) : "← " + (comp(c.from)?.name ?? c.from)} · <span className="font-medium">{c.protocol}</span> · {c.auth}
                    </li>
                  ))}
              </ul>
            </div>
          ) : selConn ? (
            <div className="animate-in fade-in text-sm">
              <p className="text-xs tracking-[0.14em] text-muted-foreground">CONNECTION</p>
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
            <p className="text-sm text-muted-foreground">Select a component in the diagram, or a connection in the list, to see its configuration, protocol and authentication.</p>
          )}
        </div>
        <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-xs">
            <caption className="sr-only">Connections</caption>
            <thead className="sticky top-0 bg-[#FBF9F5] text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">From → to</th>
                <th className="px-3 py-2 font-medium">Protocol</th>
                <th className="px-3 py-2 font-medium">Auth</th>
              </tr>
            </thead>
            <tbody>
              {t.connections.map((c, i) => (
                <tr key={i} onClick={() => (setSelC(null), setSelL(selL === i ? null : i))} className={cn("cursor-pointer border-t border-border hover:bg-muted/40", selL === i && "bg-[color-mix(in_srgb,var(--sol)_10%,white)]")}>
                  <td className="px-3 py-1.5">
                    {comp(c.from)?.name} → {comp(c.to)?.name}
                  </td>
                  <td className="px-3 py-1.5">{c.protocol}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{c.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
