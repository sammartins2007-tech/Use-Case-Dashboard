# Read-only customer app (optional, kit 1.9.1)

A second App Builder app on the SAME site that shows ONE account to its account team, read-only.
The owner keeps editing in the main radar; a sync copies that account's rows to its own copy lists.

## What the account team sees
The account's use cases, designs, roadmap, wave plans and FinOps, exactly as in the main app, with:
- no edits, no AI (Complete with AI, Add input), no file writes (the UI hides them and the code refuses them);
- no Evidence tab, no Sources, no signals: evidence is internal and stays in the owner's app;
- no other customer: the copy lists hold only that account (its Account choice list holds only its name).

## Set up (per account)
1. Pick the suffix A = the account's letters and digits in capitals (e.g. CONTOSO).
2. Fill `customer_copy.py` placeholders ({{SITE_GRAPH_ID}}, the five master list ids) and save it in Cowork as
   `.aether/scripts/customer_copy.py`. Run it with `{"account": "<Account>"}`: on the first run it creates
   UseCases-A, Signals-A, FeatureRadar-A and Customers-A with the master's columns, then syncs and verifies.
3. Add (or extend) the master Customers-704f56 row DocKind = "config", DocRef = "readonly-apps", DocStatus = "Current",
   one line per account in DocBody: `<Account> | lists UseCases-A, Signals-A, FeatureRadar-A, Customers-A | synced by customer_copy.py`.
4. Create a new App Builder app, copy kit `app/src/**` (as in setup), then:
   - `src/radar.config.ts`: `customers` = the one account, `internal: null`, `readOnly: true`, app title "<Account> AI Use Case Radar".
   - Bind the four copy lists (DataSourceAdd), and write `src/data/services.ts` from `services.readonly.template.ts`
     with {{ACC}} = A (check the generated service names match).
   - Typecheck, test with the mouse (no Evidence tab, no edit buttons, only that account), publish.
5. Share the app with the account team (users or security groups; at most about 100 individual users). Site
   permissions: the team needs read access to the site. That is set by the site owner; the app cannot grant it.
6. Keep the refresh's `{{#READONLY_APPS}}` block: every run syncs every listed account last.

## Rules
- Never edit a copy list by hand; the next sync overwrites it. The script refuses any write to a master list.
- Rows that leave the selection (discarded, moved to another account) become tombstones (SourceId 0) that the app skips.

## Customer edition (guests)
For people outside your organisation, add a customer edition on a separate site: see `optional/customer-edition/README.md`.
