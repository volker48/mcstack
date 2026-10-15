# Set up mcstack

In this page you install the plugin, pick which models mcstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

In Claude Code, add the marketplace and install the plugin:

```text
/plugin marketplace add volker48/mcstack
/plugin install mcstack@mcstack
```

The repository README covers installing on several machines through `~/.claude/settings.json`.

## Pick your models

Run:

```text
/setup-mcstack
```

[`/setup-mcstack`](../../skills/setup-mcstack/SKILL.md) asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `~/.claude/mcstack-models.md`, a small config every mcstack skill reads.

The defaults run at `xhigh` reasoning, the same as the `large` budget. `unlimited` lifts every role's effort to `max`. `medium` and `small` lower the reasoning and spend fewer tokens.

You only override what you care about. A role with no line in the config keeps the skill's default. To restore a default, delete that role's line. A rerun of `/setup-mcstack` keeps any role whose model differs from the default. When a default changes, a config written before the change still pins the old default, so delete those role lines, or delete the file, then run `/setup-mcstack` again.

Set a role to `inherit-parent` or `auto` and mcstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model value. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `/setup-mcstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.claude/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to mcstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

The config applies from the next subagent spawn.

## Keep the cost in check

mcstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-mcstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/bde-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/bde-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/bde-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. `/bde-mode` loads the skill into the conversation, and it fades as the chat moves on. Start each new task with it, or add a line to the project's `CLAUDE.md` asking the agent to read it for non-trivial work.

Next: [Route work through `/bde-mode`](./02-bde-mode.md).
