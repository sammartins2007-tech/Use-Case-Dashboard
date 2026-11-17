# Customer edition for guests (optional, kit 1.9.1)

A customer-safe, read-only copy of ONE account for people outside your organisation (customer guests),
kept in sync by the same `customer_copy.py` as the team copies.

## Why a separate edition
- App Builder apps cannot be shared with guest accounts. Guests get the **offline copy** (one HTML file on a
  SharePoint site they can open); an optional customer-edition app serves internal people who should only see
  the customer view.
- The radar site holds the master lists and evidence. A customer edition therefore lives on a **separate site**
  (the script refuses a customer edition on the master site).

## What is removed (on top of the team edition)
- Use case fields: Analysis, Insights, Decision, Confidence, Readiness, classification confidence / why / next,
  sizing basis, flag, feature unlock, discard reason, internal cost and value (`CUSTOMER_FIELDS`).
- Every `CLARIFY:` line and every internal Microsoft 365 link (SharePoint, OneDrive, Teams, Outlook).
- In designs: board, route check, FinOps, evidence and ledger parts; source lists keep public web links only.
- No FeatureRadar rows, no Signals rows, no Evidence or Sources.
- Use case ids inside designs (wave plans, what-if members and dependants, solution ids) are remapped to the
  copy's ids in every edition, so every link opens the right use case.

## Set up
1. Create (or reuse) a separate SharePoint site the customer guests can read.
2. Add a line to the master config row (DocKind = "config", DocRef = "readonly-apps"):
   `<Account> | edition customer | site https://<tenant>.sharepoint.com/sites/<customer-site> | customer edition for guests`
3. Run `customer_copy.py` with `{"account": "<Account>"}` (or `"ALL"`): it creates `UseCases-A`, `Signals-A`,
   `FeatureRadar-A`, `Customers-A` on that site, syncs, cleans and verifies.
4. Offline copy for guests:
   - `customer_snapshot_dump.py` (tool script) dumps every customer edition to `working/ce/<A>/`.
   - Copy `brand.example.json` to `brand.<account>.json` and fill it from public sources only.
   - `python3 build_account_snapshot.py working/ce/<A> brand.<account>.json <app>/public/offline-viewer.txt out.html`
     (the viewer is built with `npm run build:viewer`). The copy opens on the welcome page with every use case.
   - Upload it once to the customer site's Documents and share that file (view only) with the guests.
     Later runs overwrite the same file in place, so the shared link always opens the latest version.
5. Optional app: a new App Builder app with `customerEdition: true` and `readOnly: true` in `radar.config.ts`,
   bound to the four copy lists. **Publish it before renaming it**: renaming an app before its first publish
   breaks publishing for good.

## Review before sharing
Designs and next steps can still name internal people or internal actions in free text. Read the customer
edition once before sharing it with a customer, and fix the wording in the master so the next sync carries it.
