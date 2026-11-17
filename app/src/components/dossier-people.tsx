import { useState } from "react";
import { READ_ONLY } from "@/lib/read-only";
import { Briefcase, Building2, MapPin, Pencil, Plus, Star, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { initials, ownerOf, parsePeople, serializePeople, type Person } from "@/lib/people-steps";
import type { UseCase, UseCasePatch } from "@/data/types";
import { RADAR } from "@/radar.config";
import { cn } from "@/lib/utils";

type Save = (patch: UseCasePatch, msg: string, done?: () => void) => void;

const ORG_TONE = (org: string, account?: string) =>
  /microsoft/i.test(org) ? "#0E7C86" : account && org.toLowerCase().includes(account.toLowerCase()) ? "#1B2A41" : org ? "#7A4B12" : "#6B7280";

/** One person: name in bold, then job title, organisation and location, then the role in the project. */
export function PersonCard({ p, account, accent, big }: { p: Person; account?: string; accent?: string; big?: boolean }) {
  const tone = ORG_TONE(p.org, account);
  return (
    <div className={cn("flex gap-3 rounded-2xl border border-border bg-white p-4", p.owner && "border-2")} style={p.owner ? { borderColor: accent ?? tone } : undefined}>
      <span
        className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", big ? "size-14 text-lg" : "size-11 text-sm")}
        style={{ background: tone }}
        aria-hidden
      >
        {initials(p.name) || <UserRound className="size-5" />}
      </span>
      <div className="min-w-0 space-y-1">
        <p className={cn("font-semibold leading-tight", big ? "text-lg" : "text-[15px]")}>
          {p.name}
          {p.owner && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-medium text-white" style={{ background: accent ?? tone }}>
              <Star className="size-3" aria-hidden /> Business owner
            </span>
          )}
        </p>
        {p.title && <p className="text-sm text-[#3D4757]">{p.title}</p>}
        {(p.org || p.location) && (
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {p.org && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden /> {p.org}
              </span>
            )}
            {p.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {p.location}
              </span>
            )}
          </p>
        )}
        {p.role && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F1EC] px-2 py-1 text-xs font-medium text-[#3D4757]">
            <Briefcase className="size-3.5" aria-hidden /> {p.role}
          </p>
        )}
      </div>
    </div>
  );
}

function PeopleEditor({ open, onOpenChange, people, busy, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; people: Person[]; busy: boolean; onSave: (list: Person[]) => void }) {
  const [draft, setDraft] = useState<Person[]>(people);
  const set = (i: number, patch: Partial<Person>) => setDraft((d) => d.map((p, j) => (j === i ? { ...p, ...patch } : patch.owner ? { ...p, owner: false } : p)));
  const blank: Person = { name: "", title: "", org: "", location: "", role: "", owner: false };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(people.length ? people : [blank]);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Use case participants</DialogTitle>
          <DialogDescription>One card per person. Tick the business owner.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {draft.map((p, i) => (
            <li key={i} className="grid gap-2 rounded-xl border border-border bg-[#FBF9F5] p-3 sm:grid-cols-6">
              {(
                [
                  ["name", "Name", 2],
                  ["title", "Job title", 2],
                  ["org", "Organisation", 2],
                  ["location", "Location", 2],
                  ["role", "Role in the project", 4],
                ] as const
              ).map(([k, label, span]) => (
                <label key={k} className={cn("space-y-1 text-xs text-muted-foreground", span === 4 ? "sm:col-span-4" : "sm:col-span-2")}>
                  {label}
                  <Input value={p[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<Person>)} className="h-8 bg-white text-sm text-foreground" />
                </label>
              ))}
              <div className="flex items-end justify-between gap-2 sm:col-span-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="owner" checked={p.owner} onChange={() => set(i, { owner: true })} /> Business owner
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDraft((d) => [...d, blank])}>
          <Plus className="size-4" aria-hidden /> Add a person
        </Button>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => onSave(draft)}>
            Save participants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function usePeopleEditing(u: UseCase, save: Save) {
  const [open, setOpen] = useState(false);
  const people = parsePeople(u.people);
  const commit = (list: Person[]) => {
    const owner = list.find((p) => p.owner);
    const patch: UseCasePatch = { people: serializePeople(list) };
    if (owner) patch.owner = [owner.name, owner.title].filter(Boolean).join(" — ").slice(0, 250);
    save(patch, "Participants saved", () => setOpen(false));
  };
  return { open, setOpen, people, commit };
}

/** Overview: the business owner as a card, with the team size and a way to edit. */
export function OwnerCard({ u, save, busy, accent, onShowAll }: { u: UseCase; save: Save; busy: boolean; accent: string; onShowAll: () => void }) {
  const ed = usePeopleEditing(u, save);
  const owner = ownerOf(ed.people, u.owner);
  const others = ed.people.filter((p) => p !== owner && !p.owner).length;
  return (
    <section aria-labelledby="owner-title" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 id="owner-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Business owner
        </h2>
        {!RADAR.customerEdition && !READ_ONLY && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => ed.setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
        )}
      </div>
      {owner ? <PersonCard p={{ ...owner, owner: true }} account={u.account} accent={accent} big /> : <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">No business owner named yet.</p>}
      {others > 0 && (
        <button type="button" onClick={onShowAll} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0E7C86] hover:underline">
          <Users className="size-4" aria-hidden /> {others} more participant{others > 1 ? "s" : ""}
        </button>
      )}
      <PeopleEditor open={ed.open} onOpenChange={ed.setOpen} people={ed.people} busy={busy} onSave={ed.commit} />
    </section>
  );
}

/** Participants tab: every person, grouped by organisation, same card format. */
export function ParticipantsPanel({ u, save, busy, accent }: { u: UseCase; save: Save; busy: boolean; accent: string }) {
  const ed = usePeopleEditing(u, save);
  const list = ed.people.length ? ed.people : (() => {
    const o = ownerOf([], u.owner);
    return o ? [o] : [];
  })();
  const groups = new Map<string, Person[]>();
  for (const p of list) {
    const g = p.org || "Other";
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const order = [...groups.keys()].sort((a, b) => {
    const rank = (g: string) => (u.account && g.toLowerCase().includes(u.account.toLowerCase()) ? 0 : /microsoft/i.test(g) ? 2 : g === "Other" ? 3 : 1);
    return rank(a) - rank(b);
  });
  return (
    <section aria-labelledby="ppl-title" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 id="ppl-title" className="font-[family-name:var(--font-serif)] text-xl">
          Use case participants <span className="text-sm tabular-nums text-muted-foreground">{list.length}</span>
        </h2>
        {!RADAR.customerEdition && !READ_ONLY && (
          <Button variant="outline" size="sm" onClick={() => ed.setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> Edit participants
          </Button>
        )}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No participants named yet.</p>}
      {order.map((g) => (
        <div key={g}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...groups.get(g)!].sort((a, b) => Number(b.owner) - Number(a.owner)).map((p, i) => (
              <PersonCard key={`${p.name}-${i}`} p={p} account={u.account} accent={accent} />
            ))}
          </div>
        </div>
      ))}
      <PeopleEditor open={ed.open} onOpenChange={ed.setOpen} people={ed.people} busy={busy} onSave={ed.commit} />
    </section>
  );
}
