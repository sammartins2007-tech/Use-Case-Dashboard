# Scaffold files the radar changes (kit 1.9.0)

The App Builder template owns these files; the radar needs small edits in them. `app/src/` ships the
radar's version of each. When the instance's scaffold is the same template generation, copy them over.
When the template has moved on (the file looks different), keep the template's file and re-apply only
the edits below.

| File | Radar edit |
|---|---|
| `src/App.tsx` | Import `IS_STATIC` from `@/lib/static-copy`; add a `Router` that uses `HashRouter` when `IS_STATIC` and the template's `BrowserRouter basename={ROUTER_BASENAME}` otherwise; replace `<BrowserRouter …>` with `<Router>`. |
| `src/main.tsx` | Before `import { App } from "./App"` add `import "./lib/static-boot";` and `import { IS_STATIC } from "./lib/static-copy";`. Call `startConnectorPolicyMonitor()` only when `!IS_STATIC`. Render `<StaticBadge />` (from `./components/static-badge`) after `<ConnectorPolicyBanner />`. |
| `src/lib/console-capture.ts` | First line of `postToDevServer`: `if ((window as unknown as { __UCX__?: unknown }).__UCX__) return;` (an offline copy never sends anything). |
| `src/components/pdf-export-button.tsx` | Import `scrubDom` from `@/lib/link-scrub`; wrap `createPdfBlob(...)` in `const restore = scrubDom(target); try { … } finally { restore(); }` (no internal Microsoft 365 links in a PDF). |

## Project-root files
- `app/root/vite.viewer.config.ts` → copy to the project root as `vite.viewer.config.ts`.
- `package.json`: add the script `"build:viewer": "vite build -c vite.viewer.config.ts"` and pin
  `"@microsoft/managed-apps": "0.6.0"` (exact; later 0.x versions turned binary uploads into a JSON number list).
- `.gitignore`: add `.viewer-dist/`.
- Run `npm run build:viewer` after every source change and before every publish: it writes
  `public/offline-viewer.txt`, the self-contained viewer of the offline customer copies (the refresh gets it from
  the radar-ops toolkit, see `optional/radar-ops/README.md`). It holds no
  use-case data and no customer configuration.

## Data sources
- The five lists, bound as in setup (usecases_704f56 … customers_704f56).
- Agents (`shared_agentnode`) for Complete with AI / Add input.
- SharePoint actions (`shared_sharepointonline`, actions mode) for "save to SharePoint"; the generated client must
  be `SharePointService` with `CreateFile`. Without it, `src/data/services.ts` can export a refusing stub (see
  `optional/read-only-customer-app/services.readonly.template.ts`) and the app only downloads files.
- `src/data/services.ts` is the one place that maps generated services to the names the app uses. Every other
  module imports from `@/data/services`, never from `generated/`.
