#!/bin/bash
# Copy the mcstack plugin's skills and agents into a repository's .claude/
# folder, rewritten to run as project skills.
#
# Cloud sessions load a repository's .claude/skills and .claude/agents, but
# they don't install plugins the repository enables in .claude/settings.json.
# A committed copy is the only way cloud agents get mcstack.
#
# Usage: scripts/vendor-into-repo.sh <repo-root>
#
# The copy comes from this checkout's HEAD, so uncommitted edits are left out
# and the SHA written to .claude/mcstack/README.md names exactly what was
# copied. Rerun it to update. Paths listed in .claude/mcstack/MANIFEST are
# replaced or removed. It stops without changing anything if an incoming skill
# or agent would replace a path the MANIFEST doesn't list.
set -euo pipefail

[ $# -eq 1 ] || {
	echo "usage: $0 <repo-root>" >&2
	exit 2
}
dest=$(cd "$1" && pwd)/.claude
here=$(cd "$(dirname "$0")/.." && pwd)

# setup-mcstack only writes ~/.claude/mcstack-models.md, which a repository
# can't ship. Without that file every role uses its default model.
skip_skills=(setup-mcstack)
agents=(bde-agent comment-sicko)
gh_base=https://github.com/volker48/mcstack/blob/main/plugins/mcstack

sha=$(git -C "$here" rev-parse --short HEAD)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
git -C "$here" archive HEAD plugins/mcstack | tar -x -C "$work"
src=$work/plugins/mcstack
version=$(jq -r .version "$src/.claude-plugin/plugin.json")

skills=()
for d in "$src"/skills/*/; do
	n=$(basename "$d")
	[[ " ${skip_skills[*]} " == *" $n "* ]] || skills+=("$n")
done

# MANIFEST lists every path under .claude/ that this script owns. Anything
# else at an incoming path belongs to the repository, so stop before touching
# anything rather than delete it.
owned_now=()
for n in "${skills[@]}"; do owned_now+=("skills/$n"); done
for a in "${agents[@]}"; do owned_now+=("agents/$a.md"); done

manifest=$dest/mcstack/MANIFEST
owned_before=()
if [ -f "$manifest" ]; then
	while IFS= read -r p; do
		[[ "$p" =~ ^(skills/[A-Za-z0-9._-]+|agents/[A-Za-z0-9._-]+\.md)$ && "$p" != */.* ]] || {
			echo "error: unexpected MANIFEST entry: $p" >&2
			exit 1
		}
		owned_before+=("$p")
	done <"$manifest"
fi

collisions=()
for p in "${owned_now[@]}"; do
	if [ -e "$dest/$p" ] || [ -L "$dest/$p" ]; then
		[[ " ${owned_before[*]-} " == *" $p "* ]] || collisions+=("$p")
	fi
done
if [ ${#collisions[@]} -gt 0 ]; then
	echo "error: these paths in $dest are not in its mcstack MANIFEST, so they may belong to the repository:" >&2
	printf '  %s\n' "${collisions[@]}" >&2
	echo "Remove or rename each one, or add it to $manifest if it is an earlier copy of mcstack." >&2
	exit 1
fi

mkdir -p "$dest/skills" "$dest/agents" "$dest/mcstack"
for p in ${owned_before[@]+"${owned_before[@]}"}; do
	[[ " ${owned_now[*]} " == *" $p "* ]] || rm -rf "${dest:?}/$p"
done

for n in "${skills[@]}"; do
	rm -rf "${dest:?}/skills/$n"
	cp -R "$src/skills/$n" "$dest/skills/$n"
done
for a in "${agents[@]}"; do
	cp "$src/agents/$a.md" "$dest/agents/$a.md"
done
cp "$src/LICENSE" "$src/THIRD_PARTY_NOTICES" "$dest/mcstack/"
printf '%s\n' "${owned_now[@]}" >"$manifest"

# A project skill is not a plugin: no ${CLAUDE_PLUGIN_ROOT}, no plugin prefix
# on agent names, and no plugin README or docs beside the skills. The specific
# rules run before the general ones that would otherwise match the same text.
md_files=()
for n in "${skills[@]}"; do
	while IFS= read -r -d '' f; do md_files+=("$f"); done \
		< <(find "$dest/skills/$n" -name '*.md' -print0)
done
for a in "${agents[@]}"; do md_files+=("$dest/agents/$a.md"); done

perl -pi -e '
	s{This file is `\$\{CLAUDE_PLUGIN_ROOT\}/skills/bde-mode/SKILL\.md`\.}{This file is `.claude/skills/bde-mode/SKILL.md` at the repository root. Relative paths below, such as `playbooks/` and `references/`, are relative to `.claude/skills/bde-mode/`.}g;
	s{With no path, read `\$\{CLAUDE_PLUGIN_ROOT\}/skills/bde-mode/SKILL\.md`\. If that path does not resolve, search `~/\.claude/plugins/` for a file whose path ends in `mcstack/skills/bde-mode/SKILL\.md` and use the most recently modified copy\.}{With no path, read `.claude/skills/bde-mode/SKILL.md` from the repository root.}g;
	s{If no such file exists, stop and tell your parent\.}{If that file does not exist, stop and tell your parent.}g;
	s{"\$\{CLAUDE_PLUGIN_ROOT\}/skills/statechart/}{"\$\{CLAUDE_SKILL_DIR\}/}g;
	s{\$\{CLAUDE_PLUGIN_ROOT\}/skills/}{.claude/skills/}g;
	s{(?<![/\w])plugins/mcstack/skills/}{.claude/skills/}g;
	s{"mcstack:(bde-agent|comment-sicko)"}{"$1"}g;
	s{\]\(\.\./setup-mcstack/SKILL\.md\)}{]('"$gh_base"'/skills/setup-mcstack/SKILL.md)}g;
	s{\]\(\.\./\.\./(README\.md|docs/[^)]*)\)}{]('"$gh_base"'/$1)}g;
' "${md_files[@]}"

leftover=$(grep -rnE 'CLAUDE_PLUGIN_ROOT|"mcstack:|(^|[^/[:alnum:]_])plugins/mcstack/skills/|\]\(\.\./\.\./(README|docs)|\]\(\.\./setup-mcstack/' \
	"${md_files[@]}" || true)
if [ -n "$leftover" ]; then
	echo "error: plugin-only references left after the rewrites; add a rule for each:" >&2
	echo "$leftover" >&2
	exit 1
fi

# shellcheck disable=SC2016 # the backticks are Markdown code spans
agent_list=$(printf '`.claude/agents/%s.md`, ' "${agents[@]}")
# shellcheck disable=SC2016 # the backticks are Markdown code spans
skip_list=$(printf '`%s` ' "${skip_skills[@]}")
cat >"$dest/mcstack/README.md" <<EOF
# mcstack, vendored

Generated by \`scripts/vendor-into-repo.sh\` in
[volker48/mcstack](https://github.com/volker48/mcstack) from commit \`$sha\`
(plugin version $version). Do not edit these files here: change mcstack, then
rerun the script.

Cloud sessions load a repository's \`.claude/skills\` and \`.claude/agents\`, but
they don't install plugins the repository enables in \`.claude/settings.json\`.
This copy is how cloud agents get mcstack.

- Skills and agents: every path listed in \`MANIFEST\`. Other skills in
  \`.claude/skills\` belong to this repository and the script leaves them alone.
- Agents: ${agent_list%, }.
- Not copied: ${skip_list}(it writes \`~/.claude/mcstack-models.md\`;
  without that file every role uses its default model), \`docs/\`, and the plugin README.
- License and attribution: \`LICENSE\` and \`THIRD_PARTY_NOTICES\` in this folder.

The script rewrites what only works in a plugin: \`\${CLAUDE_PLUGIN_ROOT}/skills/\`
paths become \`.claude/skills/\` (\`\${CLAUDE_SKILL_DIR}\` for the statechart
command), \`mcstack:\`-prefixed agent names lose the prefix, and links to the
plugin README, guide pages, and \`setup-mcstack\` become GitHub URLs.

## Updating

From a checkout of mcstack at the commit you want:

\`\`\`bash
scripts/vendor-into-repo.sh /path/to/this/repo
\`\`\`
EOF

echo "vendored mcstack $sha ($version): ${#skills[@]} skills, ${#agents[@]} agents into $dest"
