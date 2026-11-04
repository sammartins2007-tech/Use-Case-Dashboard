import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPI_UNITS, parseKpis, savingUsd, serializeKpis, toUsd, usd0, type Kpi, type KpiUnit } from "@/lib/kpi";
import { cn } from "@/lib/utils";

const MONEY_UNITS: KpiUnit[] = ["h/yr", "USD/yr", "EUR/yr"];

export function KpiTable({ value, rate, busy, onSave }: { value?: string; rate: number; busy: boolean; onSave: (v: string, done: () => void) => void }) {
  const list = parseKpis(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Kpi[]>(list);

  if (editing) {
    const set = (i: number, patch: Partial<Kpi>) => setDraft((d) => d.map((k, j) => (j === i ? { ...k, ...patch } : patch.primary ? { ...k, primary: false } : k)));
    const n = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Number(v));
    return (
      <form
        className="space-y-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(serializeKpis(draft.filter((k) => k.name.trim())), () => setEditing(false));
        }}
      >
        {draft.map((k, i) => (
          <fieldset key={i} className="grid gap-2 rounded-xl border border-border bg-[#FBF9F5] p-3 sm:grid-cols-6">
            <legend className="sr-only">KPI {i + 1}</legend>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor={`k-name-${i}`} className="text-xs text-muted-foreground">KPI</Label>
              <Input id={`k-name-${i}`} value={k.name} onChange={(e) => set(i, { name: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`k-unit-${i}`} className="text-xs text-muted-foreground">Unit</Label>
              <select id={`k-unit-${i}`} value={k.unit} onChange={(e) => set(i, { unit: e.target.value as KpiUnit })} className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm">
                {KPI_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <label className="flex h-8 items-center gap-2 text-xs">
                <input type="radio" name="primary" checked={k.primary} onChange={() => set(i, { primary: true })} />
                Counts as the saving
              </label>
              <Button type="button" variant="ghost" size="sm" className="ml-auto" aria-label={`Remove KPI ${i + 1}`} onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`k-cur-${i}`} className="text-xs text-muted-foreground">Current value (text)</Label>
              <Input id={`k-cur-${i}`} value={k.current} onChange={(e) => set(i, { current: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`k-curn-${i}`} className="text-xs text-muted-foreground">Current (number)</Label>
              <Input id={`k-curn-${i}`} type="number" value={k.currentNum ?? ""} onChange={(e) => set(i, { currentNum: n(e.target.value) })} className="h-8 bg-white tabular-nums" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`k-exp-${i}`} className="text-xs text-muted-foreground">Expected outcome (text)</Label>
              <Input id={`k-exp-${i}`} value={k.expected} onChange={(e) => set(i, { expected: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`k-expn-${i}`} className="text-xs text-muted-foreground">Expected (number)</Label>
              <Input id={`k-expn-${i}`} type="number" value={k.expectedNum ?? ""} onChange={(e) => set(i, { expectedNum: n(e.target.value), savingNum: undefined })} className="h-8 bg-white tabular-nums" />
            </div>
            <div className="space-y-1 sm:col-span-6">
              <Label htmlFor={`k-basis-${i}`} className="text-xs text-muted-foreground">Basis</Label>
              <Input id={`k-basis-${i}`} value={k.basis} onChange={(e) => set(i, { basis: e.target.value })} className="h-8 bg-white" />
            </div>
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft((d) => [...d, { name: "", current: "Not stated", expected: "Not stated", unit: "h/yr", primary: d.length === 0, basis: "" }])}>
            <Plus className="size-4" aria-hidden="true" /> Add KPI
          </Button>
          <Button type="submit" size="sm" disabled={busy}>Save KPIs</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">KPIs: current value and expected outcome</p>
          <p className="text-[11px] text-muted-foreground">Hours are valued at the customer's average cost of {usd0.format(rate)} per hour.</p>
        </div>
        <Button variant="ghost" size="sm" data-pdf-exclude onClick={() => { setDraft(list); setEditing(true); }} aria-label={list.length ? "Edit KPIs" : "Add KPIs"}>
          <Pencil className="size-3.5" aria-hidden="true" />
          {list.length ? "Edit" : "Add"}
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="mt-2 text-sm italic text-amber-800">Missing · Measurable targets with today's baseline</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">KPIs with current value, expected outcome and value in dollars</caption>
            <thead>
              <tr className="border-b border-border bg-[#FBF9F5] text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">KPI</th>
                <th scope="col" className="px-3 py-2 font-medium">Current value</th>
                <th scope="col" className="px-3 py-2 font-medium">Expected outcome</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Current $ / yr</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Saving $ / yr</th>
              </tr>
            </thead>
            <tbody>
              {list.map((k, i) => {
                const cur = MONEY_UNITS.includes(k.unit) ? toUsd(k.unit, k.currentNum, rate) : undefined;
                const sav = savingUsd(k, rate);
                return (
                  <tr key={i} className={cn("border-b border-border align-top last:border-b-0", k.primary && "bg-[#E9F5EE]/60")}>
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">
                      {k.name}
                      {k.primary && <span className="ml-1.5 rounded-full bg-[#2F9461] px-1.5 py-0.5 text-[10px] font-medium text-white">counted</span>}
                      {k.basis && <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{k.basis}</span>}
                    </th>
                    <td className="px-3 py-2.5">{k.current || "Not stated"}</td>
                    <td className="px-3 py-2.5">{k.expected || "Not stated"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{typeof cur === "number" ? usd0.format(cur) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{typeof sav === "number" ? usd0.format(sav) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
