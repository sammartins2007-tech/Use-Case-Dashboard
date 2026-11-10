---
name: ai-use-case-radar
description: Set up, update or extend an "AI Use Case Radar" — a personal App Builder app that tracks a seller's AI use cases per customer, fed daily by Work IQ (mail, Teams, meetings, documents), with a complexity × effort map, platform classification, KPI values, savings and all-AI FinOps sizing. Use when the user says "set up my AI Use Case Radar", "add a customer to my radar", "update my radar from the kit", or attaches the AI-Use-Case-Radar kit. Not for one-off use case briefs.
---

# AI Use Case Radar — setup kit

The kit (this folder) holds four things:
- `app/` — the shared app code. `app/src/**` is kit-owned; `app/radar.config.template.ts` becomes the instance's only custom file `src/radar.config.ts`.
- `schema/lists.json` — the five SharePoint lists. Names and columns are fixed: the app code is generated from them.
- `prompts/daily-refresh.template.md` — the Work IQ refresh (twice a day), with `{{PLACEHOLDERS}}`.
- `prompts/source-analysis-protocol.md` — the exhaustive, auditable way every transcript and substantive email is analysed (segment ledger, dispositions, coverage check).
- `prompts/latest-version-consolidation-brief.md` — the "latest version only" field rules and CLARIFY questions, also usable for a bulk clean-up.
- `prompts/*-brief.md` — optional bulk analysis briefs (dossier rewrite, KPI quantification) for parallel sub-agents.
- `schema/playbook.redesign.json` — the solution-design rule book, stored as a content row (see setup step 1).

`VERSION` is the kit version. The instance records the version it runs in `src/KIT_VERSION`.

Kit rules: customer names, logos, colours and people belong ONLY in `src/radar.config.ts`, `src/assets/logos/` and the SharePoint data, never in kit code. Examples use fictitious companies (Contoso, Fabrikam).

## Operation 1 — Set up a new radar

Gather first, asking only what cannot be looked up (one question round):
1. Owner name and team (from the user's profile), app title (default "AI Use Case Radar").
2. Customers: exact names. For each, a brand primary and dark colour. Take them from the customer's public brand guidelines or website, or from a template pack the user attaches. Use a logo PNG only if the user attaches one; otherwise the name is shown as a wordmark.
3. Whether to keep an "Internal" bucket for account-team work (default yes).
4. The Teams channels to listen to (optional): team id and channel id, resolved with the Teams tools.
5. Default hourly cost in USD (default 50).

Then:
1. **SharePoint**: create a private site named after the app (CreateSite), or use the site the user names. Create the five lists from `schema/lists.json` with CreateLists. Replace `{{ACCOUNTS}}` with the customer names plus "Internal" if kept. Record the five list ids. Add one Customers-704f56 row per account: Title = account, HourlyRateUSD = default, DocKind = "customer". Then seed the content store: one Customers-704f56 row Title = "playbook redesign", DocKind = "playbook", DocRef = "redesign", DocStatus = "Current", DocVersion = 1, DocSeq = 0, DocChunks = 1, DocBody = the text of `schema/playbook.redesign.json` (write it with a Microsoft Graph batch call: the list-item tools reject values over 4,096 characters).
2. **App**: follow the app-generation skill to create an App Builder app (title = app title). Then:
   - Copy every file under kit `app/src/` over the app's `src/`, overwriting, and delete `src/pages/home.tsx`. Never touch protected scaffold files: config files, package files, `index.html`, `src/components/ui/**`, and pdf/spatial/model/pen/shortcut components.
   - Write `src/radar.config.ts` from the template with the gathered values, put logos in `src/assets/logos/`, and write the kit VERSION into `src/KIT_VERSION`.
   - Bind the five lists with `appbuilder-DataSourceAdd` (connector `shared_sharepointonline`, mode `table`, dataset = site URL, table = the list name). The data source names must come out as usecases_704f56, signals_704f56, featureradar_704f56, aiconsumption_704f56 and customers_704f56.
   - Typecheck and lint, run the pre-deploy gate, then publish.
3. **Refresh**: fill `prompts/daily-refresh.template.md`: owner, app title, site URL, the site's Graph id (`{{SITE_GRAPH_ID}}`, host,site-id,web-id), the five list ids, accounts sentence, `{{FX_RULE}}` (default "€1 = $1.08"), and keep or remove the optional blocks (Teams channels, single-customer copy, customer edition and snapshot). Create it with SetupScheduledPrompt: twice a day (for example 07:00 and 14:00 local time), separate execution, with the tools named in the template header. Warn the user that the first runs may wait for a one-time tool approval.
4. **First fill (optional, ask)**: run the refresh once now. Or, if the user attaches a customer pipeline (Excel), import it: one UseCases row per item, reference in InternalRef, Stage Signal. Also import the customer's own roadmap decisions when the pipeline has them (a prioritised/wave column, status, start and target dates, % done) into Wave, CustomerDecision, WaveSource "Customer pipeline <date>", CustomerStatus, StartDate, TargetDate and PercentDone, and write the wave list to Customers-704f56.Waves ("W1 | Wave 1 | start YYYY-MM | end YYYY-MM", dates blank when unknown). Then run `prompts/dossier-rewrite-brief.md` and `prompts/kpi-quantification-brief.md` with 6–8 parallel sub-agents of about 30 records each, and write the results back with UpdateListItem in a script. Log each bulk run as one AIConsumption-704f56 row (Estimated = true; same pricing as the template).
5. Tell the user the app link, the site, what the refresh reads, and that AI figures are estimates.

## Operation 2 — Update the radar from a newer kit

1. Compare kit `VERSION` with the instance's `src/KIT_VERSION`, and read `CHANGELOG.md` for the versions in between.
2. Copy kit `app/src/**` over the instance's `src/`, keeping `src/radar.config.ts` and `src/assets/logos/`. If the changelog adds fields to `RadarConfig`, add them to `radar.config.ts` with their defaults.
3. Add any new list columns from `schema/lists.json` with UpdateListSchema (add only, never remove), then `appbuilder-DataSourceRefresh` for each affected list.
4. Re-fill the refresh template and update the scheduled prompt with EditScheduledPrompt, keeping the instance's values.
5. Typecheck, run the gate, publish, update `src/KIT_VERSION`, and summarise what changed in plain words.

### Moving an instance to 1.8.0 (content store)
Versions before 1.8.0 bundled solution designs and wave plans as JSON files in `src/data/solutions/` and `src/data/wave-plans/`. From 1.8.0 the app reads them only from Customers-704f56 content rows. Before copying the new code: add the Doc* columns and the leadership columns (step 3), tag every existing customer row DocKind = "customer", and write each bundled file as content rows (solution: DocKind "solution", DocRef = use case id; wave plan: DocKind "waveplan", DocRef = "<account>-<wave>"; DocStatus "Current", DocVersion 1, DocBody pieces of at most 30,000 characters, DocSeq 0,1,2…, DocChunks = number of pieces) with Graph batch calls. Read the rows back and check that the joined DocBody equals the file before deleting the bundled folders. Seed the playbook row as in setup step 1, and set each kind's exemplarRef to one migrated design of that kind.

## Operation 3 — Add a customer

Add the customer to `radar.config.ts` (colours and an optional logo). Add the name to the Account choices of UseCases-704f56 and Signals-704f56 (UpdateListSchema). Add a Customers-704f56 row with the default rate and the account to the refresh prompt's scope. Then publish.

## Operation 4 — Single-customer copy for a customer Team (optional)

Set up a second instance on the customer Team's own site, with `customers` holding the one customer and `internal: null`. Share the app individually with the Team members (sharing to a group can be rejected). Extend the main refresh with a mirror step: copy that customer's rows both ways by SourceId, and never copy any other customer.

## Operation 5 — Deep re-analysis or catch-up (on request)
When the owner doubts a source was analysed deeply enough, or asks for a catch-up:
1. Gather the sources in the window (meetings that ended in it with their transcripts, substantive emails, channel posts, documents).
2. Run `prompts/source-analysis-protocol.md` with one sub-agent per long source (split long transcripts into parts). Each writes a ledger: every statement with speaker, time, topic, use case, field and disposition, plus coverage numbers.
3. Run `prompts/latest-version-consolidation-brief.md` over every use case the ledgers touch (and any record with dated wording), 6–10 sub-agents in parallel.
4. Validate in code before writing: only known columns, single-line columns ≤ 255 characters, no dated or history wording outside Evidence and Sources, at most 5 CLARIFY lines per use case. Write with Graph batch calls, then mirror any copies.
5. Report to the owner the ledger coverage per source (segments, statements, used), the CLARIFY questions raised and the AI cost (logged in AIConsumption-704f56, sub-agents included).

## Quality gate
- Never invent facts, figures, people or dates in any list.
- Signals pass the strict signal filter; logistics never become signals.
- Every AI run is logged in AIConsumption-704f56, sub-agents included.
- Latest version only: each field holds one consolidated current statement; history and dates live only in Evidence and Sources; contradictions become CLARIFY lines (shown in red, never in the customer edition).
- Every source is analysed with the segment ledger; never summarise a transcript from its first part only.
- Test every page and key interaction with the mouse before publishing.
- Plain business language to the user; no tool names, ids or paths.
