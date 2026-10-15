---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Writes a config file that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.claude/pstack-models.md`, the config pstack's skills read to pick each role's model and effort.

## Steps

### 1. Know the valid values

A role value is `<model>-<effort>`. `<model>` is an Agent tool `model` value: `opus`, `sonnet`, `haiku`, or `fable`. `<effort>` is an Agent tool `effort` value: `low`, `medium`, `high`, `xhigh`, or `max`. The aliases `inherit-parent` and `auto` are also valid. Both mean the role runs on the parent chat model, with no `model` or `effort` set on the spawn.

### 2. Load current state

The default role-to-model mapping is the config shape shown in step 5 below. If `~/.claude/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskUserQuestion over free text. Offer these four options with these exact labels, and name the current budget when the config records one. With no config, say that `large` matches the skill defaults.

- `unlimited — max effort`
- `large — xhigh effort`
- `medium — high effort`
- `small — medium effort`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by model, list, or alias (`inherit-parent`, `auto`). `unlimited`, `large`, `medium`, and `small` set the effort of every real value, panel entries included, to `max`, `xhigh`, `high`, or `medium`. `inherit-parent` and `auto` do not change. So `unlimited` turns `opus-xhigh` into `opus-max`, and `small` turns the defaults into `opus-medium` and `sonnet-medium`.

**(c) Show the roles and confirm.** Show every role with its value. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the four models plus `inherit-parent` and `auto` as the options. Prefer AskUserQuestion over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. Keep at least two different models in a panel so its review stays diverse. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every value written must be a valid `<model>-<effort>` pair from step 1, or an alias. If a chosen value is not valid, stop and ask again.

### 5. Write the config

Write `~/.claude/pstack-models.md` with a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# A value is <model>-<effort>: set the Agent tool's `model` and `effort` from it.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Agent `model` and `effort`). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: sonnet-xhigh
bug-fix: sonnet-xhigh
perf-issue: sonnet-xhigh
hillclimb: sonnet-xhigh
judgment and prose: opus-xhigh
hardest tasks: opus-xhigh
how explorer: sonnet-xhigh
how explainer: opus-xhigh
why investigators: sonnet-xhigh
why synthesizer: opus-xhigh
reflect tooling: sonnet-xhigh
reflect judgment, divergent, synthesizer: opus-xhigh
arena runners: opus-xhigh, sonnet-xhigh
arena cross-judge pool: opus-xhigh, sonnet-xhigh
swarm workers: sonnet-xhigh
architect runners: opus-xhigh, sonnet-xhigh
interrogate reviewers: opus-xhigh, sonnet-xhigh
```

### 6. Confirm

Tell the user the config was written. Skills read it at spawn time, so it applies from the next spawn on. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, read `${CLAUDE_PLUGIN_ROOT}/skills/create-verification-skill/SKILL.md` and follow it. On no, move on without pushing.
