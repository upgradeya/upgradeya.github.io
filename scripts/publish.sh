#!/usr/bin/env bash
# Publish the tested Gitea main branch to the live GitHub Pages master branch.

set -euo pipefail

cd "$(dirname "$0")/.."

GITEA_REMOTE="origin"
GITEA_BRANCH="main"
GITHUB_REMOTE="github"
GITHUB_BRANCH="master"

say() { printf '==> %s\n' "$1"; }
die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

say "Fetching Gitea and GitHub..."
git fetch "$GITEA_REMOTE" "$GITEA_BRANCH" --quiet
git fetch "$GITHUB_REMOTE" "$GITHUB_BRANCH" --quiet

LOCAL=$(git rev-parse "$GITEA_BRANCH")
GITEA=$(git rev-parse "$GITEA_REMOTE/$GITEA_BRANCH")
GITHUB=$(git rev-parse "$GITHUB_REMOTE/$GITHUB_BRANCH")

say "Local:  $(git rev-parse --short "$LOCAL")"
say "Gitea:  $(git rev-parse --short "$GITEA")"
say "GitHub: $(git rev-parse --short "$GITHUB")"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "Working tree is not clean. Commit or stash changes first."
fi

if [ "$LOCAL" != "$GITEA" ]; then
  die "Local main does not match origin/main. Push and test on Gitea first."
fi

if [ "$LOCAL" = "$GITHUB" ]; then
  say "GitHub is already current."
  exit 0
fi

if ! git merge-base --is-ancestor "$GITHUB" "$LOCAL"; then
  git log --oneline "$LOCAL..$GITHUB"
  die "GitHub contains commits absent locally. Refusing a non-fast-forward publish."
fi

say "Commits to publish:"
git log --oneline "$GITHUB..$LOCAL"
printf 'Publish this exact commit to https://upgradeya.com/? [y/N] '
read -r REPLY
case "$REPLY" in
  y|Y|yes|YES)
    git push "$GITHUB_REMOTE" "$GITEA_BRANCH:$GITHUB_BRANCH"
    ;;
  *)
    die "Publish aborted."
    ;;
esac

say "Published. Verify GitHub Pages before declaring the launch complete."
