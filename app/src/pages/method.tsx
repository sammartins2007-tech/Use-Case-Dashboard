import { Link } from "react-router-dom";
import { ELEMENTS } from "@/lib/readiness";
import { ROUTES } from "@/lib/routes";
import { onRoute } from "@/lib/routes";

const TOC = [
  ["use-case", "What counts as a use case"],
  ["signals", "Which signals we keep"],
  ["gates", "Five gates and five inputs"],
  ["stages", "Stages, decisions and discard"],
  ["roadmap", "Waves and roadmap"],
  ["routes", "Platform classification"],
  ["map", "Complexity and effort"],
  ["finops", "FinOps sizing"],
  ["sources", "Sources and evidence"],
  ["refresh", "The daily refresh"],
  ["ai", "How AI consumption is measured"],
] as const;

function H({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-[family-name:var(--font-serif)] text-2xl">
      <span className="mr-3 text-[#B8892B] tabular-nums">{String(n).padStart(2, "0")}</span>
      {children}
    </h2>
  );
}
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#3D4757]">{children}</p>;
const Box = ({ children }: { children: React.ReactNode }) => <div className="mt-4 rounded-2xl border border-border bg-card p-5">{children}</div>;

export function MethodPage() {
  return (
    <div id="work" tabIndex={-1} className="outline-none">
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top_right,#E1EEEE_0%,#F7F5F0_55%)]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
          <p className="text-sm text-[#0E7C86]">How it works</p>
          <h1 className="mt-1 max-w-3xl font-[family-name:var(--font-serif)] text-4xl leading-tight tracking-tight">
            Every rule the radar follows, in plain words.
          </h1>
          <P>
            Nothing on a customer page is a guess. Each field comes from a message, meeting, file or public source you can open, and each
            label follows one of the rules below.
          </P>
        </div>
      </section>
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-20 lg:self-start">
          <ol className="space-y-1 text-sm">
            {TOC.map(([id, l], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2 rounded-md px-2 py-1 text-[#3D4757] hover:bg-[#F1ECE2] hover:text-foreground">
                  <span className="tabular-nums text-[#B8892B]">{String(i + 1).padStart(2, "0")}</span>
                  {l}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-14">
          <section>
            <H id="use-case" n={1}>What counts as a use case</H>
            <P>
              A use case is a specific business or functional problem at a named customer that an AI-enabled solution could solve. It must
              describe a real, current pain (a bottleneck, delay, cost or risk), the people or process affected, and the outcome the
              business wants.
            </P>
            <Box>
              <p className="text-sm font-medium">Not a use case</p>
              <p className="mt-1 text-sm text-[#3D4757]">
                Generic AI ideas, licensing or access requests, governance, adoption and training, product capabilities on their own,
                executive sessions and broad transformation programmes.
              </p>
            </Box>
          </section>

          <section>
            <H id="signals" n={2}>Which signals we keep</H>
            <P>
              A signal is a new fact about one existing or new use case: an enrichment, a risk, a next step, a FinOps figure or a product
              feature that changes what is possible. Only signals linked to a use case are kept.
            </P>
            <Box>
              <p className="text-sm text-[#3D4757]">
                Ignored: agendas, invitations, logistics, dates and rooms, newsletters and anything that does not change a use case.
              </p>
            </Box>
          </section>

          <section>
            <H id="gates" n={3}>Five gates and five inputs</H>
            <P>
              A use case is ready to assess when all five gates are evidenced. The five inputs are what a business case then needs. Missing
              items become the open questions shown on the use case.
            </P>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["gate", "input"] as const).map((g) => (
                <Box key={g}>
                  <p className="text-sm font-medium">{g === "gate" ? "Gates (qualify)" : "Inputs (size and decide)"}</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#3D4757]">
                    {ELEMENTS.filter((e) => e.group === g).map((e) => (
                      <li key={e.key}>· {e.label}</li>
                    ))}
                  </ul>
                </Box>
              ))}
            </div>
          </section>

          <section>
            <H id="stages" n={4}>Stages, decisions and discard</H>
            <Box>
              <dl className="grid gap-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt className="font-medium">Signal</dt><dd className="text-[#3D4757]">Heard about, not yet qualified.</dd>
                <dt className="font-medium">Qualified</dt><dd className="text-[#3D4757]">Gates evidenced; worth shaping.</dd>
                <dt className="font-medium">Shaping</dt><dd className="text-[#3D4757]">Solution, data and sizing being worked out with the customer.</dd>
                <dt className="font-medium">Pilot</dt><dd className="text-[#3D4757]">Built and tested with real users.</dd>
                <dt className="font-medium">Scale</dt><dd className="text-[#3D4757]">Rolled out, with a budget and an owner.</dd>
                <dt className="font-medium">Parked / Stopped</dt><dd className="text-[#3D4757]">On hold or ended.</dd>
                <dt className="font-medium">Confidence</dt><dd className="text-[#3D4757]">How well the customer's own sources evidence the use case. High: the five gates come from customer sources. Medium: most do, some are inferred. Low: only a title or a partial description.</dd>
                <dt className="font-medium">Readiness colours</dt><dd className="text-[#3D4757]">Green: evidenced and enough for a business case. Orange: partial (vague, not quantified, or derived from another field). Red: missing.</dd>
                <dt className="font-medium">Decision</dt><dd className="text-[#3D4757]">Undecided (not yet discussed), Fund (budget agreed to build), Test (pilot or proof of concept first), Hold (valid but paused) or Stop (will not be pursued). The account team's call, never set automatically.</dd>
                <dt className="font-medium">Discard</dt><dd className="text-[#3D4757]">Removes a use case from maps and counts (duplicate, out of scope, customer said no). It stays restorable with its reason.</dd>
              </dl>
            </Box>
          </section>

          <section>
            <H id="roadmap" n={5}>Waves and roadmap</H>
            <P>
              A wave is a batch of use cases the customer plans to deliver together (W1, W2, …), each with an optional start and end month. Where
              the customer has already decided — for example in its own pipeline — the use case keeps the customer's wave, decision (Prioritised, On
              hold, Not yet decided, Not prioritised, Cancelled), status, dates and progress, and shows as a gold "Customer decided" card.
              Anything moved in the app is marked as a proposal with the date, so customer decisions and account-team proposals never get mixed
              up. Candidates are use cases not yet in a wave, ranked by a 0–10 score: value (0–3) + low effort (0–3; 1.5 when unknown) +
              leadership-priority fit (2) + readiness of the five gates (0–2). Cancelled use cases leave the roadmap.
            </P>
          </section>

          <section>
            <H id="routes" n={6}>Platform classification</H>
            <P>
              Each use case gets the one route that solves the pain most simply, with a confidence (High, Medium, Low) and a one-line reason.
              We pick the lightest route that works: no AI before AI, out-of-the-box before custom.
            </P>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">The eight platform routes</caption>
                <thead>
                  <tr className="border-b border-border bg-[#FBF9F5] text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">Route</th>
                    <th scope="col" className="px-4 py-2 font-medium">Definition</th>
                    <th scope="col" className="px-4 py-2 font-medium">Choose it when</th>
                    <th scope="col" className="px-4 py-2 font-medium">Typical signals</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUTES.map((r) => (
                    <tr key={r.key} className="border-b border-border align-top last:border-b-0">
                      <th scope="row" className="px-4 py-3 text-left">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: r.color, color: onRoute(r) }}>
                          {r.short}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-[#3D4757]">{r.definition}</td>
                      <td className="px-4 py-3 text-[#3D4757]">{r.when}</td>
                      <td className="px-4 py-3 text-[#3D4757]">{r.signals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Confidence is High when the description names the users, data and interaction; Medium when one is inferred; Low when the
              title is all we have. A flag marks likely duplicates or items that are not use cases.
            </P>
          </section>

          <section>
            <H id="map" n={7}>The two maps: complexity, value and effort</H>
            <P>
              The map places each use case on two three-level scales. Customer scores are used when they exist; otherwise the account team
              sets them on the use case page.
            </P>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Box>
                <p className="text-sm font-medium">Value (horizontal, value map)</p>
                <p className="mt-1 text-sm text-[#3D4757]">
                  From the counted KPI saving per year: below $50k Low, $50k to below $250k Medium, $250k and above High. Without a quantified saving
                  the analysis judges it from users, volumes, criticality and fit with leadership priorities, and says so in the value basis. Editable on
                  the use case page.
                </p>
              </Box>
              <Box>
                <p className="text-sm font-medium">Complexity (horizontal, complexity map)</p>
                <p className="mt-1 text-sm text-[#3D4757]">From the customer's implementation complexity score: below 2 Low, 2 to below 3 Medium, 3 and above High.</p>
              </Box>
              <Box>
                <p className="text-sm font-medium">Effort (vertical)</p>
                <p className="mt-1 text-sm text-[#3D4757]">From estimated effort: under 1 FTE-month or 20 days Low, up to 3 FTE-months or 60 days Medium, more is High.</p>
              </Box>
            </div>
            <P>
              On the complexity map, bottom-left is quick wins. On the value map, bottom-right (high value, low effort) is quick wins, top-right is
              strategic bets, bottom-left fill-ins and top-left to avoid. Dots are spread inside a cell for readability; their position within a cell
              carries no meaning.
            </P>
            <Box>
              <p className="text-sm font-medium">Department</p>
              <p className="mt-1 text-sm text-[#3D4757]">
                The business function that owns the process (Finance, Procurement, Supply Chain & Logistics, Manufacturing & Operations, Maintenance &
                Engineering, Quality, HSE & Sustainability, R&I / R&D, Sales & Marketing, Customer Service, HR, IT & Digital, Legal & Compliance,
                Communication, Strategy & Management, Other), taken from the customer's process taxonomy where it exists.
              </p>
            </Box>
            <Box>
              <p className="text-sm font-medium">Leadership priorities</p>
              <p className="mt-1 text-sm text-[#3D4757]">
                For each customer we read the latest annual report (and a newer official strategy update when one exists) and summarise, in our own
                words, the 4–6 priorities leadership commits to, with a link to the source. A use case "fits" a priority only when its process or
                outcome directly advances what leadership committed to; generic efficiency is not enough. At most two priorities per use case.
              </p>
            </Box>
          </section>

          <section>
            <H id="finops" n={8}>FinOps sizing</H>
            <Box>
              <p className="font-[family-name:var(--font-serif)] text-lg">AI run cost / month = the sum of every AI cost line</p>
              <ul className="mt-2 space-y-1 text-sm text-[#3D4757]">
                <li>· Copilot Credits (Copilot Studio agents and flows): runs × credits per run × price per credit</li>
                <li>· Microsoft 365 Copilot licences (incl. Copilot Cowork): users × price per user × share attributed</li>
                <li>· Model tokens (Microsoft Foundry / Azure OpenAI): runs × (input tokens × input price + output tokens × output price)</li>
                <li>· Microsoft Fabric capacity: capacity price × share attributed</li>
                <li>· Power Platform licences: users × price per user</li>
                <li>· Other Azure services (AI Search, Document Intelligence, compute): monthly amount</li>
                <li>· Build and run effort: one-off cost ÷ months of life</li>
              </ul>
              <p className="mt-3 font-[family-name:var(--font-serif)] text-lg">Three measures: time saved (hours), cost savings ($) and revenue gain ($)</p>
              <p className="mt-2 text-sm text-[#3D4757]">
                Every KPI shows its current value and expected outcome and measures one of three things: time saved, kept in hours and never
                converted into money; cost savings in US dollars; or revenue gain in US dollars. Per use case, one KPI per measure is counted, so
                benefits are never added twice. The three totals on every customer page follow the filters applied. FinOps value per month = the
                dollar KPIs ÷ 12, compared with the AI run cost. Prices are illustrative list prices until the customer agreement is known.
              </p>
            </Box>
            <Link to="/finops" className="mt-3 inline-flex text-sm text-[#0E7C86] hover:underline">Open FinOps →</Link>
          </section>

          <section>
            <H id="sources" n={9}>Sources and evidence</H>
            <P>
              Each use case lists the mails, chats, meetings, documents and public pages that fed it, with a date and a link. Insights from
              the web are kept separate from customer evidence. If a fact cannot be traced to a source, it is not written.
            </P>
          </section>

          <section>
            <H id="refresh" n={10}>The daily refresh</H>
            <P>
              Every morning an agent reads new Work IQ activity (mail, Teams, meetings, documents) and new product announcements, keeps only
              signals that change a use case, enriches or creates use cases, reclassifies when the evidence changes, and logs what it cost.
            </P>
          </section>

          <section>
            <H id="ai" n={11}>How AI consumption is measured</H>
            <P>
              Each run is logged with input tokens, output tokens and cost. Where no billing meter is available the run is marked estimated:
              tokens are derived from the number of agent steps and the size of their context, priced at an illustrative list rate ($3 per
              million input tokens, 80% served from cache at $0.30, and $15 per million output tokens). Actual billing is in the Microsoft
              365 admin centre.
            </P>
          </section>
        </div>
      </div>
    </div>
  );
}
