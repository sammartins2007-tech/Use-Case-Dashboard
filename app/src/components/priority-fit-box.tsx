import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { fitsOf, useCustomerSettings } from "@/data/repo";
import type { UseCase } from "@/data/types";

/** Shows which of the customer's leadership priorities (annual report) this use case supports. */
export function PriorityFitBox({ u }: { u: UseCase }) {
  const q = useCustomerSettings();
  const ids = fitsOf(u.priorityFit);
  const s = q.data?.find((c) => c.account === (u.account ?? "Internal"));
  if (!ids.length || !s) return null;
  const prios = ids.map((id) => s.priorities.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (!prios.length) return null;
  return (
    <section aria-labelledby="fit-title" className="rounded-2xl border border-[#E8D9B8] bg-[#FBF6EA] p-5">
      <h2 id="fit-title" className="flex items-center gap-2 text-sm font-medium text-[#8A6420]">
        <Sparkles className="size-4" aria-hidden="true" /> Fits {u.account}'s leadership priorities
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {prios.map((p) => (
          <li key={p.id}>
            <Link
              to={`/customer/${encodeURIComponent(u.account ?? "Internal")}/portfolio?priority=${p.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D9C9A3] bg-white px-3 py-1 text-sm hover:bg-[#FFFBF2]"
            >
              <span className="font-medium text-[#B8892B]">{p.id}</span> {p.title}
            </Link>
          </li>
        ))}
      </ul>
      {u.priorityWhy && <p className="mt-2 text-sm text-[#34465E]">{u.priorityWhy}</p>}
      {s.reportTitle && <p className="mt-1 text-[11px] text-muted-foreground">From {s.reportTitle}</p>}
    </section>
  );
}
