---
name: scan-results
description: This skill should be used when the user runs '/anthara:scan-results', asks "show my scan", "what's my AI readiness", "show me the latest assessment", "what should I fix", "show readiness dashboard", or wants to see the resolved AI-readiness scan results for the current repository. Wraps Fabric's get_repo_scan and renders the result developer-friendly with the five edge states inline.
argument-hint: ""
allowed-tools: ["Bash", "mcp__fabric__get_repo_scan", "mcp__fabric__get_status"]
version: 0.1.0
---

# /anthara:scan-results

Show the latest AI-readiness scan results for the current repository. Thin wrapper over Fabric's `get_repo_scan`. Renders the web ScanDashboard's expanded view in text form.

## Behaviour

Run these steps in order. Halt with an actionable error if any step fails.

### 1. Resolve the repo's remote URL

Run `git remote get-url origin` via Bash.

- **If the command fails** (not a git repo, no remote named `origin`): halt with: _"`/anthara:scan-results` requires a git repo with a remote. Either run from inside a git repo with `origin` set, or add a remote: `git remote add origin <url>`."_ Do not proceed.

### 2. Call `get_repo_scan`

Pass the output of `git remote get-url origin` (verbatim, with any trailing newline trimmed) as `raw_remote_url` to `mcp__fabric__get_repo_scan`.

- **If Fabric MCP raises any error** (transport failure, auth error, timeout): halt with: _"Fabric MCP unreachable — cannot fetch scan results. Verify ANTHARA_FABRIC_URL and ANTHARA_API_KEY are set, restart Claude Code, and retry. See README for setup."_ Do not proceed.

### 3. Dispatch on `state`

Inspect the `state` field of the response. It is one of five values: `ok`, `not_imported`, `never_scanned`, `scan_in_progress`, `scan_failed`. Render exactly one template (sections 4a–4e). Do not mix, do not invent a sixth state.

### 4a. `state='ok'` — full scan dashboard

Render the expanded dashboard. Mirrors the web ScanDashboard's expanded view in text. Print all sections in this order — do not collapse or paginate.

**Header:**

```
Resolved repo: <full_name> (<provider>)
Assessed <YYYY-MM-DD> · <N> days ago
```

Compute the relative-age string from `latest_scan.assessmentDate` (or `assessed_at` / `completed_at` — whichever is populated on the response). Use whole days; if the scan completed today, print `today` instead of `0 days ago`.

**Overall rating block:**

```
AI READINESS — <Rating>
  Blockers: <B>  ·  Critical: <C>  ·  Gaps: <G>  ·  Strengths: <S>
```

`<Rating>` is the response's overall rating word — one of `Critical`, `Deficient`, `Adequate`, `Excellent`. The four counters are summed across all dimensions:

- **Blockers** = total actions where `severity === 'blocker'`
- **Critical** = total actions where `severity === 'critical'`
- **Gaps** = total actions whose severity is neither `blocker` nor `critical` (i.e., any remaining action regardless of its exact severity string)
- **Strengths** = total findings (positive observations) across all dimensions

**Readiness Dimensions block:**

```
DIMENSIONS
  Documentation  [<bar>]  <Rating>  ·  <N> action(s)
  Structure      [<bar>]  <Rating>  ·  <N> action(s)
  Testing        [<bar>]  <Rating>  ·  <N> action(s)
  Tooling        [<bar>]  <Rating>  ·  <N> action(s)
```

`<bar>` is a 10-cell bar derived from the dimension's rating word — `█` for filled, `░` for empty:

| Rating      | Bar          |
| ----------- | ------------ |
| `Excellent` | `██████████` |
| `Adequate`  | `███████░░░` |
| `Deficient` | `████░░░░░░` |
| `Critical`  | `██░░░░░░░░` |

If the response surfaces a numeric score per dimension, use it to pick a fill in that range (Excellent: 9–10, Adequate: 6–7, Deficient: 4, Critical: 2). When only the rating word is present, use the table above as the fixed mapping. Align the bar columns so all four rows line up.

**Per-dimension cards (one per dimension, no collapsing):**

For each of the four dimensions in this order — Documentation, Structure, Testing, Tooling — render a card. Do not skip a dimension that has zero actions; render the header + summary even if both lists are empty.

```
------------------------------------------------------------
<DIMENSION NAME> — <Rating>
  Blockers: <b>  ·  Critical: <c>  ·  Gaps: <g>  ·  Strengths: <s>

Summary:
  <dimensionResult.summary — output as a single continuous line per paragraph, no manual line breaks; let the terminal wrap naturally>

What's Working Well (<S_dim>)
  - <finding 1 text>
  - <finding 2 text>
  ...

Action Items (<N_dim>)
  1. [severity=<sev>] <action.text>
       effort=<low|med|high>  impact=<low|med|high>  proposed-fix → <K>
  2. [severity=<sev>] <action.text>
       effort=<low|med|high>  impact=<low|med|high>  proposed-fix → <K+1>
  ...
```

List **every** action — no pagination cap. The numeric prefix (`1.`, `2.`, …) restarts per dimension and is purely visual. The `proposed-fix → K` tag is the load-bearing identifier — see the Action numbering rule below.

**Footer:**

```
Next: /anthara:apply-fix <N>  ·  view in portal: https://app.anthara.ai/repositories/<id>
```

`<N>` is the highest `proposed-fix` number rendered (i.e., the global counter's final value). The portal URL uses `repository.id` from the response. If the response does not carry an id (defensive), fall back to `https://app.anthara.ai/repositories`.

### Action numbering rule (load-bearing)

Maintain a **single global counter** that starts at `1` and increments by `1` for every action emitted in render order. The counter does **not** reset between dimensions. The first action in DOCUMENTATION is `proposed-fix → 1`; the next action — whether it is the second action in DOCUMENTATION, or the first in STRUCTURE — is `proposed-fix → 2`. Continue across STRUCTURE, TESTING, TOOLING in that order.

This single namespace is the seam for a future `/anthara:apply-fix N` flow. The user must be able to refer to "fix 7" once and have it unambiguously map to one action regardless of dimension. If the counter is reset per dimension, the seam is broken and the future apply-fix command will not be implementable without a UX-breaking schema change. Hold the line: one counter, monotonic, across all dimensions, in render order.

### 4b. `state='not_imported'` — empty state

```
This repo isn't imported into Anthara yet.
Resolved repo: <full_name> (<provider>)

Import it from the dashboard: https://app.anthara.ai/repositories
Then trigger a scan from there. Once it completes, /anthara:scan-results will show the dashboard here.
```

Use the canonical `full_name` and `provider` from the response, not the raw remote URL.

### 4c. `state='never_scanned'` — empty state

```
<full_name> is imported but hasn't been scanned yet.
Trigger a scan from the dashboard: https://app.anthara.ai/repositories/<id>
Once it completes, run /anthara:scan-results again.
```

If the response carries `repository.id`, use it in the URL. If it does not, fall back to `https://app.anthara.ai/repositories`. Plugin-side scan trigger is deferred — point at the portal.

### 4d. `state='scan_in_progress'` — status

```
A scan is currently running for <full_name> (started <relative time>).
Run /anthara:scan-results again in a minute.
```

Compute the relative-time string from `latest_scan.startedAt`. Whole minutes for under an hour; whole hours otherwise. If `startedAt` is absent, omit the parenthetical entirely and print only `A scan is currently running for <full_name>.`

### 4e. `state='scan_failed'` — status

```
The latest scan for <full_name> ended in error.
<error message from latest_scan.errorMessage, if present>
Check the dashboard for full error details: https://app.anthara.ai/repositories/<id>
You can re-trigger a scan from there.
```

If `latest_scan.errorMessage` is empty or missing, omit that line. Re-triggering happens from the portal — there is no plugin-side scan trigger.

## Out of scope

- Filtering by dimension or severity (`--dimension`, `--severity` flags). The expanded-state dump is the v1 contract.
- Triggering a scan from the plugin. Deferred — `never_scanned` and `scan_failed` templates point at the portal.
- Applying a proposed fix. Deferred — `proposed-fix → N` is text-only today; the seam will be wired up by a future `/anthara:apply-fix N` command.
- Fetching scan results for a different repo than the cwd's. The command intentionally uses the current repo's remote — to view a different repo's scan, run from inside that repo.
- Cross-user fallback. If the calling user has not imported the repo, they see the `not_imported` state — never another user's data.

## Reference

For Fabric MCP call patterns and the principle-based memory rules, see the `anthara-mcp-orchestration` skill. For pack-derived rules in this repo, run `/anthara:standards`.
