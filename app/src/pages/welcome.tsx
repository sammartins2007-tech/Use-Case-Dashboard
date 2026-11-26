import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Ear, Filter, Layers, Grid3x3, Calculator, Scale } from "lucide-react";
import { ConnectorErrorState, LoadingState } from "@/components/states";
import { CustomerLogos } from "@/components/customer-logos";
import { ClarificationsPanel } from "@/components/clarifications";
import { RADAR } from "@/radar.config";
import { SINGLE_CUSTOMER } from "@/lib/brands";
import { isValidated } from "@/lib/validated";
import { tokensFmt, usd, useAiTotals } from "@/components/ai-meter";
import { LIVE_READ_ONLY } from "@/lib/read-only";
import { useUseCases } from "@/data/repo";
import { isReady } from "@/lib/readiness";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "listen",
    icon: Ear,
    title: "Listen",
    lead: "Every morning, Work IQ reads what the customer and the account team share.",
    body: [
      "Mail, Teams chats and channels, meeting recaps and shared documents are scanned for each customer.",
      "Only real use-case evidence is kept: who suffers, what hurts, what should change, how the work flows.",
      "Agendas, travel, licensing and scheduling are ignored. Every item keeps a link back to its source.",
    ],
  },
  {
    key: "qualify",
    icon: Filter,
    title: "Qualify",
    lead: "An idea becomes a use case only when five gates are evidenced.",
    body: [
      "Process: which business process, from which step to which step.",
      "Users: who is affected and how many. Pain: what goes wrong today.",
      "Outcome: what should change for the business. Flow: the steps, with the human in the loop.",
    ],
  },
  {
    key: "classify",
    icon: Layers,
    title: "Classify",
    lead: "Each use case is routed to the right Microsoft platform, with the reason written down.",
    body: [
      "Eight routes, from No AI (rules and reporting are enough) to Foundry (custom models).",
      "Every classification carries a confidence, a why and an alternative or next step.",
      "Flags call out duplicates, items covered by other programmes and licence requests.",
    ],
  },
  {
    key: "position",
    icon: Grid3x3,
    title: "Position",
    lead: "The map places every use case by complexity and effort, in nine cells.",
    body: [
      "Low complexity and low effort is the quick-win corner.",
      "Complexity comes from the technical difficulty; effort from the workload or duration.",
      "Use cases without evidence stay off the map until someone sets them.",
    ],
  },
  {
    key: "size",
    icon: Calculator,
    title: "Size",
    lead: "FinOps turns a use case into a monthly cost and a monthly value.",
    body: [
      "Run cost = runs per month × Copilot Credits per run × price per credit.",
      "Value = runs per month × minutes saved ÷ 60 × loaded cost per hour.",
      "Net value per month tells you whether the use case pays for its AI.",
    ],
  },
  {
    key: "decide",
    icon: Scale,
    title: "Decide",
    lead: "The account team funds, tests, holds or stops, and can discard with a reason.",
    body: [
      "Decisions and sizing are human: the radar never overwrites them.",
      "A use case with all gates and its volumes is ready for a business case.",
      "Discarded use cases leave the map but stay on record.",
    ],
  },
] as const;

export function WelcomePage() {
  const q = useUseCases();
  const ai = useAiTotals();
  const [step, setStep] = useState(0);
  const rows = useMemo(() => (q.data?.rows ?? []).filter((u) => !u.discarded), [q.data]);
  const current = STEPS[step];

  return (
    <div id="work" tabIndex={-1} className="outline-none">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top_right,#F3E6CB_0%,#F3F8FD_45%,#F3F8FD_100%)]">
        <DawnArt />
        <div className="relative mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div>
            <p className="text-sm text-[#8A6420]">{RADAR.tagline}</p>
            <h1 className="mt-3 max-w-[640px] font-[family-name:var(--font-serif)] text-[44px] leading-[1.08] tracking-tight text-[#0D2847]">
              From scattered signals
              <br />
              <span className="italic text-[#0F6CBD]">to AI use cases worth funding.</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#34465E]">
              {RADAR.customerEdition
                ? `One shared view of the AI use cases ${RADAR.customers[0]?.name ?? "the customer"} and Microsoft are shaping together: what each one solves, the value it can bring, the proposed solution and when it is planned.`
                : "A living radar that listens to what our customers share, qualifies every idea against five gates, routes it to the right Microsoft platform and sizes what it will cost and return."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#customers"
                className="inline-flex items-center gap-2 rounded-full bg-[#0D2847] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26385A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {SINGLE_CUSTOMER ? `Open ${SINGLE_CUSTOMER}` : "Choose a customer"} <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              {!RADAR.customerEdition && (<Link
                to="/method"
                className="inline-flex items-center gap-2 rounded-full border border-[#C8DAEC] bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#F7FBFE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Definitions and method
              </Link>)}
            </div>
            <dl className="mt-10 grid max-w-[560px] grid-cols-3 gap-6">
              <HeroStat label="Use cases tracked" value={q.isSuccess ? String(rows.length) : "…"} />
              <HeroStat label="Ready to assess" value={q.isSuccess ? String(rows.filter(isReady).length) : "…"} />
              {SINGLE_CUSTOMER ? (
                <HeroStat label="Validated" value={q.isSuccess ? String(rows.filter(isValidated).length) : "…"} />
              ) : (
                <HeroStat label="Customers" value={String(RADAR.customers.length)} />
              )}
            </dl>
          </div>

          {!RADAR.customerEdition && !LIVE_READ_ONLY && <AiConsumptionCard ai={ai} />}
        </div>
      </section>

      {!RADAR.customerEdition && q.isSuccess && (
        <div className="mx-auto w-full max-w-[1280px] px-6 pt-8">
          <ClarificationsPanel useCases={rows} />
        </div>
      )}

      {!RADAR.customerEdition && (
        <>
      {/* How it works */}
      <section aria-labelledby="how-title" className="mx-auto w-full max-w-[1280px] px-6 py-14">
        <p className="text-sm text-[#8A6420]">How it works</p>
        <h2 id="how-title" className="mt-1 font-[family-name:var(--font-serif)] text-3xl tracking-tight">
          Six steps, from a conversation to a decision
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ol className="space-y-2" aria-label="Steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStep(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active ? "border-[#0D2847] bg-[#0D2847] text-white shadow-md" : "border-border bg-card hover:border-[#C9BFAE]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        active ? "bg-[#D9B26A] text-[#0D2847]" : "bg-[#E8F2FB] text-[#0D2847]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.title}</span>
                      <span className={cn("block truncate text-xs", active ? "text-white/75" : "text-muted-foreground")}>{s.lead}</span>
                    </span>
                    <Icon className={cn("size-4 shrink-0", active ? "text-[#D9B26A]" : "text-muted-foreground")} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
          <article aria-live="polite" className="rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(27,42,65,0.04)]">
            <p className="text-sm text-[#8A6420]">Step {step + 1} of {STEPS.length}</p>
            <h3 className="mt-1 font-[family-name:var(--font-serif)] text-2xl">{current.title}</h3>
            <p className="mt-2 text-[17px] text-[#34465E]">{current.lead}</p>
            <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ul className="space-y-3">
                {current.body.map((b) => (
                  <li key={b} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#D9B26A]" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <StepVisual stepKey={current.key} />
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                ← Previous
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="rounded-full bg-[#0F6CBD] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B6A73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Next: {STEPS[step + 1].title} →
                </button>
              ) : (
                <a href="#customers" className="rounded-full bg-[#0F6CBD] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B6A73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {SINGLE_CUSTOMER ? `Open ${SINGLE_CUSTOMER} →` : "Open a customer →"}
                </a>
              )}
            </div>
          </article>
        </div>
      </section>
        </>
      )}

      {/* Customers */}
      <section id="customers" aria-labelledby="cust-title" className="scroll-mt-20 border-t border-border bg-[#F7FBFE]">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-14">
          <p className="text-sm text-[#8A6420]">{SINGLE_CUSTOMER ?? "Choose a customer"}</p>
          <h2 id="cust-title" className="mt-1 font-[family-name:var(--font-serif)] text-3xl tracking-tight">
            Their use cases, on one map
          </h2>
          <div className="mt-8">
            {q.isLoading ? (
              <LoadingState rows={4} />
            ) : q.isError ? (
              <ConnectorErrorState error={q.error} connector="SharePoint" />
            ) : (
              <CustomerLogos useCases={q.data?.rows ?? []} nextToken={q.data?.nextToken} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-[family-name:var(--font-serif)] text-3xl tabular-nums text-[#0D2847]">{value}</dd>
    </div>
  );
}

function AiConsumptionCard({ ai }: { ai: ReturnType<typeof useAiTotals> }) {
  const rows = [...ai.rows].sort((a, b) => (a.runDate ?? "").localeCompare(b.runDate ?? ""));
  const max = Math.max(1, ...rows.map((r) => r.costUSD));
  return (
    <aside aria-labelledby="ai-title" className="self-start rounded-2xl border border-[#E8D9B8] bg-white/80 p-6 shadow-[0_10px_40px_-20px_rgba(138,100,32,0.45)] backdrop-blur">
      <h2 id="ai-title" className="text-sm text-[#8A6420]">
        AI consumed by this radar so far
      </h2>
      {ai.q.isLoading ? (
        <LoadingState rows={2} className="mt-3" />
      ) : ai.q.isError ? (
        <ConnectorErrorState error={ai.q.error} connector="SharePoint" />
      ) : (
        <>
          <p className="mt-2 font-[family-name:var(--font-serif)] text-5xl tabular-nums text-[#0D2847]">{usd.format(ai.cost)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tokensFmt(ai.tokens)} tokens across {ai.runs} runs{ai.estimated ? " · estimated" : ""}
          </p>
          {rows.length > 0 && (
            <figure className="mt-5">
              <div className="flex h-20 items-end gap-1" aria-hidden="true">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex-1 rounded-t-sm"
                    style={{ height: `${Math.max(4, (r.costUSD / max) * 100)}%`, backgroundColor: r.kind === "Deep analysis" ? "#B8892B" : "#0F6CBD", opacity: r.status === "Stalled" ? 0.4 : 1 }}
                    title={`${r.title}: ${usd.format(r.costUSD)}`}
                  />
                ))}
              </div>
              <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[#0F6CBD]" aria-hidden="true" /> Refreshes and imports
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[#B8892B]" aria-hidden="true" /> Deep analysis
                </span>
              </figcaption>
              <ul className="sr-only">
                {rows.map((r) => (
                  <li key={r.id}>{`${r.title}, ${r.runDate?.slice(0, 10) ?? ""}: ${usd.format(r.costUSD)}`}</li>
                ))}
              </ul>
            </figure>
          )}
          <Link to="/finops#consumption" className="mt-5 inline-flex text-sm font-medium text-[#0F6CBD] hover:underline">
            See every run and how it is estimated →
          </Link>
        </>
      )}
    </aside>
  );
}

function StepVisual({ stepKey }: { stepKey: string }) {
  if (stepKey === "listen")
    return (
      <Visual label="Sources flow into one use case">
        <svg viewBox="0 0 300 170" className="w-full" role="img" aria-label="Mail, Teams, meetings and documents flow into one use case">
          {["Mail", "Teams", "Meetings", "Documents"].map((t, i) => (
            <g key={t}>
              <rect x="6" y={10 + i * 40} width="96" height="28" rx="14" fill="#E8F2FB" />
              <text x="54" y={29 + i * 40} textAnchor="middle" fontSize="12" fill="#0D2847">{t}</text>
              <path d={`M102 ${24 + i * 40} C 160 ${24 + i * 40}, 160 85, 196 85`} fill="none" stroke="#D9B26A" strokeWidth="1.5" />
            </g>
          ))}
          <rect x="196" y="60" width="98" height="50" rx="12" fill="#0D2847" />
          <text x="245" y="82" textAnchor="middle" fontSize="12" fill="#fff">Use case</text>
          <text x="245" y="98" textAnchor="middle" fontSize="10" fill="#D9B26A">+ evidence</text>
        </svg>
      </Visual>
    );
  if (stepKey === "qualify")
    return (
      <Visual label="Five gates">
        <div className="flex flex-wrap gap-2">
          {["Process", "Users", "Pain", "Outcome", "Flow"].map((g, i) => (
            <span key={g} className="flex items-center gap-2 rounded-full border border-[#C8DAEC] bg-white px-3 py-1.5 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#0F6CBD] text-[11px] text-white">{i + 1}</span>
              {g}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">All five evidenced → ready to assess. Anything missing becomes a question for the customer.</p>
      </Visual>
    );
  if (stepKey === "classify")
    return (
      <Visual label="Eight routes">
        <ul className="grid grid-cols-2 gap-1.5">
          {ROUTES.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-sm">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden="true" />
              {r.short}
            </li>
          ))}
        </ul>
      </Visual>
    );
  if (stepKey === "position")
    return (
      <Visual label="Complexity × effort">
        <svg viewBox="0 0 200 170" className="w-full max-w-[260px]" role="img" aria-label="Three by three grid of complexity and effort">
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect key={`${r}${c}`} x={30 + c * 56} y={6 + r * 46} width="52" height="42" rx="6" fill={r === 2 && c === 0 ? "#E6F2F3" : "#F4F0E8"} />
            )),
          )}
          {[
            [48, 140, "#0F6CBD"], [70, 128, "#0D2847"], [100, 110, "#B8892B"], [128, 70, "#C2556B"], [160, 30, "#2A9D78"], [112, 140, "#0F6CBD"], [62, 84, "#6B8E5A"],
          ].map(([x, y, c], i) => (
            <circle key={i} cx={x as number} cy={y as number} r="5" fill={c as string} />
          ))}
          <text x="114" y="166" textAnchor="middle" fontSize="10" fill="#55657A">Complexity →</text>
          <text x="10" y="80" textAnchor="middle" fontSize="10" fill="#55657A" transform="rotate(-90 10 80)">Effort →</text>
        </svg>
      </Visual>
    );
  if (stepKey === "size") return <SizeExample />;
  return (
    <Visual label="Four decisions">
      <div className="flex flex-wrap gap-2">
        {[
          ["Fund", "#2A9D78"],
          ["Test", "#0F6CBD"],
          ["Hold", "#B8892B"],
          ["Stop", "#C2556B"],
        ].map(([d, c]) => (
          <span key={d} className="rounded-full px-4 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: c }}>
            {d}
          </span>
        ))}
      </div>
    </Visual>
  );
}

function SizeExample() {
  const [runs, setRuns] = useState(1000);
  const credits = 10;
  const price = 0.01;
  const minutes = 6;
  const cost = runs * credits * price;
  const hours = (runs * minutes) / 60;
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return (
    <Visual label="Try it: a worked example">
      <label htmlFor="ex-runs" className="text-sm">
        Runs per month: <span className="font-semibold tabular-nums">{runs.toLocaleString("en-GB")}</span>
      </label>
      <input
        id="ex-runs"
        type="range"
        min={100}
        max={5000}
        step={100}
        value={runs}
        onChange={(e) => setRuns(Number(e.target.value))}
        className="mt-2 w-full accent-[#0F6CBD]"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Example values: {credits} credits per run at ${price} each; {minutes} minutes saved per run.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#FBF4E4] p-2">
          <dt className="text-[11px] text-muted-foreground">AI run cost / month</dt>
          <dd className="font-[family-name:var(--font-serif)] text-xl tabular-nums">{usd.format(cost)}</dd>
        </div>
        <div className="rounded-lg bg-[#E8F3EF] p-2">
          <dt className="text-[11px] text-muted-foreground">Time saved / month</dt>
          <dd className="font-[family-name:var(--font-serif)] text-xl tabular-nums">{Math.round(hours).toLocaleString("en-US")} h</dd>
        </div>
        <div className="rounded-lg bg-[#0D2847] p-2 text-white">
          <dt className="text-[11px] text-white/75">AI cost per hour saved</dt>
          <dd className="font-[family-name:var(--font-serif)] text-xl tabular-nums">{usd.format(hours ? cost / hours : 0)}</dd>
        </div>
      </dl>
    </Visual>
  );
}

function Visual({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-xl bg-[#F7FBFE] p-5">
      <figcaption className="mb-3 text-xs text-[#8A6420]">{label}</figcaption>
      {children}
    </figure>
  );
}

function DawnArt() {
  return (
    <svg className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] opacity-70" viewBox="0 0 520 520" aria-hidden="true">
      {[240, 190, 140, 90].map((r, i) => (
        <circle key={r} cx="260" cy="260" r={r} fill="none" stroke="#E2CFA6" strokeWidth="1" opacity={0.35 + i * 0.12} />
      ))}
      <circle cx="260" cy="260" r="44" fill="#F3E2BD" />
    </svg>
  );
}
