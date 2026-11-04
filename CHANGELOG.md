# Changelog

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
