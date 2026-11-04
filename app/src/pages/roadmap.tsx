import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarRange, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { Pager, usePageTokens } from "@/components/pager";
import { CustomerHeader } from "@/components/customer-header";
import { PdfExportButton } from "@/components/pdf-export-button";
import { fitsOf, useCustomerSettings, useHourlyRate, useSaveWaves, useUpdateUseCase, useUseCases, type WaveDef } from "@/data/repo";
import { CUSTOMER_DECISIONS, DEPARTMENTS, UNPLANNED, type CustomerDecision, type UseCase } from "@/data/types";
import { caseSavingUsd, usd0, usdCompact } from "@/lib/kpi";
import { isCustomerDecided, monthsBetween, nextWaveId, placementOf, suggestionScore, wavesFor } from "@/lib/roadmap";
import { routeOf, onRoute } from "@/lib/routes";
import { stripRef } from "@/lib/validated";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]";
const today = () => new Date().toISOString().slice(0, 10);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

export function RoadmapPage() {
  const { account = "" } = useParams();
  const name = decodeURIComponent(account);
  const pages = usePageTokens();
  const q = useUseCases(pages.token);
  const settings = useCustomerSettings();
  const setting = settings.data?.find((c) => c.account === name);
  const { rate } = useHourlyRate(name);
  const update = useUpdateUseCase();
  const ref = useRef<HTMLDivElement>(null);
  const [dept, setDept] = useState("");
  const [decidedOnly, setDecidedOnly] = useState(false);
  const [editWaves, setEditWaves] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const active = useMemo(
    () => (q.data?.rows ?? []).filter((u) => (u.account ?? "Internal") === name && !u.discarded && u.customerDecision !== "Cancelled"),
    [q.data, name],
  );
  const filtered = useMemo(
    () => active.filter((u) => (!dept || (u.department ?? "Not set") === dept) && (!decidedOnly || isCustomerDecided(u))),
    [active, dept, decidedOnly],
  );
  const waves = useMemo(() => wavesFor(setting?.waves ?? [], active), [setting, active]);
  const inWave = (w: string) => filtered.filter((u) => u.wave === w);
  const candidates = useMemo(
    () =>
      filtered
        .filter((u) => !u.wave || u.wave === UNPLANNED || !waves.some((w) => w.id === u.wave))
        .sort((a, b) => suggestionScore(b) - suggestionScore(a)),
    [filtered, waves],
  );
  const shownCandidates = showAll ? candidates : candidates.slice(0, 12);

  const move = (u: UseCase, wave: string) =>
    update.mutate(
      { id: u.id, patch: wave === UNPLANNED ? { wave: UNPLANNED, waveSource: "" } : { wave, waveSource: `Set in app ${today()}` } },
      { onSuccess: () => toast.success(`${stripRef(u.title)} → ${wave === UNPLANNED ? "candidates" : wave}`), onError: () => toast.error("The change could not be saved") },
    );
  const decide = (u: UseCase, d: CustomerDecision) =>
    update.mutate({ id: u.id, patch: { customerDecision: d } }, { onSuccess: () => toast.success(`Decision set to ${d}`), onError: () => toast.error("The change could not be saved") });

  const totals = (list: UseCase[]) => ({
    n: list.length,
    decided: list.filter((u) => placementOf(u) === "customer").length,
    saving: list.reduce((a, u) => a + (caseSavingUsd(u.kpiValues, rate) ?? 0), 0),
  });

  // Timeline range: from waves with dates and use cases with dates.
  const span = useMemo(() => {
    const ms: string[] = [];
    for (const w of waves) {
      if (w.start) ms.push(w.start);
      if (w.end) ms.push(w.end);
    }
    for (const u of filtered) {
      if (u.startDate) ms.push(u.startDate.slice(0, 7));
      if (u.targetDate) ms.push(u.targetDate.slice(0, 7));
    }
    if (!ms.length) return null;
    ms.sort();
    return monthsBetween(ms[0], ms[ms.length - 1]);
  }, [waves, filtered]);
  const dated = filtered.filter((u) => u.startDate || u.targetDate).sort((a, b) => (a.startDate ?? a.targetDate ?? "").localeCompare(b.startDate ?? b.targetDate ?? ""));

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <CustomerHeader name={name}>
        <dl className="flex gap-6">
          {[
            ["In a wave", active.filter((u) => u.wave && u.wave !== UNPLANNED).length],
            ["Customer decided", active.filter((u) => placementOf(u) === "customer").length],
            ["Candidates", active.filter((u) => !u.wave || u.wave === UNPLANNED).length],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs text-white/75">{l}</dt>
              <dd className="font-[family-name:var(--font-serif)] text-3xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </CustomerHeader>

      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-6 pb-14 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/customer/${encodeURIComponent(name)}`} className="text-sm text-[#0E7C86] hover:underline">
            ← Back to the map
          </Link>
          <h2 className="font-[family-name:var(--font-serif)] text-2xl">Roadmap</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2" data-pdf-exclude>
            <label className="sr-only" htmlFor="rm-dept">
              Department
            </label>
            <select id="rm-dept" value={dept} onChange={(e) => setDept(e.target.value)} className="h-8 rounded-full border border-[#D9D2C4] bg-white px-3 text-sm">
              <option value="">All departments</option>
              {[...DEPARTMENTS, "Not set"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={decidedOnly}
              onClick={() => setDecidedOnly((v) => !v)}
              className={cn("rounded-full border px-3 py-1 text-sm", decidedOnly ? "border-[#C8962E] bg-[#C8962E] text-white" : "border-[#D9D2C4] bg-white hover:bg-[#FBF9F5]")}
            >
              Customer decisions only
            </button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditWaves(true)}>
              <Settings2 className="size-4" aria-hidden="true" /> Waves
            </Button>
            <PdfExportButton targetRef={ref} fileName={`${name} - AI roadmap.pdf`}>
              Download PDF
            </PdfExportButton>
          </div>
        </div>
        <p className="-mt-3 max-w-4xl text-sm text-muted-foreground">
          Gold cards come from {name}'s own decisions; dashed cards are proposals made in the app. Move a card with its wave menu; candidates are
          ranked by value, low effort, leadership fit and readiness.
        </p>

        {q.isLoading || settings.isLoading ? (
          <LoadingState rows={8} />
        ) : q.isError ? (
          <ConnectorErrorState error={q.error} connector="SharePoint" />
        ) : active.length === 0 ? (
          <EmptyState title={`No use cases for ${name} yet`} />
        ) : (
          <div ref={ref} className="space-y-6">
            {/* Wave summary */}
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {waves.map((w) => {
                const t = totals(inWave(w.id));
                return (
                  <li key={w.id} className={cn(card, "p-4")}>
                    <p className="text-xs text-muted-foreground">
                      {w.id}
                      {w.start || w.end ? ` · ${w.start ? monthLabel(w.start) : "?"} – ${w.end ? monthLabel(w.end) : "?"}` : " · dates not set"}
                    </p>
                    <p className="font-[family-name:var(--font-serif)] text-lg">{w.label}</p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium tabular-nums">{t.n}</span> use cases · <span className="tabular-nums">{t.decided}</span> customer-decided
                    </p>
                    {t.saving > 0 && <p className="text-sm tabular-nums text-[#1E5B3E]">{usdCompact.format(t.saving)} / year estimated saving</p>}
                  </li>
                );
              })}
              {waves.length === 0 && (
                <li className={cn(card, "p-4 text-sm text-muted-foreground")}>
                  No waves yet. Use <span className="font-medium text-foreground">Waves</span> to create the first one, then move candidates into it.
                </li>
              )}
            </ol>

            {/* Timeline */}
            {span && (
              <section aria-labelledby="tl-title" className={cn(card, "overflow-x-auto")}>
                <h3 id="tl-title" className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-lg">
                  <CalendarRange className="size-4 text-[#0E7C86]" aria-hidden="true" /> Timeline
                </h3>
                <div className="mt-3 min-w-[720px]">
                  <div className="grid text-[11px] text-muted-foreground" style={{ gridTemplateColumns: `220px repeat(${span.length}, minmax(28px, 1fr))` }}>
                    <span />
                    {span.map((m) => (
                      <span key={m} className="border-l border-border pl-1">
                        {monthLabel(m)}
                      </span>
                    ))}
                  </div>
                  {[...waves.filter((w) => w.start && w.end).map((w) => ({ key: w.id, label: `${w.id} · ${w.label}`, s: w.start!, e: w.end!, wave: true, href: "" })),
                    ...dated.map((u) => ({ key: String(u.id), label: stripRef(u.title), s: (u.startDate ?? u.targetDate)!.slice(0, 7), e: (u.targetDate ?? u.startDate)!.slice(0, 7), wave: false, href: `/use-case/${u.id}` }))].map((r) => {
                    const a = Math.max(0, span.indexOf(r.s));
                    const b = Math.max(a, span.indexOf(r.e));
                    return (
                      <div key={r.key} className="grid items-center py-0.5" style={{ gridTemplateColumns: `220px repeat(${span.length}, minmax(28px, 1fr))` }}>
                        {r.href ? (
                          <Link to={r.href} className="truncate pr-2 text-sm hover:underline" title={r.label}>
                            {r.label}
                          </Link>
                        ) : (
                          <span className="truncate pr-2 text-sm font-medium">{r.label}</span>
                        )}
                        <span
                          className={cn("h-3.5 rounded-full", r.wave ? "bg-[#1B2A41]" : "bg-[#0E7C86]/70")}
                          style={{ gridColumn: `${a + 2} / ${b + 3}` }}
                          aria-label={`${r.label}: ${monthLabel(r.s)} to ${monthLabel(r.e)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                {waves.some((w) => !w.start || !w.end) && (
                  <p className="mt-2 text-xs text-muted-foreground">Waves without dates are not on the timeline; set their dates under Waves.</p>
                )}
              </section>
            )}

            {/* Board */}
            <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${waves.length + 1}, minmax(270px, 1fr))` }}>
              {waves.map((w) => {
                const list = inWave(w.id).sort((a, b) => Number(placementOf(b) === "customer") - Number(placementOf(a) === "customer") || suggestionScore(b) - suggestionScore(a));
                return (
                  <section key={w.id} aria-label={`${w.id} ${w.label}: ${list.length} use cases`} className="rounded-2xl bg-[#EEF4F4] p-3">
                    <h3 className="mb-2 flex items-baseline justify-between px-1">
                      <span className="font-[family-name:var(--font-serif)] text-lg">
                        {w.id} · {w.label}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">{list.length}</span>
                    </h3>
                    <ul className="space-y-2">
                      {list.map((u) => (
                        <li key={u.id}>
                          <RoadmapCard u={u} rate={rate} waves={waves} busy={update.isPending} onMove={move} onDecide={decide} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              <section aria-label={`Candidates: ${candidates.length}`} className="rounded-2xl bg-[#F1ECE2]/70 p-3">
                <h3 className="mb-1 flex items-baseline justify-between px-1">
                  <span className="font-[family-name:var(--font-serif)] text-lg">Candidates</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{candidates.length}</span>
                </h3>
                <p className="mb-2 px-1 text-xs text-muted-foreground">Not in a wave yet, best first.</p>
                <ul className="space-y-2">
                  {shownCandidates.map((u) => (
                    <li key={u.id}>
                      <RoadmapCard u={u} rate={rate} waves={waves} busy={update.isPending} onMove={move} onDecide={decide} showScore />
                    </li>
                  ))}
                </ul>
                {candidates.length > 12 && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" data-pdf-exclude onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show the top 12" : `Show all ${candidates.length}`}
                  </Button>
                )}
              </section>
            </div>
          </div>
        )}
        <Pager canPrev={pages.canPrev} nextToken={q.data?.nextToken} busy={q.isFetching} onPrev={pages.prev} onNext={() => pages.next(q.data?.nextToken)} />
      </div>

      <WaveEditor
        open={editWaves}
        onOpenChange={setEditWaves}
        name={name}
        settingId={setting?.id}
        initial={waves}
        used={(id) => active.filter((u) => u.wave === id).length}
      />
    </div>
  );
}

function RoadmapCard({
  u,
  rate,
  waves,
  busy,
  onMove,
  onDecide,
  showScore,
}: {
  u: UseCase;
  rate: number;
  waves: WaveDef[];
  busy: boolean;
  onMove: (u: UseCase, wave: string) => void;
  onDecide: (u: UseCase, d: CustomerDecision) => void;
  showScore?: boolean;
}) {
  const r = routeOf(u.classification);
  const place = placementOf(u);
  const saving = caseSavingUsd(u.kpiValues, rate);
  const fit = fitsOf(u.priorityFit);
  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-3 text-[13px] leading-snug shadow-[0_1px_2px_rgba(27,42,65,0.05)]",
        place === "customer" ? "border-[#D9B26A] border-l-4" : place === "proposal" ? "border-dashed border-[#9FB8BB]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: r.color, color: onRoute(r) }}>
          {r.short}
        </span>
        {place === "customer" && <span className="rounded-full bg-[#FBF4E4] px-2 py-0.5 text-[10px] font-medium text-[#7A5718]">Customer decided</span>}
        {place === "proposal" && <span className="rounded-full bg-[#EEF4F4] px-2 py-0.5 text-[10px] font-medium text-[#0B5A61]">Proposal</span>}
        {u.customerDecision === "On hold" && <span className="rounded-full bg-[#F1ECE2] px-2 py-0.5 text-[10px]">On hold</span>}
        {showScore && <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">score {suggestionScore(u)}</span>}
      </div>
      <Link to={`/use-case/${u.id}`} className="mt-1.5 line-clamp-2 block font-medium hover:underline">
        {stripRef(u.title)}
      </Link>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {u.department ?? "No department"} · value {u.valueLevel ?? "?"} · effort {u.effort ?? "?"}
        {u.internalRef ? ` · ${u.internalRef}` : ""}
      </p>
      {(saving || fit.length > 0 || u.targetDate || u.customerStatus) && (
        <p className="mt-1 flex flex-wrap gap-x-2 text-[11px]">
          {typeof saving === "number" && saving > 0 && <span className="tabular-nums text-[#1E5B3E]">{usd0.format(saving)}/yr</span>}
          {fit.length > 0 && <span className="text-[#8A6420]">Leadership fit {fit.join(", ")}</span>}
          {u.targetDate && <span>target {u.targetDate}</span>}
          {u.customerStatus && u.customerStatus !== "Not set" && <span className="text-muted-foreground">{u.customerStatus}</span>}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-1.5" data-pdf-exclude>
        <label className="sr-only" htmlFor={`wave-${u.id}`}>
          Wave for {u.title}
        </label>
        <select
          id={`wave-${u.id}`}
          disabled={busy}
          value={u.wave && waves.some((w) => w.id === u.wave) ? u.wave : UNPLANNED}
          onChange={(e) => onMove(u, e.target.value)}
          className="h-7 rounded-md border border-input bg-white px-1.5 text-xs"
        >
          <option value={UNPLANNED}>Candidate</option>
          {waves.map((w) => (
            <option key={w.id} value={w.id}>
              {w.id} · {w.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`dec-${u.id}`}>
          Customer decision for {u.title}
        </label>
        <select
          id={`dec-${u.id}`}
          disabled={busy}
          value={u.customerDecision ?? "Not yet decided"}
          onChange={(e) => onDecide(u, e.target.value as CustomerDecision)}
          className="h-7 rounded-md border border-input bg-white px-1.5 text-xs"
        >
          {CUSTOMER_DECISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function WaveEditor({
  open,
  onOpenChange,
  name,
  settingId,
  initial,
  used,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  settingId?: number;
  initial: WaveDef[];
  used: (id: string) => number;
}) {
  const save = useSaveWaves();
  const [draft, setDraft] = useState<WaveDef[]>(initial);
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setDraft(initial);
  } else if (!open && lastOpen) setLastOpen(false);
  const set = (i: number, p: Partial<WaveDef>) => setDraft((d) => d.map((w, j) => (j === i ? { ...w, ...p } : w)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Waves for {name}</DialogTitle>
          <DialogDescription>Name each wave and give it a start and end month to place it on the timeline.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {draft.map((w, i) => (
            <li key={w.id} className="grid grid-cols-[52px_minmax(0,1fr)_130px_130px_36px] items-end gap-2">
              <span className="pb-2 text-sm font-medium">{w.id}</span>
              <div className="space-y-1">
                <Label htmlFor={`wl-${i}`} className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input id={`wl-${i}`} value={w.label} onChange={(e) => set(i, { label: e.target.value })} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ws-${i}`} className="text-xs text-muted-foreground">
                  Start
                </Label>
                <Input id={`ws-${i}`} type="month" value={w.start ?? ""} onChange={(e) => set(i, { start: e.target.value || undefined })} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`we-${i}`} className="text-xs text-muted-foreground">
                  End
                </Label>
                <Input id={`we-${i}`} type="month" value={w.end ?? ""} onChange={(e) => set(i, { end: e.target.value || undefined })} className="h-8" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={used(w.id) > 0}
                title={used(w.id) > 0 ? "Move its use cases out first" : "Remove wave"}
                aria-label={`Remove ${w.id}`}
                onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setDraft((d) => [...d, { id: nextWaveId(d), label: `Wave ${nextWaveId(d).slice(1)}` }])}>
          <Plus className="size-4" aria-hidden="true" /> Add wave
        </Button>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { id: settingId, account: name, waves: draft },
                {
                  onSuccess: () => {
                    toast.success("Waves saved");
                    onOpenChange(false);
                  },
                  onError: () => toast.error("The waves could not be saved"),
                },
              )
            }
          >
            Save waves
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
