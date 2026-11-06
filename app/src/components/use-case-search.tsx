import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppShortcut } from "@/components/shortcut-provider";
import { useUseCases } from "@/data/repo";
import type { UseCase } from "@/data/types";
import { brandOf } from "@/lib/brands";
import { routeOf } from "@/lib/routes";
import { hasSolution } from "@/lib/solutions";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function refOf(u: UseCase) {
  return u.internalRef?.trim() || /\[([A-Z]{2,}[-\w]*\d+)\]/.exec(u.title)?.[1] || "";
}

/** Score: reference match beats title match; every word must be found in reference, title, account or department. */
function score(u: UseCase, q: string): number {
  const ref = norm(refOf(u));
  const title = norm(u.title);
  const id = String(u.id);
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const hay = `${ref} ${title} ${norm(u.account ?? "")} ${norm(u.department ?? "")} #${id}`;
  if (!words.every((w) => hay.includes(w.replace(/^#/, "#")) || hay.includes(w))) return 0;
  const full = norm(q).trim();
  let s = 1;
  if (ref && ref === full) s += 100;
  else if (ref && ref.includes(full)) s += 60;
  if (full === id || full === `#${id}`) s += 90;
  if (title.startsWith(full)) s += 40;
  else if (title.includes(full)) s += 25;
  s += words.filter((w) => title.includes(w)).length * 5;
  if (u.discarded) s -= 30;
  return s;
}

export function UseCaseSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const uq = useUseCases();
  useAppShortcut(["mod+k"], () => setOpen(true), { description: "Search use cases", preventDefault: true });
  const rows = uq.data?.rows ?? [];
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return rows
      .map((u) => ({ u, s: score(u, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30);
  }, [rows, q]);
  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#D9D2C4] bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-[#B9B1A3]"
        aria-label="Search use cases by title or reference"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden text-left 2xl:inline">Search use cases</span>
        <kbd className="rounded border border-border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search use cases</DialogTitle>
          <DialogDescription>Search by a word in the title or by a reference number</DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <Command shouldFilter={false} className="[&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5">
        <CommandInput value={q} onValueChange={setQ} placeholder="Search by a word in the title or a reference number…" />
        <CommandList className="max-h-[60vh]">
          {q.trim() && <CommandEmpty>{uq.isLoading ? "Loading use cases…" : "No use case matches."}</CommandEmpty>}
          {!q.trim() && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Type a word from the title or a reference number.</p>}
          {results.length > 0 && (
            <CommandGroup heading={`${results.length}${results.length === 30 ? "+" : ""} use cases`}>
              {results.map(({ u }) => {
                const b = brandOf(u.account);
                const r = routeOf(u.classification);
                const ref = refOf(u);
                return (
                  <CommandItem key={u.id} value={`${u.id}`} onSelect={() => go(`/use-case/${u.id}`)} className={cn("flex items-center gap-3", u.discarded && "opacity-60")}>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: b.primary }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{u.account ?? "Internal"}</span>
                        {ref && <span className="rounded border border-border px-1 font-mono text-[10px]">{ref}</span>}
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ background: r.color }} />
                          {r.short}
                        </span>
                        {u.wave && u.wave !== "Unplanned" && <span>{u.wave}</span>}
                        {u.discarded && <span>discarded</span>}
                      </span>
                    </span>
                    {hasSolution(u.id) && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          go(`/use-case/${u.id}/solution`);
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
                      >
                        <Sparkles className="size-3" aria-hidden="true" /> Solution
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
