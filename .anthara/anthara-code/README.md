# anthara-code

Claude Code plugin for healthtech and fintech engineering teams using Anthara. Adapts a spec-driven development workflow with healthtech/fintech tuning, leans on the Anthara Fabric MCP server for memory and pack-derived standards (HIPAA / SOC 2 / PCI-DSS / internal), and treats the Anthara LiteLLM gateway as the source of truth for hard enforcement (PHI detection, MCP-call gating, cost controls).

The plugin is **advisory and workflow-shaping** — Claude follows the rules pulled from Fabric; the LiteLLM gateway intercepts requests in flight and blocks PHI, dangerous MCP calls, and cost-exceeding calls before they leave the network.

## v1.1 ship status (May 2026)

anthara-code v1.1.0 — adds `/anthara:scan-results`, the developer-side surface of the AI-readiness dashboard. The full command surface (`/anthara:start`, `/anthara:review`, `/anthara:onboard`, `/anthara:grill-me`, `/anthara:standards`, `/anthara:scan-results`, `/anthara:remember`, `/anthara:help`) is operational. The full v1 spec lives at `../docs/specs/anthara-code-v1-spec.md`; the scan-results spec at `../docs/specs/anthara-scan-results-spec.md`.

## What you get

Eight slash commands under the `/anthara:*` namespace:

- **`/anthara:start`** — spec-driven workflow with built-in due-diligence (triage → context → grill-me → spec → architecture → slice loop). Designed to prevent bugs through clarity in the spec.
- **`/anthara:review`** — code review through the lens of active rules. Reviewer pulls `get_standards` first, cites rule text and reasoning per finding.
- **`/anthara:onboard`** — interactive developer walkthrough of an existing project, healthtech/fintech tuned. Local-only.
- **`/anthara:grill-me`** — standalone Socratic interview, healthtech-tuned.
- **`/anthara:standards`** — show the resolved compliance standards for the current repo.
- **`/anthara:scan-results`** — show the latest AI-readiness scan results for the current repo. Mirrors the web dashboard's expanded view inline; each action numbered (`proposed-fix → N`) for a future `/anthara:apply-fix N` flow.
- **`/anthara:remember`** — manual memory: search facts and ad-hoc save.
- **`/anthara:help`** — explain the plugin and verify Fabric reachability.

Plus a catalog of eight healthtech-tuned agents (spec-builder, slice-coder, slice-tester, sdd-verifier, reviewer, architecture-advisor, context-gatherer, onboard) and six anthara-specific skills the agents and commands compose internally (anthara-mcp-orchestration, anthara-grill-me-flavor, anthara-spec-writing, anthara-requirement-architect, anthara-brainstorming, anthara-collaboration-loop). A handful of bee-mirrored skills (anthara-clean-code, anthara-tdd-practices, anthara-code-review, anthara-debugging, anthara-ai-workflow) are listed in the v1 spec but not built — agents currently work without them; they will land in a follow-up if any agent's `skills:` field starts referencing them.

## Prerequisites

- An active Anthara organisation
- An API key issued by your org admin
- Claude Code installed and working
- A git repository with a remote — `get_standards` is keyed on `git remote get-url origin`

## Install

Install the plugin via the Claude Code plugin marketplace, or clone this repo and point Claude Code at it locally with `--plugin-dir`.

## Setup (env vars only — no slash command needed)

The plugin reads three environment variables:

| Variable | Description |
|---|---|
| `ANTHARA_FABRIC_URL` | Base URL of your Anthara Fabric MCP server |
| `ANTHARA_API_KEY` | Bearer token issued by your org admin |
| `ANTHARA_MEMORY_GROUP` | Your organisation id |

Set them via one of:

**Shell (recommended for personal use):**

```bash
export ANTHARA_FABRIC_URL="https://fabric.your-org.example/mcp"
export ANTHARA_API_KEY="atk_..."
export ANTHARA_MEMORY_GROUP="your-org-id"
```

**Project-local (gitignored — recommended for per-project keys):**

Edit `.claude/settings.local.json` in the project root:

```json
{
  "env": {
    "ANTHARA_FABRIC_URL": "https://fabric.your-org.example/mcp",
    "ANTHARA_API_KEY": "atk_...",
    "ANTHARA_MEMORY_GROUP": "your-org-id"
  }
}
```

Make sure `.claude/settings.local.json` is in your `.gitignore`. Never commit API keys.

**`direnv`:** if your team uses `direnv`, add the three vars to `.envrc.local` (gitignored) and `direnv allow`.

## Verify

Restart Claude Code. Run:

```
/anthara:help
```

Expected output ends with one of:

- `Fabric: reachable. Postgres + graph DB connected.` — you're good.
- `Fabric: unhealthy. ...` — Fabric server is up but a backing service is down. Check Fabric logs.
- `Fabric: unreachable. ...` — env vars wrong or Fabric not running. Recheck the values and restart Claude Code.

## How it works

At session start, the plugin instructs Claude to:

1. `load_context()` — pull user profile and recent memories from Fabric.
2. `get_standards(<repo_remote_url>)` — pull pack-derived rules for the current repo.
3. `get_instructions()` — pull priority-ordered behavioural directives.

Standards from Fabric are advisory — Claude reads them and lets them shape generated code, spec acceptance criteria, and review findings. Hard blocks live in the LiteLLM gateway upstream of the LLM provider, not in this plugin.

Memory is governed by a principle:

- Useful to the entire org → `add_shared_memory` (with `AskUserQuestion` confirmation).
- Specific to your workflow → `add_private_memory` (no prompt).
- Already in `docs/specs/`, the codebase, git history, session state, or Fabric audit → don't save.

Every Fabric MCP call is automatically audit-logged via `@with_audit` upstream — calling MCP IS the audit trail.

## Troubleshooting

**`/anthara:help` reports `Fabric: unreachable`:**

1. Verify env vars are set in the same shell or in `.claude/settings.local.json`.
2. Restart Claude Code after setting vars — env changes don't take effect mid-session.
3. Confirm Fabric server is running and reachable from your machine: `curl -H "Authorization: Bearer $ANTHARA_API_KEY" $ANTHARA_FABRIC_URL/...`
4. Check that your API key hasn't been revoked. Contact your org admin if unsure.

**`get_standards` is empty:**

1. Confirm the current directory is a git repo with a remote: `git remote get-url origin`.
2. Confirm the remote URL is registered in your Anthara org's repo list. Standards are keyed on the canonicalised remote URL.

**Memory writes feel noisy:**

The shared-memory confirmation prompt gates every `add_shared_memory` call. If you're seeing too many prompts, the agent might be over-eager about what counts as "useful to the org." Push back — say "no" to the prompt and it skips silently.

## Development

The plugin is structured per the modern Claude Code plugin layout:

- `.claude-plugin/plugin.json` — manifest
- `.mcp.json` — Fabric MCP transport config
- `CLAUDE.md` — session-start instructions for Claude
- `skills/<name>/SKILL.md` — both internal skills and user-invoked slash commands
- `agents/<name>.md` — specialised agents (eight in v1.0.0)

The full v1 specification lives at `../docs/specs/anthara-code-v1-spec.md` (relative to this plugin directory; the parent `anthara-plugin/` repo contains the spec and decision history). The grill-me record is at `../.claude/bee-context.local.md`.

## License

Unlicensed. Internal Anthara distribution only.
