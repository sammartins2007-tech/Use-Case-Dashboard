import { useMemo, useState } from "react";
import { LIVE_READ_ONLY, READ_ONLY } from "@/lib/read-only";
import { format, parseISO } from "date-fns";
import { AlertCircle, CalendarClock, Check, ChevronDown, Circle, FileText, Globe, Info, Mail, MessageSquare, Pencil, Plus, Radio, Sparkles, Trash2, UserCheck, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { initials, parseSteps, serializeSteps, sortSteps, todayIso, type Step } from "@/lib/people-steps";
import type { Signal, UseCase, UseCasePatch } from "@/data/types";
import { InputContextDialog, parseEvidence, type InputRef } from "@/components/input-context";
import { matchStepSources, sourceCandidates, type SourceKind, type StepSource } from "@/lib/step-source";
import { RADAR } from "@/radar.config";
import { cn } from "@/lib/utils";

type Save = (patch: UseCasePatch, msg: string, done?: () => void) => void;

function DateBlock({ due, done, overdue, accent }: { due: string; done: boolean; overdue: boolean; accent: string }) {
  if (!due)
    return (
      <div className="grid w-14 shrink-0 place-items-center rounded-xl border border-dashed border-border py-2 text-[11px] text-muted-foreground">
        <CalendarClock className="size-4" aria-hidden />
        No date
      </div>
    );
  const d = parseISO(due);
  return (
    <div
      className={cn("w-14 shrink-0 rounded-xl py-1.5 text-center text-white", done && "opacity-50")}
      style={{ background: overdue ? "#B4232A" : accent }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-90">{format(d, "EEE")}</p>
      <p className="text-xl font-semibold leading-none">{format(d, "d")}</p>
      <p className="text-[10px] uppercase opacity-90">{format(d, "MMM")}</p>
    </div>
  );
}

const KIND_ICON: Record<SourceKind, LucideIcon> = {
  Email: Mail,
  Teams: MessageSquare,
  Meeting: Video,
  Document: FileText,
  Web: Globe,
  Feature: Sparkles,
  Owner: UserCheck,
  Source: Radio,
};

const shortDay = (iso?: string) => {
  if (!iso) return "";
  const d = parseISO(iso.slice(0, 10));
  return format(d, d.getFullYear() === new Date().getFullYear() ? "d MMM" : "d MMM yyyy");
};
const longDay = (iso?: string) => (iso ? format(parseISO(iso.slice(0, 10)), "EEE d MMM yyyy") : "");
const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs";

/** People of a step: split on commas, "and" and "+", but never inside brackets ("Alex (Finance, to confirm)" stays one person). */
function splitWho(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const flush = () => {
    if (cur.trim()) out.push(cur.trim());
    cur = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === "," || ch === "+" || ch === ";")) {
      flush();
      continue;
    }
    if (depth === 0 && /^\s+and\s+/i.test(text.slice(i, i + 6))) {
      flush();
      i += /^\s+and\s+/i.exec(text.slice(i))?.[0].length ?? 0;
      i -= 1;
      continue;
    }
    cur += ch;
  }
  flush();
  return out;
}

/** The step's origin on the card (kind and date); its details and the source excerpt in a pop-up. */
function SourceChip({ s, src, onOpen }: { s: Step; src: StepSource; onOpen: (input: InputRef) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = KIND_ICON[src.kind];
  const when = shortDay(src.date);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Source: ${src.label} ${src.title}${src.date ? `, ${longDay(src.date)}` : ""}. Show details`}
          className={cn(chip, "border border-[#C8DAEC] bg-[#F3F8FD] font-medium text-[#0A4F8F] hover:border-[#0F6CBD] hover:bg-[#E3F0FB]")}
        >
          <Icon className="size-3.5" aria-hidden />
          {src.label}
          {when && <span className="font-normal text-[#34465E]">· {when}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0 text-sm">
        {s.detail && (
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
            <p className="mt-1 leading-relaxed">{s.detail}</p>
          </div>
        )}
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where it comes from</p>
          <div className="mt-2 flex gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#E3F0FB] text-[#0F6CBD]">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-snug">{src.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{[src.label, longDay(src.date), src.sender].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          {src.excerpt && <p className="mt-2.5 line-clamp-5 rounded-lg bg-[#F3F8FD] px-3 py-2 text-[13px] leading-relaxed">{src.excerpt}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-snug text-muted-foreground">Matched with this use case&apos;s evidence trail</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0"
              onClick={() => {
                setOpen(false);
                onOpen(src.input);
              }}
            >
              Full context
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DetailsChip({ detail, noSource }: { detail: string; noSource?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(chip, "border border-border text-muted-foreground hover:bg-muted")}>
          <Info className="size-3.5" aria-hidden /> Details
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm leading-relaxed">
        {detail}
        {noSource && <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">No source on record: no input of this use case mentions this step.</p>}
      </PopoverContent>
    </Popover>
  );
}

function StepCard({ s, src, traced, accent, busy, onToggle, onOpenSource }: { s: Step; src?: StepSource; traced: boolean; accent: string; busy: boolean; onToggle: () => void; onOpenSource: (input: InputRef) => void }) {
  const overdue = !s.done && Boolean(s.due) && s.due < todayIso();
  const who = splitWho(s.who);
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3", overdue ? "border-[#E8B4B4]" : "border-border", s.done && "bg-[#F7F7F5]")}>
      <DateBlock due={s.due} done={s.done} overdue={overdue} accent={accent} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium leading-snug", s.done && "text-muted-foreground line-through")}>{s.action}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {who.map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded-full bg-[#F3F1EC] py-0.5 pl-0.5 pr-2 text-xs">
              <span className="grid size-5 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: accent }} aria-hidden>
                {initials(w.replace(/\s*\(.*$/, ""))}
              </span>
              {w}
            </span>
          ))}
          {overdue && (
            <span className={cn(chip, "bg-[#FBE9E8] font-medium text-[#8A2B2B]")}>
              <AlertCircle className="size-3.5" aria-hidden /> {LIVE_READ_ONLY ? "Date passed" : "Date passed. Done?"}
            </span>
          )}
          {traced && src ? (
            <SourceChip s={s} src={src} onOpen={onOpenSource} />
          ) : (
            <>
              {s.detail && <DetailsChip detail={s.detail} noSource={traced} />}
              {traced && !s.detail && <span className={cn(chip, "border border-dashed border-border text-muted-foreground")}>No source on record</span>}
            </>
          )}
        </div>
      </div>
      {!RADAR.customerEdition && !READ_ONLY && (
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          aria-pressed={s.done}
          aria-label={s.done ? `Reopen: ${s.action}` : `Mark done: ${s.action}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            s.done ? "border-[#B9DCC8] bg-[#E9F5EE] text-[#1E5B3E]" : "border-border bg-white hover:bg-[#E9F5EE] hover:text-[#1E5B3E]",
          )}
        >
          {s.done ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
          {s.done ? "Done" : "Mark done"}
        </button>
      )}
    </li>
  );
}

function StepsEditor({ open, onOpenChange, steps, busy, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; steps: Step[]; busy: boolean; onSave: (list: Step[]) => void }) {
  const blank: Step = { done: false, due: "", who: "", action: "", detail: "" };
  const [draft, setDraft] = useState<Step[]>(steps);
  const set = (i: number, patch: Partial<Step>) => setDraft((d) => d.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(steps.length ? steps : [blank]);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Next steps</DialogTitle>
          <DialogDescription>One short action per step, with a date and who does it. Put any precision in Details.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {draft.map((s, i) => (
            <li key={i} className="grid gap-2 rounded-xl border border-border bg-[#F7FBFE] p-3 sm:grid-cols-6">
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-4">
                Action
                <Input value={s.action} maxLength={90} onChange={(e) => set(i, { action: e.target.value })} className="h-8 bg-white text-sm text-foreground" />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                Date
                <Input type="date" value={s.due} onChange={(e) => set(i, { due: e.target.value })} className="h-8 bg-white text-sm text-foreground" />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                Who
                <Input value={s.who} onChange={(e) => set(i, { who: e.target.value })} className="h-8 bg-white text-sm text-foreground" />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-4">
                Details (optional)
                <Input value={s.detail} maxLength={220} onChange={(e) => set(i, { detail: e.target.value })} className="h-8 bg-white text-sm text-foreground" />
              </label>
              <div className="flex items-center justify-between sm:col-span-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.done} onChange={(e) => set(i, { done: e.target.checked })} /> Done
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDraft((d) => [...d, blank])}>
          <Plus className="size-4" aria-hidden /> Add a step
        </Button>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => onSave(draft)}>
            Save steps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Sources are evidence: shown only in the owner's own radar, never in a read-only or customer copy. */
const TRACED = !RADAR.customerEdition && !READ_ONLY;

/** Next steps as date cards with where each one comes from: tick one when it is done; the refresh also closes steps it sees happen. */

export function NextSteps({ u, save, busy, accent, signals = [] }: { u: UseCase; save: Save; busy: boolean; accent: string; signals?: Signal[] }) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [ctx, setCtx] = useState<InputRef | null>(null);
  const steps = sortSteps(parseSteps(u.steps));
  const sources = useMemo(() => {
    if (!TRACED) return new Map<string, StepSource>();
    const list = sortSteps(parseSteps(u.steps));
    const found = matchStepSources(list, sourceCandidates(signals, parseEvidence(u.evidence)), u.account);
    return new Map(list.flatMap((x, i) => (found[i] ? [[`${x.action}|${x.due}`, found[i] as StepSource] as const] : [])));
  }, [u.steps, u.evidence, u.account, signals]);
  const srcOf = (x: Step) => sources.get(`${x.action}|${x.due}`);
  const openSteps = steps.filter((s) => !s.done);
  const done = steps.filter((s) => s.done);
  const write = (list: Step[], msg: string, after?: () => void) => {
    const next = sortSteps(list).find((s) => !s.done);
    const patch: UseCasePatch = { steps: serializeSteps(list) };
    if (next) patch.nextStep = [next.due, next.who, next.action].filter(Boolean).join(" · ");
    save(patch, msg, after);
  };
  const toggle = (s: Step) => write(steps.map((x) => (x === s ? { ...x, done: !x.done } : x)), s.done ? "Step reopened" : "Step done");
  const legacy = !steps.length && u.nextStep?.trim();
  return (
    <section aria-labelledby="steps-title" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 id="steps-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next steps {openSteps.length > 0 && <span className="tabular-nums">· {openSteps.length} open</span>}
        </h2>
        {!RADAR.customerEdition && !READ_ONLY && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> {steps.length ? "Edit" : "Add steps"}
          </Button>
        )}
      </div>
      {openSteps.length > 0 && (
        <ol className="space-y-2">
          {openSteps.map((s, i) => (
            <StepCard key={`${s.action}-${i}`} s={s} src={srcOf(s)} traced={TRACED} accent={accent} busy={busy} onToggle={() => toggle(s)} onOpenSource={setCtx} />
          ))}
        </ol>
      )}
      {!openSteps.length && !legacy && <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">No open step. Add the next move.</p>}
      {legacy && (
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="line-clamp-4 text-sm">{u.nextStep}</p>
          {!RADAR.customerEdition && <p className="mt-1 text-xs text-muted-foreground">Not yet split into steps. The next refresh does it, or use Add steps.</p>}
        </div>
      )}
      {done.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("size-3.5 transition-transform", showDone && "rotate-180")} aria-hidden /> {done.length} done
          </button>
          {showDone && (
            <ol className="mt-2 space-y-2">
              {done.map((s, i) => (
                <StepCard key={`d-${s.action}-${i}`} s={s} src={srcOf(s)} traced={TRACED} accent={accent} busy={busy} onToggle={() => toggle(s)} onOpenSource={setCtx} />
              ))}
            </ol>
          )}
        </div>
      )}
      <StepsEditor open={open} onOpenChange={setOpen} steps={steps} busy={busy} onSave={(list) => write(list, "Next steps saved", () => setOpen(false))} />
      {TRACED && <InputContextDialog input={ctx} onOpenChange={(o) => !o && setCtx(null)} evidence={u.evidence} sources={u.sources} signals={signals} />}
    </section>
  );
}
