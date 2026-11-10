import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTES, routeOf } from "@/lib/routes";
import type { UseCasePatch } from "@/data/types";

/** Lets a person change the platform classification. Saved as "Set in app" so the refresh never overwrites it. */
export function RouteEditor({ current, busy, onSave }: { current?: string; busy?: boolean; onSave: (p: UseCasePatch, msg: string, done?: () => void) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [reason, setReason] = useState("");
  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" className="mt-2 h-7" onClick={() => { setValue(current ?? ""); setReason(""); setOpen(true); }} data-pdf-exclude>
        <Pencil className="size-3.5" aria-hidden /> Change route
      </Button>
    );
  const changed = value && value !== current;
  const save = () => {
    const day = new Date().toISOString().slice(0, 10);
    const was = current ? ` (was ${routeOf(current).short})` : "";
    onSave(
      { classification: value, classificationConfidence: "High", classificationWhy: `Set in app ${day}${was}: ${reason.trim() || "route chosen by the account team."}` },
      `Route set to ${routeOf(value).short}`,
      () => setOpen(false),
    );
  };
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/40 p-3" data-pdf-exclude>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="New route" size="sm" className="w-full bg-white">
          <SelectValue placeholder="Choose a route" />
        </SelectTrigger>
        <SelectContent>
          {ROUTES.map((r) => (
            <SelectItem key={r.key} value={r.key}>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />
                {r.key}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && <p className="text-xs text-muted-foreground">{routeOf(value).definition}</p>}
      <Input aria-label="Why this route" placeholder="Why this route? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 bg-white" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!changed || busy} onClick={save}>
          Save route
        </Button>
      </div>
    </div>
  );
}
