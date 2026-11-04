---
name: ai-use-case-radar
description: Set up, update or extend an "AI Use Case Radar" — a personal App Builder app that tracks a seller's AI use cases per customer, fed daily by Work IQ (mail, Teams, meetings, documents), with a complexity × effort map, platform classification, KPI values, savings and all-AI FinOps sizing. Use when the user says "set up my AI Use Case Radar", "add a customer to my radar", "update my radar from the kit", or attaches the AI-Use-Case-Radar kit. Not for one-off use case briefs.
---

# AI Use Case Radar — setup kit

The kit (this folder) holds four things:
- `app/` — the shared app code. `app/src/**` is kit-owned; `app/radar.config.template.ts` becomes the instance's only custom file `src/radar.config.ts`.
- `schema/lists.json` — the five SharePoint lists. Names and columns are fixed: the app code is generated from them.
- `prompts/daily-refresh.template.md` — the daily Work IQ refresh, with `{{PLACEHOLDERS}}`.
- `prompts/*-brief.md` — optional bulk analysis briefs (dossier rewrite, KPI quantification) for parallel sub-agents.

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
1. **SharePoint**: create a private site named after the app (CreateSite), or use the site the user names. Create the five lists from `schema/lists.json` with CreateLists. Replace `{{ACCOUNTS}}` with the customer names plus "Internal" if kept. Record the five list ids. Add one Customers-704f56 row per account: Title = account, HourlyRateUSD = default.
2. **App**: follow the app-generation skill to create an App Builder app (title = app title). Then:
   - Copy every file under kit `app/src/` over the app's `src/`, overwriting, and delete `src/pages/home.tsx`. Never touch protected scaffold files: config files, package files, `index.html`, `src/components/ui/**`, and pdf/spatial/model/pen/shortcut components.
   - Write `src/radar.config.ts` from the template with the gathered values, put logos in `src/assets/logos/`, and write the kit VERSION into `src/KIT_VERSION`.
   - Bind the five lists with `appbuilder-DataSourceAdd` (connector `shared_sharepointonline`, mode `table`, dataset = site URL, table = the list name). The data source names must come out as usecases_704f56, signals_704f56, featureradar_704f56, aiconsumption_704f56 and customers_704f56.
   - Typecheck and lint, run the pre-deploy gate, then publish.
3. **Refresh**: fill `prompts/daily-refresh.template.md` (owner, app title, site URL, the five list ids, accounts sentence, Teams channels block or remove it). Create it with SetupScheduledPrompt: daily at 06:30 local time, separate execution, with the tools named in the template header. Warn the user that the first runs may wait for a one-time tool approval.
4. **First fill (optional, ask)**: run the refresh once now. Or, if the user attaches a customer pipeline (Excel), import it: one UseCases row per item, reference in InternalRef, Stage Signal. Then run `prompts/dossier-rewrite-brief.md` and `prompts/kpi-quantification-brief.md` with 6–8 parallel sub-agents of about 30 records each, and write the results back with UpdateListItem in a script. Log each bulk run as one AIConsumption-704f56 row (Estimated = true; same pricing as the template).
5. Tell the user the app link, the site, what the refresh reads, and that AI figures are estimates.

## Operation 2 — Update the radar from a newer kit

1. Compare kit `VERSION` with the instance's `src/KIT_VERSION`, and read `CHANGELOG.md` for the versions in between.
2. Copy kit `app/src/**` over the instance's `src/`, keeping `src/radar.config.ts` and `src/assets/logos/`. If the changelog adds fields to `RadarConfig`, add them to `radar.config.ts` with their defaults.
3. Add any new list columns from `schema/lists.json` with UpdateListSchema (add only, never remove), then `appbuilder-DataSourceRefresh` for each affected list.
4. Re-fill the refresh template and update the scheduled prompt with EditScheduledPrompt, keeping the instance's values.
5. Typecheck, run the gate, publish, update `src/KIT_VERSION`, and summarise what changed in plain words.

## Operation 3 — Add a customer

Add the customer to `radar.config.ts` (colours and an optional logo). Add the name to the Account choices of UseCases-704f56 and Signals-704f56 (UpdateListSchema). Add a Customers-704f56 row with the default rate and the account to the refresh prompt's scope. Then publish.

## Operation 4 — Single-customer copy for a customer Team (optional)

Set up a second instance on the customer Team's own site, with `customers` holding the one customer and `internal: null`. Share the app individually with the Team members (sharing to a group can be rejected). Extend the main refresh with a mirror step: copy that customer's rows both ways by SourceId, and never copy any other customer.

## Quality gate
- Never invent facts, figures, people or dates in any list.
- Signals pass the strict signal filter; logistics never become signals.
- Every AI run is logged in AIConsumption-704f56.
- Plain business language to the user; no tool names, ids or paths.
