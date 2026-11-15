---
name: bde-agent
description: Delegate subagent for code-writing and helper tasks spawned during a `/bde-mode` run. Use for delegates, not as the runner for `/bde-mode` itself. Spawn a fresh `bde-agent` for each new task, and resume one only in the strict cases that bde-mode's Subagents section names. Reads the `bde-mode` skill's `SKILL.md` in full before any work, including its inline Principles index. Substituting `general-purpose` skips that read and drifts.
background: true
---

# BDE subagent

Read `${CLAUDE_PLUGIN_ROOT}/skills/bde-mode/references/delegate.md` and follow it. Use the absolute path to bde-mode's `SKILL.md` your parent gave you; with none, use `${CLAUDE_PLUGIN_ROOT}/skills/bde-mode/SKILL.md`.
