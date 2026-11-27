# AI Use Case Radar — kit

A personal app that tracks AI use cases per customer. Twice a day Work IQ feeds it from your mail, Teams, meetings and documents.
It qualifies each use case against five gates, classifies it into one of eight platform routes and places it on a
complexity × effort map. It also values the KPIs and sizes all AI costs (FinOps), so every use case is ready for a business case.

Open **START-HERE.html** for the visual install guide.

## Get the kit
There is one kit file, always the latest version: **AI-Use-Case-Radar-kit.zip** in the shared folder "AI Use Case Radar - Kit".
The name never changes; the version is in the `VERSION` file inside. Ask the kit owner for the link.

## Set it up (about 30 minutes, mostly unattended)
1. Open Cowork and start a new task.
2. Attach AI-Use-Case-Radar-kit.zip.
3. Type: **"Set up my AI Use Case Radar for Contoso and Fabrikam using the attached kit."** Use your own customer names.
4. Answer the one round of questions: customers, brand colours or logos, the Teams channels to listen to, and your hourly cost.
5. Cowork creates your SharePoint site and lists, builds and publishes the app, and schedules the daily refresh.

Optional: to make the kit a permanent Cowork skill, say "create a skill from skill/SKILL.md in the attached kit".

## Get improvements
Only the latest kit version is kept. When it changes (see CHANGELOG.md), download AI-Use-Case-Radar-kit.zip again from the same folder, attach it and type **"Update my AI Use Case Radar from the attached kit."**
Your customers, logos, data and settings are kept. Only the shared code, list columns and refresh rules change.

## What is in the kit
| Folder | Content |
|---|---|
| `app/src/` | Shared app code (do not edit per customer) |
| `app/radar.config.template.ts` | The one file that holds your customers, colours, logos and names |
| `schema/lists.json` | The six SharePoint lists (Customers-704f56 also holds the content store; SEAgentCalls-704f56 carries the SE agent calls) |
| `prompts/daily-refresh.template.md` | The Work IQ refresh (twice a day) |
| `prompts/source-analysis-protocol.md` | How every transcript and email is analysed, statement by statement, with a coverage check |
| `prompts/latest-version-consolidation-brief.md` | One current statement per field; contradictions become red CLARIFY questions |
| `schema/playbook.redesign.json` | Rule book for solution designs, stored in the content store |
| `prompts/*-brief.md` | Bulk analysis briefs (dossier rewrite, KPI values) |
| `schema/playbook.l2-chain.json` | The design chain (eight specialists, views, KPIs, experience, creative, FinOps) stored in the content store |
| `agents/se-specialists/` | The eight SE agents (Copilot Studio), one folder each: instructions, model, channels and the Microsoft Learn tool |
| `agents/se-board-flow/` | The agent flow "Radar - call SE agent" that calls each SE agent and writes its answer back |
| `app/SCAFFOLD.md` | The template files and project settings the radar changes |
| `optional/read-only-customer-app/` | A read-only app per customer account team, synced from your lists |
| `optional/customer-edition/` | A customer-safe edition and its offline HTML copy for guests |
| `optional/radar-ops/` | The toolkit the refresh installs to sync copies, rebuild the offline copy and check consistency |
| `skill/SKILL.md` | The setup, update and add-customer instructions Cowork follows |
| `START-HERE.html` | The visual install guide (also shared next to the zip) |

## The agents
The radar works with two kinds of agents, and the kit carries both. Setup creates every one of them in the new owner's
environment.

| Agent | What it does | When it runs | Defined in | Set up by |
|---|---|---|---|---|
| **Use Case Coach** ("Complete with AI") | Interviews the owner one question at a time and fills the missing dossier fields, readiness, open questions and analysis | When the owner clicks Complete with AI on a use case | `app/src/lib/coach.ts` | Setup step 2: the Agents connection (`shared_agentnode`, data source `agentnode`) |
| **Input Reviewer** ("Add input") | Challenges a new email, note or document extract like a sceptical architect and proposes changes the owner accepts one by one | When the owner clicks Add input | `app/src/lib/input-review.ts` | The same connection |
| **Eight SE agents** (L2 specialist board) | Copilot Studio agents, one per specialism: Copilot Studio · M365 Copilot & Co-Work · Power Platform · Azure AI / Foundry · Data & Knowledge Architecture · Integration & Tools · Security & Compliance · D365. Each assesses a use case from its own role, grounded in Microsoft Learn through its Microsoft Learn Docs MCP tool. Their answers ARE the board; the radar never writes a specialist opinion itself | In every refresh (step 10), for each use case that needs a design (none yet, a route change, material new facts, or a request from the app): the refresh writes one call per agent into SEAgentCalls-704f56, the agent flow "Radar - call SE agent" calls the agent (an agent node calling the published agent) and writes its answer back. Also available any time in Teams and Microsoft 365 Copilot | `agents/se-specialists/<role>/` (the agents), `agents/se-board-flow/` (the flow), `prompts/specialists.md` (roster and message) and `prompts/solution-board-brief.md` (calling, waiting, arbitration) | Setup steps 1 (list), 2b (agents), 2c (flow and the `se-agents` roster row) |
| **Design chain** | Technical views, KPI values, the solution experience and the creative, each checked by its validator script, then the FinOps sizing | The same step, after the board | `prompts/tech-views-*`, `prompts/kpi-quantification-brief.md`, `prompts/solution-experience-*`, `prompts/creative-*` | The same playbook row |
| **Source analysts** | Read long transcripts and documents in parts, statement by statement, with a coverage ledger | Every refresh, for long sources | `prompts/source-analysis-protocol.md` | The refresh prompt (setup step 3) |

- The two app agents are Copilot Studio agents whose definition travels in the app code (`app/src/connectors/inline-agent.ts`);
  their instructions are built at each click from the use case. They run as the signed-in owner, are switched off in read-only
  copies and customer editions, and every run is logged in AIConsumption.
- The eight SE agents live in Copilot Studio and the refresh calls them for every design: one row per agent in
  SEAgentCalls-704f56, answered by the agent flow. A use case designs only when all eight have answered; there is no
  fallback. Each call is kept in the list (message, answer, conversation id) and each opinion in the design keeps the
  agent's full answer, so every verdict can be traced back. The calls use Copilot Credits in the owner's environment.
- The design chain after the board (views, KPIs, experience, creative, FinOps) and the source analysts are Cowork
  workers. `schema/playbook.l2-chain.json` carries the same text as `prompts/`: that is the copy the refresh reads,
  so the two must stay identical. Setup and update both check it.
- To change an SE agent, edit its `agent.yaml` in `agents/se-specialists/`, bump `VERSION`, and run "Update my AI Use Case
  Radar": every instance updates its agents. To change how they are called, edit `prompts/specialists.md` or
  `prompts/solution-board-brief.md` and copy the text into `files` of `schema/playbook.l2-chain.json`.

## Contributing and releasing (Git)
The Git repository is the master copy of the sources; it never holds use cases, run results or customer data.
Change shared code in `app/src/`, never customer data. Then bump `VERSION`, replace the top `CHANGELOG.md` entry and push.
Releasing = rebuilding the one distributed zip from the repository: run `Publish-RadarKit.ps1` (kit owner only). It builds
AI-Use-Case-Radar-kit.zip from the latest commit (without the script itself and `.gitignore`), overwrites it in the shared
folder "AI Use Case Radar - Kit" and copies START-HERE.html next to it as AI-Use-Case-Radar-install-guide.html, so the link
never changes. No version tags and no GitHub releases: earlier versions live only in the Git history.
Keep everything customer-neutral: no customer names, logos or figures in the repository. Examples use fictitious companies.

## Where content lives
The app holds no use-case content in code. Solution designs, images, wave plans, what-if scenarios and redesign requests are rows in Customers-704f56 (DocKind, DocRef, DocVersion, DocStatus). The refresh proposes a new design when a use case's route changes; you accept or reject it in the app.

## Sharing with account teams
You edit; they read. A read-only app per customer shows that account's use cases, designs, roadmap and FinOps, without evidence, internal questions or any other customer. See `optional/read-only-customer-app/README.md`.

## Sharing with the customer
App Builder apps cannot be shared with guest accounts. A customer edition on a separate site strips every internal field, question, link and design part, and an offline HTML copy of it on that site is what the customer opens. See `optional/customer-edition/README.md`.

## Presenting the radar
**Inside the Radar** (menu) tells the whole story full screen, on your own live data: what a use case is, how it is
detected and kept current, how eight SE agents design the answer, how people decide, and the twice-daily run.
Follow one use case through it, and switch on Show mode to mask customer and people names for an audience.
The **Backlog** page lists the improvements that could come next. Each next step shows where it came from and when;
the deployment view draws every connection around the boxes, numbered, with the list below it.

## Notes
- AI consumption figures in the app are estimates (agent steps × context at list price). Billing is in the Microsoft 365 admin centre.
- Customer data stays in each owner's own SharePoint site; the kit never contains customer data.
