---
name: ai-use-case-radar
description: 'Set up, update or extend an "AI Use Case Radar" — a personal App Builder app that tracks a seller''s AI use cases per customer, fed daily by Work IQ (mail, Teams, meetings, documents), with a complexity × effort map, platform classification, KPI values, savings and all-AI FinOps sizing. Use when the user says "set up my AI Use Case Radar", "add a customer to my radar", "update my radar from the kit", or attaches the AI-Use-Case-Radar kit. Not for one-off use case briefs. Do not use it for a one-off use-case analysis (use business-analysis-engine) or a demo script (use fromusecase-to-script).'
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
- `schema/playbook.l2-chain.json` — the design chain (eight-specialist board, tech views, KPIs, solution experience, creative, FinOps) with the full text of its briefs and validators, stored as a content row (setup step 1).
- `app/SCAFFOLD.md` — the four template files the radar edits, the project-root files and the data sources.
- `optional/read-only-customer-app/` — a read-only app per customer account, synced from the owner's lists (Operation 4).
- `optional/customer-edition/` — a customer-safe edition and its offline HTML copy for guests (Operation 4b).
- `optional/radar-ops/` — the toolkit zip the refresh installs in step 11 (sync, offline copy, consistency check).

`VERSION` is the kit version. The instance records the version it runs in `src/KIT_VERSION`.

Kit rules: customer names, logos, colours and people belong ONLY in `src/radar.config.ts`, `src/assets/logos/` and the SharePoint data, never in kit code. Examples use fictitious companies (Contoso, Fabrikam).

## When NOT to Use
- A one-off analysis of a single use case: use business-analysis-engine.
- Turning one use case into a demo video script: use fromusecase-to-script.
- Changing the app's code outside the kit's operations: follow the App Builder process directly.

## Guardrails
- Confirm with the owner before deleting or overwriting any list, row or app instance, and before moving an instance to a new kit version.
- Never invent facts, figures, people or dates in any list (see Quality gate); a missing value stays empty with a CLARIFY line.
- Never share the app, a read-only copy or a customer edition, and never send anything to a customer, without the owner's explicit approval.
- If a step fails (connector, list schema, publish), stop at that step, report it in plain language and leave the previous working version in place.

## Operation 1 — Set up a new radar

Gather first, asking only what cannot be looked up (one question round):
1. Owner name and team (from the user's profile), app title (default "AI Use Case Radar").
2. Customers: exact names. For each, a brand primary and dark colour. Take them from the customer's public brand guidelines or website, or from a template pack the user attaches. Use a logo PNG only if the user attaches one; otherwise the name is shown as a wordmark.
3. Whether to keep an "Internal" bucket for account-team work (default yes).
4. The Teams channels to listen to (optional): team id and channel id, resolved with the Teams tools.
5. Default hourly cost in USD (default 50).

Then:
1. **SharePoint**: create a private site named after the app (CreateSite), or use the site the user names. Create the six lists from `schema/lists.json` with CreateLists. Replace `{{ACCOUNTS}}` with the customer names plus "Internal" if kept. Record the six list ids. Add one Customers-704f56 row per account: Title = account, HourlyRateUSD = default, DocKind = "customer". Then seed the content store: one Customers-704f56 row Title = "playbook redesign", DocKind = "playbook", DocRef = "redesign", DocStatus = "Current", DocVersion = 1, DocSeq = 0, DocChunks = 1, DocBody = the text of `schema/playbook.redesign.json` (write it with a Microsoft Graph batch call: the list-item tools reject values over 4,096 characters). Seed the design chain the same way: Title = "playbook l2-chain", DocKind = "playbook", DocRef = "l2-chain", DocStatus = "Current", DocVersion = 1, DocBody = the text of `schema/playbook.l2-chain.json` in pieces of at most 30,000 characters (DocSeq 0,1,2…, DocChunks = number of pieces). Read both back and check the joined DocBody equals the file.
2. **App**: follow the app-generation skill to create an App Builder app (title = app title). Then:
   - Copy every file under kit `app/src/` over the app's `src/`, overwriting, and delete `src/pages/home.tsx`. Four of them are template files the radar edits (`App.tsx`, `main.tsx`, `lib/console-capture.ts`, `components/pdf-export-button.tsx`): follow `app/SCAFFOLD.md` (copy, or re-apply the listed edits when the template has changed). Never touch any other protected scaffold file: config files, `index.html`, `src/components/ui/**`, and spatial/model/pen/shortcut components.
   - Project root, as in `app/SCAFFOLD.md`: copy `app/root/vite.viewer.config.ts`, add the `build:viewer` script, pin `@microsoft/managed-apps` to 0.6.0, add `.viewer-dist/` to `.gitignore`.
   - Write `src/radar.config.ts` from the template with the gathered values (including `siteUrl` = the site URL; `presenterBanner` only if the owner gives a cover picture for "Inside the Radar"), put logos in `src/assets/logos/`, and write the kit VERSION into `src/KIT_VERSION`.
   - Bind the five lists with `appbuilder-DataSourceAdd` (connector `shared_sharepointonline`, mode `table`, dataset = site URL, table = the list name). The data source names must come out as usecases_704f56, signals_704f56, featureradar_704f56, aiconsumption_704f56 and customers_704f56. Also bind Agents (`shared_agentnode`; the data source name must come out as `agentnode`, the name `src/connectors/inline-agent.ts` expects) and the SharePoint actions (`shared_sharepointonline`, actions) and check `src/data/services.ts` maps the generated services (see `app/SCAFFOLD.md`).
   - Run `npm run build:viewer` (writes `public/offline-viewer.txt`).
   - Typecheck and lint, run the pre-deploy gate, then publish.
2b. **SE agents (Copilot Studio)**: for each folder in `agents/se-specialists/`, copy it to `copilot-studio/<folder>/` and create the agent in the owner's environment with PushCopilotStudioContent (no contentId; content.name = the displayName in its agent.yaml, content.language = 1033; paths = its agent.yaml and tools/microsoft-learn-docs-mcp.yaml). Validate first. If the model series in agent.yaml is not offered in that environment (ListCopilotStudioModels), use the environment's default. The Microsoft Learn Docs MCP tool (`shared_microsoftlearndocsmcpserver`, operation `microsoft_docs_search`) runs on the owner's own connection: create it when the push reports it missing. Test each agent once with TestCopilotStudioAgent on a short fictitious use case (it must answer from its role and cite Microsoft Learn pages), then publish it (PublishCopilotStudioContent: Teams and Microsoft 365 Copilot). Share the agents with the account team only with the owner's approval.
2c. **SE agent calls (agent flow)**: create the agent flow from `agents/se-board-flow/` in the same environment as the SE agents (see its README: trigger on new SEAgentCalls-704f56 rows with Status "Requested", an agent node per SE agent calling the published agent, answer written back), with the owner's SharePoint and Microsoft Copilot Studio connections, and turn it on. Then write the roster row: Customers-704f56 row Title = "config se-agents", DocKind = "config", DocRef = "se-agents", DocStatus = "Current", DocBody in the format of `prompts/specialists.md` (environment, list, flow, and the eight agents' schema names and ids from step 2b, board order). Test: write one Requested row per agent with a short fictitious case and the message of `prompts/specialists.md`; all eight must come back Done with a Board summary and Microsoft Learn links within about 10 minutes.
3. **Refresh**: fill `prompts/daily-refresh.template.md`: owner, app title, site URL, the site's Graph id (`{{SITE_GRAPH_ID}}`, host,site-id,web-id), the five list ids, accounts sentence, `{{FX_RULE}}` (default "€1 = $1.08"), and keep or remove the optional blocks (Teams channels; read-only customer apps and customer editions). When the read-only block is kept, build the radar-ops toolkit zip and upload it to the site's Documents, folder RadarOps (`optional/radar-ops/README.md`). Create it with SetupScheduledPrompt: twice a day (for example 07:00 and 14:00 local time), separate execution, with the tools named in the template header. Warn the user that the first runs may wait for a one-time tool approval.
4. **First fill (optional, ask)**: run the refresh once now. Or, if the user attaches a customer pipeline (Excel), import it: one UseCases row per item, reference in InternalRef, Stage Signal. Also import the customer's own roadmap decisions when the pipeline has them (a prioritised/wave column, status, start and target dates, % done) into Wave, CustomerDecision, WaveSource "Customer pipeline <date>", CustomerStatus, StartDate, TargetDate and PercentDone, and write the wave list to Customers-704f56.Waves ("W1 | Wave 1 | start YYYY-MM | end YYYY-MM", dates blank when unknown). Then run `prompts/dossier-rewrite-brief.md` and `prompts/kpi-quantification-brief.md` with 6–8 parallel sub-agents of about 30 records each, and write the results back with UpdateListItem in a script. Log each bulk run as one AIConsumption-704f56 row (Estimated = true; same pricing as the template).
5. **Check the agents** (README, The agents). In the published app, in the owner's browser, open one use case and run Complete with AI once: the coach must answer with a question, and after the panel closes a row titled "Use Case Coach · <use case>" must appear in AIConsumption. Confirm the two playbook rows read back equal in step 1, and that every file inside `files` of the l2-chain playbook equals the same-named file in `prompts/`. The eight SE agents first run in the refresh that meets a new or changed use case: after that run, open Inside the Radar, follow that use case and check chapter 4 shows the eight specialist opinions. Check that each of the eight SE agents is published and answered the call test of step 2c through the list and the flow. Say plainly which check could not be done yet.
6. Tell the user the app link, the site, what the refresh reads, and that AI figures are estimates.

## Operation 2 — Update the radar from a newer kit

1. Compare kit `VERSION` with the instance's `src/KIT_VERSION`, and read `CHANGELOG.md` for the versions in between.
2. Copy kit `app/src/**` over the instance's `src/`, keeping `src/radar.config.ts` and `src/assets/logos/`. If the changelog adds fields to `RadarConfig`, add them to `radar.config.ts` with their defaults.
3. Add any new list columns from `schema/lists.json` with UpdateListSchema (add only, never remove), then `appbuilder-DataSourceRefresh` for each affected list.
4. **Agents**: compare the kit's `schema/playbook.l2-chain.json` and `schema/playbook.redesign.json` with the instance's Current playbook rows (DocBody joined in DocSeq order). When one differs, store the kit text as a new version (DocVersion + 1, DocStatus Current, the previous rows Superseded), keeping the instance's own exemplarRef values in the redesign playbook, and read it back. Check every file inside `files` of the l2-chain playbook equals the same-named file in `prompts/`. If the app has no `agentnode` data source, bind Agents (`shared_agentnode`) as in setup step 2. When `agents/se-specialists/` changed (see CHANGELOG), update each SE agent: Pull it, replace its instructions (and model or tool when they changed) with the kit's, Push with the expectedRevision the Pull returned, test it once and publish it; create any agent the owner does not have yet (setup step 2b). Create the SEAgentCalls-704f56 list, the agent flow and the `se-agents` roster row when they are missing (setup steps 1 and 2c).
5. Re-fill the refresh template and update the scheduled prompt with EditScheduledPrompt, keeping the instance's values.
6. Run `npm run build:viewer`, typecheck, test every page with the mouse, run the gate, publish, open the published app in the owner's browser and check it loads with data, update `src/KIT_VERSION`, and summarise what changed in plain words (and say plainly what could not be tested).

### Moving an instance to 1.13.0
1. Create the list SEAgentCalls-704f56 (`schema/lists.json`), the agent flow (`agents/se-board-flow/`) and the `se-agents` roster row, then run the call test (setup step 2c).
2. Store the kit's `schema/playbook.l2-chain.json` as a new l2-chain playbook version (DocVersion + 1, Current; the previous rows Superseded) and read it back.
3. Re-fill the refresh template (step 10 now calls the eight agents and logs the calls) and update the scheduled prompt.
4. Copy `app/src/**` (story text), typecheck, rebuild the viewer, test, publish.

### Moving an instance to 1.12.0
Create the eight SE agents (setup step 2b) when the owner does not have them yet. App code and refresh are unchanged.

### Moving an instance to 1.11.1
Copy `app/src/lib/pdf-bytes.ts` if the instance lacks it (no brief changed). Run the agents check (Operation 1, step 5) once, and bind the Agents connection as `agentnode` if Complete with AI reports a configuration error.

### Moving an instance to 1.11.0
1. Copy `app/src/**` (new: the "Inside the Radar" presenter story and the Backlog page, the sky-blue look, the source and date of every next step, the deployment view's routed and numbered connections). Optionally add `presenterBanner` to `src/radar.config.ts` (cover picture of the story).
2. Re-fill the refresh template: one source applied to every use case it names, unreadable items retried from a content-store list, Evidence lines ending with "Impact:", People with a Contribution field and every person who intervenes, a waiting proposal never blocks a redesign, step 11 installs the radar-ops toolkit and runs the consistency check. Steps 7 and 9 are gone: move an account that used the single-customer copy or the static snapshot to the `readonly-apps` config row (team copy or customer edition).
3. Build the radar-ops toolkit zip and upload it (`optional/radar-ops/README.md`); brand files now name their images relative to themselves.
4. Typecheck, rebuild the viewer, test, publish.

### Moving an instance to 1.9.1
1. Replace `.aether/scripts/customer_copy.py` with the kit version (fill the placeholders again) and run it with `{"account": "ALL", "verify_only": true}`, then without `verify_only`: every copy's design links are remapped to the copy's ids.
2. Copy `app/src/**` (dossier, hackathon, static boot and static copy changed), typecheck, rebuild the viewer, publish.
3. Re-fill the READONLY_APPS block of the refresh template (customer editions and the in-place offline copy).

### Moving an instance to 1.9.0
1. `src/data/services.ts` is new and instance-owned: after copying `app/src/**`, check its imports match the instance's generated services (list suffix -704f56 by default) and keep it on later updates if it was customised.
2. Apply `app/SCAFFOLD.md`: the four template files, `vite.viewer.config.ts`, the `build:viewer` script, the 0.6.0 pin and `.gitignore`.
3. Add `siteUrl` to `src/radar.config.ts`.
4. Bind the SharePoint actions data source if "save to SharePoint" is wanted; otherwise export a refusing `SharePointService` stub from `src/data/services.ts`.
5. Seed the `l2-chain` playbook row (setup step 1) if it is missing.
6. Re-fill the refresh template (new 100% coverage collection, inspiration-list rule, verified-only reporting, design every triggered use case through the L2 chain, optional read-only copies).

### Moving an instance to 1.8.0 (content store)
Versions before 1.8.0 bundled solution designs and wave plans as JSON files in `src/data/solutions/` and `src/data/wave-plans/`. From 1.8.0 the app reads them only from Customers-704f56 content rows. Before copying the new code: add the Doc* columns and the leadership columns (step 3), tag every existing customer row DocKind = "customer", and write each bundled file as content rows (solution: DocKind "solution", DocRef = use case id; wave plan: DocKind "waveplan", DocRef = "<account>-<wave>"; DocStatus "Current", DocVersion 1, DocBody pieces of at most 30,000 characters, DocSeq 0,1,2…, DocChunks = number of pieces) with Graph batch calls. Read the rows back and check that the joined DocBody equals the file before deleting the bundled folders. Seed the playbook row as in setup step 1, and set each kind's exemplarRef to one migrated design of that kind.

## Operation 3 — Add a customer

Add the customer to `radar.config.ts` (colours and an optional logo). Add the name to the Account choices of UseCases-704f56 and Signals-704f56 (UpdateListSchema). Add a Customers-704f56 row with the default rate and the account to the refresh prompt's scope. Then publish.

## Operation 4 — Read-only app for one customer's account team (optional)

Follow `optional/read-only-customer-app/README.md`: copy lists on the SAME site (UseCases-A, Signals-A, FeatureRadar-A, Customers-A, created and synced by `customer_copy.py`), a second app with `readOnly: true` bound to them, the master config row "readonly-apps", and the refresh's read-only block. The copy never holds evidence (Evidence, Sources, LastSignal, SignalCount are blank; no Signals rows), internal CLARIFY questions stay hidden, and no other customer's name appears in it. Share the app individually or with a security group; the team needs read access to the site, which only the site owner can grant. One owner edits, everyone else reads. (The older two-way single-customer copy and the static snapshot were removed in 1.11.0.)

## Operation 4b — Customer edition for guests (optional)

Follow `optional/customer-edition/README.md`: a config line `<Account> | edition customer | site <url>`, the same `customer_copy.py` syncing customer-safe lists on that separate site, and an offline HTML copy uploaded once and overwritten in place by the refresh. The refresh rebuilds the offline file from the radar-ops toolkit (`optional/radar-ops/`). Guests cannot open App Builder apps; share the offline file (view only). Review the copy once for internal names or actions in free text before sharing.

## Operation 5 — Deep re-analysis or catch-up (on request)
When the owner doubts a source was analysed deeply enough, or asks for a catch-up:
1. Gather the sources in the window (meetings that ended in it with their transcripts, substantive emails, channel posts, documents).
2. Run `prompts/source-analysis-protocol.md` with one sub-agent per long source (split long transcripts into parts). Each writes a ledger: every statement with speaker, time, topic, use case, field and disposition, plus coverage numbers.
3. Run `prompts/latest-version-consolidation-brief.md` over every use case the ledgers touch (and any record with dated wording), 6–10 sub-agents in parallel.
4. Validate in code before writing: only known columns, single-line columns ≤ 255 characters, no dated or history wording outside Evidence and Sources, at most 5 CLARIFY lines per use case. Write with Graph batch calls, then mirror any copies.
5. Report to the owner the ledger coverage per source (segments, statements, used), the CLARIFY questions raised and the AI cost (logged in AIConsumption-704f56, sub-agents included).

## Quality gate
- Never invent facts, figures, people or dates in any list.
- Inspiration lists (ideas the owner or a colleague built, not raised or confirmed by the customer) are never a source: never imported, never cited in Evidence or Sources.
- No link to an internal Microsoft 365 item (Teams, SharePoint/OneDrive, Outlook) in any design, document or downloaded file; name the source in words. Public links (Microsoft Learn) are fine.
- Evidence appears only in the owner's own app, never in a read-only copy, customer edition or downloaded customer file.
- Signals pass the strict signal filter; logistics never become signals.
- Every AI run is logged in AIConsumption-704f56, sub-agents included.
- Latest version only: each field holds one consolidated current statement; history and dates live only in Evidence and Sources; contradictions become CLARIFY lines (shown in red, never in the customer edition).
- Every source is analysed with the segment ledger; never summarise a transcript from its first part only.
- Test every page and key interaction with the mouse before publishing, then check the published app in the owner's browser; report only what was done and verified.
- Plain business language to the user; no tool names, ids or paths.

## Example
Fictitious request: "add Fabrikam to my radar". Operation 3: add Fabrikam's name, colours and logo only in `src/radar.config.ts` and `src/assets/logos/`; the next refresh analyses Fabrikam's mails, meetings and documents with the segment ledger; report the ledger coverage, the CLARIFY questions raised and the AI cost logged.
