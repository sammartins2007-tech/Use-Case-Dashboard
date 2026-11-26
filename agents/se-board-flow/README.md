# Agent flow "Radar - call SE agent"

The bridge between the radar refresh and the owner's eight SE agents. The refresh writes one row per agent into the
list SEAgentCalls-704f56 (Status "Requested"); this Copilot Studio workflow picks up each new row, calls that agent and
writes the agent's answer back into the row. The refresh then builds the specialist board only from those answers
(`prompts/solution-board-brief.md`).

## Why an agent node
The SE agents run on the Microsoft Copilot harness. The Microsoft Copilot Studio connector ("Execute Agent and wait")
refuses such agents; Microsoft's supported way to call them from an automation is an agent node in a Copilot Studio
workflow ("Run an agent", existing published agent). See
https://learn.microsoft.com/en-us/power-automate/call-copilot-studio-agent.

## What it does
1. Trigger: SharePoint "When an item is created" on SEAgentCalls-704f56, one run per new row, every minute, only rows
   whose Status is "Requested". Runs are parallel.
2. Switch on the row's AgentSchema: one case per SE agent, each an agent node ("Run an agent", `shared_agentnode` /
   InvokeAgent) with the agent fixed, Message = the row's Message, 15-minute timeout, human-assistance escalation off
   (an unattended run must never wait for an email reply). The default case marks the row Failed ("Unknown agent schema").
3. On success: Status "Done", Response = the agent's full answer, ConversationId, AnsweredAt. On failure or timeout:
   Status "Failed", Error, AnsweredAt.

## Create it in a new instance (setup step 2c)
- Environment: the one that holds the eight SE agents (setup step 2b).
- Take `definition.json` and replace the placeholders:
  `{{SITE_URL}}` the radar site URL, `{{LIST_SEAGENTCALLS}}` the id of SEAgentCalls-704f56, and the eight agent
  schema names created in step 2b: `{{AGENT_COPILOT_STUDIO}}`, `{{AGENT_M365_COPILOT_COWORK}}`, `{{AGENT_POWER_PLATFORM}}`,
  `{{AGENT_AZURE_AI_FOUNDRY}}`, `{{AGENT_DATA_KNOWLEDGE}}`, `{{AGENT_INTEGRATION_TOOLS}}`, `{{AGENT_SECURITY_COMPLIANCE}}`,
  `{{AGENT_D365}}` (each appears twice: the Switch case value and the agent node's agentId).
- Connections (`connections.json`): the owner's SharePoint connection and the owner's Agents connection
  (`shared_agentnode`). Create them in that environment when missing.
- Push it as a new Copilot Studio workflow, publish and turn it on.
- Write the `se-agents` roster row (`prompts/specialists.md`) with the environment id, the list id, this workflow's id
  and the eight agents.
- Test: one Requested row per agent with a short fictitious case and the message of `prompts/specialists.md`. All eight
  must come back Done with a "Board summary" and Microsoft Learn links (in the reference instance: within 4 minutes).

## Notes
- Only rows created after the workflow is on are picked up. To retry a call, add a new row; editing a row back to
  "Requested" does nothing.
- If the write-back itself fails, the row stays "Requested": the refresh treats a row still Requested after 30 minutes
  as failed and retries once.
- Every row is one agent run billed in Copilot Credits to the owner's environment.
