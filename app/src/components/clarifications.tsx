import { useState } from "react";
import { LIVE_READ_ONLY, READ_ONLY } from "@/lib/read-only";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, MessageSquareReply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateUseCase } from "@/data/repo";
import type { UseCase } from "@/data/types";
import { clarifications } from "@/lib/readiness";
import { RADAR } from "@/radar.config";

const CLARIFY = /^[-*•\d.)\s]*CLARIFY\s*:\s*/i;
const today = () => new Date().toISOString().slice(0, 10);

/** Remove one CLARIFY line (matched on its question text) from OpenQuestions. */
function withoutLine(openQuestions: string | undefined, q: string) {
  let removed = false;
  return (openQuestions ?? "")
    .split(/\r?\n/)
    .filter((l) => {
      if (removed || !CLARIFY.test(l)) return true;
      if (l.replace(CLARIFY, "").trim() === q.trim()) {
        removed = true;
        return false;
      }
      return true;
    })
    .join("\n");
}

export interface AnswerHandler {
  (u: UseCase, question: string, answer: string): void;
}

/** One red question with Answer and Not relevant. The answer is saved on the use case and applied to its fields. */
function ClarifyItem({ u, q, onAnswered, showLink }: { u: UseCase; q: string; onAnswered?: AnswerHandler; showLink?: boolean }) {
  const update = useUpdateUseCase();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [done, setDone] = useState<"answered" | "dismissed" | null>(null);

  const save = (kind: "answered" | "dismissed") => {
    const a = answer.trim();
    const line = kind === "answered" ? `${today()} Owner answer: ${q} → ${a}` : `${today()} Owner marked not relevant: ${q}`;
    const evidence = [u.evidence?.trim(), line].filter(Boolean).join("\n");
    update.mutate(
      { id: Number(u.id), patch: { openQuestions: withoutLine(u.openQuestions, q), evidence } },
      {
        onSuccess: () => {
          setDone(kind);
          toast.success(kind === "answered" ? "Answer saved. The next refresh merges it into the dossier." : "Question removed.");
          if (kind === "answered") onAnswered?.(u, q, a);
        },
        onError: () => toast.error("Could not save. Try again."),
      },
    );
  };

  if (done)
    return (
      <li className="flex items-center gap-2 text-sm text-[#0F7B5F]">
        <Check className="size-4 shrink-0" aria-hidden /> {done === "answered" ? "Answered" : "Marked not relevant"}: <span className="truncate text-muted-foreground">{q}</span>
      </li>
    );

  return (
    <li className="text-sm text-[#A4262C]">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        {showLink && (
          <Link to={`/use-case/${u.id}`} className="shrink-0 rounded-md border border-[#C42B1C]/40 bg-white px-2 py-0.5 text-xs font-medium hover:bg-[#FBE3E1]">
            {u.account ?? "Internal"} · #{u.id}
          </Link>
        )}
        <span className="min-w-0 flex-1">
          {showLink && <span className="font-medium">{u.title}: </span>}
          {q}
        </span>
        {!open && !READ_ONLY && (
          <span className="flex shrink-0 gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 border-[#C42B1C]/50 bg-white px-2 text-xs text-[#A4262C] hover:bg-[#FBE3E1]" onClick={() => setOpen(true)}>
              <MessageSquareReply className="size-3.5" aria-hidden /> Answer
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#A4262C] hover:bg-[#FBE3E1]" disabled={update.isPending} onClick={() => save("dismissed")}>
              <X className="size-3.5" aria-hidden /> Not relevant
            </Button>
          </span>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-lg border border-[#C42B1C]/30 bg-white p-2.5">
          <Textarea autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer, in plain words (for example: scope is Peroxides web inquiries only for the MVP)" className="min-h-[70px] text-sm text-foreground" aria-label={`Answer to: ${q}`} />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); setAnswer(""); }}>Cancel</Button>
            <Button type="button" size="sm" className="bg-[#C42B1C] text-white hover:bg-[#A4262C]" disabled={!answer.trim() || update.isPending} onClick={() => save("answered")}>
              {update.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />} Save answer
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Red panel: every unclear or contradictory fact that needs an answer, across the use cases given. */
export function ClarificationsPanel({ useCases, title = "Needs your clarification" }: { useCases: UseCase[]; title?: string }) {
  if (RADAR.customerEdition) return null;
  const items = useCases
    .filter((u) => !u.discarded)
    .flatMap((u) => clarifications(u).map((q) => ({ u, q, key: `${u.id}-${q}` })));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="clarify-title" className="rounded-2xl border-2 border-[#C42B1C] bg-[#FDF3F2] p-5">
      <h2 id="clarify-title" className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl text-[#A4262C]">
        <AlertTriangle className="size-5" aria-hidden="true" /> {LIVE_READ_ONLY ? "Open clarifications" : title}
        <span className="ml-1 rounded-full bg-[#C42B1C] px-2 py-0.5 text-xs font-medium text-white tabular-nums">{items.length}</span>
      </h2>
      <p className="mt-1 text-xs text-[#A4262C]/80">
        {LIVE_READ_ONLY
          ? `Facts that are unclear or contradict each other. ${RADAR.owner} follows them up in the radar.`
          : "Facts that are unclear or contradict each other. Answer here: the question disappears at once and the next refresh merges your answer into the dossier. Open the use case to apply it straight away."}
      </p>
      <ul className="mt-3 max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
        {items.map(({ u, q, key }) => <ClarifyItem key={key} u={u} q={q} showLink />)}
      </ul>
    </section>
  );
}

/** Red box at the top of one use case. onAnswered lets the page apply the answer to the fields at once. */
export function UseCaseClarifications({ u, onAnswered }: { u: UseCase; onAnswered?: AnswerHandler }) {
  if (RADAR.customerEdition) return null;
  const qs = clarifications(u);
  if (qs.length === 0) return null;
  return (
    <div role="region" aria-label="To clarify" className="mt-3 rounded-xl border-2 border-[#C42B1C] bg-[#FDF3F2] px-4 py-3 text-sm text-[#A4262C]">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" aria-hidden="true" /> To clarify ({qs.length})</p>
      <ul className="mt-2 space-y-2.5">
        {qs.map((q) => <ClarifyItem key={q} u={u} q={q} onAnswered={onAnswered} />)}
      </ul>
    </div>
  );
}
