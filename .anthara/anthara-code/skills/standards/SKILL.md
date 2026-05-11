---
name: standards
description: This skill should be used when the user runs '/anthara:standards', asks "show me the standards", "list active rules", "what compliance rules apply here", "show repo standards", "what packs are active", "what rules am I governed by", or wants to see the resolved compliance standards (pack-derived rules) for the current repository. Wraps Fabric's get_standards and renders the result developer-friendly.
argument-hint: ""
allowed-tools: ["Bash", "mcp__fabric__get_standards", "mcp__fabric__get_status"]
version: 1.0.0
---

# /anthara:standards

Show resolved compliance standards (pack-derived rules) for the current repository. Thin wrapper over Fabric's `get_standards`.

## Behaviour

Run these steps in order. Halt with an actionable error if any step fails.

### 1. Resolve the repo's remote URL

Run `git remote get-url origin` via Bash.

- **If the command fails** (not a git repo, no remote named `origin`): halt with: *"`/anthara:standards` requires a git repo with a remote. Either run from inside a git repo with `origin` set, or add a remote: `git remote add origin <url>`."* Do not proceed.

### 2. Call `get_standards`

Pass the output of `git remote get-url origin` (verbatim, including any trailing newline trimmed) as `raw_remote_url` to `get_standards`.

- **If Fabric MCP is unreachable** (any error from the call): halt with: *"Fabric MCP unreachable — cannot fetch standards. Verify ANTHARA_FABRIC_URL and ANTHARA_API_KEY are set, restart Claude Code, and retry. See README for setup."* Do not proceed.

### 3. Render the rules

The response begins with `Resolved repo: <canonical>` so the developer can verify what was looked up. Print this line as-is.

After the resolved-repo line, render the rules:

**If rules carry pack-source labels** (e.g., each rule begins with `[hipaa]` or `[soc-2]` or `[pci-dss]` or `[org-wide]` or a similar pack tag): group by pack, render in this order: pack-prefixed groups first (sorted alphabetically), then `org-wide`, then any remaining ungrouped rules. Within each group, list rules unchanged.

**If rules don't carry pack-source labels** (the response is a flat list): render the flat list, then append: *"Note: pack-grouping unavailable in this response — rules shown flat. Each rule still derives from an active compliance pack; check the rule text or the Anthara console for the source pack."*

### 4. Add a footer

After the rules, print:

```
For the comprehensive when/what playbook on calling Fabric MCP and saving to memory, see the `anthara-mcp-orchestration` skill.
For ad-hoc memory saves or searches, run /anthara:remember.
```

## Out of scope

- Mutating standards. This skill is read-only against Fabric.
- Fetching standards for a different repo than the cwd's. The command intentionally uses the current repo's remote — to view a different repo's standards, run the command from inside that repo.
- Pack management (creating, updating, deleting packs). That happens in the Anthara console / api/, not the plugin.

## Reference

For Fabric MCP call patterns, the principle-based memory rules, and the `add_shared_memory` confirmation gate, see `anthara-mcp-orchestration`.
