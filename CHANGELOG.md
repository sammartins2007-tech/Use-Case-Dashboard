# Changelog

## 1.13.0 — The refresh calls the eight SE agents
- **The board is the owner's eight Copilot Studio SE agents, called for real.** For every use case to design, the refresh
  writes one call per agent into the new list SEAgentCalls-704f56; the new agent flow "Radar - call SE agent"
  (`agents/se-board-flow/`) calls the agent with an agent node (the published agent itself; the Microsoft Copilot Studio connector
  refuses agents on the Microsoft Copilot harness) and writes the answer back. The opinions are built
  only from those answers, and each keeps the agent's full answer and conversation id. No sub-agent, role card or fallback
  writes an opinion any more; a use case without eight answers waits for the next run.
- `prompts/specialists.md`: the roster (board order), the `se-agents` roster row in the content store, the message sent to
  every agent (with a "Board summary" section) and how an answer is read. The role cards are gone.
- `prompts/solution-board-brief.md`: call, wait (retry once), opinions from the answers, arbitration, then the design.
- `schema/playbook.l2-chain.json`: the chain with the new board; `schema/lists.json`: sixth list SEAgentCalls-704f56.
- Refresh template step 10 calls the agents and logs "SE agent calls: written/answered" in the AIConsumption Basis line.
- Setup step 2c creates the flow and the roster row and runs an eight-agent call test; the update brings older instances in.
- Inside the Radar: the run and the board slides name the Copilot Studio agents and the agent flow.
- Tested on a reference instance: a fictitious case sent to the eight agents came back with eight answers, each with
  its Board summary and 4 to 26 Microsoft Learn links, in under 4 minutes.

## 1.12.0 — The eight SE agents in the kit
- New `agents/se-specialists/`: the eight L2 SE agents built in Copilot Studio (Copilot Studio; M365 Copilot & Co-Work; Power
  Platform; Azure AI / Foundry; Data & Knowledge Architecture; Integration & Tools; Security & Compliance; D365), one folder each:
  `agent.yaml` (instructions word for word, model, Teams and Microsoft 365 Copilot channels) and the Microsoft Learn Docs MCP tool.
  Environment, connection, app and owner ids are removed; every definition passes the Copilot Studio validator.
- Setup step 2b creates, tests and publishes them in the owner's Copilot Studio; an update brings them in line when the kit's
  copies change; the agents check confirms all eight answer.
- README, The agents: the SE agents are Copilot Studio agents. The refresh runs their eight roles in parallel from the role
  cards in `prompts/specialists.md`; it does not call the agents one by one.

## 1.11.1 — The agents, documented and checked at install
- README: new **The agents** section. It lists every agent the radar calls (the two app agents, Use Case Coach and Input
  Reviewer; the eight SE agents of the L2 board; the design chain; the source analysts), what each does, when it runs,
  where it is defined and which setup step installs it. None has to be built in Copilot Studio.
- Setup ends with an agents check: Complete with AI answers in the published app and logs its run, the playbook rows read back equal, the
  chain's briefs equal `prompts/`, and the first design shows the eight specialist opinions.
- Update compares the instance's playbook rows with the kit and stores a new version when the briefs changed (keeping the
  instance's exemplars).
- Setup names the Agents data source `agentnode`, the name the app code expects.
- **Fresh install fixed**: `app/src/lib/pdf-bytes.ts` is now in the kit. Today's App Builder template no longer ships it,
  so the PDF export (`lib/pdf-export.ts`) did not compile in a new app. `app/SCAFFOLD.md` says to keep a newer template's
  library version and when to pin 0.6.0.
- Tested as a new install: a new app built from today's template plus the kit typechecks, builds and opens every page
  (welcome, customers, FinOps, Inside the Radar, backlog, how it works, feature radar, a use case and its Add input panel).
- Checked against a running radar: the design chain (`schema/playbook.l2-chain.json`, its nine briefs and validators) is
  identical to the one it runs; the redesign playbook differs only by that instance's own exemplars.

## 1.11.0 — Inside the Radar, backlog, modern look, next-step sources, clean deployment view, live refresh rules
- **Inside the Radar** (new `pages/story.tsx`, `components/story/*`, `lib/story.ts`, menu item, route `/story`): a full-screen presenter story in seven chapters and 20 slides on the radar's live data — what a use case is (five gates, anatomy), how it is detected (sources, the sentence it was born from, the evidence ledger), how it learns (timeline, four rules, product news), the call to the eight SE agents (triggers, opinions, arbitration, solution), people decide, editions, the twice-daily run replayed, the kit, the backlog. Follow any use case; Show mode masks account and people names; keyboard and mouse navigation; links open the real pages. Hidden in read-only and customer editions. Optional cover picture: `presenterBanner` in `radar.config.ts` (new optional `RadarConfig` field); without it the cover shows a radar.
- **Backlog** (new `pages/backlog.tsx`, `data/backlog.ts`): the improvements that could come next, in Now / Next / Later lanes; also the story's closing chapter. Hidden in read-only and customer editions.
- **Modern look**: sky-blue palette across every page (FinOps included), sans headings, softer radius, glass cards and a light gradient background (`index.css` and the pages' colours).
- **Next steps show their source and date** (new `lib/step-source.ts`): each step carries a chip with the kind and date of the input it came from (Teams chat · 17 Nov, Email · 5 Nov, Meeting · 10 Nov); the pop-up shows the details, where it comes from (title, date, sender, excerpt) and Full context (the input pop-up). The source is matched by content with the use case's own signals and evidence trail and says so; steps with no matching input show "No source on record". Owner's app only. People named with a note in brackets ("Alex (Finance, to confirm)") stay one person.
- **Deployment view redrawn** (new `lib/orthogonal-router.ts`, `components/tech-architecture.tsx`): zones side by side, connections routed at right angles around boxes and zone titles (never through them), kept off zone borders and spread over separate lanes; every connection numbered on its line and listed below ("How the parts connect") with hover and click highlighting; the diagram no longer draws over the sticky chapter bar.
- Use case menu: the offline copy downloads and Export PDF were removed from the "…" menu (19 Nov); offline customer copies are built by the refresh.
- **Refresh template = the live radar's rules**: one source is applied to every use case it names; unreadable items are recorded in a content-store list (`config` / `unreadable`) and retried at the start of every run; every Evidence line ends with "Impact:"; People lines have a 7th field Contribution (Business, Technical, Microsoft) and every person who intervenes is added; transcripts are those created in the window; a waiting proposal never blocks a redesign (newest design compared); the contradictory "3-per-run cap" sentence is gone (no per-run cap). Steps 7 (two-way single-customer copy) and 9 (static snapshot) are removed: copies and customer editions are step 11 only, which now installs the radar-ops toolkit first, rebuilds each customer edition's offline copy in place and ends with the consistency check script.
- **Radar-ops toolkit** (new `optional/radar-ops/`: README, `install.sh`, generic `consistency_audit.py` reading the copies from the `readonly-apps` config row). Brand files name their images relative to themselves and the images travel in the toolkit (`build_account_snapshot.py`, `brand.example.json`), so the offline copy rebuilds in the refresh's fresh workspace.
- Removed: `optional/customer-snapshot/` (the static snapshot, replaced since 1.9.1 by the customer edition's offline copy).

## 1.10.0 — demo stories, full-run date, measured credits, people roles, signal context
- Play demo (new `components/iq-demo-player.tsx`): any use case can carry a scripted, fictional demo story as a content document of kind `demo` (same storage as designs; the Microsoft IQ Playground scenario format: persona, trigger, five agents across Work / Web / Fabric / Foundry IQ plus a system of record, governance, shell, tracks). The use case header shows **Play demo** only when a story exists. The player opens on the principle first (who, what happened, how it works, the approval rule), then plays inside a Microsoft 365 Copilot-in-Teams look: prompt typed into the composer, reasoning steps, streamed answer, numbered citations with pop-ups, option cards with one Recommended, a Teams Approvals card ("nothing runs until approved"), and a Behind-the-scenes panel (agents, IQ layers lit as used, governance). Hidden in the customer edition. Nothing is published outside the app.
- Full specialist run date (new `components/full-run-badge.tsx`): a header chip shows the date of the last design produced by the full specialist chain (board with specialists or opinions plus a solution experience), with "current" or "proposal waiting"; amber when no full run exists yet. Hidden in the customer edition.
- Measured credits (new `components/measured-credits.tsx`, `useMeterReadings()` in data/repo.ts): the FinOps page compares measured daily platform credits (content rows of kind `meter`: DocRef = date, DocSeq = credits) with the logged runs and estimated $, credits per $, and flags days above 1.3 × the median. Interactive build sessions are logged as consumption rows of kind "Build session". Meter rows are never copied to read-only copies.
- Signal and source context (new `components/input-context.tsx`): clicking a signal or source opens a pop-up with what it said, when, where it came from and its impact on the use case.
- People: each person on a use case is shown as owner or as a Business, Technical or Microsoft contributor (dossier-people, lib/people-steps).
- Readable picture labels in the solution visuals.
- Code: loosely typed design readers use a named `Loose` type instead of `any` (blueprint, hackathon, pathway, what-if, solutions), so the full lint gate passes before a publish.
- Content kinds: `demo` added to `DocKind` (lib/content.ts).

## 1.9.2 — consistency hardening
- `customer_copy.py` writes its run report to its own folder (`working/sync/`) and creates it; a missing scratch folder can no longer stop the copy sync.
- Refresh template: related-use-case labels always carry the target's CURRENT title (and are updated when a title changes); the read-only copy step ends with a consistency check that must report 0 bad links, title mismatches and design mismatches.
- Lesson: before deleting scratch folders, check the live scripts and refresh instructions for paths they write to.

## 1.9.1 — customer edition for guests, links inside designs fixed
- Customer edition (optional/customer-edition): `customer_copy.py` now syncs a customer-safe copy of one account to a SEPARATE site, declared by a config line `<Account> | edition customer | site <url>`. It blanks internal fields (analysis, insights, decision, confidence, readiness, sizing basis, internal cost and value), removes CLARIFY lines and internal Microsoft 365 links, strips internal design parts (board, route check, FinOps, evidence, ledger), keeps public web sources only, and copies no FeatureRadar or Signals rows. It refuses a customer edition on the master site.
- Links inside designs fixed for every copy: use case ids in wave plans (schedule and use case lists), what-if members and dependants, and the solution id are remapped to the copy's ids (a copy could open the wrong use case before). Designs are re-chunked over the same rows after the change.
- Whole-account offline copy for guests: `customer_snapshot_dump.py` + `build_account_snapshot.py` + `brand.example.json` build one HTML file with every use case of the customer edition; it opens on the welcome page. The refresh rebuilds it and overwrites the same file in place.
- App: in customer mode the dossier hides decision, confidence and readiness; the hackathon "Evidence" label is hidden when empty; a whole-account snapshot opens on the welcome page.
- Refresh template: the READONLY_APPS block covers customer editions and the in-place offline copy rebuild.
- Lessons: app sharing does not reach guest accounts (use the offline copy); publish a new app before renaming it.

## 1.9.0 — read-only customer apps, full offline copies, evidence stays internal
- Read-only app per customer account team (optional/read-only-customer-app): copy lists on the same site synced by `customer_copy.py` (create, patch, retire as tombstones, remap ids, verify; refuses any write to the master lists), a `readOnly: true` app that hides and refuses every edit, AI call and file write, and a refresh block that syncs every listed account last. The copy never carries evidence: Evidence, Sources, LastSignal and SignalCount are blank and no Signals rows are copied.
- Evidence only in the owner's app: the Evidence tab is hidden in read-only apps and offline copies; internal source chips are hidden in read-only solution pages.
- Evidence and source links fixed: only absolute web addresses (http/https) become links; text such as "No direct link available" or a source named in words stays plain text (it used to become a broken link to the app itself). New `externalUrl()` in lib/safe-url.ts, used in the dossier's data sources, solution Learn links, blueprints and pathways.
- Complete lists: use cases, signals and features are read across every page (the app showed only the first 250 rows before).
- Full offline copy of one use case ("…" menu): the whole app in one HTML file (pre-built viewer `public/offline-viewer.txt`, `npm run build:viewer`), internal or customer version, hash routing, read-only, no network. Customer configuration and the logo travel only in the copy's own snapshot. Replaces the light HTML export (`components/use-case-export.tsx` removed).
- Save to SharePoint: offline copies and PDFs are saved as real files in the site's Documents > Offline copies (SharePoint connector Create file, byte-identical, size checked) with Download / Open and a local fallback. The site is the new `siteUrl` setting in radar.config.ts; without it the app only downloads.
- No internal Microsoft 365 links (Teams, SharePoint/OneDrive, Outlook) in any downloaded file: offline copies and PDF exports are scrubbed (lib/link-scrub.ts). The app's own Sources list keeps its links.
- Shared data adapter `src/data/services.ts`: every module imports the list services from it, so the owner's app and each read-only app run the same code on their own lists.
- Template files changed by the radar (App.tsx, main.tsx, lib/console-capture.ts, components/pdf-export-button.tsx), `vite.viewer.config.ts`, the `build:viewer` script and the `@microsoft/managed-apps` 0.6.0 pin are documented in app/SCAFFOLD.md.
- Refresh template: 100% coverage collection (every mail folder with attachments, every chat including untitled ones judged by members and content, every channel with replies, every meeting with transcripts, every document) with an auditable coverage ledger; inspiration lists are never a source; report only what was done and verified; every triggered use case is designed through the full L2 chain (eight specialist sub-agents, tech views, KPIs, solution experience, creative, FinOps) with no stage gate and no per-run cap; a first design is written as Current; no internal Microsoft 365 links in designs; optional READONLY_APPS block.
- Schema: `schema/playbook.l2-chain.json` (the design chain, seeded as a content row).

## 1.8.0 — data-driven app, latest-version-only records, red clarification questions
- Use case page redesigned for simplicity: every fact shown once. Stage, decision, confidence, route, roadmap, value, complexity, effort and department are chips that open a small pop-up to read or change them. Business case readiness sits at the top (score ring plus ten dots; each dot opens what is there or missing). Description, business owner and next steps are on Overview. New Participants tab. Problem & outcome, Landscape & value and FinOps are cards and visuals (today vs target flow, system chips, volume tiles, KPI today → target cards, value tiles, run-cost summary); editing happens in dialogs. Potential solution is a single picture (what goes in → building blocks by layer → what comes out, plus how it runs). Discard, PDF and Complete with AI are in a "…" menu.
- Download one use case end to end as a single offline HTML file ("…" menu): dossier, participants, next steps, problem, landscape, FinOps, potential solution, the full solution experience and any hackathon chapter, with the same tabs as the app (one section at a time; printing shows every section) and "Show all" for long text. Two versions: internal (adds the red questions, analysis and evidence) and customer (without them; the only one offered in the customer edition). Opens in any browser without the app or a network.
- New UseCases columns People ("Name | Job title | Organisation | Location | Role in the project | Owner") and Steps ("Status | Due | Who | Action | Detail"). Next steps show as date cards; tick Mark done in the app, and the refresh closes steps it sees happen.
- 100% data-driven: the app no longer bundles any use-case content. Solution designs, images, wave plans, what-if scenarios and redesign requests are read from Customers-704f56 rows (new Doc* columns: DocKind, DocRef, DocPart, DocSeq, DocChunks, DocBody, DocStatus, DocVersion, DocRoute, DocReason, DocOrigin). Customer settings rows are tagged DocKind = "customer". `src/data/solutions/` and `src/data/wave-plans/` are gone — see "Moving an instance to 1.8.0" in skill/SKILL.md.
- Redesign flow: when a use case's route changes (or you ask for it in the app), the refresh writes a Proposed design following the rule book `schema/playbook.redesign.json`; a bar on the solution page shows the proposal and why it was made, and lets you accept it (the old design is archived), reject it or restore the previous one. A route editor on the dossier changes the route; the bar then offers to request a redesign, and a use case with no design offers "request a design". When the use case has received new evidence since its design was made, an amber bar says so and offers "Update with the latest evidence"; "Refresh from latest evidence" is always available under the design. The refresh now also rebuilds a design end to end when material new evidence arrives (stale-design trigger), putting use cases with an event in the next 30 days first.
- Route-specific solution pages (blueprints per route: no AI, code app, M365 Copilot, Copilot Cowork, Copilot Studio, Fabric, Foundry), optional hackathon and pathway chapters driven by data, and a "What if Microsoft?" scenario that keeps a customer's non-Microsoft platform choice and adds the Microsoft alternative beside it (with a cost comparison).
- Clarification questions in red: lines starting "CLARIFY:" in OpenQuestions are shown in a red panel on the welcome page, the customer page and above the dossier tabs, each linked to its use case. They are internal: hidden in the customer edition and stripped from the static snapshot. Each question has Answer and Not relevant: the line disappears at once, the answer is recorded in Evidence ("Owner answer: question → answer"), on the dossier the input reviewer opens with the answer so it can be applied to the fields straight away, and the refresh merges any remaining answers and never asks the same question again. CLARIFY lines are rare by design (at most 2 per use case, only material contradictions).
- Latest version only: every field holds one consolidated current statement; no dated "Refresh …" lines. History stays in Evidence and Sources. New prompts: source-analysis-protocol.md (segment-by-segment statement ledger with dispositions and a coverage check) and latest-version-consolidation-brief.md.
- Refresh template rewritten: twice a day, transcript reading for every meeting that ended in the window, the depth protocol, CLARIFY handling, people's edits merged (never overwritten), duplicate guard, Microsoft-proposal import, leadership priorities monthly, cost logging that includes sub-agents, a final check against dated wording, optional single-customer copy and customer-edition blocks, and step 10 solution designs.
- Schema: lists.json now lists the columns earlier versions used but did not declare (UseCases: Department, ValueLevel, ValueBasis, PriorityFit, PriorityWhy; Customers: ReportTitle, ReportUrl, ReportYear, Headline, Priorities) and notes the 255-character limit of single-line columns.
- Customer snapshot: make_data.py strips CLARIFY lines.
- Note: SharePoint lists created through some connectors can be blocked by tenant data policies; if the app cannot read a list, check the Power Platform data policy for the SharePoint connector before rebinding.

## 1.7.1 — PDF fix, FinOps in the customer edition
- Fix: the dossier PDF was almost empty (only the header; tabs were hidden or still fading in when captured). It now exports every visible tab, one tab per page start, boxes kept whole across pages. Includes an updated lib/pdf-export.ts (new createSectionedPdfBlob) — copy it over the template file.
- Customer edition now shows FinOps (use case economics, sizing and controls); only the radar's own AI consumption meter stays internal.

## 1.7.0 — Add input: any input, challenged, reviewed and applied
- New "Add input" button on every use case (internal edition). Paste anything — an email, meeting notes, a Teams thread, a customer document extract, your own remarks — or attach a text file (.txt, .md, .csv, .eml, .vtt transcript).
- The in-app agent CHALLENGES the input (vague claims, figures without basis, contradictions with the dossier, solutions presented as problems), you can answer its challenges and ask it to review again.
- It then PROPOSES field-level changes with current vs proposed text, reason, confidence and a conflict flag; you tick, edit and apply. Conflicts and low-confidence proposals start unticked. Nothing is saved before you apply; every apply can be undone.
- On apply, readiness, open questions and analysis are re-scored, the input is recorded in Evidence and Sources, and the AI use is logged as an estimate.
- Customer edition: the button is hidden.

## 1.6.0 — Use Case Coach built in, customer edition, static snapshot
- Use Case Coach (in-app agent) is now part of the core app: "Complete with AI" on every dossier asks the missing readiness questions and saves answers (with undo). Needs the Agents (shared_agentnode) data source bound to the app.
- Customer edition: set `customerEdition: true` in radar.config.ts to hide internal views (AI cost meter, feature radar, FinOps, How it works, Analysis and Evidence tabs, the coach). Point it at a site that holds only customer-safe columns.
- optional/customer-snapshot: build a single read-only HTML file of the customer edition for external people (no app, licence or guest account needed), rebuildable by the refresh.
- Fix: Coach reads answers returned only as activities; failures stay inside the panel.

## 1.5.1 — fix
- prompts/creative-validate.py: fixed a typo that stopped the check script from running.

## 1.5.0 — search, creative experiences, multi-view architecture, resilience
- Search in the header (button or Ctrl+K): find a use case by a word in the title, a reference number or its id; jump straight to the dossier or the solution.
- Solution experience: larger hero images with a slow pan, a slim sticky chapter bar with mouse-friendly scroll arrows and wheel scrolling, and a per-use-case "creative" block: six journey styles (metro, swimlanes, before/after split, story cards, spiral, curve), animated headline numbers, a signature line, a day-in-the-life clock, a fun fact, a short quiz and a domain background motif.
- Reference architecture with four views per use case: Layers (experience, intelligence, orchestration, data, platform), System context, Data (sources, classification, pipeline, outputs, residency) and Decisions & requirements (options, choice, Microsoft Learn link, non-functional requirements). The previous diagram remains as "Deployment view" next to "How it runs".
- Resilience: a crash stays inside the page or panel ("Try again"), and the app reloads itself once when old and new code are mixed after a publish.
- Compact top bar on smaller screens; customer-neutral search examples.
- Prompts: creative-brief.md, tech-views-brief.md and their validators.
- Optional Use Case Coach: reads answers returned only as activities; failures stay inside the coach panel.

## 1.4.0 — value measures, dollars only, unique solution experiences
- Three value measures everywhere: estimated time saved (hours, never converted to money), cost savings ($) and revenue gain ($). A shared metrics strip sits at the top of the customers overview, customer page, portfolio, roadmap and wave plans and follows every filter.
- KPI lines gain an optional 10th field, Kind (Time, Cost or Revenue); money is in US dollars only (old euro values are read and shown in dollars at 1.08).
- Solution experience redesigned per use case: six layouts (cinematic, editorial, blueprint, storyboard, console, dashboard), use-case-specific chapter order and titles, own hero image, and eight interactive demo types (inbox triage, document extraction, chat with sources, live alerts, what-if, draft compare, process race, approval flow).
- New "What we need and why" chapter replaces the specialist board.
- Real technical architecture view (environments, services, connectors, gateway, protocols, authentication, identity, security, networking, ALM, monitoring, data residency) next to the business flow view.
- Roadmap timeline rebuilt: wave delivery plans as swimlanes, plus a customer-dates view.
- Customer branding: optional identity block per customer (purpose line, accents, hero image, key facts).
- Prompts: solution-experience-brief.md and its validator.
- Optional: Use Case Coach (in-app agent) in optional/use-case-coach.

## 1.3.0 — solution experience and wave delivery plans
- Solution experience per use case (/use-case/:id/solution): hero image, Today/Tomorrow story, day in the life, personas, clickable experience curve, interactive layered architecture with a "Play the flow" walk-through, eight-specialist board, configure/build/deploy plan with timeline, KPIs, risks, run-cost drivers and Microsoft Learn references.
- Wave delivery plan per wave (/customer/:account/wave/:id): foundations to set up, workstreams, timeline, effort by role, team, governance, decisions and risks; linked from the roadmap wave cards.
- Solutions and wave plans are JSON files bundled in src/data/solutions/<id>.json and src/data/wave-plans/<account>-<wave>.json (schema in src/lib/solutions.ts).
- New prompts: solution-board-brief.md (runs the eight L2 specialist roles per use case) and wave-plan-brief.md.
- Twelve calm theme images in src/assets/themes.

## 1.2.0 — roadmap
- Roadmap page per customer (and a Roadmap strip on the customer page): wave summary with counts and estimated savings; timeline of waves and dated use cases; board with one column per wave plus ranked candidates; move cards between waves and set the customer decision from each card; filters; PDF export.
- Customer decisions are kept apart from proposals: gold "Customer decided" cards (WaveSource "Customer …") versus dashed "Proposal" cards (WaveSource "Set in app <date>").
- Candidate score (0–10) = value + low effort + leadership fit + readiness.
- Use case page: wave, customer decision, start and target dates in the ownership box.
- Wave editor (name, start and end month, add/remove) stored in Customers-704f56.Waves.
- New list columns: UseCases (Wave, CustomerDecision, WaveSource, CustomerStatus, StartDate, TargetDate, PercentDone, RoadmapNote), Customers (Waves). The refresh captures explicit customer decisions and never overrides app placements.

## 1.0.0 — first kit release
- Welcome page with the six-step walkthrough and an AI consumption card; AI meter on every screen.
- Customer pages: brand header, estimated saving from validated use cases, editable hourly cost, 3×3 complexity × effort map with spread dots, route bar chart and route-filtered portfolio.
- Use case dossier: internal customer reference, description, ownership, stage/confidence/decision with meanings, three-colour readiness, KPI table (current vs expected, valued in $), all-AI FinOps sizing (credits, M365 Copilot, Foundry tokens, Fabric, Power Platform, Azure, build), deep analysis with documentation links, insight-led assessment, questions, signals, related use cases, data sources, potential solution, discard/restore, PDF export.
- FinOps page, How it works page (all definitions), Feature radar.
- Single configuration file `src/radar.config.ts`; single-customer mode when there is one customer and no Internal bucket.
