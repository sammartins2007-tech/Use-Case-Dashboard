import { Link } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import { fitsOf, useCustomerSettings } from "@/data/repo";
import type { UseCase } from "@/data/types";
import { safeUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

export function LeadershipPriorities({
  name,
  useCases,
  highlighting,
  onToggleHighlight,
}: {
  name: string;
  useCases: UseCase[];
  highlighting: boolean;
  onToggleHighlight: () => void;
}) {
  const q = useCustomerSettings();
  const s = q.data?.find((c) => c.account === name);
  if (!s || s.priorities.length === 0) return null;
  const href = safeUrl(s.reportUrl);
  const fitting = useCases.filter((u) => fitsOf(u.priorityFit).length > 0);
  const base = `/customer/${encodeURIComponent(name)}/portfolio`;

  return (
    <section aria-labelledby="prio-title" className="rounded-2xl border border-[#E8D9B8] bg-[#FBF6EA] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="flex items-center gap-1.5 text-sm text-[#8A6420]">
            <Sparkles className="size-4" aria-hidden="true" /> What {name}'s leadership says matters
          </p>
          <h2 id="prio-title" className="mt-1 font-[family-name:var(--font-serif)] text-2xl">
            Leadership priorities
          </h2>
          {s.headline && <p className="mt-2 text-[15px] leading-relaxed text-[#3D4757]">{s.headline}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Source:{" "}
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0E7C86] hover:underline">
                {s.reportTitle ?? "Annual report"}
                <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              (s.reportTitle ?? "Annual report")
            )}
            {s.reportYear ? ` · ${s.reportYear}` : ""} · summarised in our own words
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            aria-pressed={highlighting}
            onClick={onToggleHighlight}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              highlighting ? "border-[#C8962E] bg-[#C8962E] text-white" : "border-[#D9C9A3] bg-white hover:bg-[#FFFBF2]",
            )}
          >
            {highlighting ? "Highlighting on the map" : "Highlight on the map"}
          </button>
          <Link to={`${base}?priority=any`} className="text-sm text-[#0E7C86] hover:underline">
            {fitting.length} use cases fit these priorities →
          </Link>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {s.priorities.map((p) => {
          const n = useCases.filter((u) => fitsOf(u.priorityFit).includes(p.id)).length;
          const src = safeUrl(p.source);
          return (
            <li key={p.id} className="flex flex-col rounded-xl border border-[#EADFC8] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">
                  <span className="mr-1.5 text-[#B8892B] tabular-nums">{p.id}</span>
                  {p.title}
                </h3>
              </div>
              <p className="mt-1.5 text-sm text-[#3D4757]">{p.summary}</p>
              {p.quote && <p className="mt-2 border-l-2 border-[#E8D9B8] pl-2 text-xs italic text-[#5B6474]">“{p.quote}”</p>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm">
                <Link
                  to={`${base}?priority=${p.id}`}
                  className={cn("font-medium hover:underline", n ? "text-[#0E7C86]" : "pointer-events-none text-muted-foreground")}
                  aria-disabled={n === 0}
                >
                  {n} use case{n === 1 ? "" : "s"} fit{n === 1 ? "s" : ""}
                  {n ? " →" : ""}
                </Link>
                {src && (
                  <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                    source<span className="sr-only"> for {p.title} (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
