import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseCase, UseCasePatch } from "@/data/types";
import { COST_KINDS, defaultKind, kindDef, lineCost, newLine, parseLines, serializeLines, type CostKind, type CostLine } from "@/lib/finops";
import { caseSavingUsd, usd0 } from "@/lib/kpi";
import { cn } from "@/lib/utils";

export function FinOpsSizing({ u, rate, busy, onSave }: { u: UseCase; rate: number; busy: boolean; onSave: (patch: UseCasePatch, msg: string) => void }) {
  const [lines, setLines] = useState<CostLine[]>(() => parseLines(u.finOpsBasis) ?? [newLine(defaultKind(u.classification))]);
  const [addKind, setAddKind] = useState<CostKind>("tokens");
  const annualSaving = caseSavingUsd(u.kpiValues, rate);
  const value = typeof annualSaving === "number" ? annualSaving / 12 : 0;
  const cost = lines.reduce((s, l) => s + lineCost(l), 0);
  const net = value - cost;
  const set = (i: number, key: string, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [key]: Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0 } : l)));

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium">FinOps sizing · all AI consumption</h3>
      <p className="text-xs text-muted-foreground">Add one line per AI cost the use case consumes. Prices are illustrative list prices; replace them with the customer's agreement.</p>
      <ul className="mt-3 space-y-3">
        {lines.map((l, i) => {
          const def = kindDef(l.kind);
          return (
            <li key={i} className="rounded-lg bg-[#FBF9F5] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{def.label}</p>
                <p className="text-sm tabular-nums">
                  {usd0.format(lineCost(l))} <span className="text-xs text-muted-foreground">/ month</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-1 h-7" data-pdf-exclude aria-label={`Remove ${def.label}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {def.fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`fin-${i}-${f.key}`} className="text-[11px] text-muted-foreground">
                      {f.label}
                    </Label>
                    <div className="relative">
                      {f.prefix && <span className="pointer-events-none absolute left-2 top-1.5 text-xs text-muted-foreground">{f.prefix}</span>}
                      <Input
                        id={`fin-${i}-${f.key}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={f.step}
                        value={String((l as unknown as Record<string, number | undefined>)[f.key] ?? 0)}
                        onChange={(e) => set(i, f.key, e.target.value)}
                        className={cn("h-8 bg-white tabular-nums", f.prefix && "pl-5")}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {def.formula} · {def.covers}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2" data-pdf-exclude>
        <div className="space-y-1">
          <Label htmlFor="add-kind" className="text-[11px] text-muted-foreground">
            Add an AI cost
          </Label>
          <select id="add-kind" value={addKind} onChange={(e) => setAddKind(e.target.value as CostKind)} className="h-8 rounded-md border border-input bg-white px-2 text-sm">
            {COST_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine(addKind)])}>
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">AI run cost / month</dt>
          <dd className="font-[family-name:var(--font-serif)] text-xl tabular-nums">{usd0.format(cost)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Value / month</dt>
          <dd className="font-[family-name:var(--font-serif)] text-xl tabular-nums">{usd0.format(value)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Net / month</dt>
          <dd className={cn("font-[family-name:var(--font-serif)] text-xl tabular-nums", net < 0 && "text-rose-700")}>{usd0.format(net)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">
        Value = the counted KPI saving ÷ 12{typeof annualSaving === "number" ? "" : " (no KPI saving yet: add one in Target outcome)"}. Hours at {usd0.format(rate)} per hour.
      </p>
      <Button
        size="sm"
        className="mt-3"
        data-pdf-exclude
        disabled={busy}
        onClick={() => onSave({ monthlyCost: Math.round(cost), monthlyValue: Math.round(value), finOpsBasis: serializeLines(lines) }, "FinOps sizing saved")}
      >
        Save sizing
      </Button>
    </div>
  );
}
