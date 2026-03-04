# cc-subagent

How many subagents does your Claude Code spawn? Shows subagent adoption rate, total count, peak sessions, and per-project breakdown.

```
cc-subagent — Claude Code subagent usage

  Main sessions:         755
  Sessions w/ subagents: 324 (42.9% of sessions)
  Total subagent sessions: 3,677
  Avg per spawning session: 11.3
  Avg per all sessions:    4.9
  Total subagent data:     1003.0 MB
  Peak in one session:     284 subagents

────────────────────────────────────────────────────────
  Subagents per session (spawning sessions only)

  1         ███████████░░░░░░░░░░░░░    64  (19.8%)
  2-5       ████████████████████████   142  (43.8%)
  6-10      ████████░░░░░░░░░░░░░░░░    48  (14.8%)
  11-30     ███████░░░░░░░░░░░░░░░░░    43  (13.3%)
  31-100    ████░░░░░░░░░░░░░░░░░░░░    21  (6.5%)
  100+      █░░░░░░░░░░░░░░░░░░░░░░░     6  (1.9%)
```

## Usage

```bash
npx cc-subagent          # Subagent count and adoption stats
npx cc-subagent --json   # JSON output
```

## What it shows

- **Adoption rate** — what fraction of your sessions spawned at least one subagent
- **Total count** — cumulative subagent sessions across your history
- **Distribution** — single subagent vs teams of 100+
- **Peak session** — the session that spawned the most subagents
- **Subagent data size** — total disk usage of subagent session files
- **By project** — which projects rely on subagents most

## About subagents

When Claude Code uses the `Agent` tool, it spawns a subagent — a child Claude session that handles a specific subtask. Subagent session files are stored at `~/.claude/projects/PROJ/SESSION_ID/subagents/agent-XXXXX.jsonl`.

Most tools filter out subagent files by default. cc-subagent specifically analyzes what's usually hidden.

## Privacy

Reads file metadata only (names, sizes). No file content is accessed or transmitted. Everything runs locally.

## Browser version

Drop your `~/.claude` folder into [cc-subagent on the web](https://yurukusa.github.io/cc-subagent/) — no install required.

---

Part of [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — 60 free tools for Claude Code
