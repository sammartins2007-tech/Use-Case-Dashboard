import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";
import type { Doc, DocSet } from "@/lib/content";

type Board = { date?: unknown; specialists?: unknown; opinions?: unknown };
type Design = { board?: Board; experience?: unknown };

/** True when a design came out of the full chain: the specialist board is stored and the solution experience was rebuilt. */
function isFullRun(d?: Doc<Design>) {
  const b = d?.data?.board;
  if (!b || typeof b !== "object" || !d?.data?.experience) return false;
  const people = Array.isArray(b.specialists) ? b.specialists : Array.isArray(b.opinions) ? b.opinions : null;
  return !!people && people.length > 0;
}

/** Date of the run: the board's own date, else the date in the design's origin, else when it was saved. */
function runDate(d: Doc<Design>) {
  const own = typeof d.data.board?.date === "string" ? d.data.board.date : "";
  const m = (own || d.origin || "").match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : (d.modified ?? "").slice(0, 10);
}

const fmt = (s: string) => {
  try {
    return format(parseISO(s), "d MMM yyyy");
  } catch {
    return s;
  }
};

/** "Last full specialist run" chip for a use case header. */
export function FullRunBadge({ set, loading }: { set?: DocSet<Design>; loading?: boolean }) {
  if (loading) return null;
  const runs = [set?.proposed, set?.current].filter(isFullRun) as Doc<Design>[];
  const last = runs.map((d) => ({ d, date: runDate(d) })).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[#E8D9B8] bg-[#FBF4E4] px-2 py-0.5 text-xs text-[#7A5718]"
        title="No design of this use case has gone through the full chain yet (8 specialists, architecture, solution experience, creative, FinOps)."
      >
        <Users className="size-3" aria-hidden="true" /> No full specialist run yet
      </span>
    );
  }
  const state = last.d.status === "Proposed" ? "proposal waiting" : "current design";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[#CFE3DD] bg-[#E8F3EF] px-2 py-0.5 text-xs text-[#1E6F55]"
      title={`Full chain: 8 specialists, architecture, solution experience, creative and FinOps. Design v${last.d.version}, ${state}.`}
    >
      <Users className="size-3" aria-hidden="true" /> Full specialist run {fmt(last.date)}
      <span className="text-[#3D6B5C]">· v{last.d.version} {state}</span>
    </span>
  );
}
