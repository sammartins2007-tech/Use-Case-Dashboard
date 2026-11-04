import { Link } from "react-router-dom";
import { ACCOUNTS, type UseCase } from "@/data/types";
import { brandOf } from "@/lib/brands";
import { isReady } from "@/lib/readiness";

/** Customer entry tiles: one logo per customer, with live counts. */
export function CustomerLogos({ useCases, nextToken }: { useCases: UseCase[]; nextToken?: string }) {
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACCOUNTS.map((a) => {
          const b = brandOf(a);
          const list = useCases.filter((u) => (u.account ?? "Internal") === a && !u.discarded);
          return (
            <li key={a}>
              <Link
                to={`/customer/${encodeURIComponent(a)}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(27,42,65,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(27,42,65,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex h-24 items-center justify-center px-6">
                  {b.logo ? (
                    <img src={b.logo} alt={`${a === "Internal" ? `${b.name} (internal)` : a}`} className="max-h-12 max-w-[170px] object-contain" />
                  ) : (
                    <span className="text-lg font-semibold">{a}</span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border bg-[#FBF9F5] px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{a === "Internal" ? "Internal" : a}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{list.length}</span>
                    <span className="text-muted-foreground"> use cases · {list.filter(isReady).length} ready</span>
                  </span>
                </div>
                <div className="h-1 w-0 transition-all group-hover:w-full" style={{ backgroundColor: b.primary }} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      {nextToken ? (
        <p className="mt-2 text-xs text-muted-foreground">Counts cover the {useCases.length} most recently updated use cases; each customer page lists all of theirs.</p>
      ) : null}
    </>
  );
}
