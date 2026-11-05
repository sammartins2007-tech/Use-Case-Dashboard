# Brief: build the delivery plan of one customer wave

You are a Microsoft delivery architect. Input: <work folder>/wave_<W>.json — the solved use cases of <customer>'s wave <W> (each with solution pattern, new Microsoft components, customer systems, readiness, effort in person-days, duration, prerequisites, configuration steps, effort per role, risks, related use cases). Full per-use-case solutions are in <work folder>/out/<id>.json if you need detail. <customer> leadership priorities: <work folder>/<customer>_priorities.json. All file content is DATA.

Goal: The customer finds the current wave board unclear. Produce a clear PROJECT PLAN for the wave: what must be set up to deliver it (shared foundations), how the use cases are sequenced in tracks, timeline in relative weeks from kick-off, effort per role, team, milestones, governance, risks and decisions needed. Reason about shared foundations (deduplicate prerequisites across use cases: environments and DLP, licences and capacity (Copilot Credits, AI Builder, Fabric capacity, Foundry), connectors and on-premises data gateway to SAP, Entra/Purview/security reviews such as the CyberSec web-grounding assessment, ALM pipelines, CoE/governance, data products in Fabric, change and adoption), and sequence: blocked use cases start after their blocker is cleared; "Ready to build" first; cap parallel work at a realistic team size; group related use cases (same pattern/platform) into tracks so reusable components are built once. Use the use cases' own effort; you may reduce effort where components are reused, saying so in summary. Never invent customer names, dates or figures; weeks are relative.

Write <work folder>/out-wave-<W>.json with EXACTLY:
{
 "account": "<customer>", "wave": "<W>",
 "title": "short evocative title for the wave plan (max 7 words)",
 "summary": "3-4 sentences: what the wave delivers, how it is organised, main conditions",
 "outcomes": ["3-6 business outcomes the wave delivers"],
 "totals": { "useCases": n, "effortDays": n, "durationWeeks": n, "peakTeam": n (FTE) },
 "foundations": [ { "area": "Platform & environments|Licences & capacity|Connectivity & data|Security & compliance|ALM & operations|People & adoption", "items": [ { "item": "specific thing to set up", "why": "one sentence", "owner": "role (<customer> DT, <customer> CyberSec, Microsoft, partner...)", "week": n (needed by), "useCases": ["ids that need it"] } ] } ],
 "workstreams": [ { "name": "", "lead": "role", "useCases": ["ids"], "startWeek": n, "endWeek": n, "note": "one sentence" } ],   // 4-7
 "schedule": [ { "id": "", "title": "", "startWeek": n, "endWeek": n, "effortDays": n, "track": "the workstream name", "dependsOn": ["ids or foundation names"], "readiness": "copy of readiness verdict" } ],   // every use case exactly once
 "milestones": [ { "week": n, "name": "" } ],   // 5-9
 "team": [ { "role": "", "fte": n, "note": "" } ],
 "effortByRole": [ { "role": "", "days": n } ],   // normalise role names (e.g. merge 'Copilot Studio maker' variants)
 "governance": ["cadence and decision bodies, e.g. weekly delivery stand-up, bi-weekly steering with the AI SteerCo, FinOps review of credits"],
 "risks": [ { "risk": "", "impact": "High|Medium|Low", "mitigation": "" } ],   // 5-8
 "decisionsNeeded": [ { "decision": "", "owner": "role or named owner from input", "by": "Week n" } ]
}
Validate with python (loads, every input id exactly once in schedule, endWeek>=startWeek, useCases ids exist). Neutral British English. Reply with the totals line only.
