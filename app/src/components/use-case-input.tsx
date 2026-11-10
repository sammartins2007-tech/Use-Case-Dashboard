import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, FileUp, Loader2, MessageSquareWarning, RotateCcw, ShieldCheck, Sparkles, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AIConsumption_704f56Service } from "../../generated/services/AIConsumption_704f56Service";
import { useUpdateUseCase } from "@/data/repo";
import type { UseCase, UseCasePatch } from "@/data/types";
import {
  REVIEW_FIELDS,
  SOURCE_TYPES,
  currentValue,
  patchFromReview,
  reviewInput,
  undoFor,
  type Review,
  type ReviewField,
  type ReviewInput,
  type ReviewTurn,
  type SourceType,
} from "@/lib/input-review";
import { cn } from "@/lib/utils";

type Stage = "input" | "review" | "applied";
const VERDICT = {
  relevant: { label: "Relevant evidence", cls: "border-[#B9DCC8] bg-[#E9F5EE] text-[#1E5B3E]" },
  partly: { label: "Partly relevant", cls: "border-[#F0D9A8] bg-[#FFF7E6] text-[#8A5A12]" },
  "not-relevant": { label: "Not evidence for this use case", cls: "border-rose-200 bg-rose-50 text-rose-900" },
} as const;
const CONF = { High: "bg-[#E9F5EE] text-[#1E5B3E]", Medium: "bg-[#EEF4FF] text-[#1F4FA8]", Low: "bg-[#FFF7E6] text-[#8A5A12]" } as const;

export function UseCaseInput({ u, open, onOpenChange, accent, prefill }: { u: UseCase; open: boolean; onOpenChange: (v: boolean) => void; accent: string; prefill?: { text: string; title: string; key: number } }) {
  const update = useUpdateUseCase();
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("input");
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("Meeting notes");
  const [sourceTitle, setSourceTitle] = useState("");
  const [history, setHistory] = useState<ReviewTurn[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [undo, setUndo] = useState<UseCasePatch | null>(null);
  const [chars, setChars] = useState({ in: 0, out: 0, turns: 0 });
  const [slow, setSlow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const live = useRef(u);
  live.current = u;
  const input: ReviewInput = { text, sourceType, sourceTitle: sourceTitle.trim() };

  useEffect(() => {
    if (!prefill) return;
    setStage("input");
    setReview(null);
    setHistory([]);
    setText(prefill.text);
    setSourceType("Other");
    setSourceTitle(prefill.title);
  }, [prefill?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = useMutation({
    mutationFn: async (h: ReviewTurn[]) => reviewInput(live.current, input, h),
    onSuccess: ({ review: r, promptChars, answerChars }) => {
      setChars((c) => ({ in: c.in + promptChars, out: c.out + answerChars, turns: c.turns + 1 }));
      setReview(r);
      setAnswers({});
      setPicked(Object.fromEntries(r.changes.map((c) => [c.field, !c.conflict && c.confidence !== "Low"])));
      setEdited(Object.fromEntries(r.changes.map((c) => [c.field, c.proposed])));
      setStage("review");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The reviewer could not answer. Try again."),
  });

  useEffect(() => {
    if (!ask.isPending) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [ask.isPending]);

  const reset = () => {
    setStage("input");
    setText("");
    setSourceTitle("");
    setHistory([]);
    setReview(null);
    setAnswers({});
    setPicked({});
    setEdited({});
    setUndo(null);
  };

  const logSession = () => {
    if (!chars.turns) return;
    const inTok = Math.round(chars.in / 4),
      outTok = Math.round(chars.out / 4);
    const cost = Math.round((inTok / 1e6) * 0.84 * 100 + (outTok / 1e6) * 15 * 100) / 100;
    const base = {
      Title: `Input review · ${u.title}`.slice(0, 250),
      RunDate: new Date().toISOString(),
      Status: { Value: "Completed" },
      InputTokens: inTok,
      OutputTokens: outTok,
      CostUSD: cost,
      Estimated: true,
      Basis: `${chars.turns} review turns; tokens estimated as characters / 4 of prompts and answers. Estimate, not a meter reading.`,
    };
    void AIConsumption_704f56Service.create({ ...base, Kind: { Value: "Use Case Coach" } } as never).then((r) => {
      if (!r.success) void AIConsumption_704f56Service.create({ ...base, Kind: { Value: "Deep analysis" } } as never);
      void qc.invalidateQueries({ queryKey: ["consumption"] });
    });
    setChars({ in: 0, out: 0, turns: 0 });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 400_000) return toast.error("That file is too large. Paste the relevant part instead.");
    const t = await f.text();
    setText((prev) => (prev ? `${prev}\n\n` : "") + t.slice(0, 12000));
    if (!sourceTitle) setSourceTitle(f.name);
    if (f.name.toLowerCase().endsWith(".eml")) setSourceType("Email");
  };

  const reReview = () => {
    if (!review) return;
    const lines = review.challenges.map((c, i) => (answers[i]?.trim() ? `On "${c.point}": ${answers[i].trim()}` : "")).filter(Boolean);
    if (!lines.length) return toast.message("Answer at least one challenge first.");
    const h: ReviewTurn[] = [...history, { role: "reviewer", text: review.challenges.map((c) => c.question).join(" ") }, { role: "user", text: lines.join("\n") }];
    setHistory(h);
    ask.mutate(h);
  };

  const apply = async () => {
    if (!review) return;
    const approved = review.changes.filter((c) => picked[c.field]).map((c) => ({ field: c.field, value: (edited[c.field] ?? c.proposed).trim() })).filter((a) => a.value);
    const patch = patchFromReview(live.current, review, approved, input);
    const before = undoFor(live.current, patch);
    try {
      await update.mutateAsync({ id: live.current.id, patch });
      await qc.invalidateQueries({ queryKey: ["useCase", String(live.current.id)] });
      setUndo(before);
      setStage("applied");
      toast.success(approved.length ? `Applied ${approved.length} change${approved.length > 1 ? "s" : ""}` : "Input logged as evidence");
    } catch {
      toast.error("The changes could not be saved. Check that you can edit this site.");
    }
  };

  const doUndo = async () => {
    if (!undo) return;
    try {
      await update.mutateAsync({ id: live.current.id, patch: undo });
      await qc.invalidateQueries({ queryKey: ["useCase", String(live.current.id)] });
      setUndo(null);
      toast.success("Changes undone");
    } catch {
      toast.error("Could not undo");
    }
  };

  const nPicked = review ? review.changes.filter((c) => picked[c.field]).length : 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) logSession();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[680px]">
        <SheetHeader className="border-b border-border p-4" style={{ background: `color-mix(in srgb, ${accent} 7%, #FFFDF8)` }}>
          <SheetTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
            <ShieldCheck className="size-5" style={{ color: accent }} aria-hidden /> Add input, challenged and reviewed
          </SheetTitle>
          <SheetDescription className="truncate">{u.title}</SheetDescription>
          <ol className="mt-2 flex items-center gap-2 text-xs" aria-label="Steps">
            {(["input", "review", "applied"] as Stage[]).map((s, i) => (
              <li key={s} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5", stage === s ? "border-transparent text-white" : "border-border bg-white text-muted-foreground")} style={stage === s ? { background: accent } : undefined}>
                <span className="tabular-nums">{i + 1}</span> {s === "input" ? "Give input" : s === "review" ? "Challenge & review" : "Applied"}
              </li>
            ))}
          </ol>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={ask.isPending}>
          {stage === "input" && (
            <>
              <p className="text-sm text-muted-foreground">
                Paste anything about this use case: an email, meeting notes, a customer document extract, a Teams thread or your own remarks. The reviewer challenges it, proposes precise changes, and nothing is saved until you approve.
              </p>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Type of input</span>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                    {SOURCE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Source (optional)</span>
                  <input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} placeholder="e.g. Workshop with Quality, 12 Nov" className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm" />
                </label>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste or type the input here…" aria-label="Input" />
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept=".txt,.md,.csv,.eml,.json,.vtt" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="size-4" aria-hidden /> Add a text file
                </Button>
                <span className="text-[11px] text-muted-foreground">.txt, .md, .csv, .eml, .vtt transcript</span>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{text.length.toLocaleString()} / 12,000</span>
              </div>
            </>
          )}

          {stage !== "input" && review && (
            <>
              <div className={cn("rounded-xl border p-3 text-sm", VERDICT[review.verdict].cls)}>
                <div className="font-medium">{VERDICT[review.verdict].label}</div>
                {review.summary && <p className="mt-1">{review.summary}</p>}
              </div>

              {stage === "review" && review.challenges.length > 0 && (
                <section aria-labelledby="ch-title" className="rounded-xl border border-[#F0D9A8] bg-[#FFFBF2] p-3">
                  <h3 id="ch-title" className="flex items-center gap-1.5 text-sm font-semibold text-[#8A5A12]">
                    <MessageSquareWarning className="size-4" aria-hidden /> The reviewer challenges
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {review.challenges.map((c, i) => (
                      <li key={i} className="rounded-lg bg-white p-3 text-sm">
                        <div className="font-medium">{c.point}</div>
                        {c.why && <p className="mt-0.5 text-xs text-muted-foreground">{c.why}</p>}
                        <p className="mt-2">{c.question}</p>
                        <Textarea value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} rows={2} placeholder="Your answer (optional)" className="mt-2" aria-label={`Answer to: ${c.question}`} />
                      </li>
                    ))}
                  </ul>
                  <Button type="button" size="sm" variant="outline" className="mt-3" onClick={reReview} disabled={ask.isPending}>
                    <RotateCcw className="size-4" aria-hidden /> Answer and review again
                  </Button>
                </section>
              )}

              <section aria-labelledby="chg-title">
                <h3 id="chg-title" className="text-sm font-semibold">
                  {stage === "applied" ? `Applied changes (${nPicked})` : review.changes.length ? `Proposed changes (${review.changes.length})` : "No change proposed"}
                </h3>
                {stage === "review" && review.changes.length > 0 && <p className="text-xs text-muted-foreground">Tick what to apply. You can edit the proposed text. Conflicts and low-confidence proposals are left unticked.</p>}
                <ul className="mt-2 space-y-3">
                  {review.changes.filter((c) => stage === "review" || picked[c.field]).map((c) => {
                    const cur = currentValue(u, c.field as ReviewField);
                    const on = !!picked[c.field];
                    return (
                      <li key={c.field} className={cn("rounded-xl border bg-white p-3 transition-colors", on ? "border-[#1B2A41]/40" : "border-border opacity-80")}>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={on} disabled={stage !== "review"} onChange={(e) => setPicked((p) => ({ ...p, [c.field]: e.target.checked }))} className="size-4" />
                            {REVIEW_FIELDS[c.field]}
                          </label>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px]", CONF[c.confidence])}>{c.confidence} confidence</span>
                          {c.conflict && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-800">
                              <AlertTriangle className="size-3" aria-hidden /> Conflicts with the dossier
                            </span>
                          )}
                        </div>
                        {c.reason && <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>}
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Now</div>
                            <p className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-line rounded-md bg-muted/60 p-2 text-xs">{cur || "Empty"}</p>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Proposed</div>
                            {stage === "review" ? (
                              <Textarea value={edited[c.field] ?? c.proposed} onChange={(e) => setEdited((x) => ({ ...x, [c.field]: e.target.value }))} rows={Math.min(8, Math.max(3, Math.ceil((edited[c.field] ?? c.proposed).length / 60)))} className="mt-0.5 text-xs" aria-label={`Proposed ${REVIEW_FIELDS[c.field]}`} />
                            ) : (
                              <p className="mt-0.5 whitespace-pre-line rounded-md bg-[#E9F5EE] p-2 text-xs">{edited[c.field] ?? c.proposed}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {stage === "applied" && (
                <div className="flex items-center gap-2 rounded-xl border border-[#B9DCC8] bg-[#E9F5EE] p-3 text-sm text-[#1E5B3E]">
                  <Check className="size-4" aria-hidden /> Applied. Readiness, open questions and analysis were updated, and the input is recorded as evidence.
                  {undo && (
                    <Button type="button" size="sm" variant="outline" className="ml-auto h-7" onClick={() => void doUndo()}>
                      <Undo2 className="size-3.5" aria-hidden /> Undo
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {slow ? "Still reviewing. This can take up to a minute…" : "The reviewer is reading and challenging your input…"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          {stage === "input" && (
            <Button type="button" className="ml-auto text-white hover:opacity-90" style={{ background: accent }} disabled={ask.isPending || text.trim().length < 20} onClick={() => ask.mutate([])}>
              <Sparkles className="size-4" aria-hidden /> Challenge and review
            </Button>
          )}
          {stage === "review" && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={ask.isPending}>
                <X className="size-4" aria-hidden /> Discard
              </Button>
              <span className="text-[11px] text-muted-foreground">Nothing is saved until you apply.</span>
              <Button type="button" className="ml-auto text-white hover:opacity-90" style={{ background: accent }} disabled={ask.isPending || update.isPending} onClick={() => void apply()}>
                <Check className="size-4" aria-hidden /> {nPicked ? `Apply ${nPicked} change${nPicked > 1 ? "s" : ""}` : "Log as evidence only"}
              </Button>
            </>
          )}
          {stage === "applied" && (
            <Button type="button" variant="outline" className="ml-auto" onClick={reset}>
              Add more input
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
