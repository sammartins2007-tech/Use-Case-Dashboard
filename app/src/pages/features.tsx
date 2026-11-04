import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { useFeatures } from "@/data/repo";
import { Pager, usePageTokens } from "@/components/pager";
import { safeUrl } from "@/lib/safe-url";
import { ToneBadge } from "@/lib/tones";

export function FeaturesPage() {
  const pages = usePageTokens();
  const q = useFeatures(pages.token);
  const rows = useMemo(
    () => [...(q.data?.rows ?? [])].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "")),
    [q.data],
  );

  return (
    <div id="work" tabIndex={-1} className="mx-auto w-full max-w-[1100px] px-6 pb-12 pt-6 outline-none">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl tracking-tight">Feature radar</h1>
        <p className="mt-1 text-sm text-muted-foreground">{rows.length} capabilities tracked</p>
      </div>
      {q.isLoading ? (
        <LoadingState rows={6} />
      ) : q.isError ? (
        <ConnectorErrorState error={q.error} connector="SharePoint" />
      ) : rows.length === 0 ? (
        <EmptyState title="No capabilities tracked yet" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((f) => {
            const href = safeUrl(f.link);
            return (
              <li key={f.id} className="grid gap-4 p-5 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,0.9fr)]">
                <div className="space-y-1.5">
                  <p className="text-sm tabular-nums">{f.releaseDate ? format(parseISO(f.releaseDate), "MMM yyyy") : "Date to confirm"}</p>
                  <ToneBadge field="status" value={f.status} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{f.product}</p>
                  <h2 className="font-[family-name:var(--font-serif)] text-lg leading-snug">{f.title}</h2>
                  {f.summary && <p className="mt-1 text-sm text-muted-foreground">{f.summary}</p>}
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Official source <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </div>
                <div className="min-w-0 space-y-2 text-sm">
                  {f.finOpsImpact && (
                    <div>
                      <p className="text-xs text-muted-foreground">FinOps impact</p>
                      <p>{f.finOpsImpact}</p>
                    </div>
                  )}
                  {f.relevantUseCases && (
                    <div>
                      <p className="text-xs text-muted-foreground">Relevant use cases</p>
                      <p>{f.relevantUseCases}</p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pager
        canPrev={pages.canPrev}
        nextToken={q.data?.nextToken}
        busy={q.isFetching}
        onPrev={pages.prev}
        onNext={() => pages.next(q.data?.nextToken)}
      />
    </div>
  );
}
