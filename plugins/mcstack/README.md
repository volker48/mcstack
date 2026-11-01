# mcstack

A Claude Code port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), the Cursor plugin by [Lauren Tan (poteto)](https://x.com/poteto). The plugin is named `mcstack` and the main entry point is `/bde-mode` (upstream `/poteto-mode`). mcstack is a set of skills, playbooks, and subagents for rigorous agent work: understand before building, verify against the real artifact, and keep prose and code small.

## Source and license

- Upstream: [`cursor/plugins`](https://github.com/cursor/plugins), directory `pstack/`, version `0.15.36`.
- Vendored here as a git subtree at [`repos/cursor-plugins/pstack`](../../repos/cursor-plugins/pstack) (subtree commit `ae5650f`). Diff this plugin against that copy to see every change.
- MIT licensed. The original copyright notice is kept in [LICENSE](./LICENSE).

This copy is meant to diverge. The skills will be reshaped to my own style over time, so do not expect it to track upstream.

## Install

See the [repository README](../../README.md).

## Get started

1. Run `/setup-mcstack` to choose a model and effort for each role. It writes `~/.claude/mcstack-models.md`. Skipping it is fine, every role has a default.
2. Start non-trivial work with `/bde-mode <task>`. It matches the task to a playbook, copies the steps into the todo list, and reads the other skills as the steps need them.
3. Lost? `/bde-help <question>`.

Every skill except `/setup-mcstack` sets `disable-model-invocation: true`, as upstream does. They load only when you type them or when `/bde-mode` reads them by path. Plugin skills are also reachable as `/mcstack:<name>`.

The [guide](./docs/guide/README.md) walks through a first real task. It was written for Cursor and is only lightly adapted.

## What changed from the Cursor version

| Cursor | Claude Code |
|---|---|
| `Task` tool, `subagent_type: generalPurpose` | `Agent` tool, `subagent_type: "general-purpose"` |
| `readonly: true` subagents | `Explore` for exploration, otherwise `general-purpose` told not to edit |
| `pstack` plugin, `/poteto-mode` | `mcstack` plugin, `/bde-mode` |
| `/setup-pstack`, `/poteto-help` | `/setup-mcstack`, `/bde-help` |
| `poteto-agent`, `comment-sicko` subagents | `mcstack:bde-agent`, `mcstack:comment-sicko` |
| `~/.cursor/rules/pstack-models.mdc` (always-applied rule) | `~/.claude/mcstack-models.md`, read by the skills before spawning |
| Model slugs such as `claude-opus-5-5-xhigh`, `grok-4.7-xhigh-fast` | `<model>-<effort>` pairs such as `opus-xhigh`, `sonnet-xhigh`, set as the Agent `model` and `effort` |
| Opus vs Grok review panels | Opus vs Sonnet panels |
| Cloud subagents (`environment: "cloud"`) | Background agents with `isolation: "worktree"`, or `"remote"` where available |
| Nested subagent spawns | The coordinator spawns everything, since Claude Code subagents cannot spawn subagents |
| `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.claude/projects/<slug>/` |
| `AskQuestion` | `AskUserQuestion` |
| `/deslop` (`cursor-team-kit`) | built-in `/simplify` |
| `control-ui`, `control-cli` (`cursor-team-kit`) | the project's `verify-*` skill, browser tools, or Bash |
| `create-skill` | `skill-creator` |
| Custom Modes | start each task with `/bde-mode`, or point `CLAUDE.md` at it |
| `.cursor/skills/` | `.claude/skills/` |
| Project tracker and Project store | `~/.claude/mcstack/orchestrate/<project-slug>/notes.md` |
| `<skill dir>` in script commands | `${CLAUDE_PLUGIN_ROOT}/skills/<name>` |
| An embedded chat video | `SendUserFile`, or the file's path |
| `is_background: true` agent frontmatter | `background: true` |

Added from other sources (MIT, notices in [THIRD_PARTY_NOTICES](./THIRD_PARTY_NOTICES)):

- `/retro` from [`mattpocock/skills`](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro) (commit `49dd158`). It points at `technical-writing`, `reflect`, `interrogate`, and `skill-creator` in place of upstream's `writing-for-agents` skill and generic reviewer.
- `/show-me` from [`humanlayer/skills`](https://github.com/humanlayer/skills/tree/main/plugins/show-me/skills/show-me) (commit `653b641`).

Not ported:

- `make-bot-ui`. It builds a UI for Cursor's Grok Bot webhooks, which have no Claude Code counterpart.
- `automations/benny`. It runs on Cursor Automations.
- Cursor plugin metadata and assets (`.cursor-plugin/`, `assets/`).

Known gaps:

- The `scripts/` under `bde-mode` are unchanged apart from the transcript path in `worktree-audit.sh`. They need [Bun](https://bun.sh).
- `/statechart` needs Node 22.18+, Bun 1.1.5+, or Deno 2, plus [mise](https://mise.jdx.dev), which installs Java and TLC on the first run (network required). Its rendering step uses the `pele` npm package.
- `/ketchup-video` needs a local way to render an mp4, such as ffmpeg, which the skill does not install.
- `bde-agent` sets `background: true`, as upstream did, so it always runs in the background even when a caller passes `run_in_background: false`.
- `watch-pr` still recognizes Cursor's Bugbot comments. That is GitHub-side behavior and still useful if Bugbot reviews your repos.
- The orchestrate and autopilot playbooks assume large agent fleets. Claude Code runs them with flat fan-out from one coordinator, and sub-coordinators as separate sessions, which is less proven than the Cursor setup they were tuned on.
