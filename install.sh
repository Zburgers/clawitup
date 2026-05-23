#!/usr/bin/env bash
set -euo pipefail

clawitup_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_repo="${1:-$PWD}"

if ! git -C "$target_repo" rev-parse --show-toplevel >/dev/null 2>&1; then
  printf '[clawitup:install] target is not a git repository: %s\n' "$target_repo" >&2
  exit 1
fi

cd "$clawitup_repo"
printf '[clawitup:install] installing dependencies and building CLI\n'
npm install
npm run build
npm link

cd "$target_repo"
printf '[clawitup:install] initializing target repo\n'
clawitup init

printf '[clawitup:install] local CLI linked from %s\n' "$clawitup_repo"
printf '[clawitup:install] target repo configured at %s\n' "$(git rev-parse --show-toplevel)"
printf '[clawitup:install] next: set provider key env var (OPENROUTER_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY)\n'
printf '[clawitup:install] next: clawitup audit --scope <scope>\n'
