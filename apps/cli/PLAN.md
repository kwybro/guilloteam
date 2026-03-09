# CLI Plan

## Overview
A CLI (`guillo`) that wraps the guilloteam API. Human-first, but works great in agent/pipe contexts too.

## Stack
- **`citty`** — command/subcommand routing and flag parsing
- **`@clack/prompts`** — interactive UX layered in per-command (spinners, prompts, formatting)
- Output defaults to human-readable; `--json` or pipe detection enables JSON output
- Published independently from the monorepo via `changesets`

## Commands (initial scope)
- `guillo teams <list|create|delete>`
- `guillo projects <list|create|delete>`
- `guillo tasks <list|create|update|delete>`
- `guillo auth login` (future)

## Notes
- Binary name is `guillo` for now, easy to rename (just `package.json#bin` + `name`)
- Auth: token stored in `~/.guilloteam/config.json`, set via `guillo auth login`
- Structured JSON errors on stderr, exit codes: 0=success, 1=user error, 2=server error
