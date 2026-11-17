import { RADAR } from "@/radar.config";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Ban,
  Bot,
  ChevronLeft,
  ChevronRight,
  Coins,
  ExternalLink,
  FileDown,
  Flag,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Download,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { useHasSolution, useSolution } from "@/lib/solutions";
import { UseCaseCoach } from "@/components/use-case-coach";
import { UseCaseInput } from "@/components/use-case-input";
import { UseCaseClarifications } from "@/components/clarifications";
import { PageBoundary } from "@/components/page-boundary";
import { RouteEditor } from "@/components/route-editor";
import { WhatIfPanel, shortName, useWhatIf } from "@/components/what-if";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectorErrorState, EmptyState, LoadingState } from "@/components/states";
import { createSectionedPdfBlob, toSafePdfExportError } from "@/lib/pdf-export";
import { KpiTable } from "@/components/kpi-table";
import { PriorityFitBox } from "@/components/priority-fit-box";
import { RoadmapFields } from "@/components/roadmap-fields";
import { FinOpsSizing } from "@/components/finops-sizing";
import { OwnerCard, ParticipantsPanel } from "@/components/dossier-people";
import { NextSteps } from "@/components/next-steps";
import { OfflineCopyAssetError, buildOfflineCopy, downloadStem, saveOfflineCopy } from "@/lib/offline-copy";
import { openInNewTab, saveToSharePoint } from "@/lib/sharepoint-save";
import { IS_STATIC } from "@/lib/static-copy";
import { LIVE_READ_ONLY, READ_ONLY, readOnlyMessage } from "@/lib/read-only";
import { scrubDom } from "@/lib/link-scrub";
import { EditTextDialog, FactChip, FlowChain, KpiCards, ReadinessStrip, SolutionVisual, SystemChips, TextCard, ValueTiles, VolumeTiles } from "@/components/dossier-visuals";
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
  type UseCase,
  type UseCasePatch,
} from "@/data/types";
import { questions } from "@/lib/readiness";
import { routeOf } from "@/lib/routes";
import { caseValue, usd0 } from "@/lib/kpi";
import { ToneBadge } from "@/lib/tones";
import { brandOf, inkOf } from "@/lib/brands";
import { externalUrl, safeUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    return format(parseISO(d), "d MMM yyyy");
  } catch {
    return d;
  }
}

type TabId = "overview" | "people" | "problem" | "landscape" | "finops" | "analysis" | "solution" | "whatif" | "evidence";
const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "Participants" },
  { id: "problem", label: "Problem & outcome" },
  { id: "landscape", label: "Landscape & value" },
  { id: "finops", label: "FinOps" },
  { id: "analysis", label: "Analysis" },
  { id: "solution", label: "Potential solution" },
  { id: "evidence", label: "Evidence" },
];
// Evidence (signals, data sources, evidence trail) only ever appears in the owner's own app, never in a read-only copy or offline copy.
const TABS = RADAR.customerEdition ? ALL_TABS.filter((t) => t.id !== "analysis" && t.id !== "evidence") : READ_ONLY ? ALL_TABS.filter((t) => t.id !== "evidence") : ALL_TABS;

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

  const nav = (
    <div className="flex items-center gap-1.5" data-pdf-exclude>
      <span className="hidden text-xs tabular-nums text-muted-foreground xl:inline">
        {pos >= 0 ? `${pos + 1} of ${siblings.length}` : `${siblings.length} use cases`}
      </span>
      <Button variant="outline" size="sm" className="h-8" disabled={!prev} onClick={() => prev && navigate(`/use-case/${prev.id}`)} aria-label="Previous use case">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" size="sm" className="h-8" disabled={!next} onClick={() => next && navigate(`/use-case/${next.id}`)} aria-label="Next use case">
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
  return (
    <div id="work" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-6 pb-16 outline-none">
      <UseCaseDossier
        key={u.id}
        u={u}
        nav={nav}
        signals={signalsQ.data ?? []}
        features={(featuresQ.data?.rows ?? []).filter((f) => (f.relevantUseCases ?? "").includes(u.title))}
      />
    </div>
  );
}

function UseCaseDossier({ u, signals, features, nav }: { u: UseCase; signals: Signal[]; features: Feature[]; nav: React.ReactNode }) {
  const hasSolution = useHasSolution();
  const design = useSolution(hasSolution(u.id) ? String(u.id) : undefined).data;
  const [tab, setTab] = useState<TabId>("overview");
  const wi = useWhatIf(u.id);
  const tabs = useMemo(() => (wi ? TABS.flatMap((t) => (t.id === "solution" ? [t, { id: "whatif" as TabId, label: "What if Microsoft?" }] : [t])) : TABS), [wi]);
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab("overview");
  }, [tabs, tab]);
  const [printAll, setPrintAll] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [editKpis, setEditKpis] = useState(false);
  const [editSizing, setEditSizing] = useState(false);
  const [editText, setEditText] = useState<null | { key: "functionalFlow" | "dataSystems" | "volumes" | "potentialSolution" | "products"; title: string; hint: string }>(null);
  const [prefill, setPrefill] = useState<{ text: string; title: string; key: number } | undefined>(undefined);
  const update = useUpdateUseCase();
  const ref = useRef<HTMLDivElement>(null);
  const save = (patch: UseCasePatch, msg: string, done?: () => void) =>
    READ_ONLY ? void toast.info(readOnlyMessage()) : update.mutate(
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
  const qs = questions(u);
  const [dlBusy, setDlBusy] = useState(false);
  /**
   * Saves a downloaded file as a real file in SharePoint (radar site > Documents > Offline copies) and offers
   * Open (download or share it from there); a local download stays available as the fallback. A download from
   * the embedded app alone gives a blob: page tied to the app session that cannot be saved or shared.
   */
  const saveAndOffer = async (t: string | number, what: string, name: string, bytes: Uint8Array, blob: Blob) => {
    const size = blob.size >= 1048576 ? `${(blob.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(blob.size / 1024))} KB`;
    const local = () => saveOfflineCopy(name, blob);
    if (IS_STATIC) {
      local();
      toast.success(`${what} ready`, { id: t, description: name, duration: 8000 });
      return;
    }
    const localButton = (label: string) => (
      <button type="button" className="font-medium underline underline-offset-2 hover:opacity-80" onClick={local}>
        {label}
      </button>
    );
    toast.loading(`Saving the ${what.toLowerCase()} to SharePoint…`, { id: t, description: `${name} · ${size}`, duration: Infinity });
    try {
      const saved = await saveToSharePoint(name, bytes);
      toast.success(`Saved to SharePoint: ${saved.name}`, {
        id: t,
        description: (
          <span>
            {saved.isHtml
              ? <>{size} · Documents › Offline copies. Click Download, then open it from your computer (SharePoint's preview cannot run it). Share it from that folder; the recipient downloads it too. Or {localButton("download it here")}.</>
              : <>{size} · Documents › Offline copies. Click Open, then Download or Share. Or {localButton("download it here")}.</>}
          </span>
        ),
        duration: Infinity,
        closeButton: true,
        richColors: true,
        action: {
          label: saved.isHtml ? "Download" : "Open",
          onClick: (e) => {
            e.preventDefault();
            openInNewTab(saved.url);
          },
        },
      });
    } catch (e) {
      console.error("[save to SharePoint] failed", e);
      const reason = e instanceof Error ? e.message : String(e);
      toast.error(`Could not save to SharePoint: ${name}`, {
        id: t,
        description: (
          <span>
            {reason} — downloading it here instead. Nothing in your Downloads? {localButton("Download it here")}.
          </span>
        ),
        duration: Infinity,
        closeButton: true,
        richColors: true,
      });
      local();
    }
  };
  const downloadCopy = async (edition: "internal" | "customer") => {
    if (dlBusy) return;
    setDlBusy(true);
    const t = toast.loading(`Building the ${edition} offline copy…`, { description: "This takes a few seconds.", duration: Infinity });
    try {
      const { name, blob, bytes } = await buildOfflineCopy(u.id, edition, (msg) => toast.loading(`Building the ${edition} offline copy…`, { id: t, description: msg, duration: Infinity }));
      await saveAndOffer(t, `${edition === "customer" ? "Customer" : "Internal"} offline copy`, name, bytes, blob);
    } catch (e) {
      console.error("[offline copy] failed", e);
      toast.error("The offline copy could not be created", {
        id: t,
        description: e instanceof OfflineCopyAssetError ? `Could not read ${e.url} — ${e.reason}` : e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        duration: Infinity,
        closeButton: true,
        richColors: true,
      });
    } finally {
      setDlBusy(false);
    }
  };
  const exportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPrintAll(true);
    const t = toast.loading("Creating the PDF…", { description: "This takes a few seconds.", duration: Infinity });
    let restoreLinks = () => {};
    let built: { fileName: string; blob: Blob } | undefined;
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 900));
      const root = ref.current;
      if (!root || !headRef.current) throw new Error("Dossier not ready");
      // No link to internal Microsoft 365 items (Teams, SharePoint/OneDrive, Outlook) in a downloaded file.
      restoreLinks = scrubDom(root);
      const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-panel]"));
      const sections = panels.map((p) => ({ blocks: Array.from(p.children).filter((c): c is HTMLElement => c instanceof HTMLElement && !c.matches("[data-pdf-exclude]")) }));
      if (sections[0]) sections[0].blocks.unshift(headRef.current);
      else sections.push({ blocks: [headRef.current] });
      const pdfName = `${downloadStem(u.account, u.id, u.title, "business-case-input")}.pdf`;
      try {
        built = await createSectionedPdfBlob(sections, pdfName);
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        built = await createSectionedPdfBlob(sections, pdfName);
      }
    } catch (e) {
      console.warn("PDF export failed", e);
      toast.error(toSafePdfExportError(e)?.message ?? "PDF export failed", { id: t, description: null, duration: Infinity, closeButton: true, richColors: true });
    } finally {
      restoreLinks();
      setPrintAll(false);
    }
    try {
      if (built) await saveAndOffer(t, "PDF", built.fileName, new Uint8Array(await built.blob.arrayBuffer()), built.blob);
    } finally {
      setPdfBusy(false);
    }
  };
  const brand = brandOf(u.account);
  const accent = inkOf(brand.primary);
  const route = routeOf(u.classification);
  const sources = parseSources(u.sources);
  const related = parseRelated(u.relatedUseCases);
  const insights = lines(u.insights);
  const assessment = lines(u.analysis);
  const stage = u.stage ?? "Signal";
  const decision = u.decision ?? "Undecided";
  const go = (label: string) => {
    const t = tabs.find((x) => x.label === label);
    if (t) {
      setTab(t.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const panel = (id: TabId, children: React.ReactNode) =>
    !tabs.some((t) => t.id === id) ? null : (
      <div
        role="tabpanel"
        id={`panel-${id}`}
        aria-labelledby={`tab-${id}`}
        hidden={!printAll && tab !== id}
        className={cn("space-y-5", !printAll && "animate-in fade-in duration-300")}
        data-pdf-panel
      >
        {printAll && <h2 className="font-[family-name:var(--font-serif)] text-2xl">{tabs.find((t) => t.id === id)?.label}</h2>}
        {children}
      </div>
    );
  const levelChip = (k: "complexity" | "effort" | "valueLevel") => (
    <FactChip key={k} label={LEVEL_LABEL[k]} value={u[k] ?? "Not set"}>
      <Label className="text-xs text-muted-foreground">{LEVEL_LABEL[k]}</Label>
      {!LIVE_READ_ONLY && (
      <Select value={u[k] ?? ""} onValueChange={(v) => save({ [k]: v as Level } as UseCasePatch, `${LEVEL_LABEL[k]} set to ${v}`)}>
        <SelectTrigger size="sm" className="w-full bg-white" aria-label={`Change ${LEVEL_LABEL[k]}`}>
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
      )}
      {k === "valueLevel" && u.valueBasis && <p className="text-xs text-muted-foreground">{u.valueBasis}</p>}
      {k !== "valueLevel" && u.sizingBasis && <p className="text-xs text-muted-foreground">{u.sizingBasis}</p>}
    </FactChip>
  );
  const cv = caseValue(u.kpiValues);
  const yearValue = (cv.costUsd ?? 0) + (cv.revenueUsd ?? 0);
  const monthCost = typeof u.monthlyCost === "number" ? u.monthlyCost : undefined;

  return (
    <div ref={ref}>
      <div ref={headRef} className="-mx-6 border-b border-border bg-[#F7F5F0] px-6 pt-3">
        {/* Brand band with the few actions */}
        <div className="flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-border bg-white py-1 pr-3" style={{ borderTop: `4px solid ${brand.primary}` }}>
          <Link to={`/customer/${encodeURIComponent(u.account ?? "Internal")}`} className="flex h-10 items-center px-4" aria-label={`${u.account ?? "Internal"} customer page`}>
            {brand.logo ? <img src={brand.logo} alt={`${u.account ?? "Microsoft"} logo`} className="max-h-7 max-w-[120px] object-contain" /> : <span>{u.account}</span>}
          </Link>
          {internalRef && (
            <span className="rounded-md border border-[#D9D2C4] bg-white px-2 py-0.5 font-mono text-xs text-[#3D4757]">
              <span className="sr-only">Internal customer reference </span>
              {internalRef}
            </span>
          )}
          {u.lastSignal && <span className="hidden text-xs text-muted-foreground md:inline">last input {fmtDate(u.lastSignal)}</span>}
          {u.discarded && (
            <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800">
              Discarded{u.discardReason ? ` · ${u.discardReason}` : ""}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2" data-pdf-exclude>
            {nav}
            {!RADAR.customerEdition && !READ_ONLY && (
              <button type="button" onClick={() => setInputOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white shadow-sm hover:opacity-90" style={{ background: accent }}>
                <ShieldCheck className="size-4" aria-hidden /> Add input
              </button>
            )}
            {hasSolution(u.id) && (
              <Link to={`/use-case/${u.id}/solution`} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium shadow-sm hover:bg-muted" style={{ borderColor: accent, color: accent }}>
                <Sparkles className="size-4" aria-hidden /> Solution experience
              </Link>
            )}
            {!LIVE_READ_ONLY && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8" aria-label="More actions">
                  {pdfBusy || dlBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MoreHorizontal className="size-4" aria-hidden />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!RADAR.customerEdition && !READ_ONLY && (
                  <DropdownMenuItem onSelect={() => setCoachOpen(true)}>
                    <Bot className="size-4" aria-hidden /> Complete with AI
                  </DropdownMenuItem>
                )}
                {!RADAR.customerEdition && !READ_ONLY && (
                  <DropdownMenuItem onSelect={() => void downloadCopy("internal")} disabled={dlBusy}>
                    <Download className="size-4" aria-hidden /> Download offline copy (internal)
                  </DropdownMenuItem>
                )}
                {!READ_ONLY && (
                  <DropdownMenuItem onSelect={() => void downloadCopy("customer")} disabled={dlBusy}>
                    <Download className="size-4" aria-hidden /> Download offline copy (customer)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void exportPdf()} disabled={pdfBusy}>
                  <FileDown className="size-4" aria-hidden /> Export PDF
                </DropdownMenuItem>
                {READ_ONLY ? null : u.discarded ? (
                  <DropdownMenuItem onSelect={() => save({ discarded: false, discardReason: "" }, "Use case restored")}>
                    <RotateCcw className="size-4" aria-hidden /> Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setDiscardOpen(true)}>
                    <Ban className="size-4" aria-hidden /> Discard
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>

        {/* Title and the facts, each fact once (click to change) */}
        <h1 className="mt-3 font-[family-name:var(--font-serif)] text-[28px] leading-tight tracking-tight">{title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FactChip label="Stage" value={stage}>
            <p className="text-muted-foreground">{STAGE_MEANING[stage]}</p>
            {!LIVE_READ_ONLY && (
            <Select value={stage} onValueChange={(v) => save({ stage: v as Stage }, `Stage set to ${v}`)}>
              <SelectTrigger aria-label="Change stage" size="sm" className="w-full">
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
            )}
          </FactChip>
          {/* Customer edition: Microsoft's internal decision, confidence and readiness scoring stay internal. */}
          {!RADAR.customerEdition && (<>
          <FactChip label="Decision" value={decision}>
            <p className="text-muted-foreground">{DECISION_MEANING[decision]}</p>
            {!LIVE_READ_ONLY && (
            <Select value={decision} onValueChange={(v) => save({ decision: v as Decision }, `Decision set to ${v}`)}>
              <SelectTrigger aria-label="Change decision" size="sm" className="w-full">
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
            )}
          </FactChip>
          <FactChip label="Confidence" value={u.confidence ?? "Low"}>
            <p>{CONFIDENCE_MEANING[u.confidence ?? "Low"]}</p>
            <p className="text-xs text-muted-foreground">How well the customer's own sources evidence the use case. Set by the analysis.</p>
          </FactChip>
          </>)}
          <FactChip label="Route" value={u.classification ? route.short : "Not classified"} dot={route.color} wide>
            {u.classificationConfidence && <ToneBadge field="confidence" value={u.classificationConfidence} label="Route confidence" />}
            {u.classificationWhy && <p>{u.classificationWhy}</p>}
            {!RADAR.customerEdition && !READ_ONLY && <RouteEditor current={u.classification} busy={update.isPending} onSave={save} />}
          </FactChip>
          {wi && (
            <FactChip label={`${wi.e.account || u.account || "Customer"}'s choice`} value={shortName(wi.e.name)} dot={wi.e.accent2}>
              <p>The customer chose this platform. The "What if Microsoft?" tab shows the Microsoft alternative beside it.</p>
            </FactChip>
          )}
          <FactChip label="Roadmap" value={u.wave && u.wave !== "Unplanned" ? `${u.wave}${u.customerDecision ? ` · ${u.customerDecision}` : ""}` : "Candidate"} wide>
            <RoadmapFields u={u} busy={update.isPending} onSave={save} />
          </FactChip>
          {levelChip("valueLevel")}
          {levelChip("complexity")}
          {levelChip("effort")}
          <FactChip label="Department" value={u.department ?? "Not set"}>
            {LIVE_READ_ONLY ? <p className="text-muted-foreground">Department of the use case.</p> : (
            <Select value={u.department ?? ""} onValueChange={(v) => save({ department: v }, `Department set to ${v}`)}>
              <SelectTrigger size="sm" className="w-full bg-white" aria-label="Change department">
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
            )}
          </FactChip>
        </div>

        {/* Business case readiness, always on top */}
        {!RADAR.customerEdition && <div className="mt-3">
          <ReadinessStrip u={u} onCoach={RADAR.customerEdition || READ_ONLY ? undefined : () => setCoachOpen(true)} onGo={go} />
        </div>}

        <UseCaseClarifications
          u={u}
          onAnswered={(_u, q, a) => {
            setPrefill({ text: `Answer from the account team to an open clarification.\nQuestion: ${q}\nAnswer: ${a}\nApply this answer to every field it settles, as one current statement (no dates).`, title: "Owner answer to a clarification", key: Date.now() });
            setInputOpen(true);
          }}
        />
      </div>

      {/* Tabs stay visible while scrolling */}
      <div role="tablist" aria-label="Dossier sections" className="sticky top-16 z-20 -mx-6 flex gap-1 overflow-x-auto border-b border-border bg-[#F7F5F0]/95 px-6 backdrop-blur no-scrollbar" data-pdf-exclude>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => {
              setTab(t.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn("relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors", tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {t.id === "evidence" && <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{signals.length + sources.length}</span>}
            <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity", tab === t.id ? "opacity-100" : "opacity-0")} style={{ background: brand.primary }} />
          </button>
        ))}
      </div>

      {!RADAR.customerEdition && !LIVE_READ_ONLY && (
        <PageBoundary label="Input review" compact onReset={() => setInputOpen(false)}>
          <UseCaseInput u={u} open={inputOpen} onOpenChange={setInputOpen} accent={accent} prefill={prefill} />
        </PageBoundary>
      )}
      {!RADAR.customerEdition && !LIVE_READ_ONLY && (
        <PageBoundary label="Coach" compact onReset={() => setCoachOpen(false)}>
          <UseCaseCoach u={u} open={coachOpen} onOpenChange={setCoachOpen} accent={accent} />
        </PageBoundary>
      )}
      <DiscardDialog open={discardOpen} onOpenChange={setDiscardOpen} busy={update.isPending} onDiscard={(reason) => save({ discarded: true, discardReason: reason }, "Use case discarded", () => setDiscardOpen(false))} />

      <div className="pt-5">
        {panel(
          "overview",
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <TextCard icon={Target} title="What this use case is about" value={u.description} hint="What the use case is about, for whom, and what it should achieve" tone={accent} lines={6} busy={update.isPending} onSave={(v, done) => save({ description: v }, "Description saved", done)} />
              <NextSteps u={u} save={save} busy={update.isPending} accent={accent} />
            </div>
            <div className="space-y-6">
              <OwnerCard u={u} save={save} busy={update.isPending} accent={accent} onShowAll={() => go("Participants")} />
              <PriorityFitBox u={u} />
            </div>
          </div>,
        )}

        {panel("people", <ParticipantsPanel u={u} save={save} busy={update.isPending} accent={accent} />)}

        {panel(
          "problem",
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <TextCard icon={Workflow} title="Business process" value={u.process} hint="Which process, from which step to which step" tone="#1B2A41" lines={4} busy={update.isPending} onSave={(v, done) => save({ process: v.slice(0, 250) }, "Process saved", done)} />
              <TextCard icon={Users} title="Who is affected" value={u.users} hint="Roles, teams and how many people" tone="#5B3FA8" lines={4} busy={update.isPending} onSave={(v, done) => save({ users: v }, "Users saved", done)} />
              <TextCard icon={Flag} title="Today's pain" value={u.pain} hint="What goes wrong today, ideally in time, cost or risk" tone="#B4232A" lines={4} busy={update.isPending} onSave={(v, done) => save({ pain: v }, "Pain saved", done)} />
            </div>
            <TextCard icon={Target} title="Target outcome" value={u.outcome} hint="What changes for the business" tone="#2F9461" lines={3} busy={update.isPending} onSave={(v, done) => save({ outcome: v }, "Outcome saved", done)} />
            <section aria-labelledby="kpi-title" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="kpi-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  KPIs · today → target
                </h2>
                {!RADAR.customerEdition && !READ_ONLY && (
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditKpis(true)}>
                    <Pencil className="size-3.5" aria-hidden /> Edit KPIs
                  </Button>
                )}
              </div>
              <KpiCards value={u.kpiValues} />
            </section>
            <Dialog open={editKpis} onOpenChange={setEditKpis}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>KPIs</DialogTitle>
                  <DialogDescription>Hours stay in hours; money is in US dollars.</DialogDescription>
                </DialogHeader>
                <KpiTable value={u.kpiValues} rate={rate} busy={update.isPending} onSave={(v, done) => save({ kpiValues: v }, "KPIs saved", done)} />
              </DialogContent>
            </Dialog>
          </>,
        )}

        {panel(
          "landscape",
          <>
            <section aria-labelledby="flow-title" className="space-y-3">
              <SectionHead id="flow-title" title="How it works today" onEdit={() => setEditText({ key: "functionalFlow", title: "How it works today", hint: "Step by step, including where a person decides. One step per line." })} />
              <FlowChain text={u.functionalFlow} accent={accent} />
            </section>
            <section aria-labelledby="sys-title" className="space-y-3">
              <SectionHead id="sys-title" title="Systems and data that stay" onEdit={() => setEditText({ key: "dataSystems", title: "Systems and data that stay", hint: "The customer's existing systems, data and tools; separate them with semicolons." })} />
              <SystemChips text={u.dataSystems} />
            </section>
            <section aria-labelledby="vol-title" className="space-y-3">
              <SectionHead id="vol-title" title="Volumes" onEdit={() => setEditText({ key: "volumes", title: "Volumes", hint: "Transactions, cases or runs per month, number of users. One figure per line." })} />
              <VolumeTiles text={u.volumes} />
            </section>
            <section aria-labelledby="val-title" className="space-y-3">
              <SectionHead id="val-title" title="Value per year" />
              <ValueTiles u={u} />
            </section>
          </>,
        )}

        {panel(
          "finops",
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <BigNumber label="AI run cost / month" value={monthCost !== undefined ? usd0.format(monthCost) : "Not sized"} note={monthCost === undefined && design?.runCost?.note ? "Estimate from the solution design below" : undefined} tone="#B4232A" />
              <BigNumber label="Value / month (cost savings + revenue)" value={yearValue ? usd0.format(yearValue / 12) : "Not quantified"} tone="#2F9461" />
              <BigNumber
                label="Net / month"
                value={monthCost !== undefined && yearValue ? usd0.format(yearValue / 12 - monthCost) : "—"}
                tone={monthCost !== undefined && yearValue && yearValue / 12 - monthCost < 0 ? "#B4232A" : "#1B2A41"}
              />
            </div>
            {design?.runCost && (design.runCost.drivers?.length || design.runCost.note) && (
              <section className="rounded-2xl border border-border bg-white p-4" aria-labelledby="drivers-title">
                <h2 id="drivers-title" className="flex items-center gap-2 text-sm font-semibold">
                  <Coins className="size-4 text-[#B8892B]" aria-hidden /> What drives the run cost
                </h2>
                {design.runCost.note && <p className="mt-1 text-sm text-[#2B3445]">{design.runCost.note}</p>}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(design.runCost.drivers ?? []).map((d) => (
                    <li key={d} className="rounded-xl bg-[#F3F1EC] px-3 py-1.5 text-xs">
                      {d}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!RADAR.customerEdition && !READ_ONLY && (
              <Button variant="outline" size="sm" onClick={() => setEditSizing(true)}>
                <Pencil className="size-3.5" aria-hidden /> {monthCost !== undefined ? "Review the sizing" : "Size the AI run cost"}
              </Button>
            )}
            <Dialog open={editSizing} onOpenChange={setEditSizing}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>FinOps sizing</DialogTitle>
                  <DialogDescription>One line per AI cost. Illustrative list prices; replace them with the customer's agreement.</DialogDescription>
                </DialogHeader>
                <FinOpsSizing u={u} rate={rate} busy={update.isPending} onSave={(p, m) => save(p, m, () => setEditSizing(false))} />
              </DialogContent>
            </Dialog>
          </>,
        )}

        {panel(
          "analysis",
          <div className="grid gap-5 lg:grid-cols-3">
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
            {insights.length > 0 && (
              <section aria-labelledby="ins-title" className={card}>
                <h2 id="ins-title" className="font-[family-name:var(--font-serif)] text-lg">
                  Deep analysis
                </h2>
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
          </div>,
        )}

        {panel(
          "solution",
          <>
            <SolutionVisual u={u} route={route} design={design} hasDesign={hasSolution(u.id)} />
            {!RADAR.customerEdition && !READ_ONLY && (
              <div className="flex flex-wrap gap-2" data-pdf-exclude>
                <Button variant="ghost" size="sm" onClick={() => setEditText({ key: "potentialSolution", title: "Potential solution (text behind the picture)", hint: "2–5 sentences: how Microsoft could solve it, in line with the route." })}>
                  <Pencil className="size-3.5" aria-hidden /> Edit the approach
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditText({ key: "products", title: "Microsoft components", hint: "Comma-separated, e.g. Copilot Studio, Power Automate, Dataverse." })}>
                  <Pencil className="size-3.5" aria-hidden /> Edit the components
                </Button>
              </div>
            )}
          </>,
        )}

        {wi &&
          panel(
            "whatif",
            <PageBoundary label="What if Microsoft" compact>
              <WhatIfPanel id={u.id} printAll={printAll} />
            </PageBoundary>,
          )}

        {panel(
          "evidence",
          <div className="grid gap-5 lg:grid-cols-3">
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
            <section aria-labelledby="ev-title" className={card}>
              <h2 id="ev-title" className="font-[family-name:var(--font-serif)] text-lg">
                Data sources <span className="text-sm tabular-nums text-muted-foreground">{sources.length}</span>
              </h2>
              {sources.length > 0 ? (
                <ul className="mt-2 space-y-2.5 text-sm">
                  {sources.map((s, i) => {
                    const href = externalUrl(s.url);
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
                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground">Evidence trail</summary>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{u.evidence}</p>
                </details>
              )}
            </section>
            <div className="space-y-5">
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
              {related.length === 0 && features.length === 0 && <p className="text-sm text-muted-foreground">No related use cases or feature unlocks yet.</p>}
            </div>
          </div>,
        )}
      </div>
      {editText && (
        <EditTextDialog
          open
          onOpenChange={(v) => !v && setEditText(null)}
          title={editText.title}
          hint={editText.hint}
          value={u[editText.key]}
          busy={update.isPending}
          onSave={(v) => save({ [editText.key]: v } as UseCasePatch, `${editText.title} saved`, () => setEditText(null))}
        />
      )}
    </div>
  );
}

function SectionHead({ id, title, onEdit }: { id: string; title: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {onEdit && !RADAR.customerEdition && !READ_ONLY && (
        <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden /> Edit
        </Button>
      )}
    </div>
  );
}

function BigNumber({ label, value, note, tone }: { label: string; value: string; note?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4" style={{ borderTop: `4px solid ${tone}` }}>
      <p className="font-[family-name:var(--font-serif)] text-3xl leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function DiscardDialog({ open, onOpenChange, busy, onDiscard }: { open: boolean; onOpenChange: (v: boolean) => void; busy: boolean; onDiscard: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discard this use case</DialogTitle>
          <DialogDescription>It disappears from the lists and can be restored later.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="discard-reason" className="text-xs text-muted-foreground">
          Reason
        </Label>
        <Input id="discard-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer decision, duplicate…" autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => onDiscard(reason.trim())}>
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
