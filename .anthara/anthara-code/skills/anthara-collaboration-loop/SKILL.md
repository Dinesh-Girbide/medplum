---
name: anthara-collaboration-loop
description: This skill should be used when processing @anthara (or @bee) annotations in documents produced by /anthara:start agents (specs, architecture documents) or managing [ ] Reviewed gates. Contains the exact comment-card format and review-loop rules. Load before handling any @anthara comment or before appending the Reviewed gate to a document an agent just produced.
version: 0.1.0
---

# Anthara Collaboration Loop

After every document-producing agent in the `/anthara:start` workflow (spec-builder, architecture-advisor) returns, the developer reviews and refines the document before the workflow proceeds. This loop is the gate.

The loop is additive — the agent's own `AskUserQuestion` confirmation flow is unchanged. The collaboration loop is an additional gate run by the orchestrator (`/anthara:start`).

---

## The Reviewed gate

Every document an agent produces gets a `[ ] Reviewed` checkbox appended at the very end of the file, on its own line:

```markdown
[ ] Reviewed
```

The developer marks it `[x] Reviewed` when satisfied. This checkbox is the **only gate** for proceeding to the next workflow step. The orchestrator re-reads the file and checks for `[x] Reviewed`. Until it's marked, the workflow stays in the loop.

---

## @anthara annotations

The developer can add `@anthara` (or `@bee` — both work for backwards compatibility) comments anywhere in the document to request changes:

```markdown
@anthara this acceptance criterion is too vague — be specific about which compliance rule it satisfies
```

When the orchestrator finds an `@anthara` annotation, it:

1. Reads the comment to understand what the developer wants.
2. Makes the requested change to the document.
3. Replaces the annotation with a comment card.

---

## Comment-card format

```markdown
<!-- -------- anthara-comment -------- -->
> **@developer**: [original comment]
> **@anthara**: [what was changed and why]
> - [ ] mark as resolved
<!-- -------- /anthara-comment -------- -->
```

The HTML comment delimiters (`<!-- -->`) make the card boundaries machine-readable. The blockquote formatting makes it visually distinct. The `[ ] mark as resolved` checkbox is for the developer's tracking — it does NOT affect the Reviewed gate.

### Concrete example

**Before** (developer writes):

```markdown
## Acceptance Criteria
- All patient-record reads are logged
@anthara which active rule does this satisfy? Cite it.
- Auth tokens expire after 30 minutes
```

**After** (orchestrator processes the annotation):

```markdown
## Acceptance Criteria
- All patient-record reads are logged with `user_id`, `record_id`, `timestamp`, and `purpose_of_access` per HIPAA §164.312(b) (Audit Controls), as surfaced by `get_standards` for this repo.
<!-- -------- anthara-comment -------- -->
> **@developer**: which active rule does this satisfy? Cite it.
> **@anthara**: Added the explicit field list and cited HIPAA §164.312(b). Pulled the rule from `get_standards`; full rule text is in the active HIPAA pack.
> - [ ] mark as resolved
<!-- -------- /anthara-comment -------- -->
- Auth tokens expire after 30 minutes
```

**This format must be used exactly as shown.** Every `@anthara` annotation becomes a comment card with:

1. Opening delimiter: `<!-- -------- anthara-comment -------- -->`
2. Developer's original comment as a blockquote with `**@developer**:` prefix.
3. Anthara's response as a blockquote with `**@anthara**:` prefix explaining what changed.
4. A `- [ ] mark as resolved` checkbox inside the blockquote.
5. Closing delimiter: `<!-- -------- /anthara-comment -------- -->`

Do not vary this structure. Consistency across all documents (specs, architecture docs) is required.

When processing a `@bee` annotation (back-compat), use the same `anthara-comment` card markers — do NOT use `bee-comment` markers in anthara-namespaced documents.

---

## What blocks progression

Only `[x] Reviewed` blocks progression. These do NOT block:

- Unresolved comment cards (`[ ] mark as resolved` still unchecked).
- Open `@anthara` annotations that haven't been processed yet (process them first, then re-check `[x] Reviewed`).

---

## The loop

1. Agent writes document and confirms via `AskUserQuestion` (existing flow).
2. Agent returns to the orchestrator (`/anthara:start`).
3. Orchestrator appends `[ ] Reviewed` to the document.
4. Orchestrator shows the file path: *"I've saved the doc to `[path]`. You can review it in your editor — if anything needs changing, add `@anthara` followed by your comment on the line you want to change. I'll read your annotations, make the changes, and leave a comment card so you can see what I did. When you're happy with the doc, mark `[x] Reviewed` at the bottom to move on."*
5. Developer messages the orchestrator. Tell them: *"Type `check` when you're ready for me to re-read, or just keep chatting."* Any message triggers a re-read.
6. Orchestrator re-reads the file:
   - **`@anthara` annotations found** → process each, make the changes, replace with comment cards, write the updated file, tell the developer what changed, wait for next message.
   - **`[x] Reviewed` found** → proceed to next workflow step.
   - **Neither** → if the message is about something else, respond normally, then gently remind: *"Whenever you're ready, the doc is at `[path]` — mark `[x] Reviewed` to continue."* Don't block the conversation on the review gate.

---

## Applies to

This loop applies after these agents return inside `/anthara:start`:

- `spec-builder` → `docs/specs/[feature]-spec.md`
- `architecture-advisor` → `.claude/anthara-architecture.local.md` (or wherever the architecture doc is saved)

It does NOT apply to: `context-gatherer`, `slice-coder`, `slice-tester`, `sdd-verifier`, `reviewer` — those don't produce review-able documents in the same sense.
