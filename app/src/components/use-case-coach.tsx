import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Check, Loader2, Send, SkipForward, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AIConsumption_704f56Service } from "../../generated/services/AIConsumption_704f56Service";
import { useUpdateUseCase } from "@/data/repo";
import type { UseCase, UseCasePatch } from "@/data/types";
import { COACH_FIELDS, askCoach, patchFrom, readinessScore, type CoachField, type CoachReply, type CoachTurn } from "@/lib/coach";
import { ELEMENTS, statusOf } from "@/lib/readiness";
import { cn } from "@/lib/utils";

type Entry =
  | { kind: "coach"; reply: CoachReply; saved: CoachField[]; undo?: UseCasePatch }
  | { kind: "user"; text: string }
  | { kind: "error"; text: string };

const DOT = { G: "bg-[#2F9461]", O: "bg-[#E08A1E]", R: "bg-[#C94141]" } as const;

function Ring({ g, o, total, color }: { g: number; o: number; total: number; color: string }) {
  const r = 22,
    c = 2 * Math.PI * r;
  const pg = g / total,
    po = o / total;
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0" role="img" aria-label={`${g} of ${total} evidenced`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#EFEBE3" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#E08A1E" strokeWidth="6" strokeDasharray={`${(pg + po) * c} ${c}`} transform="rotate(-90 28 28)" strokeLinecap="round" className="transition-all duration-700" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${pg * c} ${c}`} transform="rotate(-90 28 28)" strokeLinecap="round" className="transition-all duration-700" />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1B2A41">
        {g}/{total}
      </text>
    </svg>
  );
}

export function UseCaseCoach({ u, open, onOpenChange, accent }: { u: UseCase; open: boolean; onOpenChange: (v: boolean) => void; accent: string }) {
  const update = useUpdateUseCase();
  const qc = useQueryClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<CoachTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [chars, setChars] = useState({ in: 0, out: 0, turns: 0 });
  const [slow, setSlow] = useState(false);
  const live = useRef(u);
  live.current = u;
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (h: CoachTurn[]) => askCoach(live.current, h),
    onSuccess: async ({ reply, promptChars, answerChars }, h) => {
      setChars((c) => ({ in: c.in + promptChars, out: c.out + answerChars, turns: c.turns + 1 }));
      const patch = patchFrom(live.current, reply, "the account team");
      const saved = Object.keys(reply.updates) as CoachField[];
      const undo: UseCasePatch = {};
      for (const k of Object.keys(patch) as (keyof UseCasePatch)[]) (undo as Record<string, unknown>)[k] = (live.current as unknown as Record<string, unknown>)[k] ?? "";
      if (Object.keys(patch).length) {
        try {
          await update.mutateAsync({ id: live.current.id, patch });
          await qc.invalidateQueries({ queryKey: ["useCase", String(live.current.id)] });
          if (saved.length) toast.success(`Saved: ${saved.map((k) => COACH_FIELDS[k]).join(", ")}`);
        } catch {
          toast.error("The coach's update could not be saved");
        }
      }
      setEntries((e) => [...e, { kind: "coach", reply, saved, undo: saved.length ? undo : undefined }]);
      const turn = [reply.message, reply.question].filter(Boolean).join(" ");
      setHistory([...h, { role: "coach", text: turn }]);
    },
    onError: (err) => {
      setEntries((e) => [...e, { kind: "error", text: err instanceof Error ? err.message : "The coach could not answer." }]);
    },
  });

  // First turn when opened.
  useEffect(() => {
    if (open && entries.length === 0 && !ask.isPending) ask.mutate([]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ask.isPending) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [ask.isPending]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [entries.length, ask.isPending]);

  // Log the session's AI use (estimate) when the panel closes.
  const logSession = () => {
    if (!chars.turns) return;
    const inTok = Math.round(chars.in / 4),
      outTok = Math.round(chars.out / 4);
    const cost = Math.round((inTok / 1e6) * 0.84 * 100 + (outTok / 1e6) * 15 * 100) / 100;
    const base = {
      Title: `Use Case Coach · ${u.title}`.slice(0, 250),
      RunDate: new Date().toISOString(),
      Status: { Value: "Completed" },
      InputTokens: inTok,
      OutputTokens: outTok,
      CostUSD: cost,
      Estimated: true,
      Basis: `${chars.turns} coach turns; tokens estimated as characters / 4 of prompts and answers. Estimate, not a meter reading; the agent's own AI credits are billed separately.`,
    };
    void AIConsumption_704f56Service.create({ ...base, Kind: { Value: "Use Case Coach" } } as never).then((r) => {
      if (!r.success) void AIConsumption_704f56Service.create({ ...base, Kind: { Value: "Deep analysis" } } as never);
      void qc.invalidateQueries({ queryKey: ["consumption"] });
    });
    setChars({ in: 0, out: 0, turns: 0 });
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || ask.isPending) return;
    const h: CoachTurn[] = [...history, { role: "user", text: t }];
    setEntries((e) => [...e, { kind: "user", text: t }]);
    setHistory(h);
    setDraft("");
    ask.mutate(h);
  };

  const undo = async (i: number) => {
    const e = entries[i];
    if (e.kind !== "coach" || !e.undo) return;
    try {
      await update.mutateAsync({ id: u.id, patch: e.undo });
      setEntries((all) => all.map((x, j) => (j === i && x.kind === "coach" ? { ...x, undo: undefined, saved: [] } : x)));
      toast.success("Change undone");
    } catch {
      toast.error("Could not undo");
    }
  };

  const score = readinessScore(u);
  const last = [...entries].reverse().find((e) => e.kind === "coach") as Extract<Entry, { kind: "coach" }> | undefined;
  const done = last?.reply.done ?? false;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) logSession();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-border p-4" style={{ background: `color-mix(in srgb, ${accent} 7%, #FFFDF8)` }}>
          <div className="flex items-center gap-3">
            <Ring g={score.g} o={score.o} total={score.total} color={accent} />
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
                <Sparkles className="size-4" style={{ color: accent }} aria-hidden /> Use Case Coach
              </SheetTitle>
              <SheetDescription className="truncate">{u.title}</SheetDescription>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Readiness">
            {ELEMENTS.map((e) => {
              const s = statusOf(e, u);
              return (
                <li key={e.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-[11px]">
                  <span className={cn("size-1.5 rounded-full", DOT[s])} aria-hidden />
                  {e.label}
                </li>
              );
            })}
          </ul>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={ask.isPending}>
          {entries.map((e, i) =>
            e.kind === "user" ? (
              <div key={i} className="ml-10 rounded-2xl rounded-tr-sm bg-[#1B2A41] px-4 py-2.5 text-sm text-white">
                {e.text}
              </div>
            ) : e.kind === "error" ? (
              <div key={i} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {e.text}
                <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => ask.mutate(history)} disabled={ask.isPending}>
                  Try again
                </Button>
              </div>
            ) : (
              <div key={i} className="mr-6 flex gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white" style={{ background: accent }}>
                  <Bot className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 space-y-2">
                  {e.reply.message && <p className="text-sm leading-relaxed">{e.reply.message}</p>}
                  {e.saved.length > 0 && (
                    <details className="rounded-xl border border-[#B9DCC8] bg-[#E9F5EE] px-3 py-2 text-xs text-[#1E5B3E]">
                      <summary className="flex cursor-pointer items-center gap-1.5">
                        <Check className="size-3.5" aria-hidden /> Saved to the dossier: {e.saved.map((k) => COACH_FIELDS[k]).join(", ")}
                        {e.undo && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.preventDefault();
                              void undo(i);
                            }}
                            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/60"
                          >
                            <Undo2 className="size-3" aria-hidden /> Undo
                          </button>
                        )}
                      </summary>
                      <dl className="mt-2 space-y-1.5">
                        {e.saved.map((k) => (
                          <div key={k}>
                            <dt className="font-medium">{COACH_FIELDS[k]}</dt>
                            <dd className="whitespace-pre-line text-[#2D4A3C]">{e.reply.updates[k]}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                  {e.reply.question && (
                    <div className="rounded-2xl rounded-tl-sm border border-border bg-white p-3">
                      <p className="font-medium leading-snug">{e.reply.question}</p>
                      {e.reply.hint && <p className="mt-1 text-xs text-muted-foreground">For example: {e.reply.hint}</p>}
                    </div>
                  )}
                  {e.reply.done && <p className="rounded-xl bg-[#E9F5EE] p-3 text-sm text-[#1E5B3E]">The dossier is complete enough for a business case. You can close the coach.</p>}
                </div>
              </div>
            ),
          )}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {slow ? "Still thinking. The coach can take up to a minute…" : "The coach is thinking…"}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            send(draft);
          }}
        >
          <Textarea
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            rows={3}
            placeholder={done ? "Anything else to add?" : "Type your answer, then Send"}
            aria-label="Your answer"
            disabled={ask.isPending}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={ask.isPending || !history.length} onClick={() => send("I don't know this yet; skip this question and ask the next most useful one.")}>
              <SkipForward className="size-4" aria-hidden /> Skip
            </Button>
            <span className="text-[11px] text-muted-foreground">Each answer is saved to the dossier; you can undo it.</span>
            <Button type="submit" size="sm" className="ml-auto text-white hover:opacity-90" style={{ background: accent }} disabled={ask.isPending || !draft.trim()}>
              <Send className="size-4" aria-hidden /> Send
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
