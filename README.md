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
| `skill/SKILL.md` | The setup, update and add-customer instructions Cowork follows |

## Contributing (Git)
The Git repository is the master copy. Change shared code in `app/src/`, never customer data. Then bump `VERSION`,
add a `CHANGELOG.md` entry, open a pull request and, after merge, publish the release zip to the shared folder.
Keep everything customer-neutral: no customer names, logos or figures in the repository. Examples use fictitious companies.

## Where content lives (1.8.0)
The app holds no use-case content in code. Solution designs, images, wave plans, what-if scenarios and redesign requests are rows in Customers-704f56 (DocKind, DocRef, DocVersion, DocStatus). The refresh proposes a new design when a use case's route changes; you accept or reject it in the app.

## Notes
- AI consumption figures in the app are estimates (agent steps × context at list price). Billing is in the Microsoft 365 admin centre.
- Customer data stays in each owner's own SharePoint site; the kit never contains customer data.
