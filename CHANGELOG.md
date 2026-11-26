# Changelog

Only the latest kit version is kept and distributed. Earlier versions remain in the Git history only.

## 1.13.1 — Refresh wording aligned with the reference instance; latest version only
- Refresh template step 10: the expert review spells out the SE agent calls (roster first, eight Requested rows per use
  case, polling every 1–2 minutes, one retry with a new row after a failure or 30 minutes without answer, no sub-agent,
  no fallback, use cases without eight answers carried to the next run, the board stored with agent, answer time and
  the Microsoft Learn links cited).
- Step 7 names the SEAgentCalls-704f56 rows as an allowed write; step 10d forbids editing or deleting them and the run
  summary lists the calls (written, Done, Failed, retried) and the use cases carried to the next run.
- Template header: the SQL read tool added to the required tools.
- Setup skill: the six lists and the agents folders listed; the per-version upgrade notes replaced by one additive update
  (Operation 2) that brings any instance on 1.8.0 or later to the latest version.
- README and CHANGELOG: only the latest version is described.

## 1.13.0 — The refresh calls the eight SE agents
- **The board is the owner's eight Copilot Studio SE agents, called for real.** For every use case to design, the refresh
  writes one call per agent into the new list SEAgentCalls-704f56; the new agent flow "Radar - call SE agent"
  (`agents/se-board-flow/`) calls the agent with an agent node (the published agent itself; the Microsoft Copilot Studio connector
  refuses agents on the Microsoft Copilot harness) and writes the answer back. The opinions are built
  only from those answers, and each keeps the agent's full answer and conversation id. No sub-agent, role card or fallback
  writes an opinion any more; a use case without eight answers waits for the next run.
- `prompts/specialists.md`: the roster (board order), the `se-agents` roster row in the content store, the message sent to
  every agent (with a "Board summary" section) and how an answer is read. The role cards are gone.
- `prompts/solution-board-brief.md`: call, wait (retry once), opinions from the answers, arbitration, then the design.
- `schema/playbook.l2-chain.json`: the chain with the new board; `schema/lists.json`: sixth list SEAgentCalls-704f56.
- Refresh template step 10 calls the agents and logs "SE agent calls: written/answered" in the AIConsumption Basis line.
- Setup step 2c creates the flow and the roster row and runs an eight-agent call test; the update brings older instances in.
- Inside the Radar: the run and the board slides name the Copilot Studio agents and the agent flow.
- Tested on a reference instance: a fictitious case sent to the eight agents came back with eight answers, each with
  its Board summary and 4 to 26 Microsoft Learn links, in under 4 minutes.
