---
name: help
description: This skill should be used when the user runs '/anthara:help', asks 'what does anthara do', 'list anthara commands', 'how does this plugin work', 'is anthara working', 'check fabric', 'is fabric reachable', or wants to verify Fabric MCP reachability. Provides a concise plugin overview, the eight-command index, setup reminder, and a live Fabric health check via get_status.
argument-hint: "[command_name]"
allowed-tools: ["mcp__fabric__get_status"]
version: 0.2.0
---

# /anthara:help

Explain the anthara-code plugin and verify Fabric MCP is reachable.

## Behaviour

Run two things in order.

### 1. Print the overview and command index

Print:

```
anthara-code — spec-driven development for healthtech and fintech engineering teams using Anthara.

The plugin is a thin client over the Anthara Fabric MCP server. Standards, memory, and instructions are pulled lazily by agents and skills at the right workflow moments. Hard enforcement (PHI / MCP gating / cost) is owned by the Anthara LiteLLM gateway upstream — the plugin is advisory.

Commands:
  /anthara:start         Spec-driven workflow with grill-me-flavor due-diligence (triage → context → grill → spec → architecture → slice loop). Designed to prevent bugs through clarity in the spec.
  /anthara:review        Code review through the lens of active rules pulled via get_standards. Cites rule text and reasoning per finding.
  /anthara:onboard       Interactive developer walkthrough of an existing project, healthtech/fintech tuned. Local-only.
  /anthara:grill-me      Standalone Socratic interview, healthtech-tuned.
  /anthara:standards     Show the resolved compliance standards for the current repo.
  /anthara:scan-results  Show the latest AI-readiness scan results for the current repo (text twin of the web dashboard).
  /anthara:remember      Manual memory operation: search facts and ad-hoc save.
  /anthara:help          This command.

Setup:
  Set env vars ANTHARA_FABRIC_URL, ANTHARA_API_KEY, ANTHARA_MEMORY_GROUP.
  Restart Claude Code.
  Run /anthara:help to verify Fabric reachability.
```

### 2. Verify Fabric reachability

Call `get_status()` from the Fabric MCP server. Append exactly one of these lines to the output:

- On success: `Fabric: reachable. Postgres + graph DB connected.`
- On unhealthy response: `Fabric: unhealthy. Postgres or graph DB disconnected. Check the Fabric server logs.`
- On auth or connection error: `Fabric: unreachable. Verify ANTHARA_FABRIC_URL and ANTHARA_API_KEY are set, and the Fabric server is running. See README for setup.`

## Optional argument

If the user passes a command name (e.g., `/anthara:help start`), print only that command's section with a brief expanded description and any relevant flags. If the argument doesn't match any known command, list all available command names and suggest the closest match.

Recognised command names: `start`, `review`, `onboard`, `grill-me`, `standards`, `scan-results`, `remember`, `help`.

## Out of scope

Do NOT call any other Fabric MCP tool — only `get_status`. Do NOT load context or pull standards from `/anthara:help`. Help is a fast utility command, not a context-loader. Other commands handle their own MCP calls per `anthara-mcp-orchestration`.
