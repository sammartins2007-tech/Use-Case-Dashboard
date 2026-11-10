import { useState } from "react";
import { Check, Eye, EyeOff, History, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentActions, useContentIndex, type DocSet } from "@/lib/content";
import { routeLoose } from "@/lib/routes";
import type { Solution } from "@/lib/solutions";
import { RADAR } from "@/radar.config";

const day = (v?: string) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * Redesign control for one use case. The refresh only proposes a new design (status Proposed);
 * a person previews it and accepts it or keeps the current one. A route change without a proposal
 * can be turned into a redesign request that the next refresh picks up.
 */
export function RedesignBar({
  id,
  set,
  classification,
  preview,
  setPreview,
  lastEvidence,
}: {
  id: string;
  set?: DocSet<Solution>;
  classification?: string;
  /** Date of the newest evidence on the use case (last signal); a design older than this is out of date. */
  lastEvidence?: string;
  preview: boolean;
  setPreview: (v: boolean) => void;
}) {
  const { index } = useContentIndex();
  const act = useContentActions("solution", id);
  const [msg, setMsg] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  if (RADAR.customerEdition) return null;
  const cur = set?.current;
  const prop = set?.proposed;
  const designRoute = cur?.data.route ?? cur?.route;
  const nowRoute = classification;
  const routeChanged = Boolean(cur && nowRoute && designRoute && nowRoute.slice(0, 1) !== designRoute.slice(0, 1));
  const requested = index.meta("solution", id).requested;
  const history = set?.history ?? [];
  const busy = act.accept.isPending || act.reject.isPending || act.request.isPending || act.restore.isPending;
  const run = (p: Promise<unknown>, ok: string) =>
    p.then(
      () => setMsg(ok),
      (e: unknown) => setMsg(`That did not work: ${e instanceof Error ? e.message : "please try again"}.`),
    );

  const stale = Boolean(cur && !prop && !routeChanged && lastEvidence && cur.modified && new Date(lastEvidence).getTime() > new Date(cur.modified).getTime());
  if (!cur && !prop) return null;

  return (
    <div className="mb-5 space-y-2" data-pdf-exclude>
      {prop && (
        <div className="rounded-2xl border border-violet-300 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-violet-600" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-violet-950">
                Redesign proposed{prop.route ? ` for ${routeLoose(prop.route).short}` : ""} · version {prop.version}
                {prop.modified ? ` · ${day(prop.modified)}` : ""}
              </p>
              <p className="text-violet-900/80">{prop.reason || "A new insight changed this use case; the design was redone for it."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreview(!preview)} aria-pressed={preview}>
                {preview ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />} {preview ? "Back to current" : "Review the proposal"}
              </Button>
              <Button
                size="sm"
                disabled={busy}
                className="bg-violet-700 text-white hover:bg-violet-800"
                onClick={() => run(act.accept.mutateAsync(prop.version).then(() => setPreview(false)), "Proposal accepted. It is now the current design; the previous one is kept in the history.")}
              >
                <Check className="size-4" aria-hidden /> Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => run(act.reject.mutateAsync(prop.version).then(() => setPreview(false)), "Current design kept; the proposal is marked rejected.")}
              >
                <X className="size-4" aria-hidden /> Keep current
              </Button>
            </div>
          </div>
          {preview && <p className="mt-2 text-xs font-medium text-violet-800">You are looking at the proposal. Nothing changes until you accept it.</p>}
        </div>
      )}
      {!prop && routeChanged && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          <RefreshCw className="size-5 text-rose-600" aria-hidden />
          <p className="min-w-0 flex-1">
            This design was made for <b>{routeLoose(designRoute).short}</b>; the use case is now classified <b>{routeLoose(nowRoute).short}</b>.{" "}
            {requested ? `A redesign was requested on ${day(requested.modified)}; the next refresh will propose it here.` : "Ask for a redesign; the next refresh proposes it here for you to review."}
          </p>
          {!requested && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-rose-700 text-white hover:bg-rose-800"
              onClick={() => run(act.request.mutateAsync({ route: nowRoute ?? "", reason: `Route changed from ${designRoute} to ${nowRoute}` }), "Redesign requested. The next refresh will propose a new design here.")}
            >
              <RefreshCw className="size-4" aria-hidden /> Ask for a redesign
            </Button>
          )}
        </div>
      )}
      {stale && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <RefreshCw className="size-5 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1">
            <b>New evidence since this design.</b> The use case received new input on {day(lastEvidence)}; this design dates from {day(cur?.modified)}.{" "}
            {requested ? `An update was requested on ${day(requested.modified)}; the next refresh will propose it here.` : "Ask for an update and the next refresh proposes a refreshed design here."}
          </p>
          {!requested && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-amber-700 text-white hover:bg-amber-800"
              onClick={() => run(act.request.mutateAsync({ route: nowRoute ?? designRoute ?? "", reason: `New evidence since the design of ${day(cur?.modified)} (last input ${day(lastEvidence)})` }), "Update requested. The next refresh will propose a refreshed design here.")}
            >
              <RefreshCw className="size-4" aria-hidden /> Update with the latest evidence
            </Button>
          )}
        </div>
      )}
      {history.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory}>
            <History className="size-3.5" aria-hidden /> Earlier versions ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1">
              {history.map((h) => (
                <li key={`${h.version}-${h.status}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5">
                  <span className="font-medium text-foreground">Version {h.version}</span>
                  <span>{h.status === "Rejected" ? "proposal not taken" : "replaced"}</span>
                  {h.route && <span>· {routeLoose(h.route).short}</span>}
                  {h.modified && <span>· {day(h.modified)}</span>}
                  {h.status === "Archived" && (
                    <Button variant="ghost" size="sm" className="ml-auto h-7" disabled={busy} onClick={() => run(act.restore.mutateAsync(h.version), `Version ${h.version} is the current design again.`)}>
                      Restore
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {cur && !prop && !routeChanged && !stale && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Design version {cur.version}
            {cur.modified ? ` · updated ${day(cur.modified)}` : ""}
            {lastEvidence ? ` · last input ${day(lastEvidence)}` : ""}
          </span>
          {requested ? (
            <span className="font-medium text-amber-800">· update requested {day(requested.modified)}; the next refresh proposes it here</span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => run(act.request.mutateAsync({ route: nowRoute ?? designRoute ?? "", reason: "Owner asked for a refresh of the design from the latest evidence" }), "Update requested. The next refresh will propose a refreshed design here.")}
            >
              <RefreshCw className="size-3.5" aria-hidden /> Refresh from latest evidence
            </Button>
          )}
        </div>
      )}
      {msg && <p className="text-xs font-medium text-emerald-800" role="status">{msg}</p>}
    </div>
  );
}

/** Shown when a use case has no design yet: lets a person ask the refresh to design it. */
export function RequestDesign({ id, classification }: { id: string; classification?: string }) {
  const { index } = useContentIndex();
  const act = useContentActions("solution", id);
  const [done, setDone] = useState(false);
  if (RADAR.customerEdition) return null;
  const requested = index.meta("solution", id).requested;
  if (requested || done) return <p className="mt-3 text-center text-sm text-muted-foreground">A design has been requested; the next refresh will propose it here.</p>;
  return (
    <div className="mt-4 text-center">
      <Button disabled={act.request.isPending} onClick={() => act.request.mutateAsync({ route: classification ?? "", reason: "First design asked for in the app" }).then(() => setDone(true))}>
        <Sparkles className="size-4" aria-hidden /> Ask for a design
      </Button>
    </div>
  );
}
