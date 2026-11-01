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

Cloud sessions don't install plugins that a repository enables in its `.claude/settings.json`, but they do load the repository's `.claude/skills` and `.claude/agents`. To give cloud agents mcstack in a repository, commit a copy there:

```bash
scripts/vendor-into-repo.sh /path/to/repo
```

It copies the skills and agents from this checkout's `HEAD`, rewrites what only works in a plugin, and records the source commit in the repository's `.claude/mcstack/README.md`. Rerun it to update. Edit skills here, never in the copy.

## Layout

- `plugins/<name>/` holds each plugin.
- `scripts/vendor-into-repo.sh` copies mcstack into a repository for cloud sessions.
- `repos/` holds vendored upstream sources, read-only. Adding the marketplace clones them too (about 9 MB).
