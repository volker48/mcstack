# mcstack

A Claude Code port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), the Cursor plugin by [Lauren Tan (poteto)](https://x.com/poteto). The plugin is named `mcstack` and the main entry point is `/bde-mode` (upstream `/poteto-mode`). mcstack is a set of skills, playbooks, and subagents for rigorous agent work: understand before building, verify against the real artifact, and keep prose and code small.

## Source and license

- Upstream: [`cursor/plugins`](https://github.com/cursor/plugins), directory `pstack/`, version `0.15.25`.
- Vendored here as a git subtree at [`repos/cursor-plugins/pstack`](../../repos/cursor-plugins/pstack) (subtree commit `e5136d8`). Diff this plugin against that copy to see every change.
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
| `is_background: true` agent frontmatter | `background: true` |

Added from other sources (MIT, notices in [THIRD_PARTY_NOTICES](./THIRD_PARTY_NOTICES)):

- `/retro` from [`mattpocock/skills`](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro) (commit `49dd158`). It points at `technical-writing`, `reflect`, `interrogate`, and `skill-creator` in place of upstream's `writing-for-agents` skill and generic reviewer.
- `/show-me` from [`humanlayer/skills`](https://github.com/humanlayer/skills/tree/main/plugins/show-me/skills/show-me) (commit `653b641`).
- `/be-ambitious`, merged from [`robonuggets/be-ambitious`](https://github.com/robonuggets/be-ambitious) (commit `dc116a3`) and [`DannyMac180/skills`](https://github.com/DannyMac180/skills/tree/main/be-ambitious) (commit `7dc63b7`), both built on Felix Rieseberg's [How to be more ambitious](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/). It keeps RoboNuggets' Altitude, Depth, and Range structure, takes DannyMac180's concrete Depth answers and pass-and-fail judge, drops the motivational narrative, and points at `sharpen`, `swarm`, `arena`, `figure-it-out`, and `principle-prove-it-works`.

Not ported:

- `make-bot-ui`. It builds a UI for Cursor's Grok Bot webhooks, which have no Claude Code counterpart.
- `automations/benny`. It runs on Cursor Automations.
- Cursor plugin metadata and assets (`.cursor-plugin/`, `assets/`).

Known gaps:

- The `scripts/` under `bde-mode` are unchanged apart from the transcript path in `worktree-audit.sh`. They need [Bun](https://bun.sh).
- `bde-agent` sets `background: true`, as upstream did, so it always runs in the background even when a caller passes `run_in_background: false`.
- `watch-pr` still recognizes Cursor's Bugbot comments. That is GitHub-side behavior and still useful if Bugbot reviews your repos.
- The orchestrate and autopilot playbooks assume large agent fleets. Claude Code runs them with flat fan-out from one coordinator, which is less proven than the Cursor setup they were tuned on.
