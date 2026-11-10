# Changelog

## 1.8.0 — data-driven app, latest-version-only records, red clarification questions
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
