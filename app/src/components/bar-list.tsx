import { useNavigate } from "react-router-dom";

export interface Bar {
  key: string;
  label: string;
  n: number;
  color: string;
  to: string;
}

/** Clickable horizontal bar chart (each bar is a button that opens a filtered portfolio). */
export function BarList({ bars, unit = "use cases" }: { bars: Bar[]; unit?: string }) {
  const navigate = useNavigate();
  const max = Math.max(1, ...bars.map((b) => b.n));
  return (
    <ul className="mt-4 space-y-2">
      {bars.map((b) => (
        <li key={b.key}>
          <button
            type="button"
            disabled={b.n === 0}
            onClick={() => navigate(b.to)}
            aria-label={`${b.label}: ${b.n} ${unit}. Open portfolio`}
            className="group grid w-full grid-cols-[150px_minmax(0,1fr)_32px] items-center gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[#F7F3EC] focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <span className="truncate text-sm" title={b.label}>
              {b.label}
            </span>
            <span className="h-6 rounded-md bg-[#E8F2FB]">
              <span
                className="block h-full rounded-md transition-all group-hover:brightness-110"
                style={{ width: `${(b.n / max) * 100}%`, backgroundColor: b.color, minWidth: b.n ? 6 : 0 }}
              />
            </span>
            <span className="text-right text-sm font-semibold tabular-nums">{b.n}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
