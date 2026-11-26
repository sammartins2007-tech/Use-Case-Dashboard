import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Ban, BookOpen, CircleCheckBig, FileText, GitMerge, Hash, Mail, MessagesSquare, Newspaper, ShieldAlert, UserCheck, Video } from "lucide-react";
import type { ReactNode } from "react";
import { PIPELINE_STAGES, type Signal } from "@/data/types";
import { ELEMENTS, GATES, STATUS_LABEL, clarifications, questions, statusOf } from "@/lib/readiness";
import { ROUTES, routeOf } from "@/lib/routes";
import { article, clamp, fmtDay, fmtShortDay, int, sameTitle } from "@/lib/story";
import { cn } from "@/lib/utils";
import { RADAR } from "@/radar.config";
import { Bar, CountUp, Dot, Eyebrow, NoUseCase, Panel, Pill, Reveal, SlideHead, Tile, type PillTone } from "./kit";
import type { StoryCtx } from "./types";

/* ------------------------------------------------------------------ shared bits */

const SOURCE_ICON: Record<string, typeof Mail> = { Email: Mail, Teams: MessagesSquare, Meeting: Video, Document: FileText };
const KIND_TONE: Record<string, PillTone> = { "New use case": "teal", Enrichment: "tealSoft", Risk: "red", "Next step": "navy", FinOps: "gold", Feature: "goldSolid" };

function SourceIcon({ type, className }: { type?: string; className?: string }) {
  const Icon = SOURCE_ICON[type ?? ""] ?? FileText;
  return <Icon className={cn("size-5", className)} aria-hidden="true" />;
}

const firstSignal = (sigs: Signal[]) => sigs.find((s) => s.kind === "New use case") ?? sigs[0];

/* ------------------------------------------------------------------ 1.1 cover */


/** Cover picture when no presenter banner is configured: a calm sky with a sweeping radar. */
function RadarHero() {
  const still = useReducedMotion();
  const blips: [number, number, number][] = [
    [-150, -70, 7],
    [95, -120, 6],
    [170, 40, 8],
    [-60, 130, 6],
    [40, -30, 5],
  ];
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,#FFFFFF_0%,#EAF5FD_40%,#BFE2FA_100%)]">
      <svg className="absolute right-[-60px] top-1/2 h-[560px] w-[820px] -translate-y-1/2" viewBox="-410 -280 820 560">
        <defs>
          <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3BB0E8" stopOpacity="0" />
            <stop offset="100%" stopColor="#3BB0E8" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g transform="translate(110 0)">
          {[70, 140, 210, 280].map((r) => (
            <circle key={r} r={r} fill="none" stroke="#0F6CBD" strokeOpacity={0.16} strokeWidth={1.5} />
          ))}
          <line x1={-290} y1={0} x2={290} y2={0} stroke="#0F6CBD" strokeOpacity={0.1} />
          <line x1={0} y1={-290} x2={0} y2={290} stroke="#0F6CBD" strokeOpacity={0.1} />
          <motion.g animate={still ? undefined : { rotate: 360 }} transition={{ duration: 8, ease: "linear", repeat: Infinity }}>
            <path d="M0 0 L280 0 A280 280 0 0 0 198 -198 Z" fill="url(#radar-sweep)" />
          </motion.g>
          {blips.map(([x, y, r]) => (
            <g key={`${x},${y}`}>
              <circle cx={x} cy={y} r={r * 2.6} fill="#3BB0E8" opacity={0.18} />
              <circle cx={x} cy={y} r={r} fill="#0F6CBD" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export function Cover({ ctx }: { ctx: StoryCtx }) {
  const s = ctx.stats;
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <Reveal i={0}>
        <div className="relative h-[350px] overflow-hidden rounded-[30px] shadow-[0_24px_60px_rgba(15,60,120,0.18)] ring-1 ring-white/70">
          {RADAR.presenterBanner ? <img src={RADAR.presenterBanner} alt="" className="absolute inset-0 size-full object-cover object-right" /> : <RadarHero />}
          <div className="absolute inset-y-0 left-0 flex w-[560px] flex-col justify-center pl-12">
            <Eyebrow>Inside the Radar</Eyebrow>
            <p className="mt-3 text-[56px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#0D2847]">The {RADAR.appTitle}</p>
          </div>
        </div>
      </Reveal>
      <Reveal i={1}>
        <h2 className="max-w-[1450px] text-[40px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#0D2847]">
          From one sentence in a customer meeting to an AI solution designed by eight SE agents.
        </h2>
      </Reveal>
      <Reveal i={2}>
        <p className="max-w-[1300px] text-[20px] leading-[1.45] text-[#34465E]">
          The radar reads what the account team receives, finds real business pain, keeps every use case current and designs the answer. Twice a day, by itself.
        </p>
      </Reveal>
      <Reveal i={3}>
        <div className="grid grid-cols-5 gap-3">
          <Tile value={<CountUp value={s.active} />} label="use cases tracked" />
          <Tile value={<CountUp value={s.customers} />} label="customers" />
          <Tile value={<CountUp value={s.signals} />} label="signals captured" />
          <Tile value={<CountUp value={s.designs.current} />} label="solution designs" />
          <Tile value={<CountUp value={s.runs} />} label="refresh runs logged" />
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 1.2 the five gates */

const GATE_TEXT: Record<string, string> = {
  process: "Which business process, from which step to which step.",
  users: "Who is affected, and how many people.",
  pain: "What goes wrong today: a bottleneck, a risk, a cost.",
  outcome: "What should change for the business.",
  flow: "How the work runs, with the human in the loop.",
};

const LEFT_OUT = ["Generic AI ideas", "Access and licences", "Governance", "Adoption and training", "Product features", "Executive sessions", "Broad programmes"];

export function Gates({ ctx }: { ctx: StoryCtx }) {
  const s = ctx.stats;
  const maxAcc = Math.max(1, ...s.perAccount.map((p) => p.count));
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="01 · What a use case is" title="A use case is a business pain, not an AI idea." lead="It enters the radar only when these five things are evidenced. Everything else stays out." />
      <div className="mt-7 grid grid-cols-5 gap-4">
        {GATES.map((g, i) => (
          <Reveal key={g.key} i={i}>
            <div className="relative h-full rounded-[16px] border border-[#CDE3F5] bg-white p-5 shadow-[0_8px_22px_rgba(27,42,65,0.06)]">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#0D2847] text-[15px] font-semibold text-white">{i + 1}</span>
                <CircleCheckBig className="size-6 text-[#2A9D78]" aria-hidden="true" />
              </div>
              <p className="mt-3 font-[family-name:var(--font-serif)] text-[28px] leading-none text-[#0D2847]">{g.label}</p>
              <p className="mt-2 text-[16px] leading-snug text-[#34465E]">{GATE_TEXT[g.key]}</p>
              {i < 4 && <ArrowRight className="absolute -right-[18px] top-1/2 z-10 size-5 -translate-y-1/2 text-[#0F6CBD]" aria-hidden="true" />}
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-2 gap-6">
        <Reveal i={5}>
          <Panel className="h-full border-l-[6px] border-l-[#2A9D78]">
            <div className="flex items-baseline gap-3">
              <span className="text-[46px] font-semibold leading-none text-[#0D2847]">
                <CountUp value={s.active} />
              </span>
              <span className="text-[18px] text-[#34465E]">use cases kept, across {s.customers} customers</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
              {s.perAccount.slice(0, 8).map((p) => (
                <Bar key={p.account} label={ctx.m(p.account)} value={p.count} max={maxAcc} tone="#2A9D78" />
              ))}
            </div>
          </Panel>
        </Reveal>
        <Reveal i={6}>
          <Panel className="h-full border-l-[6px] border-l-[#8A8F98]">
            <div className="flex items-center gap-2 text-[18px] font-semibold text-[#0D2847]">
              <Ban className="size-5 text-[#55657A]" aria-hidden="true" /> Left out, on purpose
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEFT_OUT.map((x) => (
                <Pill key={x} tone="grey" className="text-[13.5px] font-medium">
                  {x}
                </Pill>
              ))}
            </div>
            <p className="mt-5 text-[17px] text-[#34465E]">
              <span className="text-[28px] font-semibold text-[#0D2847]">{s.discarded}</span> discarded, each with a written reason
            </p>
            <ul className="mt-2 space-y-1.5">
              {ctx.discard.slice(0, 3).map((d) => (
                <li key={d.reason} className="flex items-start gap-3 text-[15.5px] text-[#34465E]">
                  <span className="mt-0.5 min-w-9 rounded-md bg-[#E9EEF4] px-1.5 text-center text-[13px] font-semibold tabular-nums text-[#0D2847]">{d.count}</span>
                  <span>{clamp(ctx.m(d.reason), 110)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 1.3 anatomy of the use case we follow */

export function Anatomy({ ctx }: { ctx: StoryCtx }) {
  const u = ctx.uc;
  if (!u) return <NoUseCase />;
  const route = routeOf(u.classification);
  const red = clarifications(u).length;
  const people = (u.people ?? "").split(/\r?\n/).filter((l) => l.trim()).length;
  const stageIdx = PIPELINE_STAGES.indexOf((u.stage ?? "") as (typeof PIPELINE_STAGES)[number]);
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow={`01 · The use case we follow · #${u.id}`} title="Meet the use case we will follow." />
      <Reveal i={1} className="mt-6 min-h-0 flex-1">
        <Panel className="grid h-full grid-cols-[minmax(0,1fr)_560px] gap-10 p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="navy">{ctx.m(u.account ?? "Internal")}</Pill>
              {u.wave && u.wave !== "Unplanned" && <Pill tone="tealSoft">{u.wave}{u.customerDecision ? ` · ${u.customerDecision}` : ""}</Pill>}
              {u.confidence && <Pill tone="grey">Confidence {u.confidence.toLowerCase()}</Pill>}
            </div>
            <h3 className="mt-4 font-[family-name:var(--font-serif)] text-[38px] font-normal leading-[1.1] text-[#0D2847]">{ctx.m(u.title)}</h3>
            <dl className="mt-6 space-y-4">
              {[
                ["The pain", u.pain],
                ["The outcome", u.outcome],
                ["Who", u.users],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-[#7A5718]">{k}</dt>
                    <dd className="mt-1 text-[17px] leading-[1.45] text-[#34465E]">{clamp(ctx.m(v), 230)}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div>
              <p className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-[#7A5718]">Evidence today</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                {ELEMENTS.map((e) => {
                  const st = statusOf(e, u);
                  return (
                    <li key={e.key} className="flex items-center gap-2 text-[15px] text-[#0D2847]">
                      <Dot status={st} />
                      <span className="flex-1">{e.label}</span>
                      <span className="text-[12.5px] text-[#55657A]">{STATUS_LABEL[st]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-[#7A5718]">Stage</p>
              <ol className="mt-2 flex items-center gap-1.5">
                {PIPELINE_STAGES.map((st, i) => (
                  <li
                    key={st}
                    aria-current={i === stageIdx ? "step" : undefined}
                    className={cn(
                      "flex-1 rounded-full px-2 py-1 text-center text-[13px]",
                      i === stageIdx ? "bg-[#0F6CBD] font-semibold text-white" : i < stageIdx ? "bg-[#E3F0FB] text-[#0A4F8F]" : "bg-[#E8F2FB] text-[#55657A]",
                    )}
                  >
                    {st}
                  </li>
                ))}
              </ol>
              {stageIdx < 0 && u.stage && <p className="mt-1 text-[13px] text-[#55657A]">Now: {u.stage}</p>}
            </div>
            <div>
              <p className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-[#7A5718]">Platform route</p>
              <div className="mt-2 flex items-center gap-1" aria-hidden="true">
                {ROUTES.map((r) => (
                  <span key={r.key} className={cn("h-3 flex-1 rounded-full", r.key === route.key ? "h-5" : "opacity-35")} style={{ background: r.color }} />
                ))}
              </div>
              <p className="mt-2 text-[17px] font-semibold text-[#0D2847]">{route.short}</p>
              <p className="text-[14px] leading-snug text-[#34465E]">{route.definition}</p>
            </div>
          </div>
        </Panel>
      </Reveal>
      <Reveal i={3} className="mt-5 grid grid-cols-5 gap-3">
        <Tile value={<CountUp value={ctx.ucSignals.length || u.signalCount || 0} />} label="signals" />
        <Tile value={<CountUp value={ctx.ledger.length} />} label="evidence lines" />
        <Tile value={<CountUp value={people} />} label="people named" />
        <Tile value={<CountUp value={questions(u).length} />} label="open questions for the customer" />
        <Tile value={<CountUp value={red} />} label="red questions for the account team" className={red ? "border-[#EDB4B4] bg-[#FDF3F3]" : undefined} />
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 2.1 what it reads */

export function Sources({ ctx }: { ctx: StoryCtx }) {
  const f = ctx.runFacts;
  const still = useReducedMotion();
  const cnt = (v: number | undefined, unit: string) => (typeof v !== "number" ? undefined : v === 0 ? "none this run" : `${int.format(v)} ${unit}`);
  const rows: { icon: typeof Mail; name: string; what: string; count?: string }[] = [
    { icon: Mail, name: "Mail", what: "Every folder, the full body and every readable attachment", count: cnt(f.mails, "mails") },
    { icon: MessagesSquare, name: "Teams chats", what: "One-to-one, group and meeting chats, judged by content", count: cnt(f.chats, "chats") },
    {
      icon: Hash,
      name: "Teams channels",
      what: "Every post and reply, with the files shared there",
      count: typeof f.channels === "number" ? `${int.format(f.channels)} channels${typeof f.posts === "number" ? ` · ${int.format(f.posts)} posts` : ""}` : undefined,
    },
    { icon: Video, name: "Meetings", what: "Every meeting that ended, read from its transcript", count: cnt(f.meetings, "meetings") },
    { icon: FileText, name: "Documents", what: "Every document created, changed or shared", count: cnt(f.documents, "documents") },
  ];
  const maxSrc = Math.max(1, ...ctx.stats.bySource.map((b) => b.count));
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="02 · How it is detected"
        title="Twice a day, it reads everything the account team receives."
        lead="Search alone is never trusted: every item is listed and checked, with a 36-hour overlap so that nothing falls between two runs."
      />
      <div className="mt-7 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[660px_200px_minmax(0,1fr)] items-stretch">
        <div className="flex flex-col justify-between gap-3">
          {rows.map((r, i) => (
            <Reveal key={r.name} i={i} from="left">
              <div className="flex items-center gap-4 rounded-[14px] border border-[#D8E6F3] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(27,42,65,0.05)]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E3F0FB] text-[#0A4F8F]">
                  <r.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-semibold text-[#0D2847]">{r.name}</span>
                  <span className="block truncate text-[15px] text-[#34465E]">{r.what}</span>
                </span>
                {r.count && <span className="whitespace-nowrap rounded-full bg-[#0D2847] px-3 py-1 text-[13.5px] font-semibold text-white">{r.count}</span>}
              </div>
            </Reveal>
          ))}
        </div>
        <svg viewBox="0 0 200 520" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          {[52, 156, 260, 364, 468].map((y, i) => (
            <motion.path
              key={y}
              d={`M0 ${y} C 90 ${y}, 110 260, 196 260`}
              fill="none"
              stroke="#0F6CBD"
              strokeWidth="2.5"
              strokeDasharray="7 9"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={still ? { pathLength: 1, opacity: 0.7 } : { pathLength: 1, opacity: 0.7, strokeDashoffset: [0, -32] }}
              transition={{ pathLength: { duration: 0.8, delay: 0.3 + i * 0.08 }, opacity: { duration: 0.3, delay: 0.3 }, strokeDashoffset: { repeat: Infinity, duration: 1.1, ease: "linear" } }}
            />
          ))}
        </svg>
        <Reveal i={5} from="right" className="h-full">
          <Panel dark className="flex h-full flex-col">
            <Eyebrow dark>What it kept</Eyebrow>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="text-[54px] font-semibold leading-none">
                <CountUp value={ctx.stats.signals} />
              </span>
              <span className="text-[18px] text-[#C9D4DE]">signals with real use-case evidence</span>
            </p>
            <div className="mt-5 space-y-3">
              {ctx.stats.bySource.map((b) => (
                <div key={b.source} className="grid grid-cols-[130px_minmax(0,1fr)_44px] items-center gap-3 text-[15px]">
                  <span className="flex items-center gap-2 text-[#E6ECF1]">
                    <SourceIcon type={b.source} className="size-4" /> {b.source}
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <motion.span className="block h-full rounded-full bg-[#7FD1CF]" initial={{ width: 0 }} animate={{ width: `${Math.round((b.count / maxSrc) * 100)}%` }} transition={{ duration: 0.8, delay: 0.5 }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
            {ctx.stats.byKind.length > 0 && (
              <>
                <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.12em] text-[#E9D7AE]">What they carried</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {ctx.stats.byKind.map((k) => (
                    <Pill key={k.kind} tone={KIND_TONE[k.kind] ?? "grey"} className="text-[13.5px]">
                      {k.kind} · {k.count}
                    </Pill>
                  ))}
                </div>
              </>
            )}
            <p className="mt-auto pt-5 text-[14.5px] leading-snug text-[#C9D4DE]">
              Ignored on purpose: newsletters, notifications, logistics, licensing, agendas and idea lists the customer never raised.
            </p>
            {ctx.latestRun && <p className="mt-2 text-[13px] text-[#A9B8C6]">Source counts on the left: latest run, {fmtDay(ctx.latestRun.runDate)}.</p>}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 2.2 born from one sentence */

function Step({ i, title, children, className }: { i: number; title: string; children: ReactNode; className?: string }) {
  return (
    <Reveal i={i * 2}>
      <Panel className={cn("flex min-h-[360px] flex-col p-6", className)}>
        <p className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-[#7A5718]">
          {String(i + 1).padStart(2, "0")} · {title}
        </p>
        <div className="mt-3 min-h-0 flex-1">{children}</div>
      </Panel>
    </Reveal>
  );
}

function Arrow({ i }: { i: number }) {
  return (
    <Reveal i={i * 2 + 1} className="flex items-center justify-center" from="left">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#0F6CBD] text-white shadow-[0_6px_16px_rgba(14,124,134,0.35)]">
        <ArrowRight className="size-5" aria-hidden="true" />
      </span>
    </Reveal>
  );
}

export function Born({ ctx }: { ctx: StoryCtx }) {
  const u = ctx.uc;
  if (!u) return <NoUseCase />;
  const s = firstSignal(ctx.ucSignals);
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="02 · Detection, for real"
        title="Born from one sentence."
        lead={
          s
            ? `On ${fmtDay(s.signalDate)}, ${s.sourceType ? `${article(s.sourceType)} ${s.sourceType.toLowerCase()}` : "a source"} carried the first evidence of this use case.`
            : "The first evidence of this use case is in its Evidence history."
        }
      />
      <div className="mt-7 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1.25fr)_56px_minmax(0,1fr)_56px_minmax(0,1fr)_56px_minmax(0,1.05fr)] items-center">
        <Step i={0} title="The source">
          {s ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 text-[15px] text-[#34465E]">
                <SourceIcon type={s.sourceType} className="text-[#0F6CBD]" />
                <span className="font-semibold text-[#0D2847]">{s.sourceType ?? "Source"}</span>
                <span>· {fmtShortDay(s.signalDate)}</span>
              </div>
              {s.sender && <p className="mt-1 text-[14.5px] text-[#55657A]">From {ctx.m(s.sender)}</p>}
              <blockquote className="mt-4 border-l-4 border-[#B8892B] pl-4 font-[family-name:var(--font-serif)] text-[21px] leading-[1.35] text-[#0D2847]">
                “{clamp(ctx.m(s.insight ?? s.title), 230)}”
              </blockquote>
            </div>
          ) : (
            <p className="text-[16px] text-[#34465E]">{clamp(ctx.m(ctx.ledger[0]?.text ?? ""), 260)}</p>
          )}
        </Step>
        <Arrow i={0} />
        <Step i={1} title="The verdict">
          <div className="space-y-3">
            <div className="rounded-[12px] bg-[#F3F8FD] p-3">
              <p className="text-[14px] text-[#55657A]">Statement logged with speaker, time and topic</p>
              <div className="mt-2 flex items-center gap-2">
                <Pill tone="teal">NEW</Pill>
                <span className="text-[15px] font-semibold text-[#0D2847]">a real business pain</span>
              </div>
            </div>
            <p className="text-[15.5px] leading-snug text-[#34465E]">Same counterpart, same intent, same customer later on? Then it enriches this use case instead of creating a second one.</p>
          </div>
        </Step>
        <Arrow i={1} />
        <Step i={2} title="The five checks">
          <ul className="space-y-2.5">
            {GATES.map((g, k) => {
              const st = statusOf(g, u);
              return (
                <motion.li
                  key={g.key}
                  className="flex items-center gap-2.5 text-[16px] text-[#0D2847]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + k * 0.18 }}
                >
                  <Dot status={st} />
                  <span className="flex-1">{g.label}</span>
                  <span className="text-[13px] text-[#55657A]">{STATUS_LABEL[st]}</span>
                </motion.li>
              );
            })}
          </ul>
          <p className="mt-4 text-[13.5px] text-[#55657A]">Evidence as it stands today.</p>
        </Step>
        <Arrow i={2} />
        <Step i={3} title="The use case" className="border-[#0F6CBD] ring-2 ring-[#0F6CBD]/20">
          <p className="font-mono text-[13px] text-[#0A4F8F]">#{u.id} · {ctx.m(u.account ?? "Internal")}</p>
          <p className="mt-2 font-[family-name:var(--font-serif)] text-[25px] leading-[1.15] text-[#0D2847]">{ctx.m(u.title)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {u.stage && <Pill tone="tealSoft">Stage: {u.stage}</Pill>}
            <Pill tone="grey">{ctx.ucSignals.length || u.signalCount || 0} signals so far</Pill>
          </div>
        </Step>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 2.3 the ledger */

const VERDICTS: { v: string; tone: PillTone; text: string }[] = [
  { v: "NEW", tone: "teal", text: "A new fact, or a new use case." },
  { v: "CONFIRMS", tone: "green", text: "The same fact, from another source." },
  { v: "REFINES", tone: "navy", text: "A sharper or newer version of a fact." },
  { v: "CONFLICTS", tone: "red", text: "A contradiction: it becomes a red question." },
  { v: "OUT OF SCOPE", tone: "grey", text: "Logged too, with the reason." },
];

export function Ledger({ ctx }: { ctx: StoryCtx }) {
  const rows = ctx.ledger.filter((l) => typeof l.statements === "number" && l.statements > 0);
  const shown = rows.slice(-7);
  const maxSt = Math.max(1, ...shown.map((r) => r.statements ?? 0));
  const totalSt = rows.reduce((s, r) => s + (r.statements ?? 0), 0);
  const totalUsed = rows.reduce((s, r) => s + (r.used ?? 0), 0);
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="02 · Reading in depth"
        title="Every statement is accounted for."
        lead="Transcripts and long mails are cut into segments of about three minutes. Each statement gets a verdict and lands in the field it informs. Nothing is summarised from the first part only."
      />
      <div className="mt-7 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[500px_minmax(0,1fr)] gap-7">
        <div className="flex flex-col gap-3">
          {VERDICTS.map((v, i) => (
            <Reveal key={v.v} i={i} from="left">
              <div className="flex items-center gap-4 rounded-[14px] border border-[#D8E6F3] bg-white px-4 py-3.5">
                <Pill tone={v.tone} className="min-w-[124px] justify-center">
                  {v.v}
                </Pill>
                <span className="text-[16.5px] text-[#34465E]">{v.text}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal i={3} from="right" className="h-full">
          <Panel className="flex h-full flex-col">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[20px] font-semibold text-[#0D2847]">The ledger behind this use case</p>
              {rows.length > 0 && (
                <p className="text-[15px] text-[#34465E]">
                  <span className="font-semibold text-[#0D2847]">{int.format(totalUsed)}</span> of {int.format(totalSt)} statements used, from {rows.length} sources
                </p>
              )}
            </div>
            {shown.length ? (
              <ul className="mt-5 space-y-3.5">
                {shown.map((r, i) => {
                  const st = r.statements ?? 0;
                  const used = Math.min(st, r.used ?? 0);
                  return (
                    <li key={`${r.date}-${i}`} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-x-4 gap-y-1">
                      <span className="min-w-0 truncate text-[15px] text-[#34465E]">
                        <span className="font-mono text-[13px] text-[#55657A]">{fmtShortDay(r.date)}</span> · {r.kind ?? "Source"} · {ctx.m(r.title || "untitled")}
                      </span>
                      <span className="text-right text-[14px] tabular-nums text-[#0D2847]">
                        <b>{used}</b> of {st} used
                      </span>
                      <span className="col-span-2 block h-3 overflow-hidden rounded-full bg-[#E8F2FB]">
                        <motion.span className="relative block h-full rounded-full bg-[#BFD9D8]" initial={{ width: 0 }} animate={{ width: `${(st / maxSt) * 100}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.07 }}>
                          <span className="absolute inset-y-0 left-0 rounded-full bg-[#0F6CBD]" style={{ width: `${st ? (used / st) * 100 : 0}%` }} />
                        </motion.span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 text-[16px] text-[#34465E]">{ctx.ledger.length ? `${ctx.ledger.length} evidence lines record where every fact came from.` : "No evidence lines yet."}</p>
            )}
            <p className="mt-auto pt-4 text-[13.5px] text-[#55657A]">Dark: statements used for this use case. Light: statements read from the same source.</p>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 3.1 the timeline */

export function Timeline({ ctx }: { ctx: StoryCtx }) {
  const u = ctx.uc;
  if (!u) return <NoUseCase />;
  const all = ctx.ucSignals;
  const shown = all.slice(-10);
  const hidden = all.length - shown.length;
  const types = [...new Set(all.map((s) => s.sourceType).filter(Boolean))];
  const n = shown.length;
  const W = 1488;
  const cardW = 262;
  const xs = shown.map((_, i) => (n <= 1 ? W / 2 - cardW / 2 : (i * (W - cardW)) / (n - 1)));
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="03 · How it learns"
        title="Every new source makes it sharper."
        lead={
          all.length
            ? `${all.length} signals between ${fmtDay(all[0].signalDate)} and ${fmtDay(all[all.length - 1].signalDate)}, from ${types.length} kinds of source. Each one refined the fields it touched.`
            : "No signal recorded for this use case yet."
        }
      />
      <div className="relative mt-6 min-h-0 flex-1">
        <div className="absolute left-0 right-0 top-[250px] h-[4px] rounded-full bg-gradient-to-r from-[#CDE3F5] via-[#0F6CBD] to-[#0D2847]" aria-hidden="true" />
        {hidden > 0 && (
          <span className="absolute left-0 top-[262px] rounded-full bg-[#E9EEF4] px-2.5 py-0.5 text-[13px] text-[#34465E]">+{hidden} earlier</span>
        )}
        <ol>
          {shown.map((s, i) => {
            const up = i % 2 === 0;
            return (
              <motion.li
                key={s.id}
                className="absolute"
                style={{ left: xs[i], width: cardW, top: up ? 0 : 290 }}
                initial={{ opacity: 0, y: up ? -16 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.16, duration: 0.4 }}
              >
                <div className="h-[222px] rounded-[14px] border border-[#D8E6F3] bg-white p-3.5 shadow-[0_8px_22px_rgba(27,42,65,0.07)]">
                  <div className="flex items-center gap-2">
                    <SourceIcon type={s.sourceType} className="size-4 text-[#0F6CBD]" />
                    <span className="font-mono text-[12.5px] text-[#34465E]">{fmtShortDay(s.signalDate)}</span>
                    {s.kind && (
                      <Pill tone={KIND_TONE[s.kind] ?? "grey"} className="ml-auto text-[11.5px]">
                        {s.kind}
                      </Pill>
                    )}
                  </div>
                  <p className="mt-2 text-[14.5px] leading-[1.38] text-[#0D2847]">{clamp(ctx.m(s.insight ?? s.title), 170)}</p>
                </div>
                <span className={cn("absolute left-1/2 w-[2px] -translate-x-1/2 bg-[#0F6CBD]/40", up ? "top-[222px] h-[26px]" : "-top-[38px] h-[38px]")} aria-hidden="true" />
                <span className={cn("absolute left-1/2 size-4 -translate-x-1/2 rounded-full border-[3px] border-white bg-[#0F6CBD] shadow", up ? "top-[244px]" : "-top-[46px]")} aria-hidden="true" />
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 3.2 the rules */

export function Rules({ ctx }: { ctx: StoryCtx }) {
  const s = ctx.stats;
  const cards: { icon: typeof Mail; title: string; text: string; fact: ReactNode }[] = [
    {
      icon: GitMerge,
      title: "Same need, new source: an enrichment.",
      text: "The same counterpart with the same intent at the same customer always updates the existing use case. It never creates a second one.",
      fact: (
        <>
          <b>{ctx.ucSignals.length}</b> sources feed the use case we follow · <b>{s.duplicates}</b> duplicates caught and discarded
        </>
      ),
    },
    {
      icon: ShieldAlert,
      title: "A contradiction becomes a red question.",
      text: "When two sources disagree on scope, value, route, wave or owner, the radar does not choose. It asks the account team.",
      fact: ctx.clarifyExample ? (
        <span className="text-[#9B2C2C]">“{clamp(ctx.m(ctx.clarifyExample), 150)}”</span>
      ) : (
        <>
          <b>{s.clarifyCases}</b> use cases carry a red question today
        </>
      ),
    },
    {
      icon: BookOpen,
      title: "One field, one current truth.",
      text: "Every field holds the latest consolidated statement. Who said what, and when, lives in the Evidence history with its source.",
      fact: (
        <>
          <b>{ctx.ledger.length}</b> evidence lines keep the history of the use case we follow
        </>
      ),
    },
    {
      icon: UserCheck,
      title: "People's edits always win.",
      text: "New facts are merged into what a person typed, never over it. Decisions, FinOps figures and waves stay human.",
      fact: <>Fund, Test, Hold or Stop is never set by the refresh</>,
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="03 · The rules that keep it honest" title="Four rules keep every use case honest." />
      <div className="mt-7 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-5">
        {cards.map((c, i) => (
          <Reveal key={c.title} i={i} className="h-full">
            <Panel className="flex h-full gap-5 p-6">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-[#0D2847] text-[#E9D7AE]">
                <c.icon className="size-7" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col">
                <p className="font-[family-name:var(--font-serif)] text-[30px] leading-tight text-[#0D2847]">{c.title}</p>
                <p className="mt-2.5 text-[18px] leading-[1.45] text-[#34465E]">{c.text}</p>
                <p className="mt-auto rounded-[10px] bg-[#F3F8FD] px-3.5 py-2.5 text-[16px] text-[#0D2847]">{c.fact}</p>
              </div>
            </Panel>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 3.3 the feature radar */

export function Features({ ctx }: { ctx: StoryCtx }) {
  const title = ctx.uc?.title;
  const rel = (r?: string) => (r ?? "").split(/[;\n|]+/).map((x) => x.trim()).filter(Boolean);
  const mine = (r?: string) => !!title && rel(r).some((x) => sameTitle(x, title) || x.toLowerCase().includes(title.toLowerCase()));
  const sorted = [...ctx.features].sort((a, b) => Number(mine(b.relevantUseCases)) - Number(mine(a.relevantUseCases)) || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  const shown = sorted.slice(0, 4);
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="03 · Product news meets customer pain"
        title="New Microsoft capabilities are matched to real use cases."
        lead={`Every morning the radar reads Microsoft's official what's-new pages and records which use cases each capability could unlock. ${ctx.stats.features} capabilities tracked so far.`}
      />
      {shown.length ? (
        <div className="mt-7 grid grid-cols-4 items-start gap-4">
          {shown.map((f, i) => {
            const n = rel(f.relevantUseCases).length;
            const hit = mine(f.relevantUseCases);
            return (
              <Reveal key={f.id} i={i}>
                <Panel className={cn("flex min-h-[330px] flex-col p-5", hit && "ring-2 ring-[#B8892B]")}>
                  <div className="flex items-center gap-2">
                    <Newspaper className="size-4 text-[#0F6CBD]" aria-hidden="true" />
                    <span className="truncate font-mono text-[12.5px] uppercase tracking-[0.1em] text-[#7A5718]">{f.product ?? "Microsoft"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {f.status && <Pill tone={/^ga$|general/i.test(f.status) ? "green" : "gold"}>{f.status}</Pill>}
                    {f.releaseDate && <span className="text-[13px] text-[#55657A]">{fmtDay(f.releaseDate)}</span>}
                  </div>
                  <p className="mt-3 text-[19px] font-semibold leading-snug text-[#0D2847]">{clamp(f.title, 90)}</p>
                  <p className="mt-2 text-[15px] leading-[1.45] text-[#34465E]">{clamp(ctx.m(f.summary ?? ""), 230)}</p>
                  <div className="mt-auto pt-4">
                    {hit ? (
                      <Pill tone="goldSolid">Relevant to the use case we follow</Pill>
                    ) : (
                      <span className="text-[14.5px] text-[#0D2847]">
                        Could unlock <b>{n}</b> use case{n === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </Panel>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <Panel className="mt-7 max-w-[760px]">
          <p className="text-[18px] text-[#34465E]">No capability recorded yet. The morning run fills this radar.</p>
        </Panel>
      )}
      {shown.length > 0 && (
        <Reveal i={5} className="mt-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-[14px] bg-[#0D2847] px-6 py-4 text-[17px] text-white">
            <span>
              <b className="text-[24px]">{ctx.stats.features}</b> capabilities tracked
            </span>
            <span>
              <b className="text-[24px]">{ctx.features.filter((f) => /^ga$|general/i.test(f.status ?? "")).length}</b> generally available
            </span>
            <span>
              <b className="text-[24px]">{ctx.features.filter((f) => /preview/i.test(f.status ?? "")).length}</b> in preview
            </span>
            <span>
              <b className="text-[24px]">{ctx.features.filter((f) => rel(f.relevantUseCases).length > 0).length}</b> already linked to a use case
            </span>
          </div>
        </Reveal>
      )}
    </div>
  );
}
