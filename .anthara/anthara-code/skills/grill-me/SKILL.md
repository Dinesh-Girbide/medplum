---
name: grill-me
description: This skill should be used when the user runs '/anthara:grill-me', asks to "grill me", "stress-test my plan", "poke holes in this", "challenge my design", "what am I missing", "interview me about this", or presents a plan and wants it pressure-tested before committing to it. Healthtech and fintech tuned — active compliance rules from get_standards are a first-class probe surface alongside architecture, product, and tech. Loads anthara-grill-me-flavor and runs the interview standalone (no spec output).
argument-hint: "[topic / plan / design — optional]"
allowed-tools: ["AskUserQuestion", "ToolSearch", "Skill", "Read", "Glob", "Grep", "Bash", "Write", "Edit"]
version: 1.0.0
---

# /anthara:grill-me

Standalone Socratic interview, healthtech / fintech tuned. Invokes `anthara-grill-me-flavor` directly — same skill that powers the spec-phase grill inside `/anthara:start`, but here used independently.

**IMPORTANT — Deferred Tool Loading:** Before calling `AskUserQuestion`, you MUST first call `ToolSearch` with query `"select:AskUserQuestion"` to load it. This is a deferred tool and will fail if called without loading first. Do this once at the start of your work.

**NEVER ask questions as plain text output.** Every question to the user MUST go through the `AskUserQuestion` tool.

## Behaviour

1. **Determine the topic.** If the developer's argument provides a plan / design / topic, use it. Otherwise `AskUserQuestion`: *"What do you want to be grilled on?"*

2. **Load `anthara-grill-me-flavor`** via the Skill tool. The skill drives the interview.

3. **No spec output.** This is a standalone grill — the result is shared understanding, not a written artifact. The skill maintains a running context record at `.claude/anthara-context.local.md` so the conversation has memory; that file is the only artifact.

4. **No automatic hand-off to other workflow phases.** When the grill concludes (developer satisfied or all branches resolved), present the summary and stop. If the developer wants to continue into spec-writing or architecture, they invoke `/anthara:start`.

## When to use this vs. `/anthara:start`

- **`/anthara:grill-me`** — discrete grilling session. The developer has a plan or idea and wants it stress-tested. No spec gets produced; no slice loop runs.
- **`/anthara:start`** — full SDD workflow. Spec-phase already runs grill-me-flavor as one of its steps; the developer doesn't need to grill separately.

If the developer is unsure which to invoke, ask: *"Are we grilling to sharpen an idea, or are we kicking off implementation?"* Implementation → `/anthara:start`. Just sharpening → this command.

## Out of scope

- Spec authoring — `anthara-spec-writing` + `spec-builder` agent (inside `/anthara:start`).
- Brainstorming new options when there is no plan yet — `anthara-brainstorming` (or `/anthara:start` if the user wants to commit to building something).
- Architecture evaluation against a spec — `architecture-advisor` agent (inside `/anthara:start`).

## Reference

Full grilling behaviour and tone live in `skills/anthara-grill-me-flavor/SKILL.md`. The mini-brainstorm hand-off is `skills/anthara-brainstorming/SKILL.md`.
