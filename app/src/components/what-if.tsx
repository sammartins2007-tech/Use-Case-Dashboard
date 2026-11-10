import { Link } from "react-router-dom";
import { ArrowRight, Calculator, CheckCircle2, Coins, Compass, FlaskConical, Layers, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { LicenceCalc, SubTabs, type KitPanel } from "@/components/blueprint";
import { cn } from "@/lib/utils";
import { useDocsOfKind } from "@/lib/content";

type Fit = { need: string; theirs: string; microsoft: string; fit: string };
export type WhatIfCase = { account?: string; evidence?: string; estate: string; status: string; choice: string; keep: string; microsoft: string; verdict: string; tone: "replace" | "complement" | "keep"; fit: Fit[]; steps: string[]; watch?: string; aiUnlock?: { what: string; status: string }[] };
export type WhatIfEstate = { account?: string; name: string; role: string; microsoft: string; accent: string; accent2: string; members: string[]; dependants: string[]; licence?: any; saving: string; aiUnlock: { what: string; status: string }[] };
type Data = { estates: Record<string, WhatIfEstate>; cases: Record<string, WhatIfCase> };

/** What-if content lives in SharePoint: one document per estate (the customer's chosen platform) and per use case. */
export function useWhatIfData(): Data {
  const estates = useDocsOfKind<WhatIfEstate>("whatif-estate");
  const cases = useDocsOfKind<WhatIfCase>("whatif-case");
  return { estates: estates.data ?? {}, cases: cases.data ?? {} };
}

export const shortName = (n: string) => n.split(" (")[0];

export function whatIfFor(id: number | string | undefined, data: Data) {
  const c = id == null ? undefined : data.cases[String(id)];
  if (!c) return undefined;
  const e = data.estates[c.estate];
  return e ? { c, e } : undefined;
}

/** The what-if for one use case, if the customer chose a platform outside the Microsoft stack. */
export function useWhatIf(id: number | string | undefined) {
  return whatIfFor(id, useWhatIfData());
}

const serif = "font-[family-name:var(--font-serif)]";
const card = "rounded-2xl border border-border bg-white p-5";
const FIT_TONE: Record<string, string> = { Native: "bg-emerald-50 text-emerald-800 border-emerald-200", Partial: "bg-amber-50 text-amber-800 border-amber-200", Plan: "bg-sky-50 text-sky-800 border-sky-200", Gap: "bg-rose-50 text-rose-800 border-rose-200" };
export const VERDICT: Record<string, { label: string; cls: string }> = {
  replace: { label: "Microsoft can do it", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  complement: { label: "Microsoft complements", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  keep: { label: "Keep their choice for now", cls: "bg-amber-50 text-amber-800 border-amber-200" },
};

function Choice({ c, e }: { c: WhatIfCase; e: WhatIfEstate }) {
  const acc = e.account || "The customer";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
        <div className="absolute -right-10 -top-10 size-40 rounded-full opacity-10" style={{ background: "var(--sol2)" }} aria-hidden />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{acc}'s choice · kept</p>
        <p className={cn(serif, "mt-1 text-3xl")}>{e.name}</p>
        <p className="text-sm text-muted-foreground">{e.role}</p>
        <p className="mt-4 text-[15px] leading-relaxed">{c.choice}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border bg-[#FBF9F5] px-2.5 py-1">Status: <span className="font-medium">{c.status}</span></span>
          <span className="rounded-full border border-border bg-[#FBF9F5] px-2.5 py-1">The route classification stays as it is</span>
        </div>
      </div>
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(140deg, var(--sol), var(--sol2))" }}>
        <ShieldCheck className="size-6 opacity-80" aria-hidden />
        <p className={cn(serif, "mt-2 text-xl")}>We keep it, and show the alternative</p>
        <p className="mt-2 text-sm text-white/85">The radar respects what {acc} has chosen. The what-if below shows how the same need would run on Microsoft technology, so the decision can be taken with both options on the table.</p>
        <p className="mt-4 text-xs text-white/70">Runs today on</p>
        <p className="text-sm font-medium">{c.keep}</p>
      </div>
    </div>
  );
}

function Scenario({ c }: { c: WhatIfCase }) {
  const v = VERDICT[c.tone] ?? VERDICT.keep;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] md:items-stretch">
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="mt-1 font-medium">{c.keep}</p>
        </div>
        <ArrowRight className="hidden size-6 self-center md:block" style={{ color: "var(--sol)" }} aria-hidden />
        <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: "linear-gradient(135deg, var(--sol), var(--sol2))" }}>
          <p className="text-xs text-white/75">What if on Microsoft</p>
          <p className="mt-1 font-medium leading-relaxed">{c.microsoft}</p>
        </div>
      </div>
      <div className="rounded-2xl border-l-4 bg-white p-5 shadow-sm" style={{ borderColor: "var(--sol)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">Verdict</p>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", v.cls)}>{v.label}</span>
        </div>
        <p className={cn(serif, "mt-1 text-lg leading-snug")}>{c.verdict}</p>
      </div>
    </div>
  );
}

function SideBySide({ c, e }: { c: WhatIfCase; e: WhatIfEstate }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">{e.name} compared with Microsoft</caption>
        <thead className="bg-[#FBF9F5] text-left text-xs text-muted-foreground">
          <tr><th className="px-4 py-2.5 font-medium">What it needs</th><th className="px-4 py-2.5 font-medium">{e.name}</th><th className="px-4 py-2.5 font-medium">Microsoft</th><th className="px-4 py-2.5 font-medium">Fit</th></tr>
        </thead>
        <tbody>
          {c.fit.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              <td className="px-4 py-2.5 font-medium">{r.need}</td>
              <td className="px-4 py-2.5">{r.theirs}</td>
              <td className="px-4 py-2.5">{r.microsoft}</td>
              <td className="px-4 py-2.5"><span className={cn("rounded-full border px-2 py-0.5 text-[11px]", FIT_TONE[r.fit] ?? "")}>{r.fit}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AiOpens({ c, e }: { c: WhatIfCase; e: WhatIfEstate }) {
  const items = c.aiUnlock ?? e.aiUnlock;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((a, i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-border bg-white p-5">
          <Sparkles className="size-5" style={{ color: "var(--sol2)" }} aria-hidden />
          <p className="mt-2 flex-1 text-sm leading-relaxed">{a.what}</p>
          <p className="mt-3 text-[11px] font-medium" style={{ color: "var(--sol)" }}>{a.status}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground md:col-span-3">The use case keeps its route. These are AI options that the Microsoft platform would make available on top, not a reason to reclassify.</p>
    </div>
  );
}

function Licence({ e }: { e: WhatIfEstate }) {
  if (e.licence) return <div className="space-y-3"><LicenceCalc p={{ account: e.account, name: e.name, licence: e.licence, licenceNote: e.saving }} /></div>;
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={card}>
        <Coins className="size-5" style={{ color: "var(--sol)" }} aria-hidden />
        <p className={cn(serif, "mt-2 text-lg")}>Licence picture</p>
        <p className="mt-1 text-sm leading-relaxed">{e.saving}</p>
      </div>
      <div className={card}>
        <Calculator className="size-5" style={{ color: "var(--sol)" }} aria-hidden />
        <p className={cn(serif, "mt-2 text-lg")}>What we still need</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li>The {e.name} contract value and renewal date</li>
          <li>The Microsoft capacity the customer already has or plans</li>
          <li>The one-off migration effort per use case</li>
        </ul>
      </div>
    </div>
  );
}

function Estate({ id, e, cases }: { id: string; e: WhatIfEstate; cases: Record<string, WhatIfCase> }) {
  const chip = (x: string, dep?: boolean) => {
    const w = cases[x];
    const v = w ? VERDICT[w.tone] : undefined;
    const on = x === id;
    return (
      <Link key={x} to={`/use-case/${x}`} className={cn("group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:shadow-sm", on ? "border-transparent text-white" : "border-border bg-white hover:bg-[#FBF9F5]")} style={on ? { background: "linear-gradient(135deg, var(--sol), var(--sol2))" } : undefined}>
        <span className="font-mono text-xs">#{x}</span>
        <span className={cn("truncate text-xs", on ? "text-white/85" : "text-muted-foreground")}>{dep ? "reads " + e.name : v?.label ?? ""}</span>
      </Link>
    );
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className={card}>
        <div className="flex items-center gap-2"><Layers className="size-5" style={{ color: "var(--sol)" }} aria-hidden /><p className={cn(serif, "text-lg")}>{e.name} at {e.account || "the customer"} in the radar</p></div>
        <p className="mt-1 text-xs text-muted-foreground">{e.members.length} use cases tied to {e.name}{e.dependants.length ? `, ${e.dependants.length} more that depend on it` : ""}. Open any to see its own what-if.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{e.members.map((x) => chip(x))}</div>
        {e.dependants.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{e.dependants.map((x) => chip(x, true))}</div>}
      </div>
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(150deg, var(--sol), var(--sol2))" }}>
        <Compass className="size-5 opacity-80" aria-hidden />
        <p className={cn(serif, "mt-2 text-lg")}>The Microsoft estate</p>
        <p className="mt-1 text-sm text-white/90">{e.microsoft}</p>
      </div>
    </div>
  );
}

function TestIt({ c }: { c: WhatIfCase }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <ol className="space-y-2">
        {c.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: "var(--sol)" }}>{i + 1}</span>
            <span className="text-sm leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      {c.watch && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-xs font-medium">Watch out</p>
          <p className="mt-1 text-sm">{c.watch}</p>
        </div>
      )}
    </div>
  );
}

export function WhatIfPanel({ id, printAll }: { id: number | string; printAll?: boolean }) {
  const data = useWhatIfData();
  const w = whatIfFor(id, data);
  if (!w) return null;
  const { c, e } = w;
  const panels: KitPanel[] = [
    { id: "choice", label: `${e.account || "Customer"}'s choice`, icon: CheckCircle2, node: <Choice c={c} e={e} /> },
    { id: "scenario", label: "What if Microsoft", icon: Scale, node: <Scenario c={c} /> },
    { id: "side", label: "Side by side", icon: Layers, badge: c.fit.length, node: <SideBySide c={c} e={e} /> },
    { id: "ai", label: "AI it opens", icon: Sparkles, node: <AiOpens c={c} e={e} /> },
    { id: "licence", label: "Licence impact", icon: Coins, node: <Licence e={e} /> },
    { id: "estate", label: `${shortName(e.name)} estate`, icon: Compass, badge: e.members.length + e.dependants.length, node: <Estate id={String(id)} e={e} cases={data.cases} /> },
    { id: "test", label: "How to test it", icon: FlaskConical, node: <TestIt c={c} /> },
  ];
  const style = { ["--sol" as any]: e.accent, ["--sol2" as any]: e.accent2 } as React.CSSProperties;
  if (printAll)
    return (
      <div style={style} className="space-y-6">
        {panels.map((p) => (
          <section key={p.id}><h3 className={cn(serif, "mb-2 text-lg")}>{p.label}</h3>{p.node}</section>
        ))}
      </div>
    );
  return <div style={style}><SubTabs panels={panels} /></div>;
}
