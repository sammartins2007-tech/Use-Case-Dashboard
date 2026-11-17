import { useState } from "react";
import { LIVE_READ_ONLY, READ_ONLY } from "@/lib/read-only";
import { format, parseISO } from "date-fns";
import { AlertCircle, CalendarClock, Check, ChevronDown, Circle, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { initials, parseSteps, serializeSteps, sortSteps, todayIso, type Step } from "@/lib/people-steps";
import type { UseCase, UseCasePatch } from "@/data/types";
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

function StepCard({ s, accent, busy, onToggle }: { s: Step; accent: string; busy: boolean; onToggle: () => void }) {
  const overdue = !s.done && Boolean(s.due) && s.due < todayIso();
  const who = s.who.split(/\s*,\s*|\s+and\s+|\s*\+\s*/).filter(Boolean);
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3", overdue ? "border-[#E8B4B4]" : "border-border", s.done && "bg-[#F7F7F5]")}>
      <DateBlock due={s.due} done={s.done} overdue={overdue} accent={accent} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium leading-snug", s.done && "text-muted-foreground line-through")}>{s.action}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {who.map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded-full bg-[#F3F1EC] py-0.5 pl-0.5 pr-2 text-xs">
              <span className="grid size-5 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: accent }} aria-hidden>
                {initials(w)}
              </span>
              {w}
            </span>
          ))}
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE9E8] px-2 py-0.5 text-xs font-medium text-[#8A2B2B]">
              <AlertCircle className="size-3.5" aria-hidden /> {LIVE_READ_ONLY ? "Date passed" : "Date passed. Done?"}
            </span>
          )}
          {s.detail && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                  <Info className="size-3.5" aria-hidden /> Details
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm leading-relaxed">{s.detail}</PopoverContent>
            </Popover>
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
            <li key={i} className="grid gap-2 rounded-xl border border-border bg-[#FBF9F5] p-3 sm:grid-cols-6">
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

/** Next steps as date cards: tick one when it is done; the refresh also closes steps it sees happen. */
export function NextSteps({ u, save, busy, accent }: { u: UseCase; save: Save; busy: boolean; accent: string }) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const steps = sortSteps(parseSteps(u.steps));
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
            <StepCard key={`${s.action}-${i}`} s={s} accent={accent} busy={busy} onToggle={() => toggle(s)} />
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
                <StepCard key={`d-${s.action}-${i}`} s={s} accent={accent} busy={busy} onToggle={() => toggle(s)} />
              ))}
            </ol>
          )}
        </div>
      )}
      <StepsEditor open={open} onOpenChange={setOpen} steps={steps} busy={busy} onSave={(list) => write(list, "Next steps saved", () => setOpen(false))} />
    </section>
  );
}
