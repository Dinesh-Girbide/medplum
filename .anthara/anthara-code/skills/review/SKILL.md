---
name: review
description: This skill should be used when the user runs '/anthara:review', asks "review my diff", "review this PR", "review my branch", "review changes through compliance lens", "code review with rules", or wants a code review of a diff (uncommitted changes, a named branch, or a GitHub PR) framed through the lens of the active compliance standards. Cites rule text per finding, groups findings by severity, halts cleanly if Fabric MCP is unreachable.
argument-hint: "[--branch <name> | --pr <number>]"
allowed-tools: ["Bash", "AskUserQuestion", "ToolSearch", "Task", "mcp__fabric__get_status"]
version: 1.0.0
---

# /anthara:review

Compliance-aware code review of a diff. The compliance perspective IS the review — the reviewer pulls active standards from Fabric and frames every finding through that lens. Delegates the heavy lifting to the `reviewer` agent.

**IMPORTANT — Deferred Tool Loading:** Before calling `AskUserQuestion`, you MUST first call `ToolSearch` with query `"select:AskUserQuestion"` to load it. This is a deferred tool and will fail if called without loading first. Do this once at the start of your work.

**NEVER ask questions as plain text output.** Every question to the user MUST go through the `AskUserQuestion` tool.

## Behaviour

Run these steps in order. Halt with an actionable error if any step fails.

### 1. Pre-flight check

Call `get_status()` on the Fabric MCP server.

- **If unreachable**: halt with: *"Fabric MCP unreachable — `/anthara:review` cannot review without standards. Verify ANTHARA_FABRIC_URL and ANTHARA_API_KEY, restart Claude Code, retry."* Do not proceed without standards.

### 2. Resolve the diff

Parse the developer's argument:

- **No argument (default)** — review the current uncommitted diff plus committed changes ahead of `main`. Run via Bash:
  ```bash
  git diff main...HEAD            # committed changes ahead of main
  git diff                        # uncommitted working-tree changes
  ```
  Concatenate both outputs (label which is which).

- **`--branch <name>`** — review the named branch's diff vs `main`:
  ```bash
  git diff main...<name>
  ```
  Confirm the branch exists first: `git rev-parse --verify <name>`. If not, halt with: *"Branch `<name>` not found locally. Fetch it first: `git fetch origin <name>`."*

- **`--pr <number>`** — review the diff of the named GitHub pull request:
  ```bash
  gh pr diff <number>
  ```
  If `gh` is not installed or the PR doesn't exist, halt with the gh error message verbatim plus: *"`gh pr diff` failed — install `gh` (https://cli.github.com) or check that you have access to PR <number>."*

If the chosen diff is empty, halt with: *"No diff to review. Make some changes, switch branches, or specify a PR with `--pr <number>`."*

### 3. Delegate to the reviewer agent

Invoke the `reviewer` agent via the Task tool. Pass:

- The full diff (stdout from step 2).
- A note about which scope was reviewed (default / branch / pr) for context.
- The current working directory.

The agent calls `get_standards`, reviews the diff through the compliance lens, groups findings by severity, cites rule text per finding, and surfaces an actionable error if Fabric becomes unreachable mid-review.

When the agent returns its review, render it to the developer.

### 4. Post-review memory pass

The reviewer agent already runs the `search_facts` → `AskUserQuestion` → `add_shared_memory` pattern for any newly-flagged pack-rule violation patterns that aren't already documented. The orchestrator does not need to repeat it.

## Out of scope

- Auto-applying fixes. The reviewer is read-only. If fixes are needed, the developer handles them — or the slice-coder, if this is being run inside `/anthara:start`'s flow.
- Reviewing without rules. If Fabric is unreachable, the command halts. Compliance-blind review is a different command (not built in v1).
- Functional code review (style, naming, complexity) divorced from compliance. The full-feature reviewer agent handles that for `/anthara:start`'s wrap phase. This command's reviewer is compliance-first.

## Reference

For Fabric MCP call patterns and the shared-memory confirmation gate, see `anthara-mcp-orchestration`. Full reviewer behaviour lives in `agents/reviewer.md`.
