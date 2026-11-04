import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHourlyRate, useSaveHourlyRate } from "@/data/repo";
import type { UseCase } from "@/data/types";
import { caseSavingUsd, usd0, usdCompact } from "@/lib/kpi";
import { isValidated, stripRef } from "@/lib/validated";

export function CustomerSavings({ name, useCases }: { name: string; useCases: UseCase[] }) {
  const { rate, setting } = useHourlyRate(name);
  const saveRate = useSaveHourlyRate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(rate));

  const validated = useCases.filter(isValidated);
  const valued = validated
    .map((u) => ({ u, s: caseSavingUsd(u.kpiValues, rate) }))
    .filter((x): x is { u: UseCase; s: number } => typeof x.s === "number" && x.s > 0);
  const total = valued.reduce((a, x) => a + x.s, 0);
  const top = [...valued].sort((a, b) => b.s - a.s).slice(0, 3);
  const url = `/customer/${encodeURIComponent(name)}/portfolio?validated=1`;

  return (
    <section aria-labelledby="sav-title" className="rounded-2xl border border-[#B9DCC8] bg-[#F1F8F3] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="sav-title" className="text-sm text-[#1E5B3E]">
            Estimated saving
          </h2>
          <p className="font-[family-name:var(--font-serif)] text-4xl tabular-nums text-[#1B2A41]">
            {usdCompact.format(total)}
            <span className="ml-1 text-base text-muted-foreground">/ year</span>
          </p>
          <p className="text-sm text-[#3D4757]">
            from <span className="font-medium">{valued.length}</span> of {validated.length} validated use cases with a quantified KPI
          </p>
          <Link to={url} className="mt-2 inline-flex text-sm font-medium text-[#0E7C86] hover:underline">
            Open the {validated.length} validated use cases →
          </Link>
        </div>
        <div className="min-w-[220px] rounded-xl border border-[#D9E9DF] bg-white p-3">
          {editing ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(draft);
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("Enter a positive hourly cost");
                  return;
                }
                saveRate.mutate(
                  { id: setting?.id, account: name, rate: n },
                  {
                    onSuccess: () => {
                      toast.success(`Hourly cost set to ${usd0.format(n)}`);
                      setEditing(false);
                    },
                    onError: () => toast.error("The hourly cost could not be saved"),
                  },
                );
              }}
            >
              <Label htmlFor="rate" className="text-xs text-muted-foreground">
                Average cost per hour (USD)
              </Label>
              <Input id="rate" type="number" min={1} step={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 tabular-nums" autoFocus />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saveRate.isPending}>
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Average cost per hour</p>
              <p className="flex items-center justify-between gap-2">
                <span className="font-[family-name:var(--font-serif)] text-2xl tabular-nums">{usd0.format(rate)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Edit average cost per hour"
                  onClick={() => {
                    setDraft(String(rate));
                    setEditing(true);
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> Edit
                </Button>
              </p>
              <p className="text-[11px] text-muted-foreground">Values every hour saved for {name}.</p>
            </>
          )}
        </div>
      </div>
      {top.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Largest savings">
          {top.map(({ u, s }) => (
            <li key={u.id}>
              <Link to={`/use-case/${u.id}`} className="block rounded-xl border border-[#D9E9DF] bg-white px-3 py-2 text-sm hover:shadow-sm">
                <span className="line-clamp-1 font-medium">{stripRef(u.title)}</span>
                <span className="tabular-nums text-[#1E5B3E]">{usd0.format(s)} / year</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Validated = stage Qualified, Shaping, Pilot or Scale, or a Fund/Test decision. Each use case counts one KPI (its counted saving), so benefits are
        not double counted. Euro figures at 1 € = $1.08.
      </p>
    </section>
  );
}
