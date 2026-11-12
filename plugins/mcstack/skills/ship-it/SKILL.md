---
name: ship-it
description: "Take one branch or PR from finished code to merged: open the PR, get a review from another model, fix what's real, wait for CI, and merge. A lighter path than /bde-mode's Shipping playbook, for one PR and no subagent fleet. Use for /ship-it."
disable-model-invocation: true
---

# Ship it

One PR, start to merge, in this chat. `/ship-it` is the request to merge, but merge only after every step below passes. Stop and report when one can't.

1. **Find the PR.** Use the PR for the current branch (`gh pr view`), or the one the user named, checked out with `gh pr checkout <pr>` so every later step runs on its branch. If none exists, commit, push and open one ready for review, not as a draft, with the repository's PR template when it has one.
2. **Catch up with trunk.** If the branch is behind trunk, rebase it, re-run what the rebase touched, and check that every fix from before the rebase is still in the diff. Push with `--force-with-lease` when nobody else pushes to the branch. Otherwise ask first.
3. **Run the local gate.** Run the repository's check script and its `verify-*` skill when it has one. Put the evidence (command and result, screenshots for UI) in the PR description.
4. **Get a second opinion.** Have a model other than the one that wrote the code review the diff: an external reviewer such as Codex or Pi when one is installed, otherwise an Agent on a different model. If that reviewer can't run, for example it is out of usage, use the other option and name which one reviewed.
5. **Fix what's real.** Check each finding against the code. Fix a real one with a regression test that fails before the fix. Dismiss the rest with a one-line reason. Run `/simplify` over the diff and drop any of its edits that change behavior. Push once with all the fixes.
6. **Wait for CI.** Watch it with `gh pr checks <pr> --watch`. A failure in the diff's code gets a fix and a new push. A flake gets one re-run. A job the forge wouldn't run for billing or a spending limit is not a pass: say so in the PR, report it to the user, and stop without merging.
7. **Give the review bots one chance.** Bot review is best effort and never holds the merge for long. If a bot that reviews line by line hasn't reviewed the head (with `bun`, `<bde-mode>/scripts/review-coverage/review-coverage <pr>` tells you, where `<bde-mode>` is the bde-mode skill directory next to this skill's), ask it once (`@codex review`, `@coderabbitai review`). Wait up to 10 minutes, or as long as the user said. Handle whatever findings arrive in that time as in step 5, including the ones some bots leave only in a review's body, which create no thread. Don't wait for the bots again after a fix push.
8. **Merge.** Any push after step 6 goes back to step 6, so CI covers the head you merge. With green CI on the head and every finding that arrived handled, merge with the repository's usual method (`gh pr merge <pr> --squash` when nothing says otherwise). Read the PR back with `gh pr view <pr> --json state,mergedAt` to confirm it merged and was not only queued.

For a stack of PRs, or work that needs independent verifiers before landing, use `/bde-mode` instead.

**Reply:** the PR link, what the local gate and the reviewer found and what you fixed, the CI result, which bots hadn't reviewed the merged head, and whether it merged. If it stopped, say at which step and what the user needs to do.
