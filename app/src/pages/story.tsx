import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, EyeOff, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ConnectorErrorState, LoadingState } from "@/components/states";
import { useAppShortcut, useShortcutScope } from "@/components/shortcut-provider";
import { STAGE_H, STAGE_W } from "@/components/story/kit";
import { SLIDES } from "@/components/story/slides";
import { CHAPTERS, type StoryCtx, type StoryStats } from "@/components/story/types";
import { useConsumption, useFeatures, useSignals, useUseCases } from "@/data/repo";
import { useContentIndex, useDoc } from "@/lib/content";
import { clarifications } from "@/lib/readiness";
import {
  buildMask,
  designView,
  discardReasons,
  isRefresh,
  parseBasis,
  parseEvidence,
  peopleOf,
  richest,
  runTimes,
  sameTitle,
  zoneName,
} from "@/lib/story";
import { cn } from "@/lib/utils";
import { RADAR } from "@/radar.config";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const INTERNAL = (RADAR.internal?.name ?? "Internal").toLowerCase();

/** Scales the fixed 16:9 canvas to the space it has, like a slide in presenter view. */
function useFit(ref: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.6);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setScale(Math.min(r.width / STAGE_W, r.height / STAGE_H) * 0.985);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

export function StoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const still = useReducedMotion();
  const uq = useUseCases();
  const sq = useSignals();
  const fq = useFeatures();
  const cq = useConsumption();
  const ci = useContentIndex();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const scale = useFit(stageBox);
  const scope = useShortcutScope("story");
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState("");

  const all = useMemo(() => uq.data?.rows ?? [], [uq.data]);
  const active = useMemo(() => all.filter((u) => !u.discarded), [all]);
  const signals = useMemo(() => sq.data?.rows ?? [], [sq.data]);
  const consumption = useMemo(() => cq.data ?? [], [cq.data]);
  const refreshRuns = useMemo(() => consumption.filter(isRefresh), [consumption]);
  const designed = useMemo(() => new Set(ci.index.all.filter((d) => d.kind === "solution" && d.status === "Current").map((d) => d.ref)), [ci.index.all]);
  const hasDesign = useCallback((id: number) => designed.has(String(id)), [designed]);
  const showMode = params.get("show") === "1";
  const ready = uq.isSuccess && !sq.isLoading && !ci.isLoading;

  const ucParam = params.get("uc");
  const followed = useMemo(() => {
    if (!ready) return undefined;
    return (ucParam ? all.find((u) => String(u.id) === ucParam) : undefined) ?? richest(active, hasDesign, signals);
  }, [ready, ucParam, all, active, hasDesign, signals]);

  const dq = useDoc<unknown>("solution", followed ? String(followed.id) : undefined);
  const doc = dq.data?.current ?? dq.data?.proposed;
  const design = useMemo(() => (doc ? designView(doc.data, doc) : null), [doc]);

  const idx = Math.max(0, SLIDES.findIndex((s) => s.key === params.get("s")));
  const slide = SLIDES[idx];
  const chapterSlides = SLIDES.filter((s) => s.chapter === slide.chapter);
  const inChapter = chapterSlides.indexOf(slide);

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          if (value == null) n.delete(key);
          else n.set(key, value);
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );
  const go = useCallback((i: number) => setParam("s", SLIDES[Math.min(SLIDES.length - 1, Math.max(0, i))].key), [setParam]);
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);
  const exit = useCallback(() => navigate("/"), [navigate]);

  useAppShortcut(["right", "pagedown"], next, { scope, description: "Next slide" });
  useAppShortcut(["left", "pageup"], prev, { scope, description: "Previous slide" });

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const ctx: StoryCtx | null = useMemo(() => {
    if (!ready) return null;
    const perAccountMap = new Map<string, number>();
    for (const u of active) {
      const a = u.account ?? RADAR.internal?.name ?? "Internal";
      perAccountMap.set(a, (perAccountMap.get(a) ?? 0) + 1);
    }
    const perAccount = [...perAccountMap.entries()].map(([account, count]) => ({ account, count })).sort((a, b) => b.count - a.count);
    const bySourceMap = new Map<string, number>();
    const byKindMap = new Map<string, number>();
    for (const s of signals) {
      if (s.sourceType) bySourceMap.set(s.sourceType, (bySourceMap.get(s.sourceType) ?? 0) + 1);
      if (s.kind) byKindMap.set(s.kind, (byKindMap.get(s.kind) ?? 0) + 1);
    }
    const docs = ci.index.all;
    const countDocs = (status: string) => docs.filter((d) => d.kind === "solution" && d.status === status).length;
    const stats: StoryStats = {
      active: active.length,
      discarded: all.length - active.length,
      customers: perAccount.filter((p) => p.account.toLowerCase() !== INTERNAL).length,
      perAccount,
      signals: signals.length,
      bySource: [...bySourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      byKind: [...byKindMap.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count),
      designs: {
        current: countDocs("Current"),
        proposed: countDocs("Proposed"),
        rejected: countDocs("Rejected"),
        archived: countDocs("Archived"),
        requests: docs.filter((d) => d.kind === "request" && d.status === "Requested").length,
      },
      clarifyCases: active.filter((u) => clarifications(u).length > 0).length,
      features: fq.data?.rows.length ?? 0,
      runs: refreshRuns.length,
      runsCompleted: refreshRuns.filter((r) => /complet/i.test(r.status ?? "")).length,
      runsFailed: refreshRuns.filter((r) => /fail/i.test(r.status ?? "")).length,
      totalCost: consumption.reduce((s, r) => s + r.costUSD, 0),
      duplicates: all.filter((u) => u.discarded && /duplicate/i.test(u.discardReason ?? "")).length,
    };
    const ucSignals = followed
      ? signals.filter((s) => sameTitle(s.useCaseRef, followed.title)).sort((a, b) => (a.signalDate ?? "").localeCompare(b.signalDate ?? ""))
      : [];
    const clarifyUc = followed && clarifications(followed).length ? followed : active.find((u) => clarifications(u).length > 0);
    const latestRun = refreshRuns.find((r) => /complet/i.test(r.status ?? "")) ?? refreshRuns[0];
    const m = showMode
      ? buildMask(
          [...RADAR.customers.map((c) => c.name), ...perAccount.map((p) => p.account)],
          peopleOf([followed, clarifyUc].filter((u): u is NonNullable<typeof u> => !!u), signals, RADAR.owner),
        )
      : (t?: string) => t ?? "";
    return {
      m,
      showMode,
      stats,
      discard: discardReasons(all),
      uc: followed,
      ucSignals,
      ledger: parseEvidence(followed?.evidence),
      design,
      designLoading: dq.isLoading,
      features: fq.data?.rows ?? [],
      latestRun,
      runFacts: parseBasis(latestRun?.basis),
      recentRuns: refreshRuns.slice(0, 14),
      runTimes: runTimes(refreshRuns),
      zone: zoneName(),
      clarifyExample: clarifyUc ? clarifications(clarifyUc)[0] : undefined,
      owner: RADAR.owner,
      firstRun: refreshRuns[refreshRuns.length - 1]?.runDate,
      restart: () => go(0),
    };
  }, [ready, active, all, signals, ci.index.all, fq.data, refreshRuns, consumption, followed, showMode, design, dq.isLoading, go]);

  const pickList = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const mask = ctx?.m ?? ((t?: string) => t ?? "");
    return active
      .filter((u) => hasDesign(u.id))
      .map((u) => ({ u, title: mask(u.title), account: mask(u.account ?? "Internal") }))
      .filter((x) => words.every((w) => norm(`${x.title} ${x.account} #${x.u.id}`).includes(w)))
      .sort((a, b) => (b.u.signalCount ?? 0) - (a.u.signalCount ?? 0))
      .slice(0, 60);
  }, [active, hasDesign, q, ctx]);

  const link = ctx && slide.link ? slide.link(ctx) : null;
  const Render = slide.Render;

  if (RADAR.customerEdition) {
    return (
      <div id="work" tabIndex={-1} className="mx-auto max-w-[900px] px-6 py-16 outline-none">
        <p className="text-lg text-[#34465E]">This page is not part of this edition.</p>
      </div>
    );
  }

  const overlay = (
    <div
      ref={rootRef}
      id="work"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Inside the Radar"
      {...scope.bindings}
      className="fixed inset-0 z-50 flex flex-col radar-sky outline-none"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#CFE0F0] bg-[#F3F8FD] px-5">
        <svg width="28" height="28" viewBox="0 0 34 34" aria-hidden="true">
          <circle cx="17" cy="17" r="16" fill="#0D2847" />
          <circle cx="17" cy="17" r="11" fill="none" stroke="#E8D9B8" strokeWidth="1" opacity="0.6" />
          <path d="M17 17 L28 9" stroke="#D9B26A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="12" r="2.2" fill="#D9B26A" />
        </svg>
        <span className="font-[family-name:var(--font-serif)] text-[18px] text-[#0D2847]">Inside the Radar</span>
        <span className="hidden text-[13px] text-[#55657A] md:inline">
          Chapter {slide.chapter} of {CHAPTERS.length} · slide {idx + 1} of {SLIDES.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Popover open={pickOpen} onOpenChange={setPickOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!ctx}
                className="flex h-9 max-w-[420px] items-center gap-2 rounded-full border border-[#C8DAEC] bg-white px-3 text-[13.5px] text-[#0D2847] hover:border-[#A9B9CB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD] disabled:opacity-60"
                aria-label={`Use case the story follows: ${ctx?.uc ? ctx.m(ctx.uc.title) : "none"}. Change it`}
              >
                <span className="text-[#55657A]">Follow</span>
                <span className="truncate font-medium">{ctx?.uc ? ctx.m(ctx.uc.title) : "…"}</span>
                <ChevronDown className="size-4 shrink-0 text-[#55657A]" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[60] w-[460px] p-0">
              <Command shouldFilter={false}>
                <CommandInput value={q} onValueChange={setQ} placeholder="Find a use case with a design…" />
                <CommandList className="max-h-[360px]">
                  <CommandEmpty>No use case with a design matches.</CommandEmpty>
                  <CommandGroup heading={`${pickList.length}${pickList.length === 60 ? "+" : ""} use cases with a design`}>
                    {pickList.map(({ u, title, account }) => (
                      <CommandItem
                        key={u.id}
                        value={String(u.id)}
                        onSelect={() => {
                          setParam("uc", String(u.id));
                          setPickOpen(false);
                          setQ("");
                        }}
                        className="flex items-center gap-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {account} · #{u.id} · {u.signalCount ?? 0} signals
                          </span>
                        </span>
                        {ctx?.uc?.id === u.id && <span className="text-xs font-semibold text-[#0A4F8F]">Following</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[#C8DAEC] bg-white px-3 text-[13.5px] text-[#0D2847]">
            <EyeOff className="size-4 text-[#55657A]" aria-hidden="true" />
            Show mode
            <Switch checked={showMode} onCheckedChange={(v) => setParam("show", v ? "1" : null)} aria-label="Show mode: hide customer and people names" />
          </label>
          <button
            type="button"
            onClick={exit}
            className="flex h-9 items-center gap-1.5 rounded-full border border-[#C8DAEC] bg-white px-3 text-[13.5px] text-[#0D2847] hover:bg-[#E8F2FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]"
          >
            <X className="size-4" aria-hidden="true" /> Exit
          </button>
        </div>
      </div>

      <div ref={stageBox} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 flex flex-col overflow-hidden rounded-[24px] shadow-[0_24px_60px_rgba(27,42,65,0.18)]"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
            background: "radial-gradient(ellipse at 88% 0%, #DCEDEC 0%, #F3F8FD 52%) #F3F8FD",
          }}
        >
          <nav aria-label="Chapters" className="mx-10 mt-5 grid shrink-0 grid-cols-7 gap-2">
            {CHAPTERS.map((c, i) => {
              const n = i + 1;
              const on = n === slide.chapter;
              const done = n < slide.chapter;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => go(SLIDES.findIndex((s) => s.chapter === n))}
                  aria-current={on ? "step" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-[11px] px-3 text-left text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]",
                    on ? "bg-[#0F6CBD] font-semibold text-white shadow-[0_6px_18px_rgba(14,124,134,0.28)]" : done ? "bg-[#E3F0FB] text-[#0A4F8F] hover:bg-[#D3E7E6]" : "bg-[#E6EFF8] text-[#4A5261] hover:bg-[#E7E0D2]",
                  )}
                >
                  <span className={cn("font-mono text-[12px]", on ? "text-[#CDEBEA]" : done ? "text-[#0A4F8F]" : "text-[#6B6457]")}>{String(n).padStart(2, "0")}</span>
                  <span className="truncate">{c}</span>
                </button>
              );
            })}
          </nav>

          <div className="relative min-h-0 flex-1 px-14 pb-2 pt-6">
            {uq.isError ? (
              <ConnectorErrorState error={uq.error} connector="SharePoint" className="mt-10" />
            ) : !ctx ? (
              <div className="mt-10 max-w-[900px]">
                <p className="mb-4 text-[20px] text-[#34465E]">Reading the radar…</p>
                <LoadingState rows={4} />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.section
                  key={`${slide.key}-${ctx.uc?.id ?? 0}-${showMode ? 1 : 0}`}
                  aria-roledescription="slide"
                  aria-label={`Chapter ${slide.chapter}, ${CHAPTERS[slide.chapter - 1]}: ${slide.name}`}
                  className="h-full"
                  initial={still ? { opacity: 0 } : { opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={still ? { opacity: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <Render ctx={ctx} />
                </motion.section>
              </AnimatePresence>
            )}
          </div>

          <div className="mx-10 mb-4 flex h-12 shrink-0 items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={idx === 0}
              className="flex h-11 items-center gap-1.5 rounded-[11px] border border-[#C8DAEC] bg-white px-4 text-[15px] text-[#0D2847] hover:bg-[#E8F2FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </button>
            <div className="flex items-center gap-2">
              {chapterSlides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(SLIDES.indexOf(s))}
                  aria-label={`Slide ${i + 1} of chapter ${slide.chapter}: ${s.name}`}
                  aria-current={s.key === slide.key ? "true" : undefined}
                  className={cn("h-2.5 rounded-full transition-all", s.key === slide.key ? "w-7 bg-[#0F6CBD]" : "w-2.5 bg-[#CFC8B8] hover:bg-[#8A8F98]")}
                />
              ))}
              <span className="ml-2 text-[13.5px] text-[#4A5261]">
                Chapter {slide.chapter} · slide {inChapter + 1} of {chapterSlides.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {link && (
                <Link to={link.to} className="flex items-center gap-1 text-[15px] text-[#0A4F8F] underline underline-offset-4 hover:text-[#0F6CBD]">
                  {link.label} <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                onClick={next}
                disabled={idx === SLIDES.length - 1}
                className="flex h-11 items-center gap-1.5 rounded-[11px] bg-[#0F6CBD] px-5 text-[15px] font-semibold text-white hover:bg-[#0B5AA0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD] disabled:opacity-40"
              >
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Chapter {slide.chapter} of {CHAPTERS.length}, {CHAPTERS[slide.chapter - 1]}: {slide.name}.
      </p>
    </div>
  );

  return createPortal(overlay, document.body);
}
