---
name: anthara-requirement-architect
description: This skill should be used to rewrite software requirements so they lead to better code design and architecture in healthtech and fintech engineering contexts. Loaded by /anthara:start during the requirement-rewrite phase. Use when a developer shares requirements, user stories, feature specs, acceptance criteria, or PRDs and wants them improved before development begins. Triggers also: "review my requirements", "improve this spec", "make this requirement better", "rewrite this for better design", "architecture-aware requirements". Mirrors bee:requirement-architect with healthtech/fintech tuning — active compliance rules from get_standards are first-class architectural constraints, not afterthoughts.
version: 0.1.0
---

# Anthara Requirement Architect

Rewrite software requirements so they naturally lead to better software design, architecture, and code quality — and so they account for the active compliance rules in this repo from the start, not after a rework.

## Why this matters

How a requirement is described shapes how a developer (or an AI agent) implements it in code. A requirement full of `if/else` conditional logic produces code full of branches. A requirement that names types and behaviours produces polymorphic, extensible code.

In healthtech and fintech, requirements that ignore active compliance rules produce architectures that have to be retrofitted to satisfy them — at high cost. Pulling rules in at requirement-rewrite time, via `get_standards`, surfaces architectural constraints early.

## Core principles

### 1. Requirements shape code structure

When reading a requirement, ask: *"If a developer translates this literally into code, what would the code look like?"* Then rewrite so that literal translation produces good design.

**Conditional logic in requirements → conditional logic in code:**

Bad: *"If the user is a premium member, show price with 20% discount. If trial, no discount but add a banner. If expired, redirect to renewal."*

→ developer writes: `if (user.type === 'premium') ... else if (user.type === 'trial') ...`

**Type-based requirements → polymorphic code:**

Better: *"Each membership tier defines its own pricing display behavior and page experience. The system supports Premium, Trial, and Expired tiers, each responsible for determining how pricing is presented."*

→ developer creates: `MembershipTier` interface with `displayPricing()` method, separate implementations per tier.

### 2. Active compliance rules are first-class architectural constraints

Before rewriting, call `get_standards(raw_remote_url=<git remote get-url origin>)` so the rewrite is grounded in the active org and pack rules. When a rule applies to the requirement, surface it explicitly as a constraint in the rewrite — for example, *"all patient-record reads MUST emit an audit-log entry containing user_id, record_id, timestamp, and purpose_of_access (HIPAA §164.312(b))"* becomes part of the rewritten requirement, not a separate compliance ticket.

### 3. The seven requirement smells

Detect and fix:

#### Smell 1: Conditional chains

- Signal: *"If [condition] then [behaviour], else if [condition] then [behaviour]..."*
- Problem: branching code that's hard to extend (Open-Closed violation).
- Fix: describe distinct types/categories, each with its own behaviour profile.

#### Smell 2: Implementation leaking

- Signal: references to databases, APIs, specific technologies, UI components.
- Problem: couples requirements to a solution; blocks alternative architectures.
- Fix: describe what the system does, not how. Domain language, not tech language.

#### Smell 3: God requirement

- Signal: one requirement that touches authentication, business logic, notifications, and reporting.
- Problem: produces god classes/modules with no clear boundaries.
- Fix: decompose by domain concern — each requirement maps to one bounded context.

#### Smell 4: Missing domain language

- Signal: generic terms — *"the system"*, *"the data"*, *"the process"*, *"the user"*.
- Problem: no ubiquitous language → developers invent their own terms → inconsistent model.
- Fix: name the domain concepts explicitly. Not *"the data"* but *"the Patient Record"* or *"the Claim"*.

#### Smell 5: Temporal coupling

- Signal: *"First do X, then do Y, then do Z."*
- Problem: forces sequential implementation even when steps are independent.
- Fix: describe what triggers each action and what each action needs — let architecture decide ordering.

#### Smell 6: Ambiguous boundaries

- Signal: one requirement that says *"the system handles orders, payments, and shipping"*.
- Problem: no module boundaries → monolithic implementation.
- Fix: describe each capability as a separate concern with explicit inputs/outputs between them.

#### Smell 7: Implicit state machine

- Signal: scattered mentions of status changes across multiple requirements.
- Problem: state logic spread across the codebase with no single source of truth.
- Fix: explicitly describe the states, transitions, and triggers as one cohesive requirement.

#### Smell 8 (healthtech/fintech-specific): Compliance gap

- Signal: requirement touches PHI / cardholder data / financial-account data / other regulated data, but says nothing about audit, encryption, retention, redaction, or consent.
- Problem: implementation will satisfy the functional requirement and miss the active rule.
- Fix: pull the rule from `get_standards` and make it part of the requirement. Cite the source pack.

### 4. Rewrite strategy

For each requirement, apply this sequence:

1. **Identify the domain model.** Core nouns (entities) and their relationships. Name them with precision.
2. **Pull active rules.** Call `get_standards`. Note which rules apply to this requirement.
3. **Replace conditionals with types.** Push behaviour to the type, not to the caller.
4. **Separate concerns.** If a requirement mentions more than one bounded context, split it.
5. **Make boundaries explicit.** State the contract where two concerns interact.
6. **Surface the state machine.** If entities change status, describe the full lifecycle.
7. **Remove implementation bias.** Strip out technology references, UI specifics, solution assumptions.
8. **Add extension points.** Where future variation is likely, support multiple [X] rather than enumerating a fixed list.
9. **Bake in compliance.** For each applicable pack rule, add it to the requirement as a constraint. Cite the source pack.

## Output format

When rewriting a requirement, produce this structure:

```markdown
## Requirement Review

### Original Requirement
[paste the original]

### Smells Detected
- [Smell name]: [brief explanation of where it appears]

### Active Compliance Rules That Apply
- [Pack: rule text — cited from get_standards]
- [Pack: rule text]

### Rewritten Requirement
[the improved version, with compliance constraints inline]

### Architectural Impact
[1-2 sentences on how the rewrite leads to better code structure]

### Domain Model Suggested
[list the key entities/types/concepts that emerged from the rewrite]
```

## Agentic coding: parallel work streams

When rewriting requirements for agentic coding (multiple agents in parallel), apply these additional principles.

### Independence detection

Look for naturally independent concerns:

- Separate bounded contexts (e.g., Order Management, Payment Processing, Notification Service)
- Independent features within the same context (e.g., user registration, password reset, profile editing)
- Orthogonal quality attributes (e.g., feature implementation vs. monitoring/observability)

### Parallel work structure

For each independent stream, specify:

1. Clear boundaries — what does this stream own?
2. Explicit contracts — what does it consume? What does it provide?
3. Integration points — where/how do streams connect?
4. Dependency ordering — which streams must complete before others can start?
5. Compliance ownership — which active rules does THIS stream own enforcement of?

### Rewriting for parallel work

```markdown
### Parallel Work Streams

**Stream [N]: [Name]**
- Scope: [What this stream owns]
- Provides: [APIs/interfaces/contracts]
- Consumes: [APIs/interfaces it depends on]
- Dependencies: [Which streams must complete first]
- Compliance: [Which active rules this stream enforces, with cites]
- Acceptance Criteria:
  - [ ] [Testable criterion]
  - [ ] [Testable criterion]
```

## Important notes

- This skill rewrites requirements for architectural quality and compliance fit. It does NOT validate functional correctness or completeness — that's the spec-builder agent's job.
- Not every conditional is bad. Simple binary conditions (*"if cart is empty, show empty state"*) are fine. Target chains of 3+ conditions on the same dimension.
- Good architecture-aware requirements are MORE precise, not less. Precise about the domain model, not about implementation details.
- When the original requirement is from a non-technical stakeholder, preserve intent and business context while restructuring for architectural and compliance clarity. Add a plain-language summary alongside the rewritten version.
- Designed to be invoked BEFORE coding begins. Output feeds into spec files, architecture decisions, and the spec-builder agent.

## Reference

For Fabric MCP call patterns (specifically `get_standards`), see `anthara-mcp-orchestration`. For brainstorming alternatives when a rewrite reveals options, load `anthara-brainstorming`.
