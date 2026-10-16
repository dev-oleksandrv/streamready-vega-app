---
name: ship
description: Push the current branch, open a PR, wait for CI to go green, merge it, then return to an up-to-date main and delete the branch. Maintainer-invoked only.
disable-model-invocation: true
---

# /ship

The maintainer typing `/ship` is the approval to push and merge this one branch. It does not carry over to any other branch or a later turn.

Run the steps in order. If any step fails, stop, report what failed with the decisive output, and leave everything as it is. Never force-push, never rewrite history, never retry a merge with different flags, never fix a red CI on your own.

## 1. Preflight

```bash
git branch --show-current
git status --porcelain
git fetch origin
git log --oneline origin/main..HEAD
```

Stop if the branch is `main`, the tree is dirty, or there are no commits ahead of `origin/main`. Stop if the branch name does not match `<type>/<short-kebab-slug>` or any commit subject is not a Conventional Commit. The one exception is the Version PR branch `changeset-release/main`: the changesets action names it and writes its commit, so skip both checks for it, and skip step 2 (it has no changesets by design).

Then run `pnpm run check`. Stop on a non-zero exit.

## 2. Changeset

```bash
pnpm exec changeset status --since origin/main
```

Exit 0: the branch has a changeset or touches no app files, go on.

Otherwise draft one in `.changeset/<short-kebab-slug>.md`:

```md
---
"@voronkov/streamready": patch
---

One plain-language line for TV users, the way it should read in the store's "What's new".
```

- **Bump** from the commits: any `!` or `BREAKING CHANGE:` → `major`, any `feat` → `minor`, otherwise `patch`.
- **Summary** from the diff, not the commit subjects: what the user notices, no file or module names. Several user-visible changes get several bullet lines.
- No user-visible change (a refactor, tests, a dependency bump): an empty changeset instead, `pnpm exec changeset add --empty`.

Show the maintainer the bump and the summary and wait for their OK or edits. Then commit it alone, as `chore: add changeset`, and go on.

## 3. Push

```bash
git push -u origin <branch>
```

## 4. Pull request

Reuse an open PR for this branch if `gh pr view --json number,url,state` finds one. Otherwise create it:

```bash
gh pr create --base main --head <branch> --title "<title>" --body-file <scratchpad>/pr-body.md
```

- **Title:** a Conventional Commit subject for the whole change. With one commit, use its subject.
- **Body:** follow the format of earlier PRs (`gh pr view 7` is a good reference):
  - `## Summary`: one plain-language line on what changed and why, then bullets per area. Describe what is in the diff (`git diff origin/main...HEAD`), nothing more.
  - `## Test plan`: a checklist. Tick only what was actually done; `pnpm run check` from step 1 with the real Jest count. Leave device QA unticked unless the maintainer confirmed it in this conversation.
  - End with the attribution line from the system reminder, if there is one.
- No secrets, real IPs, device serials or M-Lab `access_token` URLs in the title or body.

## 5. Wait for CI

Record the head SHA (`git rev-parse HEAD`). Run the watch in the background and wait for its completion notice; CI can take up to 15 minutes:

```bash
gh pr checks <number> --watch --fail-fast --interval 20
```

Right after the PR opens, `gh` may report no checks yet. Wait a minute and run it again, at most 3 times.

- Exit 0: all checks passed, go on.
- Anything else: stop. Show the failing check and the tail of its log (`gh run view <run-id> --log-failed | tail -50`). Do not merge.

## 6. Merge

Merge commit only, and only the commit CI tested:

```bash
gh pr merge <number> --merge --match-head-commit <sha>
```

## 7. Sync main and clean up

```bash
git checkout main
git pull --ff-only
git branch -d <branch>
git push origin --delete <branch>
```

`git branch -d` refuses unmerged work; if it refuses, stop and report rather than using `-D`.

## 8. Report

PR URL, merge commit SHA, and `git log --oneline -1` on `main`.
