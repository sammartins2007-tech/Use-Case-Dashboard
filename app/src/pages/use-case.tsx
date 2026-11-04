import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Ban, ChevronLeft, ChevronRight, ExternalLink, HelpCircle, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { PdfExportButton } from "@/components/pdf-export-button";
import { KpiTable } from "@/components/kpi-table";
import { PriorityFitBox } from "@/components/priority-fit-box";
import { RoadmapFields } from "@/components/roadmap-fields";
import { FinOpsSizing } from "@/components/finops-sizing";
import { useFeatures, useHourlyRate, useSignalsFor, useUpdateUseCase, useUseCase, useUseCases } from "@/data/repo";
import {
  DECISIONS,
  DEPARTMENTS,
  LEVELS,
  STAGES,
  parseRelated,
  parseSources,
  type Decision,
  type Feature,
  type Level,
  type Signal,
  type Stage,
  type TextField,
  type UseCase,
  type UseCasePatch,
} from "@/data/types";
import { ELEMENTS, GATES, STATUS_LABEL, questions, statusOf, type Status } from "@/lib/readiness";
import { routeOf } from "@/lib/routes";
import { ToneBadge } from "@/lib/tones";
import { brandOf } from "@/lib/brands";
import { safeUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    return format(parseISO(d), "d MMM yyyy");
  } catch {
    return d;
  }
}

const SECTIONS: { id: string; title: string; intro?: string; fields: { key: TextField; label: string; gate?: boolean; hint: string }[] }[] = [
  {
    id: "problem",
    title: "1. Problem",
    fields: [
      { key: "process", label: "Business process", gate: true, hint: "Which process, from which step to which step" },
      { key: "users", label: "Affected users", gate: true, hint: "Roles, teams and how many people" },
      { key: "pain", label: "Current pain", gate: true, hint: "What goes wrong today, ideally in time, cost or risk" },
    ],
  },
  {
    id: "outcome",
    title: "2. Target outcome",
    fields: [
      { key: "outcome", label: "Desired outcome", gate: true, hint: "What changes for the business" },
    ],
  },
  {
    id: "landscape",
    title: "3. Today's landscape",
    intro: "How the work runs today and the customer's own systems that stay in place. Microsoft components are proposed only in the potential solution.",
    fields: [
      { key: "functionalFlow", label: "Functional flow", gate: true, hint: "Step by step, including where a person decides" },
      { key: "dataSystems", label: "Systems and data that stay", hint: "The customer's existing systems, data sources and tools" },
    ],
  },
  {
    id: "value",
    title: "4. Value drivers",
    fields: [{ key: "volumes", label: "Volumes", hint: "Transactions, cases or runs per month, number of users" }],
  },
];

const LEVEL_LABEL = { complexity: "Complexity", effort: "Effort", valueLevel: "Value" } as const;

const STAGE_MEANING: Record<string, string> = {
  Signal: "Heard about, not yet qualified.",
  Qualified: "The five gates are evidenced; worth shaping.",
  Shaping: "Solution, data and sizing are being worked out with the customer.",
  Pilot: "Built and tested with real users.",
  Scale: "Rolled out with a budget and an owner.",
  Parked: "Valid but on hold.",
  Stopped: "Ended; will not be pursued.",
};
const CONFIDENCE_MEANING: Record<string, string> = {
  High: "The customer's own sources evidence the five gates.",
  Medium: "Most gates come from customer sources; some are inferred.",
  Low: "Only a title or a partial description so far.",
};
const DECISION_MEANING: Record<string, string> = {
  Undecided: "Not yet discussed with the customer.",
  Fund: "Budget agreed to build it.",
  Test: "Run a pilot or proof of concept first.",
  Hold: "Valid, but paused for now.",
  Stop: "The customer will not pursue it.",
};

const REF_RE = /\s*\[([A-Z]{2,}\d+)\]\s*/;
const cleanTitle = (t: string) => t.replace(REF_RE, " ").replace(/\s+/g, " ").trim();
const refOf = (u: UseCase) => u.internalRef?.trim() || REF_RE.exec(u.title)?.[1] || REF_RE.exec(u.evidence ?? "")?.[1] || "";

const STATUS_STYLE: Record<Status, string> = {
  G: "border-[#B9DCC8] bg-[#E9F5EE] text-[#1E5B3E]",
  O: "border-[#F1CFA0] bg-[#FDF0DD] text-[#7A4B12]",
  R: "border-[#EDBDBD] bg-[#FBE9E8] text-[#8A2B2B]",
};
const STATUS_DOT: Record<Status, string> = { G: "bg-[#2F9461]", O: "bg-[#E08A1E]", R: "bg-[#C94141]" };

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!/^https?:\/\//.test(p)) return <span key={i}>{p}</span>;
        const href = safeUrl(p.replace(/[.,;]+$/, ""));
        if (!href) return <span key={i}>{p}</span>;
        let label = "documentation";
        try {
          const url = new URL(href);
          label = url.hostname.replace(/^www\./, "");
        } catch {
          /* keep default */
        }
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-[#0E7C86] underline-offset-2 hover:underline">
            {label}
            <ExternalLink className="size-3" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        );
      })}
    </>
  );
}

const lines = (s?: string) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);

const card = "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(27,42,65,0.04)]";

export function UseCasePage() {
  const { id } = useParams();
  const listQ = useUseCases();
  const q = useUseCase(id);
  const featuresQ = useFeatures();
  const navigate = useNavigate();

  const all = useMemo(() => listQ.data?.rows ?? [], [listQ.data]);
  const u = q.data ?? undefined;
  const signalsQ = useSignalsFor(u?.title);
  const siblings = useMemo(() => {
    const acc = u?.account ?? "Internal";
    return all
      .filter((x) => (x.account ?? "Internal") === acc && (!x.discarded || x.id === u?.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [all, u]);
  const pos = u ? siblings.findIndex((x) => x.id === u.id) : -1;
  const prev = pos > 0 ? siblings[pos - 1] : undefined;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : undefined;

  if (q.isLoading) return <LoadingState rows={10} className="mx-auto max-w-[1400px] p-6" />;
  if (q.isError) return <ConnectorErrorState error={q.error} connector="SharePoint" className="p-6" />;
  if (!u)
    return (
      <EmptyState
        title="Use case not found"
        action={
          <Button variant="outline" onClick={() => navigate("/customers")}>
            Back to customers
          </Button>
        }
      />
    );

  return (
    <div id="work" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-5 outline-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/customer/${encodeURIComponent(u.account ?? "Internal")}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {u.account ?? "Internal"} map
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-muted-foreground">
            {pos >= 0 ? `${pos + 1} of ${siblings.length}` : `${siblings.length} use cases`}
            {` · ${u.account ?? "Internal"}`}
          </span>
          <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && navigate(`/use-case/${prev.id}`)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!next} onClick={() => next && navigate(`/use-case/${next.id}`)}>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <UseCaseDossier
        key={u.id}
        u={u}
        signals={signalsQ.data ?? []}
        features={(featuresQ.data?.rows ?? []).filter((f) => (f.relevantUseCases ?? "").includes(u.title))}
      />
    </div>
  );
}

function UseCaseDossier({ u, signals, features }: { u: UseCase; signals: Signal[]; features: Feature[] }) {
  const update = useUpdateUseCase();
  const ref = useRef<HTMLDivElement>(null);
  const save = (patch: UseCasePatch, msg: string, done?: () => void) =>
    update.mutate(
      { id: u.id, patch },
      {
        onSuccess: () => {
          toast.success(msg);
          done?.();
        },
        onError: () => toast.error("The change could not be saved"),
      },
    );

  const { rate } = useHourlyRate(u.account);
  const title = cleanTitle(u.title);
  const internalRef = refOf(u);
  const statuses = ELEMENTS.map((e) => ({ e, s: statusOf(e, u) }));
  const nG = statuses.filter((x) => x.s === "G").length;
  const nO = statuses.filter((x) => x.s === "O").length;
  const gatesGreen = statuses.filter((x) => x.e.group === "gate" && x.s === "G").length;
  const qs = questions(u);
  const safeName = `${u.account ?? "Internal"} - ${title}`.replace(/[^\w\s&-]/g, "").slice(0, 80);
  const brand = brandOf(u.account);
  const route = routeOf(u.classification);
  const sources = parseSources(u.sources);
  const related = parseRelated(u.relatedUseCases);
  const insights = lines(u.insights);
  const assessment = lines(u.analysis);
  const stage = u.stage ?? "Signal";
  const decision = u.decision ?? "Undecided";

  return (
    <div ref={ref} className="space-y-6">
      {/* Brand band */}
      <div className="flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white pr-4" style={{ borderTop: `4px solid ${brand.primary}` }}>
        <Link to={`/customer/${encodeURIComponent(u.account ?? "Internal")}`} className="flex h-14 items-center px-4" aria-label={`${u.account ?? "Internal"} customer page`}>
          {brand.logo ? <img src={brand.logo} alt={`${u.account ?? "Microsoft"} logo`} className="max-h-8 max-w-[140px] object-contain" /> : <span>{u.account}</span>}
        </Link>
        <span className="text-sm text-muted-foreground">Use case dossier</span>
        {u.discarded && (
          <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800">
            Discarded{u.discardReason ? ` · ${u.discardReason}` : ""}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2" data-pdf-exclude>
          <DiscardControl u={u} busy={update.isPending} onSave={save} />
          <PdfExportButton targetRef={ref} fileName={`${safeName} - business case input.pdf`}>
            Download PDF
          </PdfExportButton>
        </div>
      </div>

      {/* Title + ownership */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <header className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{u.account ?? "Internal"}</span>
            {internalRef && (
              <span className="rounded-md border border-[#D9D2C4] bg-white px-2 py-0.5 font-mono text-xs text-[#3D4757]">
                <span className="sr-only">Internal customer reference </span>
                {internalRef}
              </span>
            )}
            {u.lastSignal && <span>· last signal {fmtDate(u.lastSignal)}</span>}
          </div>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl leading-tight tracking-tight">{title}</h1>
          <dl className="grid gap-3 sm:grid-cols-3">
            <StatusCell term="Stage" value={stage} meaning={STAGE_MEANING[stage]}>
              <Select value={stage} onValueChange={(v) => save({ stage: v as Stage }, `Stage set to ${v}`)}>
                <SelectTrigger aria-label="Change stage" size="sm" className="h-7 w-full" data-pdf-exclude>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StatusCell>
            <StatusCell term="Confidence" value={u.confidence ?? "Low"} meaning={CONFIDENCE_MEANING[u.confidence ?? "Low"]} note="How well the customer's sources evidence the use case. Set by the analysis." />
            <StatusCell term="Decision" value={decision} meaning={DECISION_MEANING[decision]}>
              <Select value={decision} onValueChange={(v) => save({ decision: v as Decision }, `Decision set to ${v}`)}>
                <SelectTrigger aria-label="Change decision" size="sm" className="h-7 w-full" data-pdf-exclude>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StatusCell>
          </dl>
          <Link to="/method#stages" className="inline-block text-xs text-[#0E7C86] hover:underline" data-pdf-exclude>
            How stages, confidence and decisions are defined
          </Link>
        </header>

        <section aria-labelledby="own-title" className={cn(card, "border-[#E8D9B8] bg-[#FBF6EA]")}>
          <h2 id="own-title" className="font-[family-name:var(--font-serif)] text-lg">
            Ownership
          </h2>
          <div className="divide-y divide-[#EADFC8]">
            <EditableField label="Business owner" hint="Who sponsors and decides" value={u.owner} busy={update.isPending} compact onSave={(v, done) => save({ owner: v }, "Owner saved", done)} />
            <EditableField label="Next step" hint="The next concrete move" value={u.nextStep} busy={update.isPending} compact onSave={(v, done) => save({ nextStep: v }, "Next step saved", done)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3" data-pdf-exclude>
            {(["complexity", "effort", "valueLevel"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`${k}-select`} className="text-xs text-muted-foreground">
                  {LEVEL_LABEL[k]}
                </Label>
                <Select value={u[k] ?? ""} onValueChange={(v) => save({ [k]: v as Level } as UseCasePatch, `${LEVEL_LABEL[k]} set to ${v}`)}>
                  <SelectTrigger id={`${k}-select`} size="sm" className="w-full bg-white">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="dept-select" className="text-xs text-muted-foreground">
                Department
              </Label>
              <Select value={u.department ?? ""} onValueChange={(v) => save({ department: v }, `Department set to ${v}`)}>
                <SelectTrigger id="dept-select" size="sm" className="w-full bg-white">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <RoadmapFields u={u} busy={update.isPending} onSave={save} />
          <p className="mt-2 hidden text-xs print:block">
            {u.department ? `Department: ${u.department}` : ""} {u.valueLevel ? `· Value: ${u.valueLevel}` : ""}
          </p>
          {u.valueBasis && <p className="mt-2 text-[11px] text-muted-foreground">Value · {u.valueBasis}</p>}
          {u.sizingBasis && <p className="mt-1 text-[11px] text-muted-foreground">{u.sizingBasis}</p>}
        </section>
      </div>

      {/* Description + classification */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="desc-title" className={card}>
          <h2 id="desc-title" className="font-[family-name:var(--font-serif)] text-xl">
            Description
          </h2>
          <EditableField label="Description" hideLabel hint="What the use case is about, for whom, and what it should achieve" value={u.description} busy={update.isPending} onSave={(v, done) => save({ description: v }, "Description saved", done)} large />
        </section>
        <section aria-labelledby="cls-title" className={card} style={{ borderTop: `4px solid ${route.color}` }}>
          <h2 id="cls-title" className="text-xs text-muted-foreground">
            Platform classification
          </h2>
          <p className="mt-1 font-[family-name:var(--font-serif)] text-xl">{u.classification ?? "Not classified yet"}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {u.classificationConfidence && <ToneBadge field="confidence" value={u.classificationConfidence} label="Route confidence" />}
            {u.flag && <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">{u.flag}</span>}
          </div>
          {u.classificationWhy && (
            <div className="mt-3">
              <h3 className="text-xs text-muted-foreground">Why this route</h3>
              <p className="text-sm">{u.classificationWhy}</p>
            </div>
          )}
          {route.key !== "none" && <p className="mt-3 text-xs text-muted-foreground">{route.definition}</p>}
          <Link to="/method#routes" className="mt-2 inline-block text-xs text-[#0E7C86] hover:underline" data-pdf-exclude>
            How we classify
          </Link>
        </section>
      </div>

      <PriorityFitBox u={u} />

      {/* Readiness */}
      <section aria-labelledby="readiness-title" className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="readiness-title" className="font-[family-name:var(--font-serif)] text-xl">
            Business case readiness
          </h2>
          <p className="text-sm">
            <span className="font-medium">{gatesGreen === GATES.length ? "Ready to assess" : `${gatesGreen} of ${GATES.length} gates fully evidenced`}</span>
            <span className="text-muted-foreground">
              {" "}
              · {nG} evidenced, {nO} partial, {ELEMENTS.length - nG - nO} missing
            </span>
          </p>
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {statuses.map(({ e, s }) => (
            <li key={e.key} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm", STATUS_STYLE[s])}>
              <span className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOT[s])} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.label}</span>
                <span className="block text-[11px] opacity-80">
                  {STATUS_LABEL[s]}
                  {e.group === "gate" ? " · gate" : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(["G", "O", "R"] as Status[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", STATUS_DOT[s])} aria-hidden="true" />
              {s === "G" ? "Evidenced: enough for a business case" : s === "O" ? "Partial: vague, unquantified or derived" : "Missing"}
            </span>
          ))}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {SECTIONS.map((sec) => (
            <section key={sec.id} aria-labelledby={`sec-${sec.id}`} className={card}>
              <h2 id={`sec-${sec.id}`} className="font-[family-name:var(--font-serif)] text-xl">
                {sec.title}
              </h2>
              {sec.intro && <p className="mt-1 text-xs text-muted-foreground">{sec.intro}</p>}
              <div className="mt-3 divide-y divide-border">
                {sec.fields.map((f) => (
                  <EditableField
                    key={f.key}
                    label={f.label}
                    hint={f.hint}
                    gate={f.gate}
                    value={u[f.key]}
                    busy={update.isPending}
                    onSave={(v, done) => save({ [f.key]: v } as UseCasePatch, `${f.label} saved`, done)}
                  />
                ))}
              </div>
              {sec.id === "outcome" && <KpiTable value={u.kpiValues} rate={rate} busy={update.isPending} onSave={(v, done) => save({ kpiValues: v }, "KPIs saved", done)} />}
              {sec.id === "value" && <FinOpsSizing u={u} rate={rate} busy={update.isPending} onSave={save} />}
            </section>
          ))}

          {insights.length > 0 && (
            <section aria-labelledby="ins-title" className={card}>
              <h2 id="ins-title" className="font-[family-name:var(--font-serif)] text-xl">
                Deep analysis
              </h2>
              <p className="text-xs text-muted-foreground">What Work IQ and public Microsoft documentation say about this use case.</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                {insights.map((l, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: brand.primary }} aria-hidden="true" />
                    <span className="break-words">
                      <Linkified text={l} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          {assessment.length > 0 && (
            <section aria-labelledby="assess-title" className={cn(card, "border-[#CFE3E4] bg-[#F1F8F8]")}>
              <h2 id="assess-title" className="font-[family-name:var(--font-serif)] text-lg">
                Assessment
              </h2>
              <ul className="mt-2 space-y-3">
                {assessment.map((l, i) => {
                  const m = /^([A-Z][\w ]{2,20}):\s*(.+)$/.exec(l);
                  return (
                    <li key={i} className="text-sm leading-relaxed">
                      {m ? (
                        <>
                          <span className="block text-xs font-semibold uppercase tracking-wide text-[#0E7C86]">{m[1]}</span>
                          {m[2]}
                        </>
                      ) : (
                        l
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {qs.length > 0 && (
            <section aria-labelledby="q-title" className={card}>
              <h2 id="q-title" className="font-[family-name:var(--font-serif)] text-lg">
                Questions for the customer
              </h2>
              <ol className="mt-2 space-y-2">
                {qs.map((x, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{x}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="sig-title" className={card}>
            <h2 id="sig-title" className="font-[family-name:var(--font-serif)] text-lg">
              Signals <span className="text-sm tabular-nums text-muted-foreground">{signals.length}</span>
            </h2>
            {signals.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No signals linked yet.</p>
            ) : (
              <ol className="mt-2 space-y-3">
                {[...signals]
                  .sort((a, b) => (b.signalDate ?? "").localeCompare(a.signalDate ?? ""))
                  .map((s) => (
                    <li key={s.id} className="border-l-2 border-border pl-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{fmtDate(s.signalDate)}</span>
                        <span>{s.sourceType}</span>
                        {s.sender && <span>· {s.sender}</span>}
                        <ToneBadge field="kind" value={s.kind} />
                      </div>
                      <p className="text-sm font-medium">{s.title}</p>
                      {s.insight && <p className="text-sm text-muted-foreground">{s.insight}</p>}
                    </li>
                  ))}
              </ol>
            )}
          </section>

          {features.length > 0 && (
            <section aria-labelledby="feat-title" className={card}>
              <h2 id="feat-title" className="font-[family-name:var(--font-serif)] text-lg">
                Feature unlocks
              </h2>
              <ul className="mt-2 space-y-2">
                {features.map((f) => (
                  <li key={f.id} className="rounded-md border border-border p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{f.title}</span>
                      <ToneBadge field="status" value={f.status} />
                    </div>
                    {f.finOpsImpact && <p className="mt-0.5 text-xs text-muted-foreground">{f.finOpsImpact}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="rel-title" className={card}>
              <h2 id="rel-title" className="font-[family-name:var(--font-serif)] text-lg">
                Related use cases <span className="text-sm tabular-nums text-muted-foreground">{related.length}</span>
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/use-case/${r.id}`} className="font-medium hover:underline">
                      {cleanTitle(r.title)}
                    </Link>
                    {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="ev-title" className={card}>
            <h2 id="ev-title" className="font-[family-name:var(--font-serif)] text-lg">
              Data sources <span className="text-sm tabular-nums text-muted-foreground">{sources.length}</span>
            </h2>
            {sources.length > 0 ? (
              <ul className="mt-2 space-y-2.5 text-sm">
                {sources.map((s, i) => {
                  const href = safeUrl(s.url);
                  return (
                    <li key={i} className="border-l-2 border-border pl-3">
                      <span className="text-xs text-muted-foreground">
                        {s.type}
                        {s.date ? ` · ${fmtDate(s.date)}` : ""}
                      </span>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 font-medium text-primary hover:underline">
                          <span className="break-words">{s.title}</span>
                          <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ) : (
                        <p className="font-medium">{s.title}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No linked sources yet.</p>
            )}
            {u.evidence && (
              <div className="mt-3 border-t border-border pt-3">
                <h3 className="text-xs text-muted-foreground">Evidence trail</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{u.evidence}</p>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Potential solution — bottom only */}
      <section aria-labelledby="sol-title" className={cn(card, "bg-[#FBF9F5]")} style={{ borderLeft: `4px solid ${route.color}` }}>
        <h2 id="sol-title" className="font-[family-name:var(--font-serif)] text-xl">
          Potential solution
        </h2>
        <p className="text-xs text-muted-foreground">How Microsoft could solve it, in line with the platform classification. A proposal, not yet agreed with the customer.</p>
        <div className="mt-3 divide-y divide-border">
          <EditableField label="Proposed approach" hint="How it could be solved and with which components" value={u.potentialSolution} busy={update.isPending} onSave={(v, done) => save({ potentialSolution: v }, "Potential solution saved", done)} />
          <EditableField label="Microsoft components" hint="Copilot Studio, Foundry, Fabric, Power Platform…" value={u.products} busy={update.isPending} onSave={(v, done) => save({ products: v }, "Components saved", done)} />
        </div>
        {u.classificationNext && (
          <p className="mt-3 text-sm">
            <span className="text-xs text-muted-foreground">Alternative or next step · </span>
            {u.classificationNext}
          </p>
        )}
      </section>
    </div>
  );
}

function StatusCell({ term, value, meaning, note, children }: { term: string; value: string; meaning?: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <dt className="text-[11px] text-muted-foreground">{term}</dt>
      <dd className="space-y-1">
        <p className="font-medium">{value}</p>
        {meaning && <p className="text-xs leading-snug text-[#3D4757]">{meaning}</p>}
        {note && <p className="text-[11px] leading-snug text-muted-foreground">{note}</p>}
        {children}
      </dd>
    </div>
  );
}

function EditableField({
  label,
  hint,
  gate,
  value,
  busy,
  onSave,
  compact,
  hideLabel,
  large,
}: {
  label: string;
  hint: string;
  gate?: boolean;
  value?: string;
  busy: boolean;
  onSave: (v: string, done: () => void) => void;
  compact?: boolean;
  hideLabel?: boolean;
  large?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const empty = !value?.trim();
  return (
    <div className={cn("grid gap-2 py-3", !compact && !hideLabel && "sm:grid-cols-[180px_minmax(0,1fr)]", compact && "gap-0.5 py-2")}>
      <div className={cn(hideLabel && "sr-only")}>
        <Label htmlFor={id} className={cn("text-sm font-medium", compact && "text-xs font-normal text-muted-foreground")}>
          {label}
        </Label>
        {gate && <p className="text-[11px] text-muted-foreground">Qualification gate</p>}
      </div>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft.trim(), () => setEditing(false));
          }}
        >
          <Textarea id={id} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder={hint} autoFocus />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          {empty ? (
            <p id={id} className="text-sm italic text-amber-800 dark:text-amber-300">
              Missing · {hint}
            </p>
          ) : (
            <p id={id} className={cn("whitespace-pre-line text-sm", large && "font-[family-name:var(--font-serif)] text-[17px] leading-relaxed")}>
              {value}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            data-pdf-exclude
            aria-label={`${empty ? "Add" : "Edit"} ${label}`}
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {empty ? "Add" : "Edit"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DiscardControl({
  u,
  busy,
  onSave,
}: {
  u: UseCase;
  busy: boolean;
  onSave: (patch: UseCasePatch, msg: string, done?: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (u.discarded)
    return (
      <Button variant="outline" size="sm" disabled={busy} onClick={() => onSave({ discarded: false, discardReason: "" }, "Use case restored")}>
        <RotateCcw className="size-4" aria-hidden="true" />
        Restore
      </Button>
    );
  return open ? (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ discarded: true, discardReason: reason.trim() }, "Use case discarded", () => setOpen(false));
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="discard-reason" className="text-xs text-muted-foreground">
          Reason
        </Label>
        <Input id="discard-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer decision, duplicate…" className="h-8 w-56" autoFocus />
      </div>
      <Button type="submit" variant="destructive" size="sm" disabled={busy}>
        Discard
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <Ban className="size-4" aria-hidden="true" />
      Discard
    </Button>
  );
}
