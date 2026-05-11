---
name: anthara-mcp-orchestration
description: This skill should be used whenever an agent, command, or another skill needs to call the Anthara Fabric MCP server. Triggers include deciding when to call get_standards / get_instructions / load_context / search_facts; deciding what to save to add_private_memory or add_shared_memory; applying the shared-memory AskUserQuestion confirmation rule; choosing between memory scopes; checking Fabric reachability via get_status. Loaded by spec-builder, slice-coder, reviewer, onboard, /anthara:start, /anthara:remember, /anthara:standards, and any component that touches Fabric MCP.
version: 0.1.0
---

# Anthara MCP Orchestration

The plugin is a thin client over the Anthara Fabric MCP server. This skill is the comprehensive playbook for when and how to call each Fabric MCP tool, and the governance rules around memory writes.

## Tool inventory

The Fabric MCP server exposes these tools:

- `load_context()` — returns user profile + recent org and personal memories. Call once at session start.
- `get_standards(raw_remote_url)` — returns pack-derived rules (org-wide + repo-specific, merged across SOC 2 / HIPAA / PCI-DSS / internal packs). Pass the output of `git remote get-url origin`. Call before generating, reviewing, or scoping code.
- `get_instructions()` — returns priority-ordered behavioural directives separate from standards. Call at session start.
- `search_facts(query, limit)` — searches both private and shared memory. Call before making decisions; before saving to avoid duplicates.
- `list_memories(scope, last_n)` — list recent memories by scope (`'private'` / `'shared'` / `'all'`).
- `add_private_memory(data)` — save personal preferences, habits, workflow patterns. **No confirmation required.**
- `add_shared_memory(data)` — save org-wide knowledge. **MUST be preceded by AskUserQuestion confirmation.** See "Shared-memory confirmation rule" below.
- `get_status()` — Fabric health check. Call from `/anthara:help` and when troubleshooting.

Every Fabric MCP call is automatically audit-logged via `@with_audit` upstream. Calling MCP IS the audit trail. Do not duplicate with extra log writes.

## When to call each tool

### At session start (mandatory sequence)

```
1. load_context()
2. <repo_remote_url> = git remote get-url origin
3. get_standards(<repo_remote_url>)
4. get_instructions()
```

If `git remote get-url origin` fails (no remote, not a repo), skip `get_standards` and surface a one-line note that standards weren't loaded. Do not silently proceed.

### Before scoping or writing code

Refresh `get_standards` on the current repo so rules are fresh. Treat the returned rules as advisory constraints — let them shape generated code, spec ACs, and review findings.

### Before making technology / architecture / tooling decisions

Call `search_facts(query)` first. Read what's already known. If the search returns nothing and a non-obvious decision emerges, save the rationale (see "Saving" below).

### Before saving anything to memory

Call `search_facts` first to avoid duplicate or near-duplicate entries. If the new insight is already captured, do not save.

### After identifying a non-obvious insight

Save it. The triage questions:

- Is this useful to anyone other than this user? → candidate for shared memory.
- Is this specific to this user's workflow / preferences / habits? → private memory.
- Is this already in the codebase / git log / docs/specs / state file / Fabric audit? → do not save (hard exclusion).
- Is this a correction the user just made to an approach? → save to private memory immediately, no prompt.

## Memory governance

### Principle (judgment-based, not category-based)

If a piece of knowledge feels useful to the entire org → call `add_shared_memory`.
If something feels specific to this user's workflow → call `add_private_memory`.

There is no exhaustive category list. Use judgment.

### Hard exclusions — never save

- Full specs / requirements (live in `docs/specs/*.md`)
- Code that's already in the codebase
- Git history (use `git log`)
- Per-session ephemeral state (lives in `.claude/anthara-state.local.md`)
- Per-call audit data (already captured upstream via `@with_audit`)

If the user explicitly asks to save one of these (e.g., "save the spec to memory"), refuse and explain — the canonical store is elsewhere. Offer to save the rationale or key insights instead.

### Shared-memory confirmation rule (MANDATORY)

Every `add_shared_memory` call MUST be preceded by an `AskUserQuestion` confirmation. Pattern:

```
AskUserQuestion:
  question: "Save this to org-wide shared memory?"
  options:
    - Yes — save it
    - No — skip
    - Edit before saving — let me revise
  context: "[1-2 sentence summary of what would be saved]"
```

On Yes → call `add_shared_memory(data)`. On No → abandon the save silently. On Edit → revise per developer input, then re-prompt.

Do not retry, do not try a different framing on No. The decision stands.

Private-memory writes do NOT require confirmation — they're personal.

## Worked examples

### Example 1 — Architecture decision (shared, with confirmation)

After `architecture-advisor` decides to use the onion pattern:

1. Draft a 1–2 sentence rationale: *"Chose onion over MVC for the api/ rewrite — domain logic was tightly coupled to controllers and pulling it inward made the slice loop tractable."*
2. AskUserQuestion: "Save this architecture decision to org-wide shared memory? — [rationale]"
3. On Yes, call `add_shared_memory(rationale)`. On No, skip.

### Example 2 — User correction (private, immediate)

User says *"stop framing in marketing terms; this is engineering."*

1. Form a 1-sentence private-memory entry: *"User pushes back on marketing/positioning framing during plugin design — engineering-mode framing required."*
2. Call `add_private_memory(entry)` immediately. No prompt.

### Example 3 — Search before deciding

Before recommending a state-management library:

1. Call `search_facts(query="state management library choice")`.
2. If results exist, factor them in. If the user's org already standardised on one, use it.
3. If nothing, make a recommendation. After the user agrees and the choice is confirmed, ask about saving the rationale (with confirmation if shared scope).

### Example 4 — Refusing to save

User says *"save the entire spec to memory."*

1. Decline, citing the hard-exclusion list — full specs live in `docs/specs/`.
2. Offer alternatives: "I can save the rationale for a specific decision in the spec, or a key insight that surfaced. Which?"

## Failure modes

### Fabric unreachable

If `get_status()` returns unhealthy or any MCP call errors with connection failure:

- Do not silently proceed without standards.
- Surface the failure in a single actionable line: *"Fabric MCP unreachable. Set ANTHARA_FABRIC_URL / ANTHARA_API_KEY and restart, or proceed without org standards."*
- Continue only if the user explicitly confirms to proceed without standards. Mark any artifacts produced as `standards-unavailable: true`.

### Stale context (long sessions)

If a session has been open for hours and policies might have changed, re-call `load_context()` and `get_standards(<repo_remote_url>)` at sensible boundaries: start of a new feature, before a `/anthara:review`, before architecture decisions.

### Auth errors

If a Fabric call returns 401 / 403, the API key is missing or invalid. Direct the user to README setup steps. Do not retry.

## Quick reference

| Moment | Tool | Confirmation? |
|---|---|---|
| Session start | `load_context`, `get_standards`, `get_instructions` | No |
| Before code / spec / review | `get_standards` (refresh) | No |
| Before any decision | `search_facts` | No |
| User correction observed | `add_private_memory` | No (private) |
| Architecture rationale | `add_shared_memory` | **Yes (AskUserQuestion)** |
| Reviewer pattern insight | `add_shared_memory` | **Yes** |
| Spec-time non-obvious decision | `add_shared_memory` | **Yes** |
| Onboard insight | `add_shared_memory` | **Yes** |
| Personal preference | `add_private_memory` | No (private) |
| Health check | `get_status` | No |
