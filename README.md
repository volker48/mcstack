# McStack

A Claude Code plugin marketplace.

| Plugin | What it is |
|---|---|
| [`pstack`](./plugins/pstack) | Rigorous agent workflows, review panels, and engineering principles, ported from Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack) for Cursor. |

## Install

The marketplace lives in this repository's `.claude-plugin/marketplace.json`.

In Claude Code:

```text
/plugin marketplace add volker48/mcstack
/plugin install pstack@mcstack
```

Or from a shell:

```bash
claude plugin marketplace add volker48/mcstack
```

```bash
claude plugin install pstack@mcstack
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
    "pstack@mcstack": true
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

## Layout

- `plugins/<name>/` holds each plugin.
- `repos/` holds vendored upstream sources, read-only. Adding the marketplace clones them too (about 9 MB).
