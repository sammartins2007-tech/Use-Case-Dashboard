import { motion, useReducedMotion } from "motion/react";
import {
  Archive,
  ArrowRight,
  Bot,
  Boxes,
  Check,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  Layers,
  ListChecks,
  Newspaper,
  Package,
  RotateCcw,
  Share2,
  Users,
  Wand,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AREA_TONE, BACKLOG, LANES } from "@/data/backlog";
import { clamp, fmtDay, int, parseBasis, usd0, usd2 } from "@/lib/story";
import { cn } from "@/lib/utils";
import { CountUp, Eyebrow, Panel, Pill, Reveal, SlideHead, Tile } from "./kit";
import type { StoryCtx } from "./types";

/* ------------------------------------------------------------------ 5.1 the AI proposes, people decide */

export function Decide({ ctx }: { ctx: StoryCtx }) {
  const d = ctx.stats.designs;
  const flow: { icon: typeof Bot; title: string; text: string; fact?: string }[] = [
    { icon: Wand, title: "The run proposes", text: "A new design arrives as a proposal. The current design is never replaced by the refresh.", fact: `${d.proposed} waiting now` },
    { icon: Users, title: "A person reviews", text: "In the app the owner accepts, rejects or asks for a redesign with a route and a reason.", fact: `${d.requests} redesign request${d.requests === 1 ? "" : "s"} open` },
    { icon: Archive, title: "History is kept", text: "An accepted proposal becomes current and the previous version is archived, never deleted.", fact: `${d.archived + d.rejected} earlier versions kept` },
  ];
  const human = ["The decision: Fund, Test, Hold or Stop", "FinOps cost and value figures", "Waves and the customer's own roadmap decisions", "Every field a person typed", "Who the app is shared with"];
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="05 · Humans decide" title="The AI proposes. People decide." lead="Every run works on its own, but nothing that matters to the customer changes without a person." />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)_48px_minmax(0,1fr)] items-stretch">
        {flow.map((f, i) => (
          <FlowCell key={f.title} i={i} last={i === flow.length - 1}>
            <Panel className="flex h-full flex-col p-6">
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#0D2847] text-[#E9D7AE]">
                <f.icon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-3 font-[family-name:var(--font-serif)] text-[27px] leading-tight text-[#0D2847]">{f.title}</p>
              <p className="mt-2 text-[16px] leading-snug text-[#34465E]">{f.text}</p>
              {f.fact && (
                <p className="mt-auto pt-3">
                  <Pill tone="tealSoft">{f.fact}</Pill>
                </p>
              )}
            </Panel>
          </FlowCell>
        ))}
      </div>
      <div className="mt-5 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-2 gap-5">
        <Reveal i={4} className="h-full">
          <Panel className="h-full border-l-[6px] border-l-[#B8892B]">
            <p className="text-[20px] font-semibold text-[#0D2847]">Always a person's call</p>
            <ul className="mt-3 space-y-2">
              {human.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-[16.5px] text-[#34465E]">
                  <Check className="size-5 shrink-0 text-[#2A9D78]" aria-hidden="true" /> {h}
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
        <Reveal i={5} className="h-full">
          <Panel dark className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#0F6CBD]">
                <Bot className="size-6" aria-hidden="true" />
              </span>
              <p className="text-[20px] font-semibold">Complete with AI</p>
            </div>
            <p className="mt-3 text-[16.5px] leading-[1.5] text-[#D5DEE6]">
              In the dossier, a coach agent asks the owner about what is still missing: process, users, pain, outcome, flow, data, volumes, KPIs, owner. Each answer is saved to the use case, with
              Undo.
            </p>
            <p className="mt-auto pt-4 text-[14px] text-[#A9B8C6]">The app's own agent, called live from the dossier. Its cost is logged like every other AI run.</p>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function FlowCell({ i, last, children }: { i: number; last: boolean; children: ReactNode }) {
  return (
    <>
      <Reveal i={i * 2} className="h-full">
        {children}
      </Reveal>
      {!last && (
        <Reveal i={i * 2 + 1} from="left" className="flex items-center justify-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#0F6CBD] text-white">
            <ArrowRight className="size-5" aria-hidden="true" />
          </span>
        </Reveal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ 5.2 each audience sees the right version */

export function Editions() {
  const cols: { title: string; who: string; yes: string[]; no: string[]; tone: string }[] = [
    {
      title: "The owner's radar",
      who: "This app. Everything, editable.",
      yes: ["Evidence and sources, with links", "Red questions for the account team", "SE agent runs and design proposals", "AI cost of every run"],
      no: [],
      tone: "#0D2847",
    },
    {
      title: "Account-team copies",
      who: "Optional. One per account, read-only.",
      yes: ["The same screens for their own account", "Designs, roadmap and FinOps sizing"],
      no: ["Evidence history", "Red questions", "Edits"],
      tone: "#0F6CBD",
    },
    {
      title: "Customer edition",
      who: "Optional. What the customer may see.",
      yes: ["Use cases, designs and the roadmap", "Clear, current statements only"],
      no: ["Red questions and internal analysis", "The radar's AI meter and feature radar", "Any link to an internal Microsoft 365 item"],
      tone: "#B8892B",
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="05 · Who sees what" title="Each audience sees the right version." lead="Copies are rebuilt from the owner's lists after every run, never edited by hand." />
      <div className="mt-6 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-3 gap-5">
        {cols.map((c, i) => (
          <Reveal key={c.title} i={i} className="h-full">
            <Panel className="flex h-full flex-col p-6" >
              <span className="h-2 w-16 rounded-full" style={{ background: c.tone }} aria-hidden="true" />
              <p className="mt-3 font-[family-name:var(--font-serif)] text-[32px] leading-tight text-[#0D2847]">{c.title}</p>
              <p className="mt-1 text-[16.5px] text-[#55657A]">{c.who}</p>
              <ul className="mt-5 space-y-3">
                {c.yes.map((y) => (
                  <li key={y} className="flex items-start gap-2.5 text-[18px] text-[#0D2847]">
                    <Check className="mt-0.5 size-5 shrink-0 text-[#2A9D78]" aria-hidden="true" />
                    {y}
                  </li>
                ))}
                {c.no.map((n) => (
                  <li key={n} className="flex items-start gap-2.5 text-[18px] text-[#55657A]">
                    <X className="mt-0.5 size-5 shrink-0 text-[#C94141]" aria-label="Not shown:" />
                    {n}
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        ))}
      </div>
      <Reveal i={3} className="mt-5">
        <div className="flex items-center gap-4 rounded-[14px] bg-[#0D2847] px-6 py-4 text-white">
          <ListChecks className="size-6 shrink-0 text-[#7FD1CF]" aria-hidden="true" />
          <p className="text-[17px]">After every run an audit compares each copy with the owner's lists: every title, link and design must match, zero mismatches.</p>
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 6.1 one run, step by step */

const RUN_STEPS: { icon: typeof Bot; name: string; text: string; calls: string[] }[] = [
  { icon: Package, name: "Prepare", text: "A fresh workspace loads the radar's toolkit", calls: ["Radar site"] },
  { icon: Layers, name: "Collect", text: "Lists every item in the window, then reads it", calls: ["Work IQ"] },
  { icon: FileText, name: "Read in depth", text: "One ledger per source, every statement judged", calls: ["Sub-agents"] },
  { icon: Database, name: "Update", text: "Fields, signals and red questions", calls: ["SharePoint lists"] },
  { icon: Gauge, name: "Analyse", text: "Readiness, route, value, priorities, people, next steps", calls: ["SharePoint lists"] },
  { icon: Newspaper, name: "Watch", text: "Product news every morning, leadership priorities monthly", calls: ["Microsoft Learn", "Public sites"] },
  { icon: Users, name: "Design", text: "8 SE agents and the chain, validators must pass", calls: ["Sub-agents", "Microsoft Learn"] },
  { icon: Share2, name: "Share & audit", text: "Copies synced, offline file rebuilt, audit at zero", calls: ["Copy sites"] },
  { icon: ClipboardList, name: "Log the cost", text: "Tokens and dollars, sub-agents included", calls: ["AI consumption list"] },
];

export function Pipeline({ ctx }: { ctx: StoryCtx }) {
  const still = useReducedMotion();
  const times = ctx.runTimes.length ? `${ctx.runTimes.join(" and ")}${ctx.zone ? ` ${ctx.zone}` : ""}` : "twice a day";
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="06 · Twice a day, by itself"
        title="One run, nine steps, nobody at the keyboard."
        lead={`A scheduled Copilot Cowork task runs at ${times}, under the owner's own identity: it only sees what the owner can already see. A missed run is caught up by the next one.`}
      />
      <div className="relative mt-8 grid grid-cols-9 gap-3">
        <div className="absolute left-[5%] right-[5%] top-[38px] h-[3px] rounded-full bg-[#D8E6F3]" aria-hidden="true" />
        {!still && (
          <motion.div
            className="absolute top-[31px] size-[17px] rounded-full bg-[#0F6CBD] shadow-[0_0_0_7px_rgba(14,124,134,0.18)]"
            initial={{ left: "5%" }}
            animate={{ left: ["5%", "94%"] }}
            transition={{ repeat: Infinity, duration: 9, ease: "linear", delay: 0.8 }}
            aria-hidden="true"
          />
        )}
        {RUN_STEPS.map((s, i) => (
          <Reveal key={s.name} i={i} className="relative flex flex-col items-center text-center">
            <span className="relative z-10 flex size-[78px] items-center justify-center rounded-full border-4 border-[#F3F8FD] bg-[#0D2847] text-[#E9D7AE] shadow-[0_8px_20px_rgba(27,42,65,0.25)]">
              <s.icon className="size-8" aria-hidden="true" />
            </span>
            <span className="mt-2 font-mono text-[12px] text-[#7A5718]">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[18px] font-semibold leading-tight text-[#0D2847]">{s.name}</span>
            <span className="mt-1.5 text-[14.5px] leading-snug text-[#34465E]">{s.text}</span>
            <span className="mt-3 flex flex-col items-center gap-1">
              {s.calls.map((c) => (
                <span key={c} className="rounded-full border border-[#CDE3F5] bg-white px-2 py-0.5 text-[12px] font-medium text-[#0A4F8F]">
                  {c}
                </span>
              ))}
            </span>
          </Reveal>
        ))}
      </div>
      <Reveal i={10} className="mt-14 grid grid-cols-3 gap-4">
        <div className="rounded-[14px] border border-[#D8E6F3] bg-white px-5 py-4">
          <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Work IQ</p>
          <p className="mt-1 text-[15.5px] leading-snug text-[#34465E]">Mail, Teams chats and channels, meetings with transcripts and documents, read through the Microsoft 365 tools.</p>
        </div>
        <div className="rounded-[14px] border border-[#D8E6F3] bg-white px-5 py-4">
          <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Sub-agents</p>
          <p className="mt-1 text-[15.5px] leading-snug text-[#34465E]">Parallel helpers for long transcripts and the eight SE agents of every design, each with its own brief.</p>
        </div>
        <div className="rounded-[14px] border border-[#D8E6F3] bg-white px-5 py-4">
          <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">The app</p>
          <p className="mt-1 text-[15.5px] leading-snug text-[#34465E]">Two connections only: the radar's SharePoint lists and the coach agent. No customer content in its code.</p>
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 6.2 the latest run, replayed */

function BasisText({ text }: { text: string }) {
  const parts = text.split(/(\d[\d,.]*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\d/.test(p) ? (
          <b key={i} className="font-semibold text-[#0D2847]">
            {p}
          </b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function LastRun({ ctx }: { ctx: StoryCtx }) {
  const r = ctx.latestRun;
  if (!r) {
    return (
      <div className="flex h-full flex-col">
        <SlideHead eyebrow="06 · The latest run" title="The latest run, replayed." />
        <Panel className="mt-8 max-w-[760px]">
          <p className="text-[18px] text-[#34465E]">No run has been logged yet.</p>
        </Panel>
      </div>
    );
  }
  const f = parseBasis(r.basis);
  const tiles: [number | undefined, string][] = [
    [f.mails, "mails checked"],
    [f.chats, "chats listed"],
    [f.posts ?? f.channels, f.posts != null ? `channel posts${f.channels != null ? `, ${f.channels} channels` : ""}` : "channels"],
    [f.meetings, "meetings ended"],
    [f.documents, "documents checked"],
    [f.signals, "signals added"],
    [f.updated, "use cases updated"],
    [f.specialists, "SE agent calls"],
  ];
  const shown = tiles.filter(([v]) => typeof v === "number") as [number, string][];
  const runs = [...ctx.recentRuns].reverse();
  const max = Math.max(1, ...runs.map((x) => x.costUSD));
  const when = r.runDate ? new Date(r.runDate) : null;
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow={`06 · The latest run${when ? ` · ${when.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        title="The latest run, replayed."
        lead={
          <>
            <Pill tone={/fail/i.test(r.status ?? "") ? "red" : "green"}>{r.status ?? "Logged"}</Pill>{" "}
            <span className="align-middle">
              {usd2.format(r.costUSD)} of AI, {int.format(r.inputTokens + r.outputTokens)} tokens{r.estimated ? " (estimates)" : ""}.
            </span>
          </>
        }
      />
      <div className="mt-5 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[560px_minmax(0,1fr)] gap-6">
        <div className="grid grid-cols-2 content-start gap-3">
          {shown.map(([v, l], i) => (
            <Reveal key={l} i={i}>
              <Tile value={<CountUp value={v} />} label={l} />
            </Reveal>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <Reveal i={2} from="right" className="min-h-0 flex-1">
            <Panel className="flex h-full flex-col p-5">
              <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Run log, as the run wrote it</p>
              <p className="mt-2 min-h-0 flex-1 overflow-hidden text-[14.5px] leading-[1.5] text-[#34465E]">
                <BasisText text={clamp(ctx.m(r.basis ?? ""), 720)} />
              </p>
            </Panel>
          </Reveal>
          {runs.length > 1 && (
            <Reveal i={4} from="right">
              <Panel className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#7A5718]">Cost of the last {runs.length} runs</p>
                  <p className="text-[13.5px] text-[#34465E]">
                    {ctx.stats.runsCompleted} of {ctx.stats.runs} runs completed · {usd0.format(ctx.stats.totalCost)} of AI logged in total
                  </p>
                </div>
                <ol className="mt-3 flex h-[120px] items-end gap-1.5" aria-label="Cost per run, oldest first">
                  {runs.map((x, i) => {
                    const failed = /fail/i.test(x.status ?? "");
                    const h = Math.max(4, Math.round((x.costUSD / max) * 92));
                    return (
                      <li key={x.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[11px] font-semibold tabular-nums text-[#0D2847]">{usd0.format(x.costUSD)}</span>
                        <motion.span
                          className={cn("w-full rounded-t-[5px]", failed ? "bg-[#C94141]" : "bg-[#0F6CBD]")}
                          initial={{ height: 0 }}
                          animate={{ height: h }}
                          transition={{ delay: 0.4 + i * 0.04, duration: 0.5 }}
                        />
                        <span className="truncate text-[10.5px] text-[#55657A]">
                          {x.runDate ? new Date(x.runDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                          {failed ? " ✕" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-2 text-[12.5px] text-[#55657A]">Runs that call the eight SE agents cost more than runs that only read and update. ✕ marks a failed run, caught up by the next one.</p>
              </Panel>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 7.1 the kit */

export function Kit({ ctx }: { ctx: StoryCtx }) {
  const holds: { icon: typeof Bot; t: string }[] = [
    { icon: Layers, t: "The app: every screen, shared code" },
    { icon: Database, t: "Five SharePoint lists: the whole memory" },
    { icon: RotateCcw, t: "The refresh: what to read and how, twice a day" },
    { icon: Users, t: "The design chain: eight SE agent briefs and validators" },
    { icon: Boxes, t: "A Copilot Cowork skill that installs and updates it" },
  ];
  const moves = [
    "Say “Set up my AI Use Case Radar” to Copilot Cowork. It asks for your customers, their brand colours and the Teams channels to listen to.",
    "It creates a private SharePoint site and the five lists.",
    "It builds the app from the kit and connects it to the lists.",
    "It schedules the refresh twice a day, under your identity.",
    "First fill: run it once now, or import the customer's own pipeline from Excel.",
  ];
  return (
    <div className="flex h-full flex-col">
      <SlideHead eyebrow="07 · Make it yours" title="Your own radar, set up in one conversation." lead="Everything is in a kit. The code is shared; your customers and your data stay yours." />
      <div className="mt-6 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] gap-5">
        <Reveal i={0} className="h-full">
          <Panel className="h-full">
            <p className="text-[20px] font-semibold text-[#0D2847]">What the kit holds</p>
            <ul className="mt-4 space-y-3.5">
              {holds.map((h) => (
                <li key={h.t} className="flex items-center gap-3 text-[17.5px] leading-snug text-[#34465E]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E3F0FB] text-[#0A4F8F]">
                    <h.icon className="size-5" aria-hidden="true" />
                  </span>
                  {h.t}
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
        <Reveal i={1} className="h-full">
          <Panel dark className="h-full">
            <Eyebrow dark>Set up in five moves</Eyebrow>
            <ol className="mt-4 space-y-3.5">
              {moves.map((m, i) => (
                <motion.li key={m} className="flex gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.15 }}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#B8892B] text-[15px] font-semibold text-white">{i + 1}</span>
                  <span className="text-[18.5px] leading-snug text-[#E6ECF1]">{m}</span>
                </motion.li>
              ))}
            </ol>
          </Panel>
        </Reveal>
        <Reveal i={2} className="h-full">
          <Panel className="flex h-full flex-col">
            <p className="text-[20px] font-semibold text-[#0D2847]">Yours</p>
            <p className="mt-1 text-[17px] leading-snug text-[#34465E]">Customers, logos and colours, your SharePoint site and its data, your schedule and your identity.</p>
            <p className="mt-5 text-[20px] font-semibold text-[#0D2847]">Shared</p>
            <p className="mt-1 text-[17px] leading-snug text-[#34465E]">Every screen, every rule and every SE agent brief. “Update my radar from the kit” brings the latest version.</p>
            <p className="mt-auto rounded-[12px] bg-[#FFF8EA] px-4 py-3 text-[15.5px] text-[#0D2847]">
              Ask <b>{ctx.m(ctx.owner)}</b> for access to the kit.
            </p>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 7.2 the close */

export function Close({ ctx }: { ctx: StoryCtx }) {
  const s = ctx.stats;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Reveal i={0}>
        <Eyebrow>Inside the Radar</Eyebrow>
      </Reveal>
      <Reveal i={1}>
        <h2 className="mt-4 max-w-[1240px] font-[family-name:var(--font-serif)] text-[64px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0D2847]">
          Your customers already tell you their next AI use case.
        </h2>
      </Reveal>
      <Reveal i={2}>
        <p className="mt-5 max-w-[1000px] text-[24px] leading-[1.4] text-[#34465E]">The radar makes sure you hear it, keeps it current, and brings a designed answer to the next meeting.</p>
      </Reveal>
      <Reveal i={3} className="mt-10 flex flex-wrap justify-center gap-3">
        <Pill tone="navy" className="px-4 py-1.5 text-[16px]">
          {int.format(s.active)} use cases
        </Pill>
        <Pill tone="tealSoft" className="px-4 py-1.5 text-[16px]">
          {int.format(s.signals)} signals
        </Pill>
        <Pill tone="gold" className="px-4 py-1.5 text-[16px]">
          {int.format(s.designs.current)} designs
        </Pill>
        <Pill tone="grey" className="px-4 py-1.5 text-[16px]">
          {int.format(s.runs)} runs since {ctx.recentRuns.length ? fmtDay(ctx.firstRun) : "the start"}
        </Pill>
      </Reveal>
      <Reveal i={4} className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={ctx.restart}
          className="flex h-12 items-center gap-2 rounded-full border border-[#C8DAEC] bg-white px-6 text-[16px] text-[#0D2847] hover:bg-[#E8F2FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Start again
        </button>
        <Link
          to="/"
          className="flex h-12 items-center gap-2 rounded-full bg-[#0F6CBD] px-6 text-[16px] font-semibold text-white hover:bg-[#0B5AA0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6CBD]"
        >
          Explore the radar <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ 7.2 the backlog */

const LANE_DOT: Record<string, string> = { now: "#0F6CBD", next: "#3BB0E8", later: "#A9B9CB" };

export function Backlog() {
  return (
    <div className="flex h-full flex-col">
      <SlideHead
        eyebrow="What comes next"
        title="The backlog: what the radar learns next."
        lead="Potential improvements, ordered by when they could land. Ideas, not commitments: each one is shaped with the people who use the radar."
      />
      <div className="mt-7 grid min-h-0 flex-1 grid-cols-3 grid-rows-[minmax(0,1fr)] gap-5">
        {LANES.map((l, li) => (
          <Reveal key={l.key} i={li + 1} className="min-h-0">
            <Panel className="flex h-full flex-col">
              <div className="flex items-baseline justify-between">
                <p className="flex items-center gap-2 text-[22px] font-semibold text-[#0D2847]">
                  <span aria-hidden="true" className="size-3.5 rounded-full" style={{ background: LANE_DOT[l.key] }} />
                  {l.label}
                </p>
                <span className="text-[14px] text-[#55657A]">{l.hint}</span>
              </div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {BACKLOG.filter((b) => b.lane === l.key).map((b) => (
                  <li key={b.title} className="rounded-[14px] border border-[#E1ECF6] bg-white/90 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold", AREA_TONE[b.area])}>{b.area}</span>
                      <span className="truncate text-[16.5px] font-semibold text-[#0D2847]">{b.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[#34465E]">{b.why}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
