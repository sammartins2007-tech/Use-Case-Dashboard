import { Link } from "react-router-dom";
import { Map as MapIcon } from "lucide-react";
import { useCustomerSettings } from "@/data/repo";
import { UNPLANNED, type UseCase } from "@/data/types";
import { placementOf, wavesFor } from "@/lib/roadmap";

/** Customer-page strip: current waves at a glance, link to the roadmap. */
export function RoadmapTeaser({ name, useCases }: { name: string; useCases: UseCase[] }) {
  const q = useCustomerSettings();
  const waves = wavesFor(q.data?.find((c) => c.account === name)?.waves ?? [], useCases);
  const live = useCases.filter((u) => u.customerDecision !== "Cancelled");
  const candidates = live.filter((u) => !u.wave || u.wave === UNPLANNED).length;
  return (
    <section aria-labelledby="rm-teaser" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[#CFE3E4] bg-[#F1F8F8] px-5 py-4">
      <h2 id="rm-teaser" className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
        <MapIcon className="size-5 text-[#0E7C86]" aria-hidden="true" /> Roadmap
      </h2>
      {waves.length ? (
        <ul className="flex flex-wrap gap-2 text-sm">
          {waves.map((w) => {
            const list = live.filter((u) => u.wave === w.id);
            const decided = list.filter((u) => placementOf(u) === "customer").length;
            return (
              <li key={w.id} className="rounded-full border border-[#CFE3E4] bg-white px-3 py-1">
                <span className="font-medium">{w.id}</span> {w.label !== w.id && w.label !== `Wave ${w.id.slice(1)}` ? `${w.label} ` : ""}·{" "}
                <span className="tabular-nums">{list.length}</span>
                {decided ? <span className="text-[#7A5718]"> ({decided} customer-decided)</span> : null}
              </li>
            );
          })}
          <li className="rounded-full border border-dashed border-[#D9D2C4] bg-white px-3 py-1">
            Candidates · <span className="tabular-nums">{candidates}</span>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No waves defined yet: open the roadmap to create them.</p>
      )}
      <Link
        to={`/customer/${encodeURIComponent(name)}/roadmap`}
        className="ml-auto rounded-full bg-[#0E7C86] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B6A73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Open the roadmap →
      </Link>
    </section>
  );
}
