import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LEVELS, type Level, type UseCase } from "@/data/types";
import { routeOf } from "@/lib/routes";
import { spreadPoints } from "@/lib/spread";
import { cn } from "@/lib/utils";

const W = 760;
const H = 560;
const PL = 74;
const PB = 54;
const PT = 10;
const PR = 10;
const CW = (W - PL - PR) / 3;
const CH = (H - PT - PB) / 3;
const idx = (l: Level) => LEVELS.indexOf(l);

export type MatrixAxis = "complexity" | "value";

const xOf = (u: UseCase, axis: MatrixAxis) => (axis === "complexity" ? u.complexity : u.valueLevel);

/** Named cells. Key = `${x}-${effort}`. */
const CELL_NAMES: Record<MatrixAxis, Record<string, { name: string; tint: string }>> = {
  complexity: { "Low-Low": { name: "Quick wins", tint: "#E6F2F3" } },
  value: {
    "High-Low": { name: "Quick wins", tint: "#E3F1E8" },
    "High-High": { name: "Strategic bets", tint: "#F3ECDB" },
    "Low-High": { name: "Avoid", tint: "#F6E6E3" },
    "Low-Low": { name: "Fill-ins", tint: "#F7F3EC" },
  },
};

export function MatrixMap({
  useCases,
  axis,
  name,
  highlight,
}: {
  useCases: UseCase[];
  axis: MatrixAxis;
  name: string;
  /** When set, use cases in the set get a gold ring and the others are dimmed. */
  highlight?: Set<number> | null;
}) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<UseCase | null>(null);
  const xLabel = axis === "complexity" ? "Complexity" : "Value";
  const placed = useMemo(() => useCases.filter((u) => xOf(u, axis) && u.effort), [useCases, axis]);

  const dots = useMemo(() => {
    const out: { u: UseCase; x: number; y: number }[] = [];
    for (const c of LEVELS)
      for (const e of LEVELS) {
        const list = placed.filter((u) => xOf(u, axis) === c && u.effort === e);
        const box = { x: PL + idx(c) * CW + 18, y: PT + (2 - idx(e)) * CH + 36, w: CW - 36, h: CH - 52 };
        spreadPoints(list.map((u) => u.id), box).forEach((p) => out.push({ u: list.find((u) => u.id === p.id)!, x: p.x, y: p.y }));
      }
    return out;
  }, [placed, axis]);

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby={`map-t-${axis} map-d-${axis}`}>
        <title id={`map-t-${axis}`}>{`${name} use cases by ${xLabel.toLowerCase()} and effort`}</title>
        <desc id={`map-d-${axis}`}>
          {`Nine cells: ${xLabel.toLowerCase()} low to high from left to right, effort low to high from bottom to top. ${placed.length} use cases placed; dots are coloured by platform route.`}
        </desc>
        {LEVELS.map((e, ei) =>
          LEVELS.map((c, ci) => {
            const x = PL + ci * CW;
            const y = PT + (2 - ei) * CH;
            const n = placed.filter((u) => xOf(u, axis) === c && u.effort === e).length;
            const named = CELL_NAMES[axis][`${c}-${e}`];
            return (
              <g key={`${c}-${e}`}>
                <rect x={x + 3} y={y + 3} width={CW - 6} height={CH - 6} rx={14} fill={named?.tint ?? "#F7F3EC"} />
                <text x={x + 16} y={y + 26} fontSize="11" fill="#55657A">
                  {named ? named.name : `${c} ${xLabel.toLowerCase()} · ${e} effort`}
                </text>
                <text x={x + CW - 16} y={y + 26} textAnchor="end" fontSize="12" fontWeight="600" fill="#0D2847">
                  {n || ""}
                </text>
              </g>
            );
          }),
        )}
        {LEVELS.map((c, ci) => (
          <text key={c} x={PL + ci * CW + CW / 2} y={H - PB + 22} textAnchor="middle" fontSize="13" fill="#0D2847">
            {c}
          </text>
        ))}
        <text x={PL + (W - PL - PR) / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#55657A">
          {xLabel} →
        </text>
        {LEVELS.map((e, ei) => (
          <text key={e} x={PL - 12} y={PT + (2 - ei) * CH + CH / 2} textAnchor="end" dominantBaseline="middle" fontSize="13" fill="#0D2847">
            {e}
          </text>
        ))}
        <text x={16} y={PT + (H - PT - PB) / 2} textAnchor="middle" fontSize="12" fill="#55657A" transform={`rotate(-90 16 ${PT + (H - PT - PB) / 2})`}>
          Effort →
        </text>
      </svg>
      {dots.map(({ u, x, y }) => {
        const r = routeOf(u.classification);
        const hit = highlight ? highlight.has(u.id) : false;
        const dim = highlight ? !hit : false;
        return (
          <button
            key={u.id}
            type="button"
            title={u.title}
            aria-label={`${u.title}. ${r.short}. ${xOf(u, axis)} ${xLabel.toLowerCase()}, ${u.effort} effort${hit ? ". Fits a leadership priority" : ""}. Open use case`}
            onClick={() => navigate(`/use-case/${u.id}`)}
            onMouseEnter={() => setHover(u)}
            onMouseLeave={() => setHover((h) => (h?.id === u.id ? null : h))}
            onFocus={() => setHover(u)}
            onBlur={() => setHover((h) => (h?.id === u.id ? null : h))}
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, backgroundColor: r.color }}
            className={cn(
              "absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-all hover:z-10 hover:scale-150 focus-visible:z-10 focus-visible:scale-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring forced-colors:border-[CanvasText]",
              hit && "z-[5] size-4 ring-[3px] ring-[#C8962E]",
              dim && "opacity-25",
            )}
          />
        );
      })}
      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(440px,90%)] -translate-x-1/2 rounded-xl border border-border bg-white/95 px-4 py-3 text-sm shadow-lg" role="status">
          <p className="font-medium">{hover.title}</p>
          <p className="text-xs text-muted-foreground">
            {routeOf(hover.classification).short} · {hover.department ?? "No department"} · {hover.stage ?? "Signal"} · click to open
          </p>
        </div>
      )}
    </div>
  );
}

export const placedCount = (useCases: UseCase[], axis: MatrixAxis) => useCases.filter((u) => xOf(u, axis) && u.effort).length;
