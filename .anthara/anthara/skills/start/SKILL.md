---
name: start
description: Triage router and the first command to run when the user doesn't know which Anthara command applies. Takes a description, classifies the work (bug / small feature / large feature / exploratory / existing artifact pointer), detects regulated context, and recommends the right chain entry — brainstorm, discovery, spec-writer, debug-fix, develop, create-ticket, or skip Anthara entirely. Always confirms before invoking. Use when the user runs /anthara:start, says "kick off a feature", "I want to build X", "we need to fix Y", "where do I start", "which Anthara command", or describes work without picking a command themselves.
argument-hint: <description of what to build, fix, explore, or a URL/path to an existing discovery or spec>
allowed-tools: Read, Bash, Skill
---

# /anthara:start

Triage router. Takes a description, classifies the work, recommends the right chain entry point, then invokes the chosen command. The user's first interaction with Anthara when they don't yet know which command to run.

## Operating principles

- **Lightweight.** Three closed questions max — ideally zero. Heuristics on the description should classify most cases.
- **Recommend + confirm, never invoke silently.** The user always sees the proposed route and confirms via `AskUserQuestion`.
- **Detect regulated context once.** Pack detection drives whether trivial fixes get a spec or skip Anthara entirely.
- **Stateless.** start records nothing; the routed-to command does its own memory writes.
- **Tool discipline.** Closed questions through `AskUserQuestion`; one open question per turn (rare in start).

## Step 1: Read the description

Parse the user's argument for signal words and structure:

- **Debug/diagnose signals** — *"debug"*, *"why is this failing"*, *"diagnose"*, *"tests are broken"*, *"returns 500"*, *"getting an error"*, *"stack trace"*, *"flaky"*, *"intermittent"*, specific error messages or stack traces pasted directly, CI failure URLs.
- **Bug-fix signals** — *"fix"*, *"broken"*, *"not working"*, *"bug in"*, *"regression"*, specific symptom phrases (*"page 2 missing first item"*, *"login fails when..."*).
- **Small-feature signals** — *"add"*, *"build"*, with concrete scope (*"a button to..."*, *"an endpoint for..."*).
- **Larger-feature signals** — *"build a system"*, *"new product area"*, multiple actors mentioned, multi-stakeholder hints.
- **Brainstorm signals** — *"brainstorm"*, *"what are our options"*, *"how might we"*, *"what if we"*, *"help me think through"*, *"explore approaches"*, *"let's brainstorm"*, open-ended problem with no clear direction yet.
- **Exploratory signals** — *"explore"*, *"investigate"*, *"we're thinking about"*, *"figure out"*, *"research"*, no clear scope but has identifiable stakeholders or inputs to synthesize.
- **Pointer signals** — `https://...`, `docs/specs/...`, *"see the discovery doc at"*, *"per the spec at"*. The user has a starting artifact.

If a URL or file path is provided, that takes precedence — route to the next chain step from that artifact (Step 3 mapping).

## Step 2: Quick context scan

If running inside a repo:

- Compute `raw_remote_url = git remote get-url origin`.
- Parse `<owner/repo>` from `raw_remote_url` (e.g., `github.com/anthara-ai/plugin` → `anthara-ai/plugin`). Never `ORG_WIDE`.
- List `docs/specs/` for existing specs (informational — useful when recommending).

Call `get_standards(<owner/repo>)` on fabric MCP. Inspect active packs.

- **Regulated context** — any of `hipaa`, `pci`, `soc-2`, `fda-samd`, `gdpr` (or close variants by pack-name) are active.
- **Non-regulated context** — only general packs (`clean-code`, `owasp`, `wcag`, `test-integrity`, etc.) are active.

This drives the bug-fix routing in Step 3.

If fabric is unreachable: assume regulated by default (Anthara's value prop is regulated industries; safer assumption). Note the assumption to the user.

**Detect RISK from description signals.** Risk is a second axis alongside the bucket. It flows downstream to every command — spec depth, develop retry budget, ship checklist, audit weight.

| Risk | Signals |
|---|---|
| **LOW** | Internal tool, low traffic, easy to revert, no regulated data, dev / staging only |
| **MODERATE** | User-facing surface, moderate traffic, some business logic, non-regulated data |
| **HIGH** | Payment flow, authentication / authorization, data migration, regulated content (PHI / PCI / etc.), high-traffic endpoint, hard-to-revert change, third-party integration with no idempotency |

If the description has explicit risk signals (*"payment"*, *"login"*, *"migrate"*, *"PHI"*, *"production database"*), classify accordingly. If unclear, ask once via `AskUserQuestion` at Step 4.

Risk threads forward as a hint to the invoked skill in Step 6.

## Step 3: Heuristic classification

Map description signals + regulated context to a bucket:

| Bucket | Description signals | Regulated? | Route |
|---|---|---|---|
| Debug/diagnose | debug/diagnose, error message, stack trace, CI failure, *"why is this failing"* | either | `/anthara:debug-fix` |
| Trivial fix (regulated) | bug-fix, localized, user already knows the cause | yes | `/anthara:spec-writer` (bug-fix mode) → `/anthara:develop` |
| Trivial fix (non-regulated) | bug-fix, localized, user already knows the cause | no | Skip Anthara — suggest manual fix; offer `/anthara:create-ticket` for tracker entry |
| Small feature | clear scope, single slice expected | either | `/anthara:spec-writer` → `/anthara:develop` |
| Larger feature | clear scope, multi-slice / multi-stakeholder | either | `/anthara:spec-writer` → `/anthara:develop` (spec-writer's grill-me will fire) |
| Brainstorm | open-ended, no plan yet, *"brainstorm"*, *"options"* | either | `/anthara:brainstorm` → `/anthara:discovery` → `/anthara:spec-writer` → `/anthara:develop` |
| Exploratory | fuzzy, multi-stakeholder, *"explore"*, has inputs to synthesize | either | `/anthara:discovery` → `/anthara:spec-writer` → `/anthara:develop` |
| Existing artifact (discovery doc) | user pointed at a discovery brief | either | `/anthara:spec-writer` against that doc |
| Existing artifact (spec) | user pointed at a spec | either | `/anthara:develop` against that spec |

If the heuristic is unambiguous, advance to Step 5. Otherwise Step 4.

## Step 4: Targeted elicitation (only if heuristic is unsure)

`AskUserQuestion` for one or two closed questions to disambiguate. Pick from:

- *"Is this a bug fix or new functionality?"* — bug / feature / refactor / exploring.
- *"How big do you think it is?"* — single file / a few files / new module / new product area.
- *"Risk level?"* — low (internal, easy revert) / moderate (user-facing, some business logic) / high (payment, auth, migration, regulated data, hard to revert).
- *"Do you have an existing discovery doc or spec already?"* — yes (with pointer) / no.

Skip questions the heuristic already answered. The goal is one or two questions, never a wall.

## Step 5: Recommend route + confirm

Surface the proposed route via `AskUserQuestion`. Variants by bucket:

- **Debug/diagnose:** *"Sounds like you need to diagnose a failure. I'd route to `/anthara:debug-fix` — it'll reproduce, check org memory for known gotchas, narrow systematically, and fix with compliance guardrails. Start debugging / I already know the cause — route to spec-writer instead / cancel."*
- **Trivial fix (regulated):** *"Localized bug, regulated codebase (active packs: <list>). I'd route through `/anthara:spec-writer` (bug-fix mode) → `/anthara:develop` to keep the audit trail. Take this route / develop directly anyway / fix manually outside Anthara / cancel."*
- **Trivial fix (non-regulated):** *"Localized bug, no regulated packs active. I'd skip Anthara — fix it directly in your editor. Want a tracker entry first? I can run `/anthara:create-ticket`. Skip and fix manually / create ticket / route through Anthara anyway / cancel."*
- **Small feature:** *"Sounds like a scoped feature. I'd route through `/anthara:spec-writer` → `/anthara:develop`. Take this route / start at develop directly / cancel."*
- **Larger feature:** *"Sounds like a multi-slice feature with stakeholders to align. I'd route through `/anthara:spec-writer` → `/anthara:develop`; spec-writer will grill if scope is unclear. Take this route / start with discovery first (broader framing) / cancel."*
- **Brainstorm:** *"This sounds like an open problem space with no clear direction yet. I'd start with `/anthara:brainstorm` to generate and evaluate options, then route to `/anthara:discovery` when a direction emerges. Start brainstorming / skip to discovery (if you already have inputs to synthesize) / cancel."*
- **Exploratory:** *"This is exploratory with stakeholders or inputs to synthesize. I'd route through `/anthara:discovery` → `/anthara:spec-writer` → `/anthara:develop`. Take this route / start with a brainstorm first (if the direction itself is unclear) / skip discovery and write a spec directly / cancel."*
- **Pointer to discovery:** *"You pointed at a discovery doc. I'd run `/anthara:spec-writer` against it. Take this route / open the doc first / cancel."*
- **Pointer to spec:** *"You pointed at an existing spec. I'd run `/anthara:develop` against it. Take this route / start with a collaboration loop on the spec first / cancel."*

Always include:
- *"Route directly to develop"* option (escape hatch for users who don't want spec layer).
- *"Cancel"* option.

## Step 6: Invoke the chosen skill

Once the user confirms, invoke the chosen skill via the `Skill` tool. Pass:

- The user's original description as argument.
- Any pointer (URL / path) provided.
- A brief context note: *"start triaged this as <bucket>, RISK=<low/moderate/high>; <reason>."*

The downstream skill uses the risk hint to scale its depth — spec-writer asks more grilling questions for HIGH risk, develop allocates a larger retry budget for HIGH risk on the slice loop, ship's future checklist gates HIGH risk behind feature flags / canaries.

For multi-step routes (discovery → spec-writer → develop), invoke only the **first** skill. The chain unfolds naturally — discovery's handoff mentions spec-writer, spec-writer's mentions develop, etc.

For "skip Anthara" routes (trivial fix in non-regulated context, user picked "fix manually"): tell the user explicitly, suggest the manual-fix shape (which file, which test to add), then exit. Do not invoke a skill.

## What NOT to do

- Do not invoke a skill silently. Always confirm via `AskUserQuestion`.
- Do not write or modify files. start is a router; routed-to skills handle artifacts.
- Do not run more than 2-3 closed questions. If you need more elicitation, that's a sign the right route is `/anthara:discovery` (which IS the elicitation tool).
- Do not skip regulated-context detection. The bug-fix routing depends on it; this is the one fabric call start always makes.
- Do not pronounce the work scoped or framed. start is a router; framing is the routed-to skill's job.
- Do not record anything to Org Memory. start is stateless.
- Do not bundle two open questions in one message (per Tool discipline). One per turn.
- Do not skip the recommendation step. The user must see and confirm the route before any skill is invoked.
