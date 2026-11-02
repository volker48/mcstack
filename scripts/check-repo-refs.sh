#!/bin/bash
# Fail when a tracked file names a GitHub repository that isn't listed in
# scripts/public-repos.txt.
#
# This repository is public, and fixtures captured from a private repository
# carry its name in URLs and cross-references. Listing the repositories this one
# may name keeps the check from having to know, or publish, which ones are
# private. Only owner-qualified names are matched, so a bare `repo#12` reference
# gets past it.
#
# Usage: scripts/check-repo-refs.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
allowlist=$root/scripts/public-repos.txt
name='[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+'

# The vendored repositories under repos/ are copies of public upstreams.
refs=$(git -C "$root" grep -I -n -o -E \
	-e "github\.com/$name" \
	-e "$name#[0-9]+" \
	-e "\"(nameWithOwner|full_name|repo)\": *\"$name\"" \
	-e "--repo[ =]$name" \
	-- ':!repos') || [ $? -eq 1 ] # 1 means no matches

unlisted=$(
	while IFS=: read -r file line ref; do
		[ -n "$ref" ] || continue
		repo=$(sed -E 's#^(github\.com/|"[A-Za-z_]+": *"|--repo[ =])##; s#("|\#[0-9]+)$##; s#(\.git)?\.?$##' <<<"$ref" | tr '[:upper:]' '[:lower:]')
		grep -qxF "$repo" "$allowlist" || echo "$file:$line: $repo"
	done <<<"$refs"
)

if [ -n "$unlisted" ]; then
	echo "These repositories aren't in scripts/public-repos.txt:" >&2
	echo "$unlisted" >&2
	echo "Replace captured data with synthetic data, or list the repository if it is public." >&2
	exit 1
fi
