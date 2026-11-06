# Customer snapshot (static HTML)

Builds one self-contained, read-only HTML file of a customer edition (radar.config.ts with `customerEdition: true`) that customers can open in any browser without an app, licence or guest account.

- `make_data.py` turns the customer's use case list (customer-safe columns only: never Analysis, Evidence, Sources, Insights, signals or AI cost) into `generated/static-data.json`.
- The generated data services are replaced by read-only stubs that serve that JSON; the router switches to hash routing so the file works from disk or SharePoint.
- `build.sh` builds and inlines everything into one file; `test.mjs` opens every route and fails on a crash.
- The daily refresh can rebuild it and overwrite the same OneDrive/SharePoint file in place, so a link shared in Teams always opens the latest version.
Adapt the paths at the top of build.sh and make_data.py to your instance.
