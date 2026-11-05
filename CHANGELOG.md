# Changelog

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
