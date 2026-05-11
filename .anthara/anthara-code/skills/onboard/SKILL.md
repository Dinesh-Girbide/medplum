---
name: onboard
description: This skill should be used when the user runs '/anthara:onboard', asks "onboard me", "walk me through this codebase", "I'm new to this project", "give me a tour of this codebase", "explain this repo", or wants an interactive developer onboarding to an existing project. Healthtech and fintech tuned — surfaces PHI handling, PCI-DSS modules, and regulated-data flows alongside architecture, domain, and dragons. Local-only — does not call api/ HTTP endpoints and does not generate scaffold artifacts.
argument-hint: "[role / experience / focus area — optional]"
allowed-tools: ["AskUserQuestion", "ToolSearch", "Task"]
version: 1.0.0
---

# /anthara:onboard

Interactive developer onboarding for an existing project, healthtech and fintech tuned. Delegates to the `onboard` agent.

**IMPORTANT — Deferred Tool Loading:** Before calling `AskUserQuestion`, you MUST first call `ToolSearch` with query `"select:AskUserQuestion"` to load it. This is a deferred tool and will fail if called without loading first. Do this once at the start of your work.

**NEVER ask questions as plain text output.** Every question to the user MUST go through the `AskUserQuestion` tool. If you find yourself typing a question as regular text, stop and use `AskUserQuestion` instead.

## Behaviour

1. **Collect starting context.** If the developer's argument supplies role / experience / focus area, parse it and skip the prompt. Otherwise `AskUserQuestion`:
   - Role (e.g., "senior backend engineer", "junior frontend developer", "DevOps / SRE")
   - Familiarity with the stack (e.g., "5y of TypeScript, new to this codebase")
   - Focus area (e.g., "payments module", "the API layer", "everything")

2. **Delegate to the onboard agent** via the Task tool, passing the collected context plus the current working directory.

3. The agent performs Phase 1 (codebase analysis including `get_standards` for active rules and a regulated-data scan) and Phase 2 (interactive walkthrough with knowledge checks). Sections are delivered one at a time via `AskUserQuestion`.

4. After the walkthrough wraps, the agent identifies non-obvious onboarding insights and, for each, asks via `AskUserQuestion` whether to save to shared memory (per the shared-memory confirmation rule from `anthara-mcp-orchestration`). On yes the agent calls `add_shared_memory`; on no it skips silently.

## Out of scope

- Scaffolding files — no generated `CLAUDE.md`, `agents.md`, `plan.md`, or other artifacts. The walkthrough is conversational only.
- Backend API integration — no HTTP calls to the `api/` service. Local-only.
- Readiness assessment / scoring — that is a different concept (handled by `api/`'s assessment endpoints, NOT by this command).

## Reference

Full agent behaviour, including the regulated-data scan rules (PHI / PCI-DSS / GLBA / etc.), MCQ format, and the post-walkthrough shared-memory pass, lives in `agents/onboard.md`. For underlying memory call patterns and the `AskUserQuestion` confirmation gate, the agent consults `anthara-mcp-orchestration`.
