# pstack for Claude Code

A Claude Code port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), the Cursor plugin by [Lauren Tan (poteto)](https://x.com/poteto). pstack is a set of skills, playbooks, and subagents for rigorous agent work: understand before building, verify against the real artifact, and keep prose and code small.

## Source and license

- Upstream: [`cursor/plugins`](https://github.com/cursor/plugins), directory `pstack/`, version `0.15.25`.
- Vendored here as a git subtree at [`repos/cursor-plugins/pstack`](../../repos/cursor-plugins/pstack) (subtree commit `e5136d8`). Diff this plugin against that copy to see every change.
- MIT licensed. The original copyright notice is kept in [LICENSE](./LICENSE).

This copy is meant to diverge. The skills will be reshaped to my own style over time, so do not expect it to track upstream.

## Install

See the [repository README](../../README.md).

## Get started

1. Run `/setup-pstack` to choose a model and effort for each role. It writes `~/.claude/pstack-models.md`. Skipping it is fine, every role has a default.
2. Start non-trivial work with `/poteto-mode <task>`. It matches the task to a playbook, copies the steps into the todo list, and reads the other skills as the steps need them.
3. Lost? `/poteto-help <question>`.

Every skill except `/setup-pstack` sets `disable-model-invocation: true`, as upstream does. They load only when you type them or when `/poteto-mode` reads them by path. Plugin skills are also reachable as `/pstack:<name>`.

The [guide](./docs/guide/README.md) walks through a first real task. It was written for Cursor and is only lightly adapted.

## What changed from the Cursor version

| Cursor | Claude Code |
|---|---|
| `Task` tool, `subagent_type: generalPurpose` | `Agent` tool, `subagent_type: "general-purpose"` |
| `readonly: true` subagents | `Explore` for exploration, otherwise `general-purpose` told not to edit |
| `poteto-agent`, `comment-sicko` subagents | `pstack:poteto-agent`, `pstack:comment-sicko` |
| `~/.cursor/rules/pstack-models.mdc` (always-applied rule) | `~/.claude/pstack-models.md`, read by the skills before spawning |
| Model slugs such as `claude-opus-5-5-xhigh`, `grok-4.7-xhigh-fast` | `<model>-<effort>` pairs such as `opus-xhigh`, `sonnet-xhigh`, set as the Agent `model` and `effort` |
| Opus vs Grok review panels | Opus vs Sonnet panels |
| Cloud subagents (`environment: "cloud"`) | Background agents with `isolation: "worktree"`, or `"remote"` where available |
| Nested subagent spawns | The coordinator spawns everything, since Claude Code subagents cannot spawn subagents |
| `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.claude/projects/<slug>/` |
| `AskQuestion` | `AskUserQuestion` |
| `/deslop` (`cursor-team-kit`) | built-in `/simplify` |
| `control-ui`, `control-cli` (`cursor-team-kit`) | the project's `verify-*` skill, browser tools, or Bash |
| `create-skill` | `skill-creator` |
| Custom Modes | start each task with `/poteto-mode`, or point `CLAUDE.md` at it |
| `.cursor/skills/` | `.claude/skills/` |
| `is_background: true` agent frontmatter | `background: true` |

Not ported:

- `make-bot-ui`. It builds a UI for Cursor's Grok Bot webhooks, which have no Claude Code counterpart.
- `automations/benny`. It runs on Cursor Automations.
- Cursor plugin metadata and assets (`.cursor-plugin/`, `assets/`).

Known gaps:

- The `scripts/` under `poteto-mode` are unchanged apart from the transcript path in `worktree-audit.sh`. They need [Bun](https://bun.sh).
- `poteto-agent` sets `background: true`, as upstream did, so it always runs in the background even when a caller passes `run_in_background: false`.
- `watch-pr` still recognizes Cursor's Bugbot comments. That is GitHub-side behavior and still useful if Bugbot reviews your repos.
- The orchestrate and autopilot playbooks assume large agent fleets. Claude Code runs them with flat fan-out from one coordinator, which is less proven than the Cursor setup they were tuned on.
