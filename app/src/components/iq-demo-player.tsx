import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, BookOpen, Building2, CalendarDays, CheckCircle2, ChevronDown, Copy, Database, Globe, LayoutGrid, Loader2, Mail,
  MessageSquare, MessagesSquare, MoreHorizontal, Paperclip, PanelRight, Play, Plus, RotateCcw, Search, SendHorizontal,
  ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, User, Users, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Plays a scripted demo scenario (Microsoft IQ Playground scenario format) inside the radar, styled like
 * Microsoft 365 Copilot in Teams, so a use case can be shown as a realistic click-through story without
 * publishing anything outside the app. Scenarios are stored per use case as documents of kind "demo".
 * The story always opens on its principle before any prompt is shown.
 */
export interface IqSource { id: string; label: string; system: string; detail: string }
interface IqOption { id: string; title: string; body: string; badge?: string; supportedBy?: string }
interface IqChoice { label: string; user: string; assistant: string; chain?: string; thinkingSteps?: { label: string; sub: string }[]; sources?: IqSource[]; scenarios?: IqOption[] }
interface IqTrack { id: string; label: string; scenes: { choices: IqChoice[] }[] }
export interface IqScenario {
  title: string;
  summary?: string;
  industry?: string;
  persona: { role: string; goal?: string; approverRole?: string };
  trigger?: { kind: string; description: string; detectedBy?: string };
  agents: { name: string; sub: string; color: string; iq?: string }[];
  governance: { approvalThreshold: string; policySource?: string; auditRetention?: string };
  shell: {
    conversationHistory?: string[];
    suggestedChips?: string[];
    upcomingTasks?: { title: string; subtitle: string; action?: string }[];
    tryThese?: { label: string; color: string }[];
  };
  tracks: IqTrack[];
}

const FONT = { fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', system-ui, -apple-system, sans-serif" };
const PURPLE = "#5B5FC7";
const LAYER: Record<string, { label: string; color: string }> = {
  work: { label: "Work IQ", color: "#0f6cbd" },
  web: { label: "Web IQ", color: "#b5641f" },
  fabric: { label: "Fabric IQ", color: "#117865" },
  foundry: { label: "Foundry IQ", color: "#8b5bd6" },
  none: { label: "System of record", color: "#5b6472" },
};
const SYSTEM_LAYER: Record<string, string> = { email: "work", teams: "work", web: "web", fabric: "fabric", foundry: "foundry", crm: "none", sap: "none", joule: "none", logistics: "none" };
const SYSTEM_ICON: Record<string, typeof Mail> = { email: Mail, teams: MessagesSquare, web: Globe, fabric: Database, foundry: BookOpen, governance: ShieldCheck };
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** Very small markdown: paragraphs, "- " bullets and **bold**. */
function Md({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
  return (
    <div className="space-y-2 leading-relaxed">
      {text.split(/\n{2,}/).map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.trim().slice(2))}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

type Stage = "thinking" | "streaming" | "done";
type Turn = { choice: IqChoice; stage: Stage; step: number; shown: number };

function CopilotMark({ size = 28 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-lg text-white" style={{ width: size, height: size, background: "linear-gradient(135deg,#0f6cbd 0%,#7f5ad1 55%,#d6457a 100%)" }} aria-hidden>
      <Sparkles style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

export function IqDemoPlayer({ scenario, open, onOpenChange }: { scenario: IqScenario; open: boolean; onOpenChange: (v: boolean) => void }) {
  const fill = useMemo(() => {
    const user = scenario.persona.role;
    const approver = scenario.persona.approverRole || "the approver";
    return (s: string) => s.replace(/\{\{\s*userName\s*\}\}/g, user).replace(/\{\{\s*approverName\s*\}\}/g, approver);
  }, [scenario]);
  const [phase, setPhase] = useState<"intro" | "play">("intro");
  const [trackId, setTrackId] = useState("main");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [typing, setTyping] = useState<IqChoice | null>(null);
  const [draft, setDraft] = useState("");
  const [behind, setBehind] = useState(false);
  const [layersSeen, setLayersSeen] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  const track = scenario.tracks.find((t) => t.id === trackId) ?? scenario.tracks[0];
  const busy = Boolean(typing) || turns.some((t) => t.stage !== "done");
  const nextScene = track?.scenes[turns.length];
  const finished = !nextScene && !busy;
  const followups = (scenario.shell.upcomingTasks ?? []).filter((t) => t.action && t.action !== trackId && scenario.tracks.some((tr) => tr.id === t.action));
  const mainAgent = scenario.agents.find((a) => a.iq === "work") ?? scenario.agents[0];

  const reset = (id = "main", toIntro = false) => {
    setTrackId(id);
    setTurns([]);
    setTyping(null);
    setDraft("");
    if (id === "main") setLayersSeen(new Set());
    if (toIntro) setPhase("intro");
  };
  useEffect(() => {
    if (!open) {
      reset("main", true);
      setBehind(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 1. The prompt is typed into the composer, then sent.
  useEffect(() => {
    if (!typing) return;
    const full = fill(typing.user);
    if (draft.length < full.length) {
      const t = setTimeout(() => setDraft(full.slice(0, draft.length + 2)), 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTurns((prev) => [...prev, { choice: typing, stage: "thinking", step: 0, shown: 0 }]);
      setTyping(null);
      setDraft("");
    }, 350);
    return () => clearTimeout(t);
  }, [typing, draft, fill]);

  // 2. Reasoning steps tick off, 3. the answer streams in.
  useEffect(() => {
    const last = turns[turns.length - 1];
    if (!last || last.stage === "done") return;
    const steps = last.choice.thinkingSteps?.length ?? 0;
    const total = fill(last.choice.assistant).length;
    const t = setTimeout(
      () =>
        setTurns((prev) => {
          const copy = [...prev];
          const cur = { ...copy[copy.length - 1] };
          if (cur.stage === "thinking") {
            if (cur.step < steps) cur.step += 1;
            else cur.stage = "streaming";
          } else if (cur.shown < total) cur.shown = Math.min(total, cur.shown + 9);
          else cur.stage = "done";
          copy[copy.length - 1] = cur;
          return copy;
        }),
      last.stage === "thinking" ? (steps ? 800 : 900) : 25,
    );
    return () => clearTimeout(t);
  }, [turns, fill]);

  useEffect(() => {
    const last = turns[turns.length - 1];
    if (last?.stage === "done") {
      const add = (last.choice.sources ?? []).map((s) => SYSTEM_LAYER[s.system]).filter(Boolean);
      if (add.length) setLayersSeen((prev) => new Set([...prev, ...add]));
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, draft]);

  const ask = (c: IqChoice) => {
    if (busy) return;
    setDraft("");
    setTyping(c);
  };
  const layers = [...new Set(scenario.agents.map((a) => a.iq ?? "none"))].filter((l) => l !== "none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex h-[92vh] max-h-[92vh] w-[97vw] max-w-[1440px] flex-col gap-0 overflow-hidden rounded-xl border-0 p-0 sm:max-w-[1440px]" style={FONT}>
        <DialogTitle className="sr-only">{scenario.title}</DialogTitle>
        <DialogDescription className="sr-only">Interactive demo story. All data is fictional.</DialogDescription>

        {/* Teams title bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[#e0e0e0] bg-[#ebebeb] px-3 text-[13px] text-[#242424]">
          <span className="grid size-6 place-items-center rounded text-[11px] font-bold text-white" style={{ background: PURPLE }} aria-hidden>T</span>
          <div className="mx-auto flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-[#d1d1d1] bg-white px-2 text-[#616161]">
            <Search className="size-3.5" aria-hidden /> <span>Search</span>
          </div>
          <span className="hidden rounded-full border border-dashed border-[#a0a0a0] px-2 py-0.5 text-[11px] text-[#616161] md:inline">Demo · fictional data</span>
          <span className="grid size-7 place-items-center rounded-full bg-[#dfe3f7] text-[11px] font-semibold text-[#3d3f8f]" title={scenario.persona.role}>{initials(scenario.persona.role)}</span>
          <button type="button" onClick={() => onOpenChange(false)} className="grid size-7 place-items-center rounded hover:bg-black/10" aria-label="Close demo"><X className="size-4" /></button>
        </div>

        {phase === "intro" ? (
          <Intro scenario={scenario} track={track} fill={fill} layers={layers} onStart={() => setPhase("play")} />
        ) : (
          <div className="flex min-h-0 flex-1 bg-[#f5f5f5] text-[#242424]">
            {/* App rail */}
            <nav className="hidden w-[68px] shrink-0 flex-col items-center gap-1 bg-[#ebebeb] py-2 sm:flex" aria-label="Apps (demo)">
              {[{ i: Bell, l: "Activity" }, { i: MessageSquare, l: "Chat" }, { i: Users, l: "Teams" }, { i: CalendarDays, l: "Calendar" }, { i: Sparkles, l: "Copilot", on: true }, { i: LayoutGrid, l: "Apps" }].map(({ i: I, l, on }) => (
                <span key={l} className={cn("flex w-14 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px]", on ? "bg-white font-semibold" : "text-[#616161]")} style={on ? { color: PURPLE } : undefined}>
                  <I className="size-5" aria-hidden />
                  {l}
                </span>
              ))}
            </nav>

            {/* Copilot side pane */}
            <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#e0e0e0] bg-[#fafafa] md:flex" aria-label="Copilot navigation (demo)">
              <div className="flex items-center gap-2 px-4 pb-2 pt-4"><CopilotMark size={24} /><span className="text-[15px] font-semibold">Copilot</span></div>
              <button type="button" onClick={() => reset(trackId)} disabled={busy} className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-[#d1d1d1] bg-white px-3 py-1.5 text-[13px] hover:bg-[#f0f0f0]">
                <Plus className="size-4" aria-hidden /> New chat
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[#616161]">Agents</p>
                {scenario.agents.map((a) => (
                  <div key={a.name} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]", a === mainAgent && "bg-white shadow-sm")} title={a.sub}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: a.color }}>{initials(a.name)}</span>
                    <span className="truncate">{a.name}</span>
                  </div>
                ))}
                <p className="px-2 pb-1 pt-4 text-[11px] font-semibold text-[#616161]">Chats</p>
                {turns.length > 0 && <div className="truncate rounded-md bg-white px-2 py-1.5 text-[13px] font-semibold shadow-sm">{fill(turns[0].choice.label)}</div>}
                {(scenario.shell.conversationHistory ?? []).map((c) => <div key={c} className="truncate rounded-md px-2 py-1.5 text-[13px] text-[#424242]" title={c}>{c}</div>)}
              </div>
            </aside>

            {/* Conversation */}
            <section className="flex min-w-0 flex-1 flex-col bg-white" aria-label="Copilot conversation (demo)">
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#f0f0f0] px-4">
                <span className="grid size-6 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: mainAgent?.color }}>{initials(mainAgent?.name ?? "C")}</span>
                <span className="text-[14px] font-semibold">{mainAgent?.name}</span>
                <ChevronDown className="size-4 text-[#616161]" aria-hidden />
                <span className="ml-auto" />
                <button type="button" onClick={() => setBehind((v) => !v)} aria-pressed={behind} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] hover:bg-[#f0f0f0]", behind && "bg-[#ebebf7]")} style={behind ? { color: PURPLE } : undefined}>
                  <PanelRight className="size-4" aria-hidden /> Behind the scenes
                </button>
                <MoreHorizontal className="size-4 text-[#616161]" aria-hidden />
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
                <div className="mx-auto max-w-[820px] space-y-6 px-6 py-6">
                  {turns.length === 0 && !typing && (
                    <div className="pt-6 text-center">
                      <div className="mx-auto w-fit"><CopilotMark size={44} /></div>
                      <p className="mt-3 text-[22px] font-semibold">Hi, {scenario.persona.role}</p>
                      <p className="text-[14px] text-[#616161]">{track?.id === "main" ? "Here's what needs your attention today." : track?.label}</p>
                      <div className="mx-auto mt-6 grid max-w-[700px] gap-2 text-left sm:grid-cols-2">
                        {(scenario.shell.upcomingTasks ?? []).map((t) => {
                          const playable = t.action && t.action !== trackId && scenario.tracks.some((tr) => tr.id === t.action);
                          return (
                            <button key={t.title} type="button" disabled={!playable} onClick={() => playable && reset(t.action!)} className={cn("rounded-lg border border-[#e0e0e0] p-3 text-[13px] shadow-sm", playable ? "hover:border-[#c7c8f2] hover:bg-[#fafaff]" : "cursor-default")}>
                              <span className="block font-semibold">{fill(t.title)}</span>
                              <span className="mt-0.5 block text-[12px] text-[#616161]">{fill(t.subtitle)}</span>
                              {playable && <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: PURPLE }}><Play className="size-3" aria-hidden /> Start</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {turns.map((t, i) => <TurnView key={i} t={t} fill={fill} scenario={scenario} />)}
                  {typing && <div className="h-2" />}
                  <div ref={endRef} />
                </div>
              </div>

              {/* Suggestions + composer */}
              <div className="shrink-0 px-6 pb-4">
                <div className="mx-auto max-w-[820px]">
                  {nextScene && !busy && (
                    <div className="mb-2 flex flex-wrap justify-end gap-2">
                      {nextScene.choices.map((c) => (
                        <button key={c.label} type="button" onClick={() => ask(c)} className="rounded-full border border-[#c7c8f2] bg-white px-3 py-1.5 text-[13px] shadow-sm hover:bg-[#f5f5ff]" style={{ color: PURPLE }}>
                          {fill(c.label)}
                        </button>
                      ))}
                    </div>
                  )}
                  {finished && (
                    <div className="mb-2 flex flex-wrap justify-end gap-2">
                      {followups.map((f) => (
                        <button key={f.action} type="button" onClick={() => reset(f.action!)} className="inline-flex items-center gap-1 rounded-full border border-[#c7c8f2] bg-white px-3 py-1.5 text-[13px] shadow-sm hover:bg-[#f5f5ff]" style={{ color: PURPLE }}>
                          <Play className="size-3.5" aria-hidden /> {fill(f.title)}
                        </button>
                      ))}
                      <button type="button" onClick={() => reset("main", true)} className="inline-flex items-center gap-1 rounded-full border border-[#d1d1d1] bg-white px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5]">
                        <RotateCcw className="size-3.5" aria-hidden /> Replay from the start
                      </button>
                    </div>
                  )}
                  <div className="rounded-xl border border-[#d1d1d1] bg-white px-3 py-2 shadow-sm focus-within:border-[#5B5FC7]">
                    <p className={cn("min-h-[40px] whitespace-pre-wrap pt-1 text-[14px]", !draft && "text-[#8a8a8a]")}>
                      {draft || (nextScene && !busy ? "Message Copilot — or pick a suggestion above" : "Message Copilot")}
                      {typing && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#242424] align-middle" />}
                    </p>
                    <div className="flex items-center gap-2 text-[#616161]">
                      <Paperclip className="size-4" aria-hidden />
                      <span className="ml-auto" />
                      <span className={cn("grid size-7 place-items-center rounded-md", typing ? "text-white" : "")} style={typing ? { background: PURPLE } : undefined}><SendHorizontal className="size-4" aria-hidden /></span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-center text-[11px] text-[#8a8a8a]">AI-generated content may be incorrect · Demo story with fictional data</p>
                </div>
              </div>
            </section>

            {/* Behind the scenes */}
            {behind && (
              <aside className="hidden w-[290px] shrink-0 overflow-y-auto border-l border-[#e0e0e0] bg-[#fafafa] p-4 text-[13px] lg:block" aria-label="Behind the scenes">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#616161]">IQ layers used so far</p>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {layers.map((l) => {
                    const on = layersSeen.has(l);
                    return <span key={l} className={cn("rounded-full border px-2 py-0.5 text-[11px] transition-colors", on ? "text-white" : "text-[#8a8a8a]")} style={on ? { background: LAYER[l]?.color, borderColor: LAYER[l]?.color } : undefined}>{LAYER[l]?.label ?? l}</span>;
                  })}
                </div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Agents</p>
                <ul className="mb-5 space-y-2">
                  {scenario.agents.map((a) => (
                    <li key={a.name} className="flex items-start gap-2">
                      <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
                      <span><span className="block font-semibold">{a.name}</span><span className="block text-[11px] text-[#616161]">{a.sub}{a.iq ? ` · ${LAYER[a.iq]?.label ?? a.iq}` : ""}</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Governance</p>
                <div className="space-y-2 rounded-lg border border-[#e0e0e0] bg-white p-3 text-[12px]">
                  <p className="flex items-start gap-1.5"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#a4262c]" aria-hidden />{fill(scenario.governance.approvalThreshold)}</p>
                  {scenario.governance.policySource && <p className="text-[#616161]">Policy: {scenario.governance.policySource}</p>}
                  {scenario.governance.auditRetention && <p className="text-[#616161]">{scenario.governance.auditRetention}</p>}
                </div>
              </aside>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Intro({ scenario, track, fill, layers, onStart }: { scenario: IqScenario; track?: IqTrack; fill: (s: string) => string; layers: string[]; onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[linear-gradient(135deg,#f3f3fb_0%,#ffffff_60%,#fbf3f7_100%)] p-6 text-[#242424]">
      <div className="w-full max-w-[720px] rounded-2xl border border-[#e0e0e0] bg-white p-8 shadow-lg">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#616161]"><Sparkles className="size-3.5" aria-hidden /> THE PRINCIPLE{scenario.industry ? ` · ${scenario.industry.toUpperCase()}` : ""}</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight">{scenario.title}</h2>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed">
          <p><span className="font-semibold">Who:</span> you play the {scenario.persona.role}{scenario.persona.goal ? <>, whose goal is to {scenario.persona.goal.charAt(0).toLowerCase() + scenario.persona.goal.slice(1)}</> : null}.</p>
          {scenario.trigger && <p><span className="font-semibold">What just happened:</span> {fill(scenario.trigger.description)}</p>}
          <p><span className="font-semibold">How it works:</span> Copilot pulls the facts together from your work, licensed external sources, business data and policies, then proposes options with their sources.</p>
          <p><span className="font-semibold">The rule:</span> nothing is executed until a human approves it{scenario.persona.approverRole ? ` (${scenario.persona.approverRole})` : ""}.</p>
        </div>
        {layers.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {layers.map((l) => <span key={l} className="rounded-full px-2.5 py-0.5 text-[12px] text-white" style={{ background: LAYER[l]?.color }}>{LAYER[l]?.label ?? l}</span>)}
          </div>
        )}
        <div className="mt-7 flex items-center gap-3">
          <button type="button" onClick={onStart} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[14px] font-semibold text-white shadow-sm hover:opacity-90" style={{ background: PURPLE }}>
            <Play className="size-4" aria-hidden /> Start the demo
          </button>
          <span className="text-[12px] text-[#616161]">{track?.label} · all data is fictional</span>
        </div>
      </div>
    </div>
  );
}

function TurnView({ t, fill, scenario }: { t: Turn; fill: (s: string) => string; scenario: IqScenario }) {
  const [refsOpen, setRefsOpen] = useState(false);
  const text = fill(t.choice.assistant);
  const sources = t.choice.sources ?? [];
  const steps = t.choice.thinkingSteps ?? [];
  const approval = sources.find((s) => s.system === "governance");
  const cited = sources.filter((s) => s.system !== "governance");
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-lg bg-[#e8ebfa] px-3.5 py-2 text-[14px] text-[#242424]">{fill(t.choice.user)}</div>
      </div>
      <div className="flex items-start gap-3">
        <CopilotMark size={28} />
        <div className="min-w-0 flex-1 text-[14px]">
          <p className="mb-1 text-[12px] font-semibold text-[#424242]">Copilot</p>
          {steps.length > 0 && (
            <details open={t.stage !== "done"} className="mb-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2">
              <summary className="cursor-pointer list-none text-[12px] font-semibold text-[#616161]">
                {t.stage === "thinking" ? <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" aria-hidden /> Reasoning…</span> : <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /> Reasoned in {steps.length} steps</span>}
              </summary>
              <ol className="mt-2 space-y-1">
                {steps.map((s, j) => {
                  const done = j < t.step || t.stage !== "thinking";
                  const doing = j === t.step && t.stage === "thinking";
                  return (
                    <li key={s.label} className={cn("flex items-start gap-2 text-[12px]", !done && !doing && "opacity-40")}>
                      {doing ? <Loader2 className="mt-0.5 size-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className={cn("mt-0.5 size-3.5", done ? "text-emerald-600" : "text-[#8a8a8a]")} aria-hidden />}
                      <span><span className="font-semibold">{s.label}</span> <span className="text-[#616161]">· {s.sub}</span></span>
                    </li>
                  );
                })}
              </ol>
            </details>
          )}
          {t.stage === "thinking" && !steps.length && <p className="flex items-center gap-2 text-[12px] text-[#616161]"><Loader2 className="size-3.5 animate-spin" aria-hidden /> Working on it…</p>}
          {t.stage !== "thinking" && (
            <>
              <Md text={t.stage === "done" ? text : text.slice(0, t.shown)} />
              {t.stage === "done" && cited.length > 0 && (
                <span className="mt-1 inline-flex flex-wrap gap-1">
                  {cited.map((s, k) => <Cite key={s.id} n={k + 1} s={s} fill={fill} />)}
                </span>
              )}
            </>
          )}
          {t.stage === "done" && (t.choice.scenarios ?? []).length > 0 && (
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {t.choice.scenarios!.map((o) => (
                <div key={o.id} className={cn("rounded-lg border bg-white p-3 text-[13px] shadow-sm", o.badge ? "border-[#5B5FC7] ring-1 ring-[#5B5FC7]" : "border-[#e0e0e0]")}>
                  {o.badge && <span className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ background: PURPLE }}>{o.badge}</span>}
                  <p className="text-[14px] font-semibold">{fill(o.title)}</p>
                  <div className="mt-1.5 text-[12.5px]"><Md text={fill(o.body)} /></div>
                  {o.supportedBy && <p className="mt-2 border-t border-[#f0f0f0] pt-1.5 text-[11px] text-[#616161]">Based on: {fill(o.supportedBy)}</p>}
                </div>
              ))}
            </div>
          )}
          {t.stage === "done" && approval && <ApprovalCard scenario={scenario} rule={approval} fill={fill} />}
          {t.stage === "done" && (
            <div className="mt-2 flex items-center gap-3 text-[#616161]">
              <Copy className="size-3.5" aria-hidden />
              <ThumbsUp className="size-3.5" aria-hidden />
              <ThumbsDown className="size-3.5" aria-hidden />
              {cited.length > 0 && (
                <button type="button" onClick={() => setRefsOpen((v) => !v)} aria-expanded={refsOpen} className="inline-flex items-center gap-1 text-[12px] hover:text-[#242424]">
                  {cited.length} reference{cited.length > 1 ? "s" : ""} <ChevronDown className={cn("size-3.5 transition-transform", refsOpen && "rotate-180")} aria-hidden />
                </button>
              )}
              <span className="ml-auto text-[11px]">AI-generated content may be incorrect</span>
            </div>
          )}
          {refsOpen && (
            <ol className="mt-2 space-y-1.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-2.5 text-[12px]">
              {cited.map((s, k) => {
                const I = SYSTEM_ICON[s.system] ?? Building2;
                return (
                  <li key={s.id} className="flex items-start gap-2">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#e0e0e0] text-[10px] font-semibold">{k + 1}</span>
                    <I className="mt-0.5 size-3.5 shrink-0 text-[#616161]" aria-hidden />
                    <span><span className="font-semibold">{fill(s.label)}</span><span className="block text-[#616161]">{fill(s.detail)}</span></span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Cite({ n, s, fill }: { n: number; s: IqSource; fill: (s: string) => string }) {
  const I = SYSTEM_ICON[s.system] ?? Building2;
  const layer = LAYER[SYSTEM_LAYER[s.system] ?? "none"];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="grid h-4 min-w-4 place-items-center rounded bg-[#e8ebfa] px-1 text-[10px] font-semibold text-[#3d3f8f] hover:bg-[#d5d9f5]" aria-label={`Reference ${n}: ${fill(s.label)}`}>{n}</button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 text-[12px]" style={FONT}>
        <p className="flex items-center gap-1.5 font-semibold"><I className="size-3.5" aria-hidden />{fill(s.label)}</p>
        <p className="mt-1 text-[#424242]">{fill(s.detail)}</p>
        <p className="mt-2 text-[11px] font-semibold" style={{ color: layer.color }}>{layer.label}</p>
      </PopoverContent>
    </Popover>
  );
}

function ApprovalCard({ scenario, rule, fill }: { scenario: IqScenario; rule: IqSource; fill: (s: string) => string }) {
  return (
    <div className="mt-3 max-w-[460px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3 py-2">
        <span className="grid size-6 place-items-center rounded text-white" style={{ background: "#0f6cbd" }}><ShieldCheck className="size-3.5" aria-hidden /></span>
        <span className="text-[13px] font-semibold">Approvals</span>
        <span className="ml-auto rounded-full bg-[#fff4ce] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">Pending</span>
      </div>
      <div className="space-y-1.5 px-3 py-2.5 text-[12.5px]">
        <p className="text-[14px] font-semibold">{scenario.tracks[0]?.label ?? scenario.title}</p>
        <p><span className="text-[#616161]">Requested by </span>{scenario.persona.role}</p>
        <p><span className="text-[#616161]">Approver </span>{scenario.persona.approverRole ?? "Approver"}</p>
        <p className="flex items-start gap-1.5 text-[#424242]"><User className="mt-0.5 size-3.5 shrink-0" aria-hidden />{fill(rule.detail)}</p>
      </div>
      <div className="flex gap-2 border-t border-[#f0f0f0] px-3 py-2">
        <span className="rounded-md px-3 py-1 text-[12px] font-semibold text-white opacity-60" style={{ background: PURPLE }} title="Only the approver can act">Approve</span>
        <span className="rounded-md border border-[#d1d1d1] px-3 py-1 text-[12px] font-semibold opacity-60" title="Only the approver can act">Reject</span>
        <span className="ml-auto self-center text-[11px] text-[#616161]">Nothing runs until approved</span>
      </div>
    </div>
  );
}
