# anthara-code

Claude Code plugin for healthtech and fintech engineering teams using Anthara. Adapts a spec-driven development workflow with healthtech/fintech tuning, leans on the Anthara Fabric MCP server for memory and pack-derived standards, and treats the Anthara LiteLLM gateway as the source of truth for hard enforcement (PHI detection, MCP-call gating, cost controls).

The plugin is **advisory and workflow-shaping**, not enforcing. Claude follows the rules pulled from Fabric; the LiteLLM gateway intercepts requests in flight and blocks PHI / dangerous MCP calls / cost-exceeding calls before they leave the network.

## Session start (mandatory)

At the start of every session, call these Fabric MCP tools in this order:

1. `load_context()` — load the user's profile + recent org and personal memories.
2. `get_standards(raw_remote_url=<output of git remote get-url origin>)` — load active pack-derived rules for this repository (org-wide + repo-specific, merged across SOC 2 / HIPAA / PCI-DSS / internal packs).
3. `get_instructions()` — load priority-ordered behavioural directives.

Apply these throughout the session as advisory rules. Don't print them at length; absorb them and let them shape generated code, reviews, spec acceptance criteria, and decisions. Surface specific rules when they're directly relevant to the work.

If `git remote get-url origin` fails (no git remote, not a repo, etc.), skip `get_standards` and tell the user once that standards weren't loaded. Don't silently proceed without surfacing it.

## Posture

- **Advisory, not enforcing.** Standards from `get_standards` are advisory rules — follow them unless there's a documented reason not to. Do not invent new hard blocks at the plugin layer.
- **The LiteLLM gateway owns enforcement.** PHI detection, MCP tool-call gating, and cost controls happen in the Anthara LiteLLM gateway upstream of any LLM provider. The plugin assumes the gateway is operational and does not re-implement its checks.
- **No PHI handling in the plugin.** The plugin does not detect, mask, or block PHI itself. If an action would put PHI on the wire, the gateway will catch it.

## Memory rules — principle-based

Memory writes go to the Anthara Fabric MCP via:

- `add_private_memory(data)` — your own preferences, habits, workflow patterns.
- `add_shared_memory(data)` — knowledge useful to the entire org.

**Principle.** If a piece of knowledge feels useful to the entire org, save it to shared memory. If it feels specific to this user's workflow, save it to private memory. The decision is judgment-based — there is no exhaustive category list. Trust your judgment and the user's.

**Shared-memory confirmation rule.** Every `add_shared_memory` call MUST be preceded by an `AskUserQuestion` confirmation prompt (e.g., "Save this to org-wide shared memory?"). If the user declines, abandon the save silently. Private-memory writes proceed without confirmation — they're personal.

**Hard exclusions — never save these:**

- Full specs / requirements (live in `docs/specs/*.md`, searchable in repo)
- Code that's already in the codebase
- Git history (use `git log`)
- Per-session ephemeral state (lives in `.claude/anthara-state.local.md`)
- Per-call audit data (already flows to Fabric via the `@with_audit` decorator upstream)

**Save (illustrative, not exhaustive):**

- Architecture decisions + WHY (the rationale, not the full doc)
- Compliance / standards interpretations (e.g., "we treat HIPAA §164.312 encryption-at-rest as required because of state-law overlay")
- Pack rule interpretations made during slice work or review
- Integration gotchas (provider quirks, package issues, deploy-platform surprises)
- Tooling decisions discovered (e.g., "we use uv for Python deps in api/")
- Useful code patterns or recipes that aren't already in the codebase
- User corrections / pushbacks → private
- Personal workflow preferences → private

**Correction-watcher.** When the user corrects an approach you took (e.g., "stop framing in marketing terms", "this isn't right because Y"), save the correction to private memory via `add_private_memory` so future sessions don't repeat the mistake. No prompt needed — it's private memory.

For the comprehensive when/how playbook including worked examples, load the `anthara-mcp-orchestration` skill.

## Commands

> **v1.2 ship status (May 2026):** Nine commands are operational. anthara-code v1.2.0 adds `/anthara:discover` and introduces discovery, design-agent, and tidy agents into `/anthara:start` (Phases 3-4-6). Previous commands: `/anthara:start`, `/anthara:review`, `/anthara:onboard`, `/anthara:grill-me`, `/anthara:standards`, `/anthara:scan-results`, `/anthara:remember`, `/anthara:help`.

- **`/anthara:start`** — Spec-driven development workflow with grill-me-flavor due-diligence. Triage → context → tidy → design → grill-me → discovery → requirement-rewrite → spec → architecture → slice loop. Built to prevent bugs by forcing clarity before code is generated.
- **`/anthara:discover`** — Standalone discovery session. PM persona interviews you (or synthesizes transcripts) to produce a PRD with regulated-data flows and compliance surface. Use standalone or let `/anthara:start` invoke it for FEATURE/EPIC tasks with high decision density.
- **`/anthara:review`** — Code review through the lens of active rules. Reviewer pulls `get_standards` first, then evaluates the diff. Cites rule text and reasoning per finding.
- **`/anthara:onboard`** — Interactive developer walkthrough of an existing project, healthtech/fintech tuned. Local-only; does not scaffold output.
- **`/anthara:grill-me`** — Standalone Socratic interview, healthtech-tuned. Same skill embedded in `/anthara:start`.
- **`/anthara:standards`** — Show the resolved compliance standards for the current repo. Thin wrapper over `get_standards`.
- **`/anthara:scan-results`** — Show the latest AI-readiness scan results for the current repo. Mirrors the web dashboard's expanded view inline. Each action item is numbered (`proposed-fix → N`) for a future `/anthara:apply-fix N` flow.
- **`/anthara:remember`** — Manual memory operation: search facts and ad-hoc save. Honors the shared-memory confirmation rule above.
- **`/anthara:help`** — Explain the plugin and list all commands. Verifies Fabric reachability via `get_status`.

## Audit

Every Fabric MCP call you make is audit-logged automatically via the upstream `@with_audit` decorator (model: `mcp_audit_log`). You don't need to emit audit events from the plugin — calling MCP tools IS the audit trail. Don't duplicate this with extra log writes.

## State file

`/anthara:start` keeps workflow state in `.claude/anthara-state.local.md`. Frontmatter mirrors `bee-state.local.md` (feature, size, risk, current-phase, current-slice, slice-progress, phase-progress, plus discovery / phase-spec / architecture / design-brief paths) and adds an `anthara_artifacts` section listing `spec_path`, `architecture_path`, and `test_plan_path`. The file is per-project and gitignored — ephemeral to the workflow run.

## Setup

The plugin reads three environment variables:

- `ANTHARA_FABRIC_URL` — base URL of the Anthara Fabric MCP server
- `ANTHARA_API_KEY` — bearer token issued by your org admin
- `ANTHARA_MEMORY_GROUP` — your org / memory-group id (used in the Fabric MCP SSE path)

Set them in your shell, in `.claude/settings.local.json` (gitignored), or via `direnv`. Restart Claude Code after setting. Verify with `/anthara:help` — it will report whether Fabric is reachable.

See `README.md` for full setup steps.
