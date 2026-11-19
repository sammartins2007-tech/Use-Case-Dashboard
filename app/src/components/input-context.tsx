import { ExternalLink, FileText, Mail, MessageSquare, Radio, Sparkles, Users, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { externalUrl } from "@/lib/safe-url";
import { parseSources, type Signal, type SourceRef } from "@/data/types";
import { cn } from "@/lib/utils";

/** One input to a use case (a signal, a data source or a line of the evidence trail) shown with its full context. */
export interface InputRef {
  title: string;
  date?: string;
  type?: string;
  sender?: string;
  kind?: string;
  insight?: string;
  sourceRef?: string;
  url?: string;
}

export interface EvidenceLine {
  date?: string;
  type?: string;
  source?: string;
  text: string;
  impact?: string;
  facts?: string;
  counts?: string;
}

const KIND_MEANING: Record<string, string> = {
  "New use case": "This input is where the use case was first described.",
  Enrichment: "This input adds or refines facts on the use case.",
  Risk: "This input flags a risk to the use case.",
  "Next step": "This input sets a concrete step that moves the use case forward.",
  FinOps: "This input carries volumes, consumption or cost figures.",
  Feature: "A new Microsoft capability that unlocks or changes this use case.",
};

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const quoted = (s?: string) => /['‘’"“”]([^'‘’"“”]{3,})['‘’"“”]/.exec(s ?? "")?.[1];
const days = (a?: string, b?: string) => (a && b ? Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 864e5 : NaN);

/** Evidence lines "<YYYY-MM-DD> <Type> '<source>': <n> statements, <k> used — <facts> [Impact: <fields changed>]". */
export function parseEvidence(s?: string): EvidenceLine[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text) => {
      const m = /^(\d{4}-\d{2}-\d{2})\s+(\S+)?\s*(.*)$/.exec(text);
      const rest = m ? m[3] : text;
      const [head, ...tail] = rest.split(/\s+[—–]\s+/);
      let facts = tail.join(" — ") || undefined;
      let impact: string | undefined;
      const im = /\bImpact:\s*(.+)$/i.exec(facts ?? rest);
      if (im) {
        impact = im[1].trim();
        if (facts) facts = facts.slice(0, facts.toLowerCase().lastIndexOf("impact:")).replace(/[\s.;—–-]+$/, "") || undefined;
      }
      const counts = /(\d+\s+statements?[^—–]*)/i.exec(head)?.[1]?.replace(/[\s:,]+$/, "");
      return { date: m?.[1], type: m?.[2], source: quoted(head) ?? head.replace(/:.*$/, "").trim(), text, facts: facts ?? (tail.length ? undefined : head.includes(":") ? head.slice(head.indexOf(":") + 1).trim() : undefined), impact, counts };
    });
}

function sameSource(a: { title?: string; source?: string; date?: string }, b: { title?: string; source?: string; date?: string }) {
  const x = norm(quoted(a.source) ?? a.source ?? a.title);
  const y = norm(quoted(b.source) ?? b.source ?? b.title);
  if (!x || !y) return false;
  const near = Number.isNaN(days(a.date, b.date)) || days(a.date, b.date) <= 3;
  const short = x.length < y.length ? x : y;
  return near && short.length >= 6 && (x.includes(y) || y.includes(x));
}

const ICON: Record<string, typeof Mail> = { email: Mail, teams: MessageSquare, meeting: Video, document: FileText, web: ExternalLink };

export function InputContextDialog({
  input,
  onOpenChange,
  evidence,
  sources,
  signals,
}: {
  input: InputRef | null;
  onOpenChange: (open: boolean) => void;
  evidence?: string;
  sources?: string;
  signals: Signal[];
}) {
  const ev = parseEvidence(evidence);
  const src = parseSources(sources);
  const probe = input ? { title: input.title, source: input.sourceRef ?? input.title, date: input.date } : null;
  const lines = probe ? ev.filter((e) => sameSource(probe, { source: e.source, date: e.date }) || (!!input?.date && e.date === input.date && norm(e.type) === norm(input.type))) : [];
  const links: SourceRef[] = probe ? src.filter((s) => sameSource(probe, { title: s.title, date: s.date })) : [];
  const sigs = probe ? signals.filter((s) => sameSource(probe, { source: s.sourceRef ?? s.title, date: s.signalDate })) : [];
  const url = externalUrl(input?.url) ?? links.map((l) => externalUrl(l.url)).find(Boolean);
  const Icon = ICON[norm(input?.type).split(" ")[0]] ?? Radio;
  const impacts = lines.map((l) => l.impact).filter(Boolean) as string[];
  // One statement per fact: when two summaries open with the same words, keep the fuller one.
  const factKey = (f: string) => norm(f).split(" ").slice(0, 5).join(" ");
  const facts = [...([...sigs.map((s) => s.insight), input?.insight, ...lines.map((l) => l.facts)].filter(Boolean) as string[])
    .reduce((m, f) => (m.has(factKey(f)) && m.get(factKey(f))!.length >= f.length ? m : m.set(factKey(f), f)), new Map<string, string>())
    .values()];
  const people = [...new Set([input?.sender, ...sigs.map((s) => s.sender)].filter(Boolean) as string[])];
  const kinds = [...new Set([input?.kind, ...sigs.map((s) => s.kind)].filter(Boolean) as string[])];

  return (
    <Dialog open={!!input} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {input && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 pr-6 text-lg leading-snug">
                <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {input.title}
              </DialogTitle>
              <DialogDescription>
                {[input.type, input.date && new Date(input.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), people.join(", ")].filter(Boolean).join(" · ")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What it says</h3>
                {facts.length ? (
                  <ul className="space-y-1.5">
                    {facts.map((f, i) => (
                      <li key={i} className="rounded-lg bg-[#F7F5F0] px-3 py-2">{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No summary was recorded for this input.</p>
                )}
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="size-3.5" aria-hidden /> Impact on this use case
                </h3>
                {kinds.map((k) => (
                  <p key={k} className="mb-1">
                    <span className="mr-1.5 rounded-full bg-[#EEF2F6] px-2 py-0.5 text-[11px] font-medium">{k}</span>
                    {KIND_MEANING[k] ?? ""}
                  </p>
                ))}
                {impacts.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {impacts.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={cn("rounded-lg border border-dashed border-border px-3 py-2 text-muted-foreground", kinds.length && "mt-1")}>
                    {facts.length
                      ? "The fields this input changed were not recorded separately (inputs before 18 Nov 2026); the facts above were merged into the use case."
                      : "The fields this input changed were not recorded."}
                  </p>
                )}
                {lines.some((l) => l.counts) && <p className="mt-1 text-xs text-muted-foreground">Analysed: {lines.map((l) => l.counts).filter(Boolean).join("; ")}</p>}
              </section>

              {(people.length > 0 || url) && (
                <section className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  {people.length > 0 && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden /> {people.join(", ")}
                    </p>
                  )}
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Open the source <ExternalLink className="size-3.5" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
