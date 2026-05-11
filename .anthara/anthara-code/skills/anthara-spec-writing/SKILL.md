---
name: anthara-spec-writing
description: This skill should be used when writing specs, acceptance criteria, or slicing features into vertical slices for healthtech and fintech engineering work. Loaded by the spec-builder agent inside /anthara:start. Mirrors bee:spec-writing with healthtech/fintech tuning — pack-derived rules from get_standards become mandatory ACs, and compliance/audit/encryption/retention concerns are first-class, not afterthoughts.
version: 0.1.0
---

# Anthara Spec Writing

## What makes a good acceptance criterion

Each criterion is a single, testable statement describing one observable behaviour in one sentence.

**Good:**

```markdown
- [ ] User can create an account with email and password
- [ ] Shows error when email is already taken
- [ ] Password must be at least 8 characters
- [ ] Sends welcome email after successful signup
```

**Bad:**

```markdown
- [ ] Handle user registration                  (How? What happens?)
- [ ] The registration feature works correctly  (What does "correctly" mean?)
- [ ] Use bcrypt for password hashing with 12 salt rounds  (Implementation, not behaviour)
```

**The test:** can a developer (or the slice-tester agent) write a test from this criterion without asking clarifying questions? If yes, it's good. If no, it needs more detail.

### Rules for good ACs

- **One behaviour per AC.** If "and" is in the middle, split it into two.
- **Observable outcome.** Someone can look at the screen / API response / database / audit log and verify it.
- **No implementation details.** Say *"shows error when email is taken"*, not *"returns 409 Conflict with JSON error body"*.
- **Include error cases explicitly.** Error ACs are first-class.
- **No vague qualifiers.** Never *"correctly"*, *"properly"*, *"well"*, *"appropriate"* without defining what that means.
- **Compliance ACs cite the source rule.** When an AC is derived from `get_standards`, cite the rule (pack + rule text or rule number) so reviewers can verify.

## Pack-derived ACs are mandatory

When `get_standards(raw_remote_url=...)` returns rules that apply to the feature being spec'd, those rules become **mandatory acceptance criteria** in the spec. Not optional. Not "best effort." Not deferred to a follow-up. They appear in the spec alongside the functional ACs.

**Example.** Functional AC: *"User can request their medical records via the patient portal."* Active HIPAA pack rule: *"All patient-record access events are audit-logged with user_id, record_id, timestamp, and purpose_of_access."*

The spec lists BOTH:

```markdown
## Acceptance Criteria
- [ ] User can request their medical records from the portal home screen
- [ ] Portal verifies the user's identity before serving records
- [ ] Records returned are filtered to the requesting user
- [ ] Shows error when no records exist for the user
- [ ] Every record-access event is audit-logged with user_id, record_id, timestamp, purpose_of_access  (HIPAA §164.312(b), pack: hipaa-2024)
- [ ] Audit log is queryable by record_id within the active retention window
```

The compliance ACs are not buried under "Out of Scope" or "Future Work." They're peers of the functional ACs.

## Code in specs

Small indicative code is fine when it clarifies intent:

```markdown
GOOD — API shape:
  POST /api/orders
  { userId, items: [{ productId, qty }] }
  → 201 { orderId, total, status }

GOOD — Data structure:
  Order: { id, userId, items[], total, status, createdAt }

BAD — Implementation logic:
  const order = await db.insert('orders', { ... });
```

Use code to show contracts and shapes. Never use code to show logic — that belongs to the slice-coder.

## Vertical slicing and outside-in thinking

These principles apply at every size — SMALL, FEATURE, EPIC. Not optional for large tasks.

**Always slice by user-visible capability, not by technical layer.**

**Vertical (correct):**

- Slice 1: User can register with email and password (UI + API + DB + validation + audit-log AC)
- Slice 2: User can log in and receive a session token (UI + API + auth logic + audit-log AC)
- Slice 3: User can reset their password via email (UI + API + email service + audit-log AC)

**Horizontal (wrong):**

- Slice 1: Create all database tables
- Slice 2: Build all API endpoints
- Slice 3: Build the UI

Vertical wins because each slice is independently testable and shippable, and each slice carries its own compliance ACs end-to-end.

A good slice is **independently releasable**, **testable in isolation**, **small enough for one TDD plan**, and **delivers user-visible value with its compliance constraints satisfied**.

**Ordering:** start with the walking skeleton — the thinnest end-to-end path. Each subsequent slice adds capability. Later slices can assume earlier slices work.

**Outside-in within each slice:** order ACs from what the user experiences inward — UI first, API contract next, data, then compliance/audit/observability. Compliance ACs come at the end of the slice's AC list, but they're part of the slice's contract — they don't get split into a separate "compliance pass" slice.

## Adaptive depth by risk

Not every spec needs the same rigour:

**Low risk** (internal tool, easy to revert, no regulated data):

- 3-5 acceptance criteria
- Happy path + basic error handling
- Quick confirmation, move on

**Moderate risk** (user-facing, business logic, may touch regulated data):

- 5-8 acceptance criteria
- Happy path + edge cases + error scenarios + applicable compliance ACs

**High risk** (payments, auth, PHI handling, data migration, anything cross-cutting):

- 8-12 acceptance criteria
- Happy path + edge cases + failure modes + security + concurrency + applicable compliance ACs (HIPAA / PCI-DSS / SOC 2 / GLBA)
- Concurrency: what if two users act simultaneously?
- Data integrity: what if the process fails halfway?

If the feature touches regulated data, treat it as moderate risk minimum, regardless of other factors.

## Capturing out-of-scope

Explicitly state what is NOT being done. Prevents scope creep and gives the AI clear boundaries.

Examples:

- *"Out of scope: social login (Google, GitHub). Email/password only for this slice."*
- *"Out of scope: email verification. Users can log in immediately after registration."*
- *"Out of scope: audit-log retention beyond active window. Long-term retention is a separate slice."*

Without explicit out-of-scope, the AI may build features that weren't asked for.

## Spec structure

### Single-slice feature

```markdown
# Spec: [Feature Name]

## Overview
[1-2 sentences: what and why]

## Acceptance Criteria
- [ ] [Functional AC]
- [ ] [Error AC]
- [ ] [Edge case AC]
- [ ] [Compliance AC] (cite pack + rule)

## API Shape (if applicable)
[Indicative code]

## Out of Scope
- [What we're explicitly not doing]

## Technical Context
- Patterns to follow: [from codebase]
- Key dependencies: [existing code this integrates with]
- Active packs: [list packs from get_standards]
- Risk level: [LOW / MODERATE / HIGH]
```

### Multi-slice feature (EPIC)

```markdown
# Spec: [Feature Name]

## Overview
[1-2 sentences]

## Slice 1: [Name — the walking skeleton]
- [ ] [Functional AC]
- [ ] [Error AC]
- [ ] [Compliance AC] (cite pack + rule)

## Slice 2: [Name — builds on Slice 1]
- [ ] [Functional AC]
- [ ] [Compliance AC]

## Out of Scope
- [What we're not doing]

## Technical Context
- Active packs: [list]
- Risk level: [LOW / MODERATE / HIGH]
```

Checkboxes (`- [ ]`) track progress. Each AC gets `[x]` when the sdd-verifier confirms a passing test.
