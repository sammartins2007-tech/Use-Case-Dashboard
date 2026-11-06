import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useConsumption } from "@/data/repo";
import { cn } from "@/lib/utils";

export const usd = new Intl.NumberFormat("en-GB", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const tokensFmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);

export function useAiTotals() {
  const q = useConsumption();
  const rows = q.data ?? [];
  const cost = rows.reduce((s, r) => s + r.costUSD, 0);
  const tokens = rows.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  return { q, rows, cost, tokens, runs: rows.length, estimated: rows.some((r) => r.estimated) };
}

/** Compact "AI consumed so far" meter shown on every screen. */
export function AiMeter({ className }: { className?: string }) {
  const { q, cost, tokens, estimated } = useAiTotals();
  return (
    <Link
      to="/finops#consumption"
      className={cn(
        "flex items-center gap-2 rounded-full border border-[#E8D9B8] bg-[#FBF4E4] px-3 py-1.5 text-sm text-[#1B2A41] transition-colors hover:bg-[#F6EAD0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      aria-label={q.isSuccess ? `AI consumed so far: ${usd.format(cost)}, ${tokensFmt(tokens)} tokens${estimated ? ", estimated" : ""}` : "AI consumed so far"}
    >
      <Sparkles className="size-4 text-[#8A6420]" aria-hidden="true" />
      <span className="hidden whitespace-nowrap text-xs text-[#5B6474] 2xl:inline">AI used so far</span>
      <span className="whitespace-nowrap font-semibold tabular-nums">{q.isSuccess ? usd.format(cost) : q.isError ? "unavailable" : "…"}</span>
      {q.isSuccess && <span className="hidden whitespace-nowrap text-xs tabular-nums text-[#5B6474] 2xl:inline">· {tokensFmt(tokens)} tokens</span>}
    </Link>
  );
}
