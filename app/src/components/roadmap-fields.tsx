import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerSettings } from "@/data/repo";
import { CUSTOMER_DECISIONS, UNPLANNED, type CustomerDecision, type UseCase, type UseCasePatch } from "@/data/types";
import { placementOf, wavesFor } from "@/lib/roadmap";
import { LIVE_READ_ONLY } from "@/lib/read-only";

const today = () => new Date().toISOString().slice(0, 10);

/** Wave, customer decision and target date, editable from the use case page's ownership box. */
export function RoadmapFields({ u, busy, onSave }: { u: UseCase; busy: boolean; onSave: (patch: UseCasePatch, msg: string) => void }) {
  const q = useCustomerSettings();
  const waves = wavesFor(q.data?.find((c) => c.account === (u.account ?? "Internal"))?.waves ?? [], [u]);
  const place = placementOf(u);
  return (
    <div className="mt-3 rounded-xl border border-[#EADFC8] bg-white p-3" data-pdf-exclude>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium">Roadmap</p>
        <Link to={`/customer/${encodeURIComponent(u.account ?? "Internal")}/roadmap`} className="text-xs text-[#0E7C86] hover:underline">
          Open roadmap
        </Link>
      </div>
      {LIVE_READ_ONLY ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {[
            ["Wave", u.wave && waves.some((w) => w.id === u.wave) ? `${u.wave} · ${waves.find((w) => w.id === u.wave)?.label ?? ""}` : "Candidate (not in a wave)"],
            ["Customer decision", u.customerDecision ?? "Not yet decided"],
            ["Start", u.startDate ?? "Not set"],
            ["Target", u.targetDate ?? "Not set"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="uc-wave" className="text-xs text-muted-foreground">
            Wave
          </Label>
          <select
            id="uc-wave"
            disabled={busy}
            value={u.wave && waves.some((w) => w.id === u.wave) ? u.wave : UNPLANNED}
            onChange={(e) =>
              onSave(
                e.target.value === UNPLANNED ? { wave: UNPLANNED, waveSource: "" } : { wave: e.target.value, waveSource: `Set in app ${today()}` },
                `Moved to ${e.target.value === UNPLANNED ? "candidates" : e.target.value}`,
              )
            }
            className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm"
          >
            <option value={UNPLANNED}>Candidate (not in a wave)</option>
            {waves.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id} · {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="uc-dec" className="text-xs text-muted-foreground">
            Customer decision
          </Label>
          <select
            id="uc-dec"
            disabled={busy}
            value={u.customerDecision ?? "Not yet decided"}
            onChange={(e) => onSave({ customerDecision: e.target.value as CustomerDecision }, `Customer decision set to ${e.target.value}`)}
            className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm"
          >
            {CUSTOMER_DECISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="uc-start" className="text-xs text-muted-foreground">
            Start
          </Label>
          <Input
            id="uc-start"
            type="date"
            disabled={busy}
            defaultValue={u.startDate ?? ""}
            onBlur={(e) => e.target.value !== (u.startDate ?? "") && onSave({ startDate: e.target.value || null }, "Start date saved")}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uc-target" className="text-xs text-muted-foreground">
            Target
          </Label>
          <Input
            id="uc-target"
            type="date"
            disabled={busy}
            defaultValue={u.targetDate ?? ""}
            onBlur={(e) => e.target.value !== (u.targetDate ?? "") && onSave({ targetDate: e.target.value || null }, "Target date saved")}
            className="h-8"
          />
        </div>
      </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {place === "customer" ? `Placed by the customer (${u.waveSource})` : place === "proposal" ? `Proposal (${u.waveSource})` : "Not in a wave yet"}
        {u.customerStatus && u.customerStatus !== "Not set" ? ` · customer status: ${u.customerStatus}` : ""}
        {typeof u.percentDone === "number" ? ` · ${u.percentDone}% done` : ""}
      </p>
    </div>
  );
}
