import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Boxes, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Pause, Play, Plug, ShieldCheck, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/states";
import { useUseCase } from "@/data/repo";
import { brandOf, inkOf } from "@/lib/brands";
import { routeOf } from "@/lib/routes";
import { safeUrl } from "@/lib/safe-url";
import { BUILD_TITLE, LAYER_LABEL, LAYER_ORDER, useHeroImage, useSolution, type ChapterId, type Layout, type Solution, type SolNode } from "@/lib/solutions";
import { BlueprintKit, GoLiveSection, KindHero } from "@/components/blueprint";
import { SolutionDemo } from "@/components/solution-demos";
import { TechArchitecture } from "@/components/tech-architecture";
import { ArchViews } from "@/components/arch-views";
import { Challenge, ClockStory, JourneyViz, NumbersStrip, Signature, motifStyle } from "@/components/solution-creative";
import { ScrollRow } from "@/components/scroll-row";
import { HackathonChapter, hasHackathon } from "@/components/hackathon";
import { PathwayChapter, hasPathway } from "@/components/pathway";
import { RedesignBar, RequestDesign } from "@/components/redesign-bar";
import { cn } from "@/lib/utils";

const serif = "font-[family-name:var(--font-serif)]";
const CH_KICKER: Record<ChapterId, string> = {
  demo: "See it work",
  story: "The story",
  journey: "Customer journey",
  architecture: "Architecture",
  needs: "What is needed",
  plan: "Configure · build · deploy",
  value: "Value, cost and risk",
  build: "The solution",
  golive: "Get it live",
  hackathon: "Route to hackathon",
  pathway: "Assumptions and path",
};
const DEFAULT_CHAPTERS: { id: ChapterId; title: string; intro: string }[] = [
  { id: "story", title: "From today's friction to the solved state", intro: "" },
  { id: "journey", title: "How the experience changes", intro: "" },
  { id: "architecture", title: "The target solution", intro: "" },
  { id: "needs", title: "What we need and why", intro: "" },
  { id: "plan", title: "The delivery plan", intro: "" },
  { id: "value", title: "What success looks like", intro: "" },
];

/** Route-true chapter sets: light routes get the artefact and how to go live; heavy routes keep architecture and plan. */
function routeChapters(s: Solution): { id: ChapterId; title: string; intro: string }[] {
  const b = s.blueprint!;
  const build = { id: "build" as ChapterId, title: BUILD_TITLE[b.kind], intro: "" };
  const story = { id: "story" as ChapterId, title: "Today and tomorrow", intro: "" };
  const golive = { id: "golive" as ChapterId, title: "Get it live", intro: "" };
  const value = { id: "value" as ChapterId, title: "Value and risks", intro: "" };
  const hack = hasHackathon(s) ? [{ id: "hackathon" as ChapterId, title: "Route to hackathon", intro: "" }] : [];
  if (hasPathway(s)) hack.unshift({ id: "pathway" as ChapterId, title: "Assumptions and path", intro: "" });
  if (b.kind === "m365" || b.kind === "cowork" || b.kind === "noai" || b.kind === "unknown") return [...hack, build, story, golive, value];
  const out = [...hack, build, story];
  if ((b.kind === "studio" || b.kind === "fabric" || b.kind === "foundry") && (s.techViews || s.technical)) out.push({ id: "architecture", title: "Architecture", intro: "" });
  out.push(golive, { id: "plan", title: "Delivery plan", intro: "" }, value);
  return out;
}

export function SolutionPage() {
  const { id = "" } = useParams();
  const uc = useUseCase(id);
  const sol = useSolution(id);
  const [preview, setPreview] = useState(false);
  const brand = brandOf(uc.data?.account);
  const accent = inkOf(brand.primary ?? "#0E7C86");

  if (sol.loading) return <div className="mx-auto max-w-5xl p-8"><LoadingState rows={6} /></div>;
  const proposal = sol.set?.proposed?.data;
  const shown = (preview || !sol.data) && proposal ? proposal : sol.data;
  if (!shown)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <EmptyState title="No solution yet" description="This use case has no solution design yet." />
        <RequestDesign id={id} classification={uc.data?.classification} />
        <div className="mt-4 text-center">
          <Link to={`/use-case/${id}`} className="text-primary underline">
            Back to the use case
          </Link>
        </div>
      </div>
    );
  const look = shown.experience?.look;
  const pal = PALETTES[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTES.length];
  const solAccent = look?.accent ?? (shown.blueprint ? pal[0] : accent);
  const solAccent2 = look?.accent2 ?? (shown.blueprint ? pal[1] : accent);
  const bar = <RedesignBar id={id} set={sol.set} classification={uc.data?.classification} preview={preview || !sol.data} setPreview={setPreview} lastEvidence={uc.data?.lastSignal} />;
  return <SolutionView key={shown === proposal ? "proposal" : "current"} bar={bar} s={shown} id={id} account={uc.data?.account} classification={uc.data?.classification} owner={uc.data?.owner} accent={solAccent} accent2={solAccent2} />;
}

/** Curated accent pairs; a use case without its own look gets one picked from its id, so pages differ. */
const PALETTES: [string, string][] = [
  ["#0F6E6E", "#2BA59A"],
  ["#5B3FA8", "#9B6FD6"],
  ["#A3472A", "#D9822B"],
  ["#1F5FA8", "#3FA0D8"],
  ["#2F6B3A", "#7FB241"],
  ["#8A2C5B", "#D0567F"],
  ["#3D4F66", "#7A93AE"],
  ["#946B12", "#D4A72C"],
];
const KIND_LABEL: Record<string, string> = { noai: "Rules and flows, no AI", codeapp: "Power Apps code app", m365: "Microsoft 365 Copilot", cowork: "Copilot Cowork", studio: "Copilot Studio agent", fabric: "Microsoft Fabric", foundry: "Azure AI Foundry", unknown: "Route to decide" };

function SolutionView({ s, id, account, classification, owner, accent, accent2, bar }: { bar?: React.ReactNode; s: Solution; id: string; account?: string; classification?: string; owner?: string; accent: string; accent2?: string }) {
  const exp = s.experience;
  const layout: Layout = exp?.layout ?? "cinematic";
  const chapters = s.blueprint ? routeChapters(s) : exp?.chapters?.length ? exp.chapters.filter((c) => c.id !== "demo" || exp.demo) : DEFAULT_CHAPTERS;
  const bp = s.blueprint;
  const [active, setActive] = useState<ChapterId>(chapters[0].id);
  const idx = Math.max(0, chapters.findIndex((c) => c.id === active));
  const ch = chapters[idx];
  const hero = useHeroImage(id, s.theme);
  const route = routeOf(classification);
  const contentRef = useRef<HTMLDivElement>(null);
  const go = (k: ChapterId) => {
    setActive(k);
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const wave = s.wave === "W1" ? "Wave 1" : s.wave === "W2" ? "Wave 2" : s.wave;
  const facts = (
    <>
      <Chip label="Route" value={route.short} dot={route.color} />
      {hasPathway(s) && <Chip label="Assumptions" value={`${(s as unknown as { pathway: { assumptions: unknown[] } }).pathway.assumptions.length} to validate`} dot="#D97706" />}
      {hasHackathon(s) && <Chip label="Hackathon" value={(s as unknown as { hackathon: { event: { dates: string } } }).hackathon.event.dates} dot="#E11D48" />}
      {bp ? (
        <Chip label="Effort" value={`${bp.effort.value} ${bp.effort.value === 1 ? bp.effort.unit.replace(/s$/, "") : bp.effort.unit}`} />
      ) : (
        <>
          <Chip label="Effort" value={`${s.plan.totalEffortDays} days`} />
          <Chip label="Duration" value={`${s.plan.durationWeeks} weeks`} />
        </>
      )}
      {bp && <Chip label="Runs on" value={bp.runCost.model} />}
      {owner && <Chip label="Owner" value={owner} />}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/85 px-3 py-1">
        <span className={cn("size-2 rounded-full", s.readinessVerdict.startsWith("Ready to") ? "bg-emerald-600" : s.readinessVerdict.startsWith("Ready") ? "bg-amber-500" : "bg-rose-500")} />
        <span className="max-w-[260px] truncate" title={s.readinessVerdict}>
          {s.readinessVerdict}
        </span>
      </span>
    </>
  );
  const back = (
    <Link to={`/use-case/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" aria-hidden /> {account ?? ""} · {wave} · {s.title}
    </Link>
  );
  const body = (
    <div key={active} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className={cn("mb-5 max-w-4xl", bp && "sr-only")}>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground">{CH_KICKER[ch.id].toUpperCase()}</p>
        <h2 className={cn(serif, "mt-1 text-2xl md:text-3xl")}>{ch.title}</h2>
        {ch.intro && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{ch.intro}</p>}
      </div>
      {bar}
      {ch.id === "build" && bp && (
        <BlueprintKit b={bp} s={s} />
      )}
      {ch.id === "golive" && bp && <GoLiveSection b={bp} s={s} />}
      {ch.id === "hackathon" && <HackathonChapter s={s} />}
      {ch.id === "pathway" && <PathwayChapter s={s} />}
      {ch.id === "demo" && exp?.demo && <SolutionDemo demo={exp.demo} />}
      {ch.id === "story" && <StorySection s={s} />}
      {ch.id === "journey" && <JourneySection s={s} />}
      {ch.id === "architecture" && <ArchitectureChapter s={s} />}
      {ch.id === "needs" && <NeedsSection s={s} />}
      {ch.id === "plan" && <PlanSection s={s} />}
      {ch.id === "value" && <ValueSection s={s} />}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        {idx > 0 ? (
          <Button variant="ghost" onClick={() => go(chapters[idx - 1].id)}>
            <ChevronLeft className="size-4" aria-hidden /> {chapters[idx - 1].title}
          </Button>
        ) : (
          <span />
        )}
        {idx < chapters.length - 1 ? (
          <Button onClick={() => go(chapters[idx + 1].id)} className="text-white hover:opacity-90" style={{ background: "var(--sol)" }}>
            Next: {chapters[idx + 1].title} <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Link to={`/use-case/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
            Back to the dossier
          </Link>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Design proposal prepared by Microsoft and grounded in Microsoft Learn. Figures marked "To confirm" or "Not stated" still need customer validation; effort is an estimate in person-days; demo content is illustrative.
      </p>
    </div>
  );
  const tabs = (dark = false) => (
    <ScrollRow label="Chapters" dark={dark} activeKey={active}>
      {chapters.map((c, i) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={active === c.id}
          onClick={() => go(c.id)}
          className={cn(
            "relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-sm transition-colors",
            active === c.id ? (dark ? "font-medium text-white" : "font-medium text-foreground") : dark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className={cn("grid size-5 place-items-center rounded-full text-[11px] tabular-nums", active === c.id ? "text-white" : dark ? "bg-white/15" : "bg-white/80")} style={active === c.id ? { background: "var(--sol)" } : undefined}>
            {i + 1}
          </span>
          {c.title}
          <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity", active === c.id ? "opacity-100" : "opacity-0")} style={{ background: dark ? "white" : "var(--sol)" }} />
        </button>
      ))}
    </ScrollRow>
  );
  const style = { ["--sol" as string]: accent, ["--sol2" as string]: accent2 ?? accent } as React.CSSProperties;
  const motif = motifStyle(s.creative?.motif);
  const tagline = exp?.tagline ?? s.headline;
  const content = (
    <div ref={contentRef} className="scroll-mt-32">
      {body}
    </div>
  );
  const stickyBar = (inner: React.ReactNode, cls = "bg-[#F7F5F0]/95") => (
    <div className={cn("sticky top-16 z-20 border-b border-border backdrop-blur", cls)}>
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-6">
        <span className={cn(serif, "hidden shrink-0 text-lg xl:block")} style={{ color: "var(--sol)" }}>
          {s.creative?.signature?.emoji ? `${s.creative.signature.emoji} ` : ""}
          {s.solutionName}
        </span>
        <div className="min-w-0 flex-1">{inner}</div>
      </div>
    </div>
  );

  /* ---- Route blueprints: compact header, chapter tabs, panels that fit the screen ---- */
  if (bp) {
    const look = exp?.look ?? {};
    const tone = look.tone ?? (layout === "console" ? "dark" : layout === "dashboard" || layout === "blueprint" ? "tint" : "light");
    const dark = tone === "dark";
    const titleCls = look.type === "mono" ? "font-mono font-semibold tracking-tight" : look.type === "sans" ? "font-semibold tracking-tight" : serif;
    const canvas = look.canvas ?? (dark ? "#0F1B2D" : tone === "tint" ? "color-mix(in srgb, var(--sol) 7%, #FFFDF8)" : "#F7F5F0");
    return (
      <div className="min-h-[calc(100vh-4rem)] pb-8" style={style}>
        <header className={cn("relative overflow-hidden border-b border-border", dark && "text-white")} style={{ background: canvas }}>
          <div className="pointer-events-none absolute inset-0 opacity-70" style={motif} />
          <div className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full opacity-25 blur-3xl" style={{ background: "var(--sol2)" }} />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-6 px-6 py-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-2.5">
              <span className={cn("[&_a]:text-inherit", dark && "opacity-80")}>{back}</span>
              <span className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-white" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2))" }}>
                <Sparkles className="size-3" aria-hidden /> {KIND_LABEL[bp.kind] ?? route.short}
                {s.creative?.signature?.kicker ? <span className="font-normal opacity-85">· {s.creative.signature.kicker}</span> : null}
              </span>
              <h1 className={cn(titleCls, "text-4xl leading-[1.05] md:text-5xl")} style={dark ? undefined : { color: "var(--sol)" }}>
                {s.solutionName}
              </h1>
              <p className={cn("line-clamp-2 max-w-2xl text-lg leading-snug", dark ? "text-white/85" : "text-foreground/80")}>{tagline}</p>
              {s.creative?.signature?.line && <p className={cn(serif, "line-clamp-1 max-w-2xl text-[15px] italic", dark ? "text-white/70" : "text-foreground/60")}>“{s.creative.signature.line}”</p>}
              <div className={cn("flex flex-wrap gap-1.5 text-xs", dark && "text-foreground")}>{facts}</div>
            </div>
            <div className="relative hidden h-[230px] overflow-hidden rounded-3xl lg:block">
              {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] hover:scale-105" />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--sol) 55%, transparent), transparent 60%)" }} />
              <div className="absolute inset-0 flex items-center justify-end pr-6">
                <KindHero b={bp} s={s} />
              </div>
            </div>
          </div>
        </header>
        {stickyBar(tabs(), dark ? "bg-[#F4F6F8]/95" : "bg-[#F7F5F0]/95")}
        <div className="mx-auto max-w-[1440px] px-6 pt-5">{content}</div>
      </div>
    );
  }

  /* ---- Layout: editorial / blueprint — split hero, chapter rail ---- */
  if (layout === "editorial" || layout === "blueprint") {
    const bp = layout === "blueprint";
    return (
      <div className={cn("min-h-[calc(100vh-4rem)] pb-10", bp && "bg-[#F3F6F9]")} style={style}>
        <header className="relative overflow-hidden border-b border-border" style={motif}>
          <div className="mx-auto grid max-w-[1440px] items-stretch gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="flex min-w-0 flex-col justify-center gap-4">
              {back}
              <h1 className={cn(bp ? "font-mono text-4xl font-semibold tracking-tight md:text-5xl" : cn(serif, "text-5xl md:text-6xl"), "leading-[1.02]")} style={{ color: "var(--sol)" }}>
                {s.solutionName}
              </h1>
              <p className={cn(bp ? "text-lg" : cn(serif, "text-2xl"), "max-w-xl leading-snug text-foreground/85")}>{tagline}</p>
              <Signature s={s} />
              <NumbersStrip s={s} />
              <div className="flex flex-wrap gap-1.5 text-xs">{facts}</div>
            </div>
            <div className={cn("relative min-h-[300px] overflow-hidden lg:min-h-[440px]", bp ? "rounded-xl ring-1 ring-[#C9D3DE]" : "rounded-[2rem]")}>
              {hero && <img src={hero} alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] hover:scale-105", bp && "saturate-[.8]")} />}
              {bp && <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_23px,rgba(255,255,255,.35)_23px_24px),repeating-linear-gradient(90deg,transparent_0_23px,rgba(255,255,255,.35)_23px_24px)]" />}
              {bp && <span className="absolute right-3 bottom-3 rounded bg-white/90 px-2 py-1 font-mono text-[10px] tracking-wider">DWG · {s.title.slice(0, 32).toUpperCase()}</span>}
            </div>
          </div>
        </header>
        {stickyBar(<div className="lg:hidden">{tabs()}</div>, bp ? "bg-[#F3F6F9]/95 lg:hidden" : "bg-[#F7F5F0]/95 lg:hidden")}
        <div className="mx-auto grid max-w-[1440px] gap-8 px-6 pt-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <nav aria-label="Chapters" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
            <p className={cn(serif, "mb-2 px-3 text-sm")} style={{ color: "var(--sol)" }}>
              {s.solutionName}
            </p>
            <ol className="space-y-1">
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => go(c.id)}
                    aria-current={active === c.id ? "step" : undefined}
                    className={cn("group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all", active === c.id ? "bg-white shadow-sm" : "hover:bg-white/60")}
                  >
                    <span className={cn(bp ? "font-mono" : serif, "text-lg leading-none tabular-nums")} style={{ color: active === c.id ? "var(--sol)" : "#B9B1A3" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={cn(active === c.id ? "font-medium" : "text-muted-foreground")}>{c.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <main className="min-w-0">{content}</main>
        </div>
      </div>
    );
  }

  /* ---- Layout: storyboard — tall full-bleed scene, scene cards ---- */
  if (layout === "storyboard") {
    return (
      <div className="pb-10" style={style}>
        <header className="relative isolate overflow-hidden">
          {hero && <img src={hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/55 to-transparent" />
          <div className="mx-auto flex min-h-[520px] max-w-[1440px] flex-col justify-between px-6 pt-5 pb-6">
            <span className="w-fit rounded-full bg-white/80 px-3 py-1 backdrop-blur">{back}</span>
            <div className="mx-auto max-w-3xl text-center">
              {s.creative?.signature?.emoji && <span className="text-5xl drop-shadow">{s.creative.signature.emoji}</span>}
              <h1 className={cn(serif, "mt-2 text-5xl leading-tight md:text-6xl")} style={{ color: "var(--sol)" }}>
                {s.solutionName}
              </h1>
              <p className={cn(serif, "mx-auto mt-2 max-w-2xl text-xl")}>{tagline}</p>
              {s.creative?.signature?.line && <p className="mt-2 text-sm text-foreground/75">“{s.creative.signature.line}”</p>}
            </div>
            <div className="mx-auto w-full max-w-3xl">
              <NumbersStrip s={s} />
            </div>
          </div>
        </header>
        <div className="sticky top-16 z-20 border-b border-border bg-[#F7F5F0]/95 backdrop-blur">
          <ol className="mx-auto grid max-w-[1440px] grid-cols-3 gap-2 px-6 py-2 sm:grid-cols-4 lg:grid-cols-7">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => go(c.id)}
                  aria-current={active === c.id ? "step" : undefined}
                  className={cn("h-full w-full rounded-xl border p-2 text-left text-xs transition-all", active === c.id ? "border-transparent text-white shadow-md" : "border-border bg-white hover:-translate-y-0.5")}
                  style={active === c.id ? { background: "var(--sol)" } : undefined}
                >
                  <span className="block text-[10px] opacity-70">Scene {i + 1}</span>
                  <span className="line-clamp-2 font-medium">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="mx-auto max-w-[1300px] px-6 pt-6" style={motif}>
          <div className="mb-4 flex flex-wrap justify-center gap-1.5 text-xs">{facts}</div>
          {content}
        </div>
      </div>
    );
  }

  /* ---- Layout: console / dashboard — operational hero with big visual ---- */
  if (layout === "console" || layout === "dashboard") {
    const dash = layout === "dashboard";
    const kpis = s.kpis.slice(0, 4);
    return (
      <div className="pb-10" style={style}>
        <header className={cn("border-b border-border", dash ? "bg-white" : "bg-[#0F1B2D] text-white")} style={dash ? motif : undefined}>
          <div className="mx-auto grid max-w-[1440px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="flex min-w-0 flex-col justify-center gap-4">
              <span className={cn("[&_a]:text-inherit", dash ? "" : "opacity-80")}>{back}</span>
              <h1 className={cn(dash ? serif : "font-mono", "text-4xl leading-tight font-semibold md:text-5xl")} style={dash ? { color: "var(--sol)" } : undefined}>
                {!dash && <span className="mr-3 inline-block size-3 animate-pulse rounded-full bg-emerald-400 align-middle" aria-hidden />}
                {s.solutionName}
              </h1>
              <p className={cn("max-w-xl text-lg", dash ? "text-foreground/80" : "text-white/80")}>{tagline}</p>
              <Signature s={s} onDark={!dash} />
              <NumbersStrip s={s} onDark={!dash} />
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-3xl lg:min-h-[420px]">
              {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              {!dash && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#0F1B2D]/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-xl bg-black/50 px-3 py-2 font-mono text-[11px] text-emerald-300 backdrop-blur">
                    ● LIVE · {exp?.demo?.title ?? "agent running"}
                  </div>
                </>
              )}
              {dash && kpis.length > 0 && (
                <div className="absolute inset-x-3 bottom-3 grid gap-2 sm:grid-cols-2">
                  {kpis.slice(0, 2).map((k, i) => (
                    <div key={i} className="rounded-xl bg-white/90 px-3 py-2 backdrop-blur">
                      <p className="truncate text-[11px] text-muted-foreground">{k.name}</p>
                      <p className="truncate text-sm">
                        <span className="text-muted-foreground">{k.baseline || "Not stated"}</span> → <span className="font-semibold" style={{ color: "var(--sol)" }}>{k.target || "To confirm"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        {stickyBar(tabs(), dash ? "bg-white/95" : "bg-[#F4F6F8]/95")}
        <div className="mx-auto max-w-[1440px] px-6 pt-6">
          <div className="mb-4 flex flex-wrap gap-1.5 text-xs">{facts}</div>
          {content}
        </div>
      </div>
    );
  }

  /* ---- Layout: cinematic (default) — tall full-bleed image ---- */
  return (
    <div className="pb-10" style={style}>
      <header className="relative isolate overflow-hidden">
        {hero && <img src={hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover animate-[sol-kenburns_24s_ease-in-out_infinite_alternate]" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#F7F5F0] via-[#F7F5F0]/80 to-transparent" />
        <div className="mx-auto flex min-h-[540px] max-w-[1440px] flex-col justify-center gap-5 px-6 py-8">
          {back}
          <h1 className={cn(serif, "max-w-3xl text-6xl leading-[0.95] md:text-7xl")} style={{ color: "var(--sol)" }}>
            {s.solutionName}
          </h1>
          <p className={cn(serif, "max-w-2xl text-2xl leading-snug text-foreground/90")}>{tagline}</p>
          <div className="max-w-2xl">
            <Signature s={s} />
          </div>
          <div className="max-w-2xl">
            <NumbersStrip s={s} />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">{facts}</div>
        </div>
      </header>
      {stickyBar(tabs())}
      <div className="mx-auto max-w-[1440px] px-6 pt-6" style={motif}>
        {content}
      </div>
    </div>
  );
}


/* ---------- Needs ---------- */
const NEED_CATS = ["Platform", "Licences & capacity", "Data & integration", "Security & compliance", "People & process"];
const NEED_ICON: Record<string, LucideIcon> = {
  Platform: Boxes,
  "Licences & capacity": BadgeCheck,
  "Data & integration": Plug,
  "Security & compliance": ShieldCheck,
  "People & process": Users,
};
const STATUS_TONE: Record<string, string> = {
  "In place": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "To set up": "bg-amber-50 text-amber-800 border-amber-200",
  "To confirm": "bg-sky-50 text-sky-800 border-sky-200",
};
function NeedsSection({ s }: { s: Solution }) {
  const needs = s.needs ?? [];
  if (!needs.length) return <p className="text-sm text-muted-foreground">Not documented yet.</p>;
  const cats = NEED_CATS.filter((c) => needs.some((n) => n.category === c));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-xs">
        {(["To set up", "To confirm", "In place"] as const).map((st) => (
          <span key={st} className={cn("rounded-full border px-2.5 py-0.5", STATUS_TONE[st])}>
            {needs.filter((n) => n.status === st).length} {st.toLowerCase()}
          </span>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cats.map((c) => {
          const Icon = NEED_ICON[c] ?? Boxes;
          return (
            <section key={c} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-medium">
                <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: "var(--sol)" }}>
                  <Icon className="size-4" aria-hidden />
                </span>
                {c}
              </h3>
              <ul className="mt-3 space-y-3">
                {needs
                  .filter((n) => n.category === c)
                  .map((n, i) => (
                    <li key={i} className="border-l-2 pl-3" style={{ borderColor: "var(--sol)" }}>
                      <p className="flex flex-wrap items-start justify-between gap-2 text-[15px] font-medium leading-snug">
                        {n.item}
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-normal", STATUS_TONE[n.status])}>{n.status}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Why · </span>
                        {n.why}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Architecture: technical + business flow ---------- */
function ArchitectureChapter({ s }: { s: Solution }) {
  type V = "arch" | "tech" | "flow";
  const opts: [V, string][] = [];
  if (s.techViews) opts.push(["arch", "Reference architecture"]);
  if (s.technical) opts.push(["tech", "Deployment view"]);
  opts.push(["flow", "How it runs"]);
  const [view, setView] = useState<V>(opts[0][0]);
  return (
    <div>
      {opts.length > 1 && (
        <div role="tablist" aria-label="Architecture perspective" className="mb-5 inline-flex rounded-full bg-muted p-1 text-sm">
          {opts.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn("rounded-full px-4 py-1.5", view === k ? "bg-white font-medium shadow-sm" : "text-muted-foreground")}>
              {l}
            </button>
          ))}
        </div>
      )}
      {view === "arch" && s.techViews ? <ArchViews v={s.techViews} /> : view === "tech" && s.technical ? <TechArchitecture t={s.technical} /> : <ArchitectureSection s={s} />}
    </div>
  );
}

function Chip({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white/85 px-3 py-1 backdrop-blur">
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </span>
  );
}

/** Section titles are replaced by the chapter header. */
function SectionTitle(props: { kicker: string; title: string; intro?: string }) {
  void props;
  return null;
}

/* ---------- Story ---------- */
function StorySection({ s }: { s: Solution }) {
  const [after, setAfter] = useState(true);
  const items = after ? s.story.tomorrow : s.story.today;
  return (
    <section id="story">
      <SectionTitle kicker="The story" title="From today's friction to the solved state" />
      <div className={cn("grid gap-6", !s.creative?.dayInTheLife?.length && "lg:grid-cols-[1.15fr_1fr]")}>
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div role="tablist" aria-label="Before or after" className="inline-flex rounded-full bg-muted p-1 text-sm">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                role="tab"
                aria-selected={after === v}
                onClick={() => setAfter(v)}
                className={cn("rounded-full px-4 py-1.5 transition-all", after === v ? "bg-white shadow-sm" : "text-muted-foreground")}
              >
                {v ? "Tomorrow" : "Today"}
              </button>
            ))}
          </div>
          <ul key={String(after)} className="mt-6 space-y-4">
            {items.map((t, i) => (
              <li
                key={i}
                className="flex gap-3 animate-in fade-in slide-in-from-left-2 fill-mode-both"
                style={{ animationDelay: `${i * 90}ms`, animationDuration: "500ms" }}
              >
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: after ? "var(--sol)" : "#B9B1A3" }}
                  aria-hidden
                />
                <span className="text-[15px] leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        {s.creative?.dayInTheLife?.length ? null : (
<figure className="relative rounded-3xl p-6 md:p-8" style={{ background: "color-mix(in srgb, var(--sol) 8%, #FFFDF8)" }}>
          <span className={cn(serif, "absolute -top-4 left-6 text-7xl leading-none")} style={{ color: "var(--sol)" }} aria-hidden>
            “
          </span>
          <figcaption className="text-xs tracking-[0.14em] text-muted-foreground">A DAY IN THE LIFE</figcaption>
          <blockquote className={cn(serif, "mt-3 text-lg leading-relaxed")}>{s.story.dayInTheLife}</blockquote>
        </figure>
)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {s.personas.map((p) => (
          <div key={p.role} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full text-sm font-medium text-white" style={{ background: "var(--sol)" }}>
                {p.role
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <p className="font-medium leading-tight">{p.role}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Needs · </span>
              {p.need}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Gains · </span>
              {p.gain}
            </p>
          </div>
        ))}
      </div>
          {s.creative?.dayInTheLife?.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ClockStory s={s} />
          <Challenge s={s} />
        </div>
      ) : null}
    </section>
  );
}

/* ---------- Journey ---------- */
function JourneySection({ s }: { s: Solution }) {
  return <JourneyViz s={s} fallback={<CurveJourney s={s} />} />;
}

function CurveJourney({ s }: { s: Solution }) {
  const [sel, setSel] = useState(0);
  const j = s.journey;
  const step = j[Math.min(sel, j.length - 1)];
  const W = 1000,
    H = 170,
    padX = 60;
  const x = (i: number) => padX + (j.length === 1 ? 0 : (i * (W - 2 * padX)) / (j.length - 1));
  const y = (v: number) => H / 2 - Math.max(-2, Math.min(2, v)) * 32;
  const path = (k: "feelBefore" | "feelAfter") =>
    j.map((p, i) => {
      if (i === 0) return `M ${x(0)} ${y(p[k])}`;
      const px = x(i - 1),
        py = y(j[i - 1][k]),
        cx = (px + x(i)) / 2;
      return `C ${cx} ${py}, ${cx} ${y(p[k])}, ${x(i)} ${y(p[k])}`;
    }).join(" ");
  return (
    <section id="journey">
      <SectionTitle
        kicker="Customer journey"
        title="How the experience changes, step by step"
        intro="The curve shows how each step feels for the people involved, before (grey) and after (colour). Select a step to see what changes."
      />
      <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Experience curve before and after">
          <line x1={padX} x2={W - padX} y1={H / 2} y2={H / 2} stroke="#E4DED3" strokeDasharray="4 6" />
          <text x={8} y={y(2) + 4} fontSize="11" fill="#8A8F98">
            great
          </text>
          <text x={8} y={y(-2) + 4} fontSize="11" fill="#8A8F98">
            painful
          </text>
          <path d={path("feelBefore")} fill="none" stroke="#B9B1A3" strokeWidth="2.5" strokeDasharray="6 6" />
          <path d={path("feelAfter")} fill="none" stroke="var(--sol)" strokeWidth="3.5" className="sol-draw" />
          {j.map((p, i) => (
            <g key={i} onClick={() => setSel(i)} className="cursor-pointer">
              <circle cx={x(i)} cy={y(p.feelBefore)} r="5" fill="#B9B1A3" />
              <circle cx={x(i)} cy={y(p.feelAfter)} r={sel === i ? 10 : 7} fill={p.aiMoment ? "var(--sol)" : "#fff"} stroke="var(--sol)" strokeWidth="3" />
              {p.aiMoment && (
                <text x={x(i)} y={y(p.feelAfter) - 16} textAnchor="middle" fontSize="13" fill="var(--sol)">
                  ✦
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {j.map((p, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              className={cn(
                "min-w-[140px] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                sel === i ? "border-transparent text-white shadow-md" : "border-border hover:bg-muted",
              )}
              style={sel === i ? { background: "var(--sol)" } : undefined}
              aria-pressed={sel === i}
            >
              <span className="block text-[11px] opacity-75">Step {i + 1}</span>
              <span className="font-medium">{p.stage}</span>
            </button>
          ))}
        </div>
        <div key={sel} className="mt-5 grid gap-4 animate-in fade-in duration-300 md:grid-cols-[200px_1fr_1fr]">
          <div className="text-sm">
            <p className="text-muted-foreground">Who</p>
            <p className="font-medium">{step.actor}</p>
            <p className="mt-3 text-muted-foreground">Where</p>
            <p className="font-medium">{step.touchpoint}</p>
            {step.aiMoment && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white" style={{ background: "var(--sol)" }}>
                <Sparkles className="size-3.5" aria-hidden /> AI moment
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs tracking-[0.14em] text-muted-foreground">BEFORE</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{step.before}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 10%, white)" }}>
            <p className="text-xs tracking-[0.14em]" style={{ color: "var(--sol)" }}>
              AFTER
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{step.after}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Architecture ---------- */
function ArchitectureSection({ s }: { s: Solution }) {
  const a = s.architecture;
  const layers = useMemo(() => LAYER_ORDER.filter((l) => a.nodes.some((n) => n.layer === l)), [a.nodes]);
  const W = 1040,
    rowH = 104,
    labelW = 150,
    nodeW = 168,
    nodeH = 58;
  const H = layers.length * rowH + 10;
  const pos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    layers.forEach((l, li) => {
      const ns = a.nodes.filter((n) => n.layer === l);
      const span = W - labelW - 20;
      ns.forEach((n, i) => {
        out[n.id] = { x: labelW + (span * (i + 0.5)) / ns.length, y: li * rowH + rowH / 2 + 5 };
      });
    });
    return out;
  }, [a.nodes, layers]);
  const [selNode, setSelNode] = useState<SolNode | null>(null);
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const flow = a.flow;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (stepIdx >= flow.length - 1) setPlaying(false);
      else setStepIdx((v) => v + 1);
    }, stepIdx < 0 ? 200 : 2800);
    return () => clearTimeout(t);
  }, [playing, stepIdx, flow.length]);
  const cur = stepIdx >= 0 ? flow[stepIdx] : null;
  const curve = (f: string, t: string) => {
    const p = pos[f],
      q = pos[t];
    if (!p || !q) return "";
    if (Math.abs(p.y - q.y) < 1) {
      const dy = -nodeH / 2 - 18;
      return `M ${p.x} ${p.y - nodeH / 2} C ${p.x} ${p.y + dy}, ${q.x} ${q.y + dy}, ${q.x} ${q.y - nodeH / 2}`;
    }
    const down = q.y > p.y;
    const y1 = p.y + (down ? nodeH / 2 : -nodeH / 2),
      y2 = q.y + (down ? -nodeH / 2 : nodeH / 2),
      my = (y1 + y2) / 2;
    return `M ${p.x} ${y1} C ${p.x} ${my}, ${q.x} ${my}, ${q.x} ${y2}`;
  };
  const activeIds = cur ? new Set([cur.from, cur.to]) : null;
  const wrap = (t: string, n: number) => {
    const words = t.split(" ");
    const lines: string[] = [];
    let l = "";
    for (const w of words) {
      if ((l + " " + w).trim().length > n && l) {
        lines.push(l);
        l = w;
      } else l = (l + " " + w).trim();
    }
    if (l) lines.push(l);
    return lines.slice(0, 2);
  };
  return (
    <section id="architecture">
      <SectionTitle kicker="Architecture" title="The target solution" intro={a.summary} />
      <div className="rounded-3xl border border-border bg-card p-3 md:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (stepIdx >= flow.length - 1) setStepIdx(-1);
                setPlaying(true);
              }
            }}
            style={{ background: "var(--sol)" }}
            className="text-white hover:opacity-90"
          >
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {playing ? "Pause" : stepIdx >= 0 ? "Resume the flow" : "Play the flow"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPlaying(false); setStepIdx((v) => Math.max(0, v - 1)); }} disabled={stepIdx <= 0} aria-label="Previous step">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPlaying(false); setStepIdx((v) => Math.min(flow.length - 1, v + 1)); }} disabled={stepIdx >= flow.length - 1} aria-label="Next step">
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{cur ? `Step ${cur.step} of ${flow.length}` : `${flow.length} runtime steps · click any component for details`}</span>
          <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded border border-dashed border-[#8A8F98] bg-[#F4F1EA]" /> customer system</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded" style={{ background: "color-mix(in srgb, var(--sol) 14%, white)", border: "1.5px solid var(--sol)" }} /> new component</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px] w-full" role="img" aria-label="Architecture diagram">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#B9B1A3" />
              </marker>
              <marker id="arr-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sol)" />
              </marker>
            </defs>
            {layers.map((l, li) => (
              <g key={l}>
                <rect x={0} y={li * rowH + 6} width={W} height={rowH - 6} rx={14} fill={li % 2 ? "#FBF9F5" : "#F6F3EC"} />
                <text x={16} y={li * rowH + rowH / 2 + 9} fontSize="13" fill="#5B6474" style={{ fontFamily: "var(--font-serif)" }}>
                  {LAYER_LABEL[l] ?? l}
                </text>
              </g>
            ))}
            {a.edges.map((e, i) => {
              const on = cur && cur.from === e.from && cur.to === e.to;
              return (
                <path key={i} d={curve(e.from, e.to)} fill="none" stroke={on ? "var(--sol)" : "#CFC7B8"} strokeWidth={on ? 3 : 1.4} markerEnd={on ? "url(#arr-on)" : "url(#arr)"} opacity={cur && !on ? 0.35 : 1}>
                  <title>{e.label}</title>
                </path>
              );
            })}
            {cur && !a.edges.some((e) => e.from === cur.from && e.to === cur.to) && (
              <path d={curve(cur.from, cur.to)} fill="none" stroke="var(--sol)" strokeWidth={3} markerEnd="url(#arr-on)" />
            )}
            {cur && pos[cur.from] && pos[cur.to] && (
              <circle r="7" fill="var(--sol)" key={stepIdx}>
                <animateMotion dur="1.4s" repeatCount="indefinite" path={curve(cur.from, cur.to)} />
              </circle>
            )}
            {a.nodes.map((n) => {
              const p = pos[n.id];
              if (!p) return null;
              const on = activeIds?.has(n.id);
              const dim = activeIds && !on;
              const lines = wrap(n.label, 20);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x - nodeW / 2} ${p.y - nodeH / 2})`}
                  onClick={() => setSelNode(n)}
                  className="cursor-pointer"
                  opacity={dim ? 0.4 : 1}
                  aria-hidden
                >
                  <rect
                    width={nodeW}
                    height={nodeH}
                    rx={12}
                    fill={n.existing ? "#F4F1EA" : "color-mix(in srgb, var(--sol) 12%, white)"}
                    stroke={on || selNode?.id === n.id ? "var(--sol)" : n.existing ? "#8A8F98" : "var(--sol)"}
                    strokeWidth={on || selNode?.id === n.id ? 3 : 1.5}
                    strokeDasharray={n.existing ? "5 4" : undefined}
                  />
                  {lines.map((t, i) => (
                    <text key={i} x={nodeW / 2} y={nodeH / 2 + (i - (lines.length - 1) / 2) * 15 + 5} textAnchor="middle" fontSize="12.5" fontWeight={600} fill="#1B2A41">
                      {t}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Components">
          {a.nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelNode(n)}
              aria-pressed={selNode?.id === n.id}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs", selNode?.id === n.id ? "border-transparent text-white" : "border-border hover:bg-muted")}
              style={selNode?.id === n.id ? { background: "var(--sol)" } : undefined}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-h-[96px] rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--sol) 8%, #FFFDF8)" }}>
            <p className="text-xs tracking-[0.14em] text-muted-foreground">RUNTIME STEP</p>
            {cur ? (
              <p key={stepIdx} className="mt-1.5 text-[15px] leading-relaxed animate-in fade-in duration-500">
                <span className="mr-2 font-medium" style={{ color: "var(--sol)" }}>
                  {cur.step}.
                </span>
                {cur.text}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">Press “Play the flow” to watch a request travel through the solution.</p>
            )}
          </div>
          <div className="min-h-[96px] rounded-2xl border border-border p-4">
            <p className="text-xs tracking-[0.14em] text-muted-foreground">COMPONENT</p>
            {selNode ? (
              <div className="mt-1.5 animate-in fade-in duration-300">
                <p className="font-medium">
                  {selNode.label} <span className="font-normal text-muted-foreground">· {selNode.product}</span>
                </p>
                <p className="mt-1 text-sm">{selNode.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {LAYER_LABEL[selNode.layer]} · {selNode.existing ? "Existing customer system, stays" : "New component"}
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">Select a component in the diagram.</p>
            )}
          </div>
        </div>
      </div>
      <h3 className={cn(serif, "mt-10 text-2xl")}>Design decisions</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {a.decisions.map((d, i) => (
          <details key={i} className="group rounded-2xl border border-border bg-card p-5 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <span>
                <span className="block text-sm text-muted-foreground">{d.decision}</span>
                <span className="mt-1 block font-medium">{d.choice}</span>
              </span>
              <ChevronDown className="mt-1 size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 text-sm">
              <span className="font-medium">Why · </span>
              {d.why}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Alternatives · </span>
              {d.alternatives}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function LearnLink({ l }: { l: { title: string; url: string } }) {
  const href = safeUrl(l.url);
  if (!href) return <span className="rounded-full border border-border px-3 py-1 text-xs">{l.title}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
      {l.title} <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

/* ---------- Plan ---------- */
function PlanSection({ s }: { s: Solution }) {
  const p = s.plan;
  const weeks = Math.max(p.durationWeeks, ...p.phases.map((x) => x.endWeek), 1);
  const [tab, setTab] = useState<"configure" | "build" | "deploy" | "prerequisites">("configure");
  const [ph, setPh] = useState<number | null>(null);
  const lists = { prerequisites: p.prerequisites, configure: p.configure, build: p.build, deploy: p.deploy };
  const maxDays = Math.max(...p.phases.map((x) => x.effortDays), 1);
  return (
    <section id="plan">
      <SectionTitle kicker="Configure · build · deploy" title="The delivery plan" intro={p.summary} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Effort" value={`${p.totalEffortDays}`} unit="person-days" />
        <Stat label="Duration" value={`${p.durationWeeks}`} unit="weeks" />
        <Stat label="Team" value={`${p.team.reduce((a, t) => a + t.fte, 0).toFixed(1)}`} unit="FTE at peak" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{p.effortBasis}</p>
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="relative">
          <div className="ml-[34%] flex text-[11px] text-muted-foreground md:ml-[28%]">
            {Array.from({ length: weeks }, (_, i) => (
              <span key={i} className="flex-1 border-l border-border/70 pl-1">
                {weeks <= 16 || (i + 1) % 2 === 1 ? `W${i + 1}` : ""}
              </span>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {p.phases.map((x, i) => (
              <button key={i} onClick={() => setPh(ph === i ? null : i)} className="flex w-full items-center text-left" aria-expanded={ph === i}>
                <span className="w-[34%] pr-3 text-sm md:w-[28%]">
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-muted-foreground">{x.effortDays} days</span>
                </span>
                <span className="relative h-9 flex-1 rounded-lg bg-muted/50">
                  <span
                    className="absolute top-1 bottom-1 rounded-md transition-all hover:brightness-110"
                    style={{
                      left: `${((x.startWeek - 1) / weeks) * 100}%`,
                      width: `${Math.max(((x.endWeek - x.startWeek + 1) / weeks) * 100, 3)}%`,
                      background: "var(--sol)",
                      opacity: 0.45 + 0.55 * (x.effortDays / maxDays),
                    }}
                  />
                </span>
              </button>
            ))}
            {p.milestones.length > 0 && (
              <div className="flex items-center">
                <span className="w-[34%] pr-3 text-sm text-muted-foreground md:w-[28%]">Milestones</span>
                <span className="relative h-9 flex-1">
                  {p.milestones.map((m, i) => (
                    <span
                      key={i}
                      title={`Week ${m.week}: ${m.name}`}
                      className="absolute top-2 size-4 -translate-x-1/2 rotate-45 border-2 border-white shadow"
                      style={{ left: `${(Math.min(m.week, weeks) / weeks) * 100}%`, background: "#B8892B" }}
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
        {ph != null && p.phases[ph] && (
          <div className="mt-5 grid gap-4 rounded-2xl bg-muted/50 p-4 animate-in fade-in duration-300 md:grid-cols-3">
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground">ACTIVITIES</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {p.phases[ph].activities.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground">DELIVERABLES</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {p.phases[ph].deliverables.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground">ROLES</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {p.phases[ph].roles.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{r.role}</span>
                    <span className="tabular-nums text-muted-foreground">{r.days} d</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {p.milestones.map((m, i) => (
            <li key={i}>
              <span className="mr-1 inline-block size-2 rotate-45" style={{ background: "#B8892B" }} />W{m.week} · {m.name}
            </li>
          ))}
          <li className="italic">Select a phase for its activities and roles.</li>
        </ul>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div role="tablist" className="inline-flex flex-wrap rounded-full bg-muted p-1 text-sm">
            {(["prerequisites", "configure", "build", "deploy"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-full px-4 py-1.5 capitalize", tab === k ? "bg-white shadow-sm" : "text-muted-foreground")}>
                {k === "prerequisites" ? "Before we start" : k}
              </button>
            ))}
          </div>
          <ol key={tab} className="mt-5 space-y-3">
            {lists[tab].map((t, i) => (
              <li key={i} className="flex gap-3 animate-in fade-in fill-mode-both" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs text-white" style={{ background: "var(--sol)" }}>
                  {i + 1}
                </span>
                <span className="text-[15px] leading-relaxed">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs tracking-[0.14em] text-muted-foreground">TEAM</p>
          <ul className="mt-3 space-y-3">
            {p.team.map((t) => (
              <li key={t.role}>
                <div className="flex justify-between text-sm">
                  <span>{t.role}</span>
                  <span className="tabular-nums text-muted-foreground">{t.fte} FTE</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, t.fte * 100)}%`, background: "var(--sol)" }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1">
        <span className={cn(serif, "text-4xl tabular-nums")} style={{ color: "var(--sol)" }}>
          {value}
        </span>{" "}
        <span className="text-sm text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

/* ---------- Value & risks ---------- */
function ValueSection({ s }: { s: Solution }) {
  const tone = (i: string) => (i === "High" ? "bg-rose-50 text-rose-800 border-rose-200" : i === "Medium" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200");
  return (
    <section id="value">
      <SectionTitle kicker="Value, cost and risk" title="What success looks like, and what could stop it" />
      <div className="grid gap-4 md:grid-cols-2">
        {s.kpis.map((k, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-medium">{k.name}</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="rounded-lg bg-muted px-2.5 py-1">{k.baseline || "Not stated"}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              <span className="rounded-lg px-2.5 py-1 text-white" style={{ background: "var(--sol)" }}>
                {k.target || "To confirm"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Measured by: {k.measure}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className={cn(serif, "text-2xl")}>Risks</h3>
          <ul className="mt-4 space-y-3">
            {s.risks.map((r, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-medium">{r.risk}</p>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", tone(r.impact))}>{r.impact}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.mitigation}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className={cn(serif, "text-xl")}>Run cost drivers</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {s.runCost.drivers.map((d, i) => (
                <li key={i}>· {d}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{s.runCost.note}</p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "color-mix(in srgb, var(--sol) 8%, #FFFDF8)" }}>
            <h3 className={cn(serif, "text-xl")}>To confirm with the customer</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {s.openQuestions.map((d, i) => (
                <li key={i}>? {d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <h3 className={cn(serif, "mt-10 text-xl")}>Microsoft Learn references</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {s.sources.map((l, i) => (
          <LearnLink key={i} l={l} />
        ))}
      </div>
    </section>
  );
}
