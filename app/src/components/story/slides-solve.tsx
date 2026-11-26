import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, FilePlusCorner, MessageSquarePlus, Pause, Play, Shuffle, Sparkles } from "lucide-react";
import { LAYER_LABEL, LAYER_ORDER } from "@/lib/solutions";
import { boardOrder, clamp, int, learnTitle, usd0, type AgentOpinion, type DesignView } from "@/lib/story";
import { cn } from "@/lib/utils";
import { CountUp, Eyebrow, NoUseCase, Panel, Pill, Reveal, SlideHead, Tile, type PillTone } from "./kit";
import type { StoryCtx } from "./types";

const fitTone = (fit?: string): PillTone => (/strong/i.test(fit ?? "") ? "teal" : /partial/i.test(fit ?? "") ? "gold" : /weak/i.test(fit ?? "") ? "red" : "grey");
const firstSentence = (t: string) => (t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t).trim();

function NoDesign({ ctx }: { ctx: StoryCtx }) {
  if (!ctx.uc) return <NoUseCase />;
  return (
    <Panel className="mt-8 max-w-[860px]">
      <p className="text-[20px] leading-snug text-[#34465E]">
        {ctx.designLoading ? "Loading the design…" : "This use case has no design yet. The next run designs it, because a use case without a design is one of the four triggers."}
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ 4.1 when the SE agents are called */

export function Triggers({ ctx }: { ctx: StoryCtx }) {
  const d = ctx.stats.designs;
  const cards = [
    { icon: MessageSquarePlus, title: "Someone asks", text: "The owner asks for a redesign in the app, with the wanted route and the reason.", fact: `${d.requests} request${d.requests === 1 ? "" : "s"} open` },
    { icon: Shuffle, title: "The route changed", text: "The platform route of the use case no longer matches the route of its design." },
    { icon: FilePlusCorner, title: "No design yet", text: "Every use case that is kept gets a design, whatever its stage." },
    { icon: Sparkles, title: "New material evidence", text: "Users, flow, data, volumes, KPIs, scope, owner, timeline or a customer decision changed." },
  ];
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="04 · Solved by 8 SE agents"
        title="The SE agents are called when a use case needs a new answer."
        lead="Four events trigger a design, checked at every run. Nothing waits for a person to remember."
      />
      <div className="mt-7 grid grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Reveal key={c.title} i={i}>
            <Panel className="flex h-[250px] flex-col p-6">
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#E3F0FB] text-[#0A4F8F]">
                <c.icon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-4 font-[family-name:var(--font-serif)] text-[27px] leading-tight text-[#0D2847]">{c.title}</p>
              <p className="mt-2 text-[16px] leading-snug text-[#34465E]">{c.text}</p>
              {c.fact && (
                <p className="mt-auto">
                  <Pill tone="navy">{c.fact}</Pill>
                </p>
              )}
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal i={4} className="mt-5">
        <div className="flex items-center gap-4 rounded-[14px] bg-[#0D2847] px-6 py-4 text-white">
          <Eyebrow dark>Who goes first</Eyebrow>
          <p className="text-[17px] leading-snug">
            A use case with a customer event in the next 30 days (hackathon, pilot, workshop) or already in pilot, then the owner's requests, then the oldest trigger. A design that has started is
            always finished.
          </p>
        </div>
      </Reveal>
      <Reveal i={5} className="mt-5 grid grid-cols-3 gap-4">
        <Tile value={<CountUp value={d.current} />} label="current designs, each accepted by a person" />
        <Tile value={<CountUp value={d.proposed} />} label="proposals waiting for review" />
        <Tile value={<CountUp value={d.archived + d.rejected} />} label="earlier versions archived or rejected" />
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 4.2 the call: eight SE agents */

const RING_W = 700;
const RING_H = 520;
const TILE_W = 178;
const TILE_H = 76;

function AgentTile({ a, lead, selected, onSelect, x, y, i }: { a: AgentOpinion; lead: boolean; selected: boolean; onSelect: () => void; x: number; y: number; i: number }) {
  const off = a.involvement === "Not needed";
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${a.agent}: ${a.involvement}${a.fit ? `, ${a.fit} fit` : ""}. Show its opinion`}
      className={cn(
        "absolute flex flex-col rounded-[14px] border-[1.5px] px-3 py-2 text-left shadow-[0_8px_22px_rgba(27,42,65,0.1)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]",
        selected ? "border-[#0D2847] bg-[#0D2847] text-white" : off ? "border-dashed border-[#ADBCCD] bg-[#FAF8F3] text-[#34465E] hover:bg-white" : "border-[#CDE3F5] bg-white text-[#0D2847] hover:border-[#0F6CBD]",
        lead && !selected && "border-2 border-[#B8892B] shadow-[0_10px_28px_rgba(184,137,43,0.3)]",
      )}
      style={{ left: x, top: y, width: TILE_W, height: TILE_H }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 + i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
    >
      {lead && <span className="absolute -top-3 right-3 rounded-full bg-[#8A6417] px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] text-white">LEAD</span>}
      <span className="line-clamp-2 text-[14.5px] font-semibold leading-tight">{a.agent}</span>
      <span className="mt-auto flex items-center justify-between gap-2">
        <Pill tone={selected ? "tealSoft" : fitTone(a.fit ?? (off ? "Not needed" : ""))} className="text-[11.5px]">
          {a.fit ?? a.involvement}
        </Pill>
        <span className={cn("font-mono text-[11px]", selected ? "text-[#C9D4DE]" : "text-[#55657A]")}>{a.learn.length} Learn</span>
      </span>
    </motion.button>
  );
}

function VerdictPanel({ ctx, d }: { ctx: StoryCtx; d: DesignView }) {
  const b = d.board;
  const voice = b.agents.find((a) => a.agent !== b.lead && /strong/i.test(a.fit ?? "") && a.verdict) ?? b.agents.find((a) => a.verdict);
  const rc = b.runCost;
  return (
    <Panel dark className="flex h-full flex-col p-6">
      <Eyebrow dark>The verdict · design v{d.version ?? 1}</Eyebrow>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-[28px] leading-tight">{ctx.m(d.solutionName)}</p>
      {b.lead && (
        <p className="mt-2 flex items-center gap-2 text-[14.5px] text-[#E9D7AE]">
          <span className="rounded-full bg-[#8A6417] px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] text-white">LEAD</span> {b.lead}
        </p>
      )}
      <p className="mt-2.5 text-[14.5px] leading-[1.45] text-[#D5DEE6]">{clamp(ctx.m(d.pattern || d.headline), 150)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {typeof d.planDays === "number" && <Tile dark compact value={`${int.format(d.planDays)} days`} label="effort in the plan" />}
        {typeof d.planWeeks === "number" && <Tile dark compact value={`${d.planWeeks} weeks`} label={d.phases ? `${d.phases} phases` : "duration"} />}
        {rc && typeof rc.low === "number" && typeof rc.high === "number" && (
          <Tile dark compact value={`${usd0.format(rc.low)}–${usd0.format(rc.high)}`} label="run cost a month, low to high" className="col-span-2" />
        )}
      </div>
      {b.learnTotal > 0 && <p className="mt-2.5 text-[13.5px] text-[#C9D4DE]">{b.learnTotal} Microsoft Learn pages read and cited by the agents.</p>}
      {voice && (
        <div className="mt-auto rounded-[14px_14px_14px_4px] bg-[#0F6CBD] px-4 py-3">
          <p className="text-[15px] leading-snug">“{clamp(ctx.m(firstSentence(voice.verdict)), 140)}”</p>
          <p className="mt-1 text-[12.5px] text-[#D7F0EF]">{voice.agent} agent</p>
        </div>
      )}
    </Panel>
  );
}

function OpinionPanel({ ctx, a, onBack }: { ctx: StoryCtx; a: AgentOpinion; onBack: () => void }) {
  return (
    <Panel className="flex h-full flex-col p-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-[14px] text-[#0A4F8F] hover:bg-[#E3F0FB] focus-visible:outline-2 focus-visible:outline-[#0F6CBD]">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to the verdict
      </button>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-[26px] leading-tight text-[#0D2847]">{a.agent}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill tone={a.involvement === "Lead" ? "goldSolid" : "grey"}>{a.involvement}</Pill>
        {a.fit && <Pill tone={fitTone(a.fit)}>{a.fit} fit</Pill>}
        {typeof a.effortDays === "number" && a.effortDays > 0 && <Pill tone="tealSoft">{a.effortDays} person-days</Pill>}
      </div>
      {a.verdict && <p className="mt-3 text-[15px] leading-[1.45] text-[#0D2847]">{clamp(ctx.m(a.verdict), 210)}</p>}
      {a.findings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {a.findings.slice(0, 2).map((f) => (
            <li key={f} className="flex gap-2 text-[13.5px] leading-snug text-[#34465E]">
              <Check className="mt-0.5 size-4 shrink-0 text-[#2A9D78]" aria-hidden="true" />
              {clamp(ctx.m(f), 120)}
            </li>
          ))}
        </ul>
      )}
      {a.risks[0] && <p className="mt-3 rounded-[10px] bg-[#FBE7E7] px-3 py-2 text-[13.5px] leading-snug text-[#7F2424]">Risk: {clamp(ctx.m(a.risks[0]), 120)}</p>}
      {a.learn.length > 0 && (
        <p className="mt-auto pt-3 text-[13px] leading-snug text-[#55657A]">
          Read on Microsoft Learn: {a.learn.slice(0, 2).map((l) => clamp(learnTitle(l), 48)).join(" · ")}
          {a.learn.length > 2 ? ` and ${a.learn.length - 2} more` : ""}
        </p>
      )}
    </Panel>
  );
}

export function Board({ ctx }: { ctx: StoryCtx }) {
  const d = ctx.design;
  const still = useReducedMotion();
  const [sel, setSel] = useState<number | null>(null);
  const agents = useMemo(() => (d ? boardOrder(d.board.agents, d.board.lead).slice(0, 8) : []), [d]);
  if (!ctx.uc || !d) return <NoDesign ctx={ctx} />;
  const u = ctx.uc;
  const cx = RING_W / 2;
  const cy = RING_H / 2;
  const rx = 255;
  const ry = 212;
  const pos = agents.map((_, i) => {
    const t = ((-90 + (i * 360) / Math.max(agents.length, 1)) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
  const selected = sel != null ? agents[sel] : undefined;
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow={`04 · The SE agent call${d.date ? ` · design of ${new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
        title={agents.length ? `${agents.length === 8 ? "Eight" : agents.length} SE agents examine the case. One solution wins.` : "One solution, designed end to end."}
        lead="Your eight Copilot Studio agents are called in parallel. Each reads Microsoft Learn with its own tool and answers. The orchestrator arbitrates."
      />
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[350px_700px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-5">
        <Reveal i={0} from="left" className="h-full">
          <Panel className="flex h-full flex-col p-5">
            <Eyebrow>The case file · #{u.id}</Eyebrow>
            <p className="mt-2 font-[family-name:var(--font-serif)] text-[23px] leading-[1.15] text-[#0D2847]">{ctx.m(u.title)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="navy">{ctx.m(u.account ?? "Internal")}</Pill>
              {u.stage && <Pill tone="tealSoft">{u.stage}</Pill>}
            </div>
            <p className="mt-3 text-[14.5px] text-[#34465E]">
              <b className="text-[18px] text-[#0D2847]">{ctx.ucSignals.length || u.signalCount || 0}</b> signals · <b className="text-[18px] text-[#0D2847]">{ctx.ledger.length}</b> evidence lines
            </p>
            {u.pain && (
              <div className="mt-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">The pain</p>
                <p className="mt-1 text-[14.5px] leading-[1.45] text-[#34465E]">{clamp(ctx.m(u.pain), 190)}</p>
              </div>
            )}
            <p className="mt-auto font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Each agent receives</p>
            <ol className="mt-2 space-y-2.5 border-t border-dashed border-[#DCD5C6] pt-3">
              {["The case file: pain, process, users, flow, systems, volumes, KPIs", "Its own instructions in Copilot Studio: one of eight specialisms", "Its Microsoft Learn tool: at least three pages it reads and cites"].map((t, i) => (
                <li key={t} className="flex gap-2.5 text-[14px] leading-snug text-[#34465E]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[#0D2847] text-[12px] font-semibold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>
        <div className="relative h-full" style={{ width: RING_W }}>
          <svg width={RING_W} height={RING_H} className="absolute left-0 top-0" aria-hidden="true">
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#D8E6F3" />
            {pos.map((p, i) => {
              const a = agents[i];
              const lead = a.agent === d.board.lead || a.involvement === "Lead";
              const off = a.involvement === "Not needed";
              return (
                <motion.line
                  key={a.agent}
                  x1={cx}
                  y1={cy}
                  x2={p.x}
                  y2={p.y}
                  stroke={lead ? "#B8892B" : off ? "#ADBCCD" : "#0F6CBD"}
                  strokeWidth={lead ? 3 : 2}
                  strokeDasharray={off ? "3 7" : "7 7"}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={still || off ? { pathLength: 1, opacity: 0.75 } : { pathLength: 1, opacity: 0.75, strokeDashoffset: [0, -28] }}
                  transition={{ pathLength: { duration: 0.6, delay: 0.2 + i * 0.08 }, opacity: { duration: 0.3, delay: 0.2 }, strokeDashoffset: { repeat: Infinity, duration: 1.2, ease: "linear" } }}
                />
              );
            })}
          </svg>
          <motion.div
            className="absolute flex size-[146px] flex-col items-center justify-center rounded-full text-center text-white"
            style={{
              left: cx - 73,
              top: cy - 73,
              background: "radial-gradient(circle at 35% 30%, #2D4366, #0D2847)",
              boxShadow: "0 0 0 12px rgba(14,124,134,0.10), 0 0 0 26px rgba(14,124,134,0.05), 0 14px 34px rgba(27,42,65,0.35)",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 18 }}
          >
            <span className="text-[16px] font-semibold">Orchestrator</span>
            <span className="mt-1 text-[12px] leading-snug text-[#BFD2DA]">
              {agents.length} parallel calls
              {d.board.arbitration.length > 0 && (
                <>
                  <br />
                  {d.board.arbitration.length} topics arbitrated
                </>
              )}
              {d.board.whatIfs.length > 0 && (
                <>
                  <br />
                  {d.board.whatIfs.length} what-ifs judged
                </>
              )}
            </span>
          </motion.div>
          {agents.map((a, i) => (
            <AgentTile
              key={a.agent}
              a={a}
              i={i}
              lead={a.agent === d.board.lead || a.involvement === "Lead"}
              selected={sel === i}
              onSelect={() => setSel(sel === i ? null : i)}
              x={pos[i].x - TILE_W / 2}
              y={pos[i].y - TILE_H / 2}
            />
          ))}
          {agents.length === 0 && (
            <p className="absolute inset-x-10 bottom-6 text-center text-[15px] text-[#34465E]">This design was made before the specialist board was stored with it.</p>
          )}
        </div>
        <Reveal i={2} from="right" className="h-full min-w-0">
          {selected ? <OpinionPanel ctx={ctx} a={selected} onBack={() => setSel(null)} /> : <VerdictPanel ctx={ctx} d={d} />}
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 4.3 how the orchestrator decides */

const verdictTone = (v: string): PillTone =>
  /not now|not fit|not needed|rejected|no\b/i.test(v) ? "grey" : /later|defer|fallback|after|spike/i.test(v) ? "gold" : /baseline|complement|option|optional/i.test(v) ? "tealSoft" : "teal";

export function Arbitrate({ ctx }: { ctx: StoryCtx }) {
  const d = ctx.design;
  if (!ctx.uc || !d) return <NoDesign ctx={ctx} />;
  const b = d.board;
  const topics = b.arbitration.length ? b.arbitration.slice(0, 7) : d.decisions.slice(0, 6).map((x) => ({ topic: x.decision, decision: x.choice }));
  const e = b.effort;
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="04 · How the orchestrator decides"
        title="Disagreements are settled in the open."
        lead={b.summary ? clamp(ctx.m(b.summary), 230) : "Every choice is written down with its reason, so a person can challenge it."}
      />
      <div className="mt-6 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6">
        <Reveal i={0} from="left" className="h-full min-h-0">
          <Panel className="flex h-full flex-col">
            <p className="text-[20px] font-semibold text-[#0D2847]">{b.arbitration.length ? "Arbitration" : "Key decisions"}</p>
            <ol className="mt-3 space-y-2">
              {topics.map((t, i) => (
                <motion.li key={`${t.topic}-${i}`} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                  <span className="flex size-[30px] items-center justify-center rounded-full bg-[#E3F0FB] text-[13px] font-semibold text-[#0A4F8F]">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold text-[#0D2847]">{clamp(ctx.m(t.topic), 70)}</span>
                    <span className="block truncate text-[14px] leading-snug text-[#34465E]">{ctx.m(t.decision)}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </Panel>
        </Reveal>
        <Reveal i={1} from="right" className="h-full min-h-0">
          <Panel className="flex h-full flex-col">
            <p className="text-[20px] font-semibold text-[#0D2847]">What if…?</p>
            {b.whatIfs.length ? (
              <ul className="mt-3 space-y-2">
                {b.whatIfs.slice(0, 8).map((w, i) => (
                  <motion.li key={`${w.scenario}-${i}`} className="flex items-center gap-3 border-b border-[#E8F2FB] pb-2 last:border-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 + i * 0.07 }}>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-[#0D2847]">{clamp(ctx.m(w.scenario), 80)}</span>
                    <Pill tone={verdictTone(w.verdict)}>{clamp(w.verdict, 24)}</Pill>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[15.5px] text-[#34465E]">This design was made before alternatives were judged one by one.</p>
            )}
            {e && typeof e.specialistSum === "number" && typeof e.planTotal === "number" && (
              <div className="mt-auto rounded-[12px] bg-[#0D2847] px-4 py-3 text-white">
                <p className="text-[15px] leading-snug">
                  The agents estimated <b>{e.specialistSum} person-days</b>; the plan keeps <b>{e.planTotal}</b> after removing overlaps.
                </p>
                {e.removed && <p className="mt-1 text-[12.5px] leading-snug text-[#C9D4DE]">{clamp(ctx.m(e.removed), 150)}</p>}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 4.4 from verdict to solution */

const CHAIN = ["SE agent board", "Architecture views", "KPI sizing", "Solution experience", "Creative", "FinOps low · mid · high"];
const CHECKED = new Set([1, 3, 4]);

export function Solution({ ctx }: { ctx: StoryCtx }) {
  const d = ctx.design;
  const still = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!still);
  const flow = d?.flow ?? [];
  useEffect(() => {
    if (!playing || flow.length < 2) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % flow.length), 2800);
    return () => window.clearInterval(t);
  }, [playing, flow.length]);
  if (!ctx.uc || !d) return <NoDesign ctx={ctx} />;
  const layers = (d.layers.length ? d.layers : LAYER_ORDER).filter((l) => d.nodes.some((n) => n.layer === l));
  const extra = [...new Set(d.nodes.map((n) => n.layer))].filter((l) => !layers.includes(l));
  const rows = [...layers, ...extra];
  const cur = flow[step];
  const rc = d.board.runCost;
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="04 · From verdict to solution" title={ctx.m(d.solutionName) || "The solution"} lead={d.headline ? clamp(ctx.m(d.headline), 220) : undefined} />
      <Reveal i={0} className="mt-4">
        <ol className="flex items-center gap-2">
          {CHAIN.map((c, i) => (
            <motion.li key={c} className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15 }}>
              <span className="flex items-center gap-2 rounded-[10px] border border-[#D8E6F3] bg-white px-3 py-1.5 text-[14px] text-[#0D2847]">
                {d.board.full ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#2A9D78] text-white">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#E9EEF4] text-[10px] font-semibold text-[#4A5261]">{i + 1}</span>
                )}
                {c}
                {d.board.full && CHECKED.has(i) && <span className="text-[11.5px] text-[#55657A]">validated</span>}
              </span>
              {i < CHAIN.length - 1 && <span className="text-[#8A8F98]" aria-hidden="true">→</span>}
            </motion.li>
          ))}
        </ol>
      </Reveal>
      <div className="mt-4 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1fr)_400px] gap-5">
        <Reveal i={1} className="h-full min-h-0">
          <Panel className="flex h-full flex-col p-5">
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5">
              {rows.map((l) => (
                <div key={l} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
                  <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">{LAYER_LABEL[l] ?? l}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {d.nodes
                      .filter((n) => n.layer === l)
                      .map((n) => {
                        const on = !!cur && (cur.from === n.id || cur.to === n.id);
                        return (
                          <span
                            key={n.id}
                            className={cn(
                              "rounded-[10px] border px-2.5 py-1 text-[13px] leading-tight transition-all duration-300",
                              on ? "border-[#0F6CBD] bg-[#0F6CBD] text-white shadow-[0_6px_16px_rgba(14,124,134,0.35)]" : n.existing ? "border-dashed border-[#ADBCCD] bg-[#FAF8F3] text-[#34465E]" : "border-[#CDE3F5] bg-white text-[#0D2847]",
                            )}
                          >
                            <span className="font-semibold">{ctx.m(n.label)}</span>
                            {n.product && <span className={cn("block text-[11.5px]", on ? "text-[#D7F0EF]" : "text-[#55657A]")}>{clamp(ctx.m(n.product), 34)}</span>}
                          </span>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
            {flow.length > 0 && (
              <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-[#F3F8FD] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-pressed={playing}
                  aria-label={playing ? "Pause the walk-through" : "Play the walk-through"}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0D2847] text-white hover:bg-[#2D4366] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]"
                >
                  {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                </button>
                <p className="min-w-0 flex-1 text-[15px] leading-snug text-[#0D2847]" aria-live="polite">
                  <b>Step {step + 1} of {flow.length}.</b> {clamp(ctx.m(cur?.text ?? ""), 170)}
                </p>
                <span className="flex shrink-0 gap-1">
                  {flow.map((f, i) => (
                    <button
                      key={`${f.step}-${i}`}
                      type="button"
                      onClick={() => {
                        setStep(i);
                        setPlaying(false);
                      }}
                      aria-label={`Step ${i + 1}`}
                      aria-current={i === step ? "step" : undefined}
                      className={cn("h-2.5 rounded-full transition-all", i === step ? "w-6 bg-[#0F6CBD]" : "w-2.5 bg-[#CFC8B8] hover:bg-[#8A8F98]")}
                    />
                  ))}
                </span>
              </div>
            )}
          </Panel>
        </Reveal>
        <Reveal i={2} from="right" className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
          <div className="grid grid-cols-2 gap-3">
            {d.board.lead && <Tile compact value={d.board.lead} label="lead SE agent" />}
            {typeof d.planDays === "number" && (
              <Tile compact value={`${int.format(d.planDays)} days`} label={`${typeof d.planWeeks === "number" ? `${d.planWeeks} weeks` : "effort"}${d.phases ? ` · ${d.phases} phases` : ""}`} />
            )}
          </div>
          {rc && typeof rc.low === "number" && typeof rc.high === "number" ? (
            <Tile compact value={`${usd0.format(rc.low)}–${usd0.format(rc.high)}`} label={`run cost a month, low to high${typeof rc.mid === "number" ? ` · mid ${usd0.format(rc.mid)}` : ""}`} />
          ) : (
            <span />
          )}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#E9C77E] bg-[#FFF8EA] px-4 py-3">
            {d.readiness && (
              <p className="text-[15px] text-[#0D2847]">
                <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Readiness · </span>
                <b>{clamp(ctx.m(d.readiness), 60)}</b>
              </p>
            )}
            {d.phaseList.length > 0 && (
              <ol className="mt-2 space-y-1" aria-label="Plan phases by week">
                {d.phaseList.slice(0, 7).map((p, i) => {
                  const total = Math.max(1, ...d.phaseList.map((x) => x.end));
                  return (
                    <li key={`${p.name}-${i}`} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-x-2 text-[12.5px] text-[#34465E]">
                      <span className="truncate">{ctx.m(p.name)}</span>
                      <span className="text-right font-mono text-[11px] text-[#55657A]">
                        wk {p.start}–{p.end}
                      </span>
                      <span className="col-span-2 relative block h-2 rounded-full bg-[#F1E3C2]">
                        <motion.span
                          className="absolute inset-y-0 rounded-full bg-[#8A6417]"
                          style={{ left: `${((p.start - 1) / total) * 100}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(Math.max(1, p.end - p.start + 1) / total) * 100}%` }}
                          transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
