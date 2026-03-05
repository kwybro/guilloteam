# guillo CLI

The guilloteam command-line interface. Manage teams, projects, and tasks — for humans and agents alike.

## Installation

```sh
bun install
bun run build   # from apps/cli
```

The binary is `guillo`.

## Global flags

Most commands accept these flags:

| Flag | Description |
|------|-------------|
| `--team <id>` | Override the locked team |
| `--project <id>` | Override the locked project |
| `--pretty` | Human-readable output (default when stdout is a TTY) |

Output defaults to newline-delimited JSON on non-TTY stdout, making it easy to pipe into `jq` or other tools.

---

## Commands

### `guillo auth`

```
guillo auth login     Log in and store credentials
guillo auth logout    Remove stored credentials
```

### `guillo config`

```
guillo config get <key>        Print a config value
guillo config set <key> <val>  Set a config value
```

### `guillo lock / unlock`

Lock a team or project as the default context so you don't have to pass `--team` / `--project` on every command.

```
guillo lock team <id>       Set default team
guillo lock project <id>    Set default project
guillo unlock team          Clear default team
guillo unlock project       Clear default project
```

### `guillo teams`

```
guillo teams list           List all teams
guillo teams create <name>  Create a team
guillo teams delete <id>    Delete a team
```

### `guillo projects`

```
guillo projects list           List all projects in the active team
guillo projects create <name>  Create a project
guillo projects delete <id>    Delete a project
```

### `guillo tasks`

#### `guillo tasks list`

List all tasks in the active project.

```sh
guillo tasks list
guillo tasks list --team <teamId> --project <projectId>
```

#### `guillo tasks get <id>`

Get a single task by ID.

```sh
guillo tasks get <id>
```

Pretty output shows:

```
◆ Task
│
◇ <title>
│
○ ID:          <id>
○ Status:      <status>
○ Description: <description or "(none)">
│
◆ Done
```

#### `guillo tasks create <title>`

Create a new task.

```sh
guillo tasks create "My task"
guillo tasks create "My task" --description "More context here" --status in_progress
```

| Flag | Description | Default |
|------|-------------|---------|
| `--description <text>` | Optional description / details for the task | — |
| `--status <status>` | Initial status: `open` \| `in_progress` \| `executed` \| `pardoned` | `open` |

#### `guillo tasks update <id>`

Update an existing task. At least one of `--title`, `--status`, or `--description` is required.

```sh
guillo tasks update <id> --title "Renamed task"
guillo tasks update <id> --status in_progress
guillo tasks update <id> --description "Updated details"
guillo tasks update <id> --title "Renamed" --description "New details" --status executed
```

| Flag | Description |
|------|-------------|
| `--title <text>` | New title |
| `--description <text>` | New description (pass empty string to clear) |
| `--status <status>` | New status: `open` \| `in_progress` \| `executed` \| `pardoned` |

#### `guillo tasks delete <id>`

Delete a task. Prompts for confirmation on a TTY.

```sh
guillo tasks delete <id>
```

### `guillo team`

Team-scoped helpers (membership, etc.).

### `guillo summon`

Summon an agent to work on the active project.

### `guillo execute`

Execute a task using an agent.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | User / input error |
| `2` | Server error |

## Config file

Credentials and locked context are stored in `~/.guilloteam/config.json`.
