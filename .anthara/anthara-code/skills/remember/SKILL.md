---
name: remember
description: This skill should be used when the user runs '/anthara:remember', asks to "remember this", "save to memory", "search memory", "what do I know about X", "recall", "find in memory", or wants to manually save to or search the Anthara Fabric memory ad-hoc. Honors the principle-based memory rules and the shared-memory AskUserQuestion confirmation pattern from anthara-mcp-orchestration. For automatic memory saves during workflows (architecture decisions, reviewer findings, corrections), see anthara-mcp-orchestration directly.
argument-hint: "[search query OR text to save OR empty for recent]"
allowed-tools: ["mcp__fabric__add_private_memory", "mcp__fabric__add_shared_memory", "mcp__fabric__search_facts", "mcp__fabric__list_memories", "AskUserQuestion", "ToolSearch"]
version: 1.0.0
---

# /anthara:remember

User-driven Fabric memory operation: search, save, or list recent memories ad-hoc.

For automatic memory saves during workflows (architecture rationales, reviewer pattern findings, user corrections, non-obvious spec-time insights), load the `anthara-mcp-orchestration` skill — it owns the comprehensive playbook including the principle-based decision rules, the hard-exclusion list, and the mandatory AskUserQuestion confirmation pattern for shared-memory writes. This skill is the manual, user-driven surface; orchestration is the agent-facing playbook.

**IMPORTANT — Deferred Tool Loading:** Before calling `AskUserQuestion` (used in the save flow for scope decision and shared-memory confirmation), you MUST first call `ToolSearch` with query `"select:AskUserQuestion"` to load it. This is a deferred tool and will fail if called without loading first. Do this once at the start of your work.

**NEVER ask questions as plain text output.** Every question to the user MUST go through the `AskUserQuestion` tool.

## Behaviour

Parse the developer's argument and route to one of three flows.

### 1. Search flow — when input is a question or query

Trigger phrasing: "what do I know about X", "search for X", "find X in memory", "recall X", or any question form.

1. Call `search_facts(query=<input>, limit=20)`.
2. Render results grouped by scope label (`private` or `shared`), each entry showing source label, fact text, and timestamp.
3. If results are empty, say so and do not save or create anything.

### 2. Save flow — when input is a statement to save

Trigger phrasing: "remember this: ...", "save: ...", "note that ...", or any statement form.

Run these steps in order. Do not skip step 2 — it is load-bearing.

1. **Search first.** Call `search_facts(query=<input summary>)` to avoid duplicates. If a near-duplicate exists, surface it and AskUserQuestion: "I already have a similar memory. Save anyway, or skip?" — proceed per the answer.

2. **Apply hard exclusions.** Refuse and explain if the input matches any of:
   - A full spec or requirement document (those live in `docs/specs/*.md` and are searchable in the repo).
   - Code already in the codebase (use `git log` / `git blame`, not memory).
   - Git history (use `git log`).
   - Per-session ephemeral state (lives in `.claude/anthara-state.local.md`).
   - Per-call audit data (already captured upstream via the `@with_audit` decorator on Fabric MCP tools).

   When refusing, offer alternatives — see "Refusal patterns" below.

3. **Determine scope.** Decide whether the input is org-useful (shared) or workflow-specific to this user (private), using the principle from `anthara-mcp-orchestration`:
   - **Org-useful (shared):** architecture decisions, compliance interpretations, pack rule interpretations, integration gotchas, tooling decisions, useful code patterns or recipes that aren't already in the codebase, team conventions discovered.
   - **User-specific (private):** personal preferences, individual habits, dev-specific tool config, user corrections of approach.
   - If unclear: `AskUserQuestion` — "Save this as shared (org-wide, visible to your whole team) or private (just for you)?" with options Shared / Private / Cancel.

4. **For shared scope — confirmation gate (mandatory).** `AskUserQuestion` with the explicit save prompt: "Save this to org-wide shared memory? — [1-2 sentence summary of what would be saved]" with options Yes — save it / No — skip / Edit before saving.
   - On Yes: call `add_shared_memory(<input>)`.
   - On No: abandon silently. Do not retry, do not try a different framing.
   - On Edit: ask the developer to revise, then re-prompt with the revised text.

5. **For private scope — save directly.** Call `add_private_memory(<input>)` without a confirmation prompt. Private memory is personal; the developer initiated the save.

### 3. Recent flow — when input is empty or "recent memories"

Trigger phrasing: no argument, "recent memories", "what have I saved lately", "list memories".

1. Call `list_memories(scope='all', last_n=20)`.
2. Render the list with scope label and timestamp.

## Refusal patterns

When refusing a hard-exclusion save, be specific about why and offer an alternative:

- **Full spec ask:** *"Specs live in `docs/specs/` and are searchable in the repo — saving the whole spec to memory would duplicate. I can save the rationale for a specific decision in the spec, or a key insight that surfaced. Which?"*
- **Code ask:** *"Code already lives in the repo — `git log` and `git blame` cover it. What's the part of the decision NOT obvious from the code?"*
- **Git history ask:** *"`git log` is the canonical source. If there's a non-obvious commit-message rationale worth preserving outside git, that's a candidate — what specifically?"*

Refusing is the correct outcome for these cases. Do not work around the rule.

## Out of scope

- Auto-saving from inside workflow agents — `anthara-mcp-orchestration` owns this.
- Automatic capture of user corrections — that is owned by the plugin `CLAUDE.md` correction-watcher rule and runs without an explicit `/anthara:remember` invocation. This skill is the manual surface only.
- Bulk import / export of memory — out of v1.
- Editing existing memories — Fabric memory is immutable in v1; save a corrected version with a note such as *"supersedes earlier memory: ..."*.

## Reference

For the comprehensive when/what-to-save playbook including agent-driven auto-save triggers, the principle-based decision rules, worked examples, and failure modes, load the `anthara-mcp-orchestration` skill.
