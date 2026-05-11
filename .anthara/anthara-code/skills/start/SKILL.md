---
name: start
description: This skill should be used when the user runs '/anthara:start', wants to "kick off a feature", "build a new feature", "spec and build something", "start spec-driven dev", or asks to develop a healthtech / fintech feature end-to-end with built-in due-diligence. Drives the full /anthara:start workflow — triage, context, tidy, design, grill-me-flavor, discovery, requirement-rewrite, spec, architecture, slice loop. Designed to prevent bugs through clarity in the spec; pulls active compliance rules from get_standards and treats them as mandatory ACs.
argument-hint: "[task description — optional, otherwise asked interactively]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion", "ToolSearch", "Task", "Skill", "mcp__fabric__get_status", "mcp__fabric__get_standards", "mcp__fabric__load_context"]
version: 1.2.0
---

# /anthara:start

Spec-driven development workflow with grill-me-flavor due-diligence, healthtech and fintech tuned. The flagship `/anthara:*` command.

**IMPORTANT — Deferred Tool Loading:** Before calling `AskUserQuestion`, you MUST first call `ToolSearch` with query `"select:AskUserQuestion"` to load it. This is a deferred tool and will fail if called without loading first. Do this once at the start of your work.

**NEVER ask questions as plain text output.** Every question to the user MUST go through the `AskUserQuestion` tool. If you find yourself typing a question as regular text, stop and use `AskUserQuestion` instead.

## What this skill does

Orchestrates a multi-phase workflow that turns a feature idea into shipped, tested, compliance-aware code. Phases run in order and gate each other:

1. **Triage** — assess size + risk.
2. **Context** — `context-gatherer` agent scans codebase + pulls active standards.
3. **Tidy** *(optional)* — `tidy` agent cleans up the change area in a separate commit.
4. **UI Check** *(optional)* — `design-agent` produces `.claude/DESIGN.md` if UI-involved.
5. **Grill-me-flavor** — `anthara-grill-me-flavor` skill runs Socratic due-diligence on the idea.
6. **Discovery** *(optional)* — `discovery` agent produces a PRD for FEATURE/EPIC tasks with high decision density.
7. **Requirement-rewrite** — `anthara-requirement-architect` skill rewrites the requirement for design + compliance fit.
8. **Spec** — `spec-builder` agent produces `docs/specs/[feature]-spec.md`. Then `anthara-collaboration-loop` runs on the spec.
9. **Architecture** — `architecture-advisor` agent produces `.claude/anthara-architecture.local.md`. Then `anthara-collaboration-loop` runs on the architecture doc.
10. **Slice loop** — for each slice in the spec: `slice-coder` → `slice-tester` → `sdd-verifier`. One at a time. Don't batch.

The workflow is the load-bearing engineering value of this command: clarity in the spec → fewer bugs in the code.

## Pre-flight check

Before any phase runs:

1. Call `get_status()` on the Fabric MCP server.
2. **If Fabric is unreachable**, halt with an actionable message: *"Fabric MCP unreachable. /anthara:start needs Fabric for standards, memory, and audit. Set ANTHARA_FABRIC_URL / ANTHARA_API_KEY and restart, then run /anthara:start again."* Do not proceed without Fabric.
3. Call `load_context()` to load user profile + recent memories.

## State

Workflow state lives at `.claude/anthara-state.local.md`. Create or update it after each phase transition.

State file structure (initialise with the Write tool on first phase, update with Edit thereafter):

```markdown
---
feature: [feature name]
size: [TRIVIAL / SMALL / FEATURE / EPIC]
risk: [LOW / MODERATE / HIGH]
current_phase: [triaged / context_gathered / tidied / design_briefed / grilled / discovered / rewritten / spec_confirmed / architecture_confirmed / slice_<N>_coding / slice_<N>_testing / slice_<N>_verifying / done]
current_slice: [N or null]
slice_progress:
  - "Slice 1: <status>"
  - "Slice 2: <status>"
anthara_artifacts:
  spec_path: docs/specs/[feature]-spec.md
  architecture_path: .claude/anthara-architecture.local.md
  discovery_path: null
  design_brief_path: null
  test_plan_path: null
---
```

Mirror bee-state's frontmatter where applicable, plus the `anthara_artifacts` section with concrete artifact paths.

## Workflow

### Phase 1 — Triage

If the developer's argument provides a task description, parse it. Otherwise `AskUserQuestion`: *"What feature do we want to build?"*

Assess SIZE (TRIVIAL / SMALL / FEATURE / EPIC) and RISK (LOW / MODERATE / HIGH) from the description. Write initial state to `.claude/anthara-state.local.md`.

For TRIVIAL: skip the full workflow. Use `/anthara:remember` for ad-hoc work or hand off to the slice-coder directly with the task description. Then return.

For SMALL / FEATURE / EPIC: continue to Phase 2.

**State update:** `current_phase: triaged`.

### Phase 2 — Context

Delegate to the `context-gatherer` agent via the Task tool. Pass the task description and the project's working directory. The agent reads the codebase and calls `get_standards` + `get_instructions`. It writes `.claude/anthara-context.local.md`.

If the agent returns with the **Active Compliance Standards** section showing "Standards availability: unavailable", surface that to the developer once and ask whether to proceed without standards. If yes, mark anthara-state's `standards_available: false` for downstream agents.

**State update:** `current_phase: context_gathered`.

### Phase 3 — Tidy (Optional)

If the context-gatherer flagged tidy opportunities in the **Tidy Opportunities** section, use AskUserQuestion:
*"I found some cleanup opportunities in this area: [list the flagged items]. Want to tidy first? It'll be a separate commit."*
Options: "Yes, tidy first (Recommended)" / "Skip, move on"

If the area is clean ("no tidy needed"), skip this phase entirely.

If yes: delegate to the **tidy** agent via Task. Pass the flagged items and the context file. The tidy agent works in a separate commit — cleanup and feature work never mix.

**State update:** `current_phase: tidied` (or skip to next phase if area is clean or developer declined).

### Phase 4 — UI Check (Optional)

If context-gatherer flagged "UI-involved: yes" in the **Design System** section:

Delegate to the **design-agent** via Task, passing the developer's task description, `context_file: .claude/anthara-context.local.md`, and the triage assessment. The design agent produces a design brief at `.claude/DESIGN.md`.

When the agent returns:

1. Update state with `design_brief_path: .claude/DESIGN.md`.
2. Run the `anthara-collaboration-loop` skill on the design brief.

If "UI-involved: no", skip this phase entirely.

For greenfield projects: do a lightweight UI-signal scan of the developer's description for UI keywords (screen, form, dashboard, page, UI, UX, frontend, display, view, layout, chart, table, component, button, widget). If detected, offer the design agent.

**State update:** `current_phase: design_briefed` (or skip to next phase if no UI).

### Phase 5 — Grill-me-flavor

Load the `anthara-grill-me-flavor` skill via the Skill tool. Run the interview against the task + the context summary. The skill maintains the running grill record at `.claude/anthara-context.local.md` (appending after the context-gatherer's section).

When the skill concludes (developer satisfied or all branches resolved), proceed.

**State update:** `current_phase: grilled`.

### Phase 6 — Discovery (Optional)

This phase runs for FEATURE and EPIC tasks only. Assess **decision density** — how many unresolved decisions are in this task, and do they affect each other?

**High decision density — discovery needed:**
- 2+ unresolved decisions that are interdependent (choosing one constrains the others)
- Amplifying signals (any + 2+ open decisions = definitely discover): goal framing ("build a system that...", "replace X"), unbounded scope ("at least", "similar to"), no existing patterns, multiple providers/integrations, replacement framing
- Regulated-data amplifier: if the feature touches PHI, cardholder data, or financial-account data AND has 2+ open decisions, recommend discovery — compliance constraints multiply the decision space

**Low decision density — skip discovery, go straight to requirement-rewrite:**
- 0-1 open decisions, or multiple decisions that are independent of each other

When discovery is recommended, use AskUserQuestion:
*"I count [N] design decisions that affect each other here — [list them briefly]. I'd suggest a quick discovery pass to map these out before we spec. Takes a few minutes but prevents building the wrong thing."*
Options: "Yes, let's discover first (Recommended)" / "Skip, go straight to spec"

If the developer chooses discovery:
Delegate to the **discovery** agent via Task, passing the task description, triage assessment, `context_file: .claude/anthara-context.local.md`, and any grill-me decisions already recorded. The agent writes `docs/specs/[feature]-discovery.md`.

When the agent returns:

1. Update state with `discovery_path`.
2. Run the `anthara-collaboration-loop` skill on the discovery document.
3. If discovery revised the triage size (e.g., FEATURE → EPIC) or risk, update state.
4. If discovery document contains a **Module Structure** section and the project is greenfield, load the `anthara-boundary-generation` skill and follow its procedure.

**State update:** `current_phase: discovered` (or skip to next phase if discovery not needed or developer declined).

### Phase 7 — Requirement-rewrite

Load the `anthara-requirement-architect` skill via the Skill tool. Run it on the original task description + the grill record + discovery document (if produced). The skill produces a rewritten requirement with: smells detected, active rules that apply, rewritten requirement (compliance constraints inline), architectural impact, domain model.

Append the output to `.claude/anthara-context.local.md` so spec-builder has it.

**State update:** `current_phase: rewritten`.

### Phase 8 — Spec

Delegate to the `spec-builder` agent via Task. Pass: task description, triage, `context_file: .claude/anthara-context.local.md`, discovery document path (if produced). The agent writes the spec to `docs/specs/[feature]-spec.md` and gets developer confirmation via its own `AskUserQuestion`.

When the agent returns:

1. Update state with `spec_path`.
2. Run the `anthara-collaboration-loop` skill on the spec file: append `[ ] Reviewed`, instruct the developer how to add `@anthara` annotations, and wait. On every developer message, re-read the file. Process annotations into comment cards. Proceed only when `[x] Reviewed` is set.

**State update:** `current_phase: spec_confirmed`.

### Phase 9 — Architecture

Delegate to the `architecture-advisor` agent via Task. Pass: spec_path, context_file, triage. The agent writes `.claude/anthara-architecture.local.md`, surfaces evolution triggers + slice-order recommendations, and saves the rationale to shared memory after `AskUserQuestion` confirmation.

When the agent returns:

1. If the agent recommended a slice reorder: update the spec to reflect the new order (reorder `### Slice` sections; keep content intact).
2. Update state with `architecture_path`.
3. Run `anthara-collaboration-loop` on the architecture document.

**State update:** `current_phase: architecture_confirmed`.

### Phase 10 — Slice loop

Read the spec. For each slice in order:

#### A. Code

Delegate to `slice-coder` via Task. Pass: spec_path, slice_number, context_file, architecture_file. The agent writes production code for the slice's ACs (functional and compliance).

**State update:** `current_phase: slice_<N>_coding`.

#### B. Test

Delegate to `slice-tester` via Task. Pass: spec_path, slice_number, source_files (from slice-coder), test_file_path (named for behaviour, NEVER for slice number), context_file, architecture_file.

**State update:** `current_phase: slice_<N>_testing`.

#### C. Verify

Delegate to `sdd-verifier` via Task. Pass: spec_path, slice_number, risk_level, context_file, architecture_file, source_files, test_files.

If verifier returns **PASS**: the agent already marked the slice's ACs `[x]` in the spec. Continue to the next slice.

If verifier returns **NEEDS FIXES**: surface the report, `AskUserQuestion`: *"Slice [N] needs fixes. How to proceed?"* Options:

- **Re-run slice-coder to fix (Recommended)** — pass verifier feedback as additional context.
- **Re-run slice-tester to improve tests** — same.
- **Manual fix — I'll handle it** — wait for developer.
- **Accept as-is** — risky; only on developer's explicit choice.

Re-verify after fixes.

**State update:** `current_phase: slice_<N>_verifying` → `slice_<N>_done`.

#### D. Next slice or wrap

Move to the next slice. Repeat A → B → C. When all slices verify, proceed to wrap.

### Phase 11 — Wrap

After all slices verify:

1. Run the full test suite one final time. All tests pass.
2. Present a workflow summary: slices completed, tests passing, architecture chosen, files created/modified, per-slice notes.
3. **State update:** `current_phase: done`.

## Out of scope (v1.2)

- Multi-phase delivery — discovery can produce a milestone map with multiple phases, but the slice loop currently runs a single phase. Multi-phase orchestration (loop spec→arch→slices per phase) is deferred.
- Browser verification — visual verification of UI slices via Chrome DevTools after each slice passes is deferred.
- Recap agent — final-pass narrative summary is deferred; the wrap summary above is the v1.2 substitute.
- Reviewer agent (the post-slice-loop reviewer) — the wrap summary is the substitute; full reviewer pass returns in a later version.

## Failure handling

- **Fabric unreachable** at pre-flight or any phase — halt with an actionable message; do not proceed.
- **Agent error / timeout** — retry once. If still failing, surface to the developer with the agent's last output.
- **Test suite fails after wrap** — report which tests failed; ask developer how to proceed (fix now / accept and follow up).
- **Spec drift detected by verifier** (cited rule no longer in `get_standards`) — flag in the wrap summary; spec needs an update before the next workflow run.

## Reference

For Fabric MCP call patterns, see `anthara-mcp-orchestration`. For grilling specifics, `anthara-grill-me-flavor`. For requirement-rewrite mechanics, `anthara-requirement-architect`. For spec authoring, `anthara-spec-writing`. For collaboration-loop format and gates, `anthara-collaboration-loop`. For design principles, `anthara-design-fundamentals`. For greenfield boundary generation, `anthara-boundary-generation`. Per-agent behaviour is documented in each agent's frontmatter and body under `agents/`.
