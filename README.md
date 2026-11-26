# AI Use Case Radar — kit

A personal app that tracks AI use cases per customer. Twice a day Work IQ feeds it from your mail, Teams, meetings and documents.
It qualifies each use case against five gates, classifies it into one of eight platform routes and places it on a
complexity × effort map. It also values the KPIs and sizes all AI costs (FinOps), so every use case is ready for a business case.

## Set it up (about 30 minutes, mostly unattended)
1. Open Cowork and start a new task.
2. Attach this kit (the zip, or the folder from the shared location).
3. Type: **"Set up my AI Use Case Radar for Contoso and Fabrikam using the attached kit."** Use your own customer names.
4. Answer the one round of questions: customers, brand colours or logos, the Teams channels to listen to, and your hourly cost.
5. Cowork creates your SharePoint site and lists, builds and publishes the app, and schedules the daily refresh.

Optional: to make the kit a permanent Cowork skill, say "create a skill from skill/SKILL.md in the attached kit".

## Get improvements
When a new kit version is published (see CHANGELOG.md), attach it and type **"Update my AI Use Case Radar from the attached kit."**
Your customers, logos, data and settings are kept. Only the shared code, list columns and refresh rules change.

## What is in the kit
| Folder | Content |
|---|---|
| `app/src/` | Shared app code (do not edit per customer) |
| `app/radar.config.template.ts` | The one file that holds your customers, colours, logos and names |
| `schema/lists.json` | The five SharePoint lists (Customers-704f56 also holds the content store) |
| `prompts/daily-refresh.template.md` | The Work IQ refresh (twice a day) |
| `prompts/source-analysis-protocol.md` | How every transcript and email is analysed, statement by statement, with a coverage check |
| `prompts/latest-version-consolidation-brief.md` | One current statement per field; contradictions become red CLARIFY questions |
| `schema/playbook.redesign.json` | Rule book for solution designs, stored in the content store |
| `prompts/*-brief.md` | Bulk analysis briefs (dossier rewrite, KPI values) |
| `schema/playbook.l2-chain.json` | The design chain (eight specialists, views, KPIs, experience, creative, FinOps) stored in the content store |
| `agents/se-specialists/` | The eight SE agents (Copilot Studio), one folder each: instructions, model, channels and the Microsoft Learn tool |
| `app/SCAFFOLD.md` | The template files and project settings the radar changes |
| `optional/read-only-customer-app/` | A read-only app per customer account team, synced from your lists |
| `optional/customer-edition/` | A customer-safe edition and its offline HTML copy for guests |
| `optional/radar-ops/` | The toolkit the refresh installs to sync copies, rebuild the offline copy and check consistency |
| `skill/SKILL.md` | The setup, update and add-customer instructions Cowork follows |

## The agents
The radar works with two kinds of agents, and the kit carries both. Setup creates every one of them in the new owner's
environment.

| Agent | What it does | When it runs | Defined in | Set up by |
|---|---|---|---|---|
| **Use Case Coach** ("Complete with AI") | Interviews the owner one question at a time and fills the missing dossier fields, readiness, open questions and analysis | When the owner clicks Complete with AI on a use case | `app/src/lib/coach.ts` | Setup step 2: the Agents connection (`shared_agentnode`, data source `agentnode`) |
| **Input Reviewer** ("Add input") | Challenges a new email, note or document extract like a sceptical architect and proposes changes the owner accepts one by one | When the owner clicks Add input | `app/src/lib/input-review.ts` | The same connection |
| **Eight SE agents** (L2 specialist board) | Copilot Studio agents, one per specialism: Copilot Studio · M365 Copilot & Co-Work · Power Platform · Azure AI / Foundry · Data & Knowledge Architecture · Integration & Tools · Security & Compliance · D365. Each assesses a use case from its own role, grounded in Microsoft Learn through the Microsoft Learn Docs MCP tool, and returns structured findings to an orchestrator; the board then picks one target pattern and a lead specialist | In every refresh (step 10) for each use case that needs a design: none yet, a route change, material new facts, or a request from the app. Any time in Teams or Microsoft 365 Copilot, where they are published | `agents/se-specialists/<role>/` (the agents); `prompts/specialists.md` and `prompts/solution-board-brief.md` (the board the refresh runs) | Setup step 2b creates, tests and publishes the agents; setup step 1 stores the board in the content store |
| **Design chain** | Technical views, KPI values, the solution experience and the creative, each checked by its validator script, then the FinOps sizing | The same step, after the board | `prompts/tech-views-*`, `prompts/kpi-quantification-brief.md`, `prompts/solution-experience-*`, `prompts/creative-*` | The same playbook row |
| **Source analysts** | Read long transcripts and documents in parts, statement by statement, with a coverage ledger | Every refresh, for long sources | `prompts/source-analysis-protocol.md` | The refresh prompt (setup step 3) |

- The two app agents are Copilot Studio agents whose definition travels in the app code (`app/src/connectors/inline-agent.ts`);
  their instructions are built at each click from the use case. They run as the signed-in owner, are switched off in read-only
  copies and customer editions, and every run is logged in AIConsumption.
- The eight SE agents live in Copilot Studio. The refresh does not call them one by one: it runs their eight roles in parallel in
  Copilot Cowork from the role cards in `prompts/specialists.md` (common rules, the output contract the app reads, and about
  1,000 characters per role; the agents' own instructions run to 5,000–12,000 characters). The design chain and the source
  analysts are Cowork workers too. `schema/playbook.l2-chain.json` carries the same text as `prompts/`: that is the copy the
  refresh reads, so the two must stay identical. Setup and update both check it.
- To change an SE agent, edit its `agent.yaml` in `agents/se-specialists/` and its role card in `prompts/specialists.md`, copy the
  card into `files` of `schema/playbook.l2-chain.json`, bump `VERSION`, and run "Update my AI Use Case Radar": every instance
  updates its agents and stores the new playbook version.

## Contributing (Git)
The Git repository is the master copy. Change shared code in `app/src/`, never customer data. Then bump `VERSION`,
add a `CHANGELOG.md` entry, open a pull request and, after merge, publish the release zip to the shared folder.
Keep everything customer-neutral: no customer names, logos or figures in the repository. Examples use fictitious companies.

## Where content lives (1.8.0 and later)
The app holds no use-case content in code. Solution designs, images, wave plans, what-if scenarios and redesign requests are rows in Customers-704f56 (DocKind, DocRef, DocVersion, DocStatus). The refresh proposes a new design when a use case's route changes; you accept or reject it in the app.

## Sharing with account teams (1.9.0)
You edit; they read. A read-only app per customer shows that account's use cases, designs, roadmap and FinOps, without evidence, internal questions or any other customer. See `optional/read-only-customer-app/README.md`.

## Sharing with the customer (1.9.1)
App Builder apps cannot be shared with guest accounts. A customer edition on a separate site strips every internal field, question, link and design part, and an offline HTML copy of it on that site is what the customer opens. See `optional/customer-edition/README.md`.

## Presenting the radar (1.11.0)
**Inside the Radar** (menu) tells the whole story full screen, on your own live data: what a use case is, how it is
detected and kept current, how eight SE agents design the answer, how people decide, and the twice-daily run.
Follow one use case through it, and switch on Show mode to mask customer and people names for an audience.
The **Backlog** page lists the improvements that could come next. Each next step shows where it came from and when;
the deployment view draws every connection around the boxes, numbered, with the list below it.

## Notes
- AI consumption figures in the app are estimates (agent steps × context at list price). Billing is in the Microsoft 365 admin centre.
- Customer data stays in each owner's own SharePoint site; the kit never contains customer data.
