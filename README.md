# McStack

A Claude Code plugin marketplace.

| Plugin | What it is |
|---|---|
| [`mcstack`](./plugins/mcstack) | Rigorous agent workflows, review panels, and engineering principles, ported from Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack) for Cursor. |

## Install

The marketplace lives in this repository's `.claude-plugin/marketplace.json`.

In Claude Code:

```text
/plugin marketplace add volker48/mcstack
/plugin install mcstack@mcstack
```

Or from a shell:

```bash
claude plugin marketplace add volker48/mcstack
```

```bash
claude plugin install mcstack@mcstack
```

To set up every machine the same way, add this to `~/.claude/settings.json` (for example from your dotfiles). Claude Code clones the marketplace and installs the plugin on the next session start. This shape comes from the plugin docs and has not been tested here yet.

```json
{
  "extraKnownMarketplaces": {
    "mcstack": {
      "source": { "source": "github", "repo": "volker48/mcstack" }
    }
  },
  "enabledPlugins": {
    "mcstack@mcstack": true
  }
}
```

Before the repository is pushed, a local checkout works as the marketplace source:

```bash
claude plugin marketplace add /path/to/mcstack
```

## Updates

The plugin manifests set no `version`, so Claude Code versions each plugin by the commit it was installed from. Every pushed commit is an update. Pull it with:

```bash
claude plugin marketplace update mcstack
```

## Cloud sessions

Cloud sessions don't install plugins that a repository enables in its `.claude/settings.json`, but a cloud session on a repository does load its `.claude/skills`. Cloud threads in a Claude project load neither. To give cloud sessions, and harnesses other than Claude Code, mcstack, commit a copy to the repository with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add volker48/mcstack
```

It installs each skill once into `.agents/skills/`, which Codex, Pi, and most other harnesses read, and links it into `.claude/skills/` for Claude Code. `skills-lock.json` records the commit it came from, and `npx skills update` moves it forward. The skills brief their subagents from their own prompt files, so a copy needs no agent definitions. In a repository with a copy, turn the plugin off (`"mcstack@mcstack": false` under `enabledPlugins` in `.claude/settings.local.json`), so each skill loads once. Edit skills here, never in the copy.

## Layout

- `plugins/<name>/` holds each plugin.
- `repos/` holds vendored upstream sources, read-only. Adding the marketplace clones them too (about 9 MB).
