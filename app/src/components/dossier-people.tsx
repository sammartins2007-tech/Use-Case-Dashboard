import { useState } from "react";
import { READ_ONLY } from "@/lib/read-only";
import { Briefcase, Building2, MapPin, Pencil, Plus, Star, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTRIBUTIONS, contributionOf, initials, ownerOf, parsePeople, serializePeople, type Contribution, type Person } from "@/lib/people-steps";
import type { UseCase, UseCasePatch } from "@/data/types";
import { RADAR } from "@/radar.config";
import { cn } from "@/lib/utils";

type Save = (patch: UseCasePatch, msg: string, done?: () => void) => void;

const ORG_TONE = (org: string, account?: string) =>
  /microsoft/i.test(org) ? "#0F6CBD" : account && org.toLowerCase().includes(account.toLowerCase()) ? "#0D2847" : org ? "#7A4B12" : "#6B7280";

export const CONTRIB_META: Record<Contribution, { label: string; plural: string; tone: string; hint: string }> = {
  Business: { label: "Business contributor", plural: "Business contributors", tone: "bg-amber-50 text-amber-900 ring-amber-200", hint: "Knows the process, the pain and the expected outcome" },
  Technical: { label: "Technical contributor", plural: "Technical contributors", tone: "bg-sky-50 text-sky-900 ring-sky-200", hint: "Systems, data, integration or the build (customer IT or partner)" },
  Microsoft: { label: "Microsoft contributor", plural: "Microsoft contributors", tone: "bg-teal-50 text-teal-900 ring-teal-200", hint: "Microsoft account team or specialist" },
};

/** One person: name in bold, then job title, organisation and location, then the role in the project. */
export function PersonCard({ p, account, accent, big }: { p: Person; account?: string; accent?: string; big?: boolean }) {
  const tone = ORG_TONE(p.org, account);
  const c = CONTRIB_META[contributionOf(p, account)];
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
              <Star className="size-3" aria-hidden /> Owner
            </span>
          )}
        </p>
        {!p.owner && (
          <p className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", c.tone)} title={c.hint}>
            {c.label}
          </p>
        )}
        {p.title && <p className="text-sm text-[#34465E]">{p.title}</p>}
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
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F1EC] px-2 py-1 text-xs font-medium text-[#34465E]">
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
  const blank: Person = { name: "", title: "", org: "", location: "", role: "", owner: false, contribution: "" };
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
          <DialogDescription>One card per person. Tick the owner; every other person is a business, technical or Microsoft contributor.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {draft.map((p, i) => (
            <li key={i} className="grid gap-2 rounded-xl border border-border bg-[#F7FBFE] p-3 sm:grid-cols-6">
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
              <div className="flex flex-wrap items-end justify-between gap-3 sm:col-span-6">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="owner" checked={p.owner} onChange={() => set(i, { owner: true })} /> Owner
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Contributor type
                    <select
                      value={p.contribution || contributionOf(p)}
                      onChange={(e) => set(i, { contribution: e.target.value as Contribution })}
                      className="h-8 rounded-md border border-border bg-white px-2 text-sm text-foreground"
                    >
                      {CONTRIBUTIONS.map((x) => (
                        <option key={x} value={x}>
                          {CONTRIB_META[x].label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
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
  const commit = (raw: Person[]) => {
    const list = raw.map((p) => ({ ...p, contribution: p.contribution || contributionOf(p, u.account) }));
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
          Owner
        </h2>
        {!RADAR.customerEdition && !READ_ONLY && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => ed.setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
        )}
      </div>
      {owner ? <PersonCard p={{ ...owner, owner: true }} account={u.account} accent={accent} big /> : <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">No business owner named yet.</p>}
      {others > 0 && (
        <button type="button" onClick={onShowAll} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F6CBD] hover:underline">
          <Users className="size-4" aria-hidden /> {others} contributor{others > 1 ? "s" : ""}
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
  const owner = list.find((p) => p.owner);
  const groups: { key: string; label: string; hint?: string; people: Person[] }[] = [
    { key: "owner", label: "Owner", people: owner ? [owner] : [] },
    ...CONTRIBUTIONS.map((c) => ({
      key: c,
      label: CONTRIB_META[c].plural,
      hint: CONTRIB_META[c].hint,
      people: list.filter((p) => p !== owner && contributionOf(p, u.account) === c),
    })),
  ].filter((g) => g.people.length > 0);
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
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label} <span className="tabular-nums">{g.people.length}</span>
            {g.hint && <span className="ml-2 font-normal normal-case tracking-normal">· {g.hint}</span>}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.people.map((p, i) => (
              <PersonCard key={`${p.name}-${i}`} p={p} account={u.account} accent={accent} />
            ))}
          </div>
        </div>
      ))}
      <PeopleEditor open={ed.open} onOpenChange={ed.setOpen} people={ed.people} busy={busy} onSave={ed.commit} />
    </section>
  );
}
