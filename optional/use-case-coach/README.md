# Optional: Use Case Coach (in-app agent)

Adds a "Complete with AI" button on each use case. A side panel interviews the user one question at a time,
saves each answer into the right dossier field (with undo), re-scores readiness and rewrites the analysis and
customer questions. Each session is logged as an estimated AI cost.

## Install
1. In App Builder, bind the in-app agent connector (`shared_agentnode`, action mode) and create its connection.
2. Copy `inline-agent.ts` from the App Builder agent packet into `src/connectors/` and set `AGENTNODE_DATA_SOURCE`.
3. Copy `src/lib/coach.ts` and `src/components/use-case-coach.tsx` into the app.
4. Replace `src/pages/use-case.tsx`, `src/data/repo.ts` and `src/data/types.ts` with the `*.with-coach.*` versions
   (they add the button and allow the app to save Readiness, OpenQuestions, Analysis, Evidence and LastSignal).

Every coach answer consumes AI credits. Money is always written in US dollars and hours stay hours.
