# Execution Queue v0 Requirements (Superseded)

> This document captures the earlier Input/Queue Item implementation direction.
> It is superseded by [Noise-to-Execution Product Direction](./noise-to-execution-direction.md),
> which records the ratified Team → Project → Noise → Initiative → Queue model.
> Keep this file only as historical context until the new implementation plan
> replaces it.

## Purpose

Guilloteam helps a development team keep an ordered queue of context-rich work
ready for execution by its agents.

Team members capture rough ideas, bugs, findings, and concerns as Inputs. They
turn selected Inputs into Queue Items, develop those items until they are ready,
and ask Guilloteam what should be prepared or executed next.

The v0 workflow is:

```text
Input -> Queue Item -> Ready -> In Progress -> Done
```

## North Star

A product owner using ChatGPT and a developer using Claude Code connect their
agents to the same Guilloteam MCP server.

The product owner asks the agent to record an idea. The developer asks another
agent to record a bug. Both become Inputs in a shared space.

The team chooses an Input worth pursuing and creates a Queue Item from it. The
item starts with a rough description. The team and its agents use the product's
Constitution, World Model, repository, and linked Inputs to make the description
specific enough for execution. A human marks it ready.

The developer then asks, "What's next to execute?" Guilloteam returns the
highest-positioned ready item that has not started. At the same time, the product
owner can ask, "What's next to prepare?" and receive the highest-positioned item
that is not ready.

When execution finishes, the item is completed and the next ready item becomes
available. The whole team shares one answer to where the product is going next.

## Goals

- Give development teams one shared place to capture unstructured Inputs.
- Maintain an explicit ordered queue of chosen work.
- Keep queue position independent from execution readiness.
- Let humans and agents develop a Queue Item's description as a living context
  document.
- Give MCP-connected agents deterministic answers for what to prepare and what
  to execute next.
- Support multiple independent queues in storage and APIs without implementing
  queue nesting or cross-queue scheduling.
- Preserve the existing Intent, Observation, and Evidence functionality without
  forcing it into the new workflow.

## Non-goals

- A web UI or public projection.
- Nested queues, initiatives, lanes, or portfolio planning.
- Users, teams, roles, assignments, or per-person queues.
- Input types, voting, comments, or automatic synthesis.
- Automated readiness assessment.
- Work-in-progress limits, capability matching, dependencies, or scheduling.
- Execution orchestration, branches, pull requests, deployments, or model
  inference.
- Replacing or migrating Observations and Evidence.
- A separate execution-packet or execution-attempt entity.

## Domain model

### Input

An Input is something a development team wants Guilloteam to remember and
potentially act on. Guilloteam does not classify Inputs in v0.

Required fields:

- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`

Inputs can be edited. They are not deleted, archived, promoted, or marked as
processed in v0. Whether an Input has contributed to work is derived from its
Queue Item links.

### Queue

A Queue is an independent ordered collection of Queue Items.

Required fields:

- `id`
- `name`
- `createdAt`
- `updatedAt`

The initial user experience expects one queue, commonly named `Execution Queue`,
but every Queue Item storage and API operation must be scoped by a Queue ID. The
data model must not use a singleton queue or global Queue Item ordering.

### Queue Item

A Queue Item is work the team has chosen to develop toward execution. Its
description is the v0 context canvas; no separate draft entity is needed.

Required fields:

- `id`
- `queueId`
- `name`
- `description`
- `position`
- `readiness`
- `status`
- `inputIds`
- `createdAt`
- `updatedAt`
- `startedAt`, nullable
- `completedAt`, nullable
- `completionSummary`, nullable

Allowed readiness values:

- `not_ready`
- `ready`

Allowed status values:

- `queued`
- `in_progress`
- `done`

A Queue Item may link to zero or more Inputs, and an Input may be linked to more
than one Queue Item. All linked Inputs must exist.

## Behavioral requirements

### Queue ordering

- Active Queue Items are ordered within their Queue, starting at position 1.
- Creating an item without a requested position appends it to the active queue.
- Moving an item updates the surrounding active positions atomically.
- Queues are ordered independently.
- `done` items are excluded from the active ordering and from next-item queries.
- The storage technique for positions is an implementation choice, but callers
  must always receive a deterministic active order without duplicate positions.

### Readiness and status

- New Queue Items begin as `not_ready` and `queued`.
- A queued item can be marked `ready` or returned to `not_ready` by an explicit
  human-directed operation.
- Only a `ready`, `queued` item can start.
- Starting an item atomically changes its status to `in_progress` and records
  `startedAt`.
- Starting an item that is no longer queued must fail rather than silently
  succeeding. This protects two agents from starting the same item.
- Only an `in_progress` item can be completed.
- Completing an item changes its status to `done`, records `completedAt`, accepts
  an optional completion summary, and removes it from active ordering.
- Reopening and cancellation are deferred.

### Next-item selection

- "Next to prepare" is the highest-positioned item in a Queue whose status is
  `queued` and readiness is `not_ready`.
- "Next to execute" is the highest-positioned item in a Queue whose status is
  `queued` and readiness is `ready`.
- An `in_progress` item does not prevent a later ready item from being returned.
  v0 does not enforce a work-in-progress limit.
- A next-item query returns no item when no item matches; this is not an error.
- Selection never crosses Queue boundaries.

## Required workflows

### Capture an Input

Create, list, read, and update Inputs. Listing must optionally return only Inputs
that are not linked to any Queue Item so agents can help the team review unused
material without adding a separate Input status.

### Create and inspect a Queue

Create, list, read, and rename Queues. Queue creation must not happen implicitly
in the database. An MCP-connected agent must be able to create the first Queue
for a new installation.

### Create and shape a Queue Item

Create a Queue Item in a chosen Queue, optionally linking existing Inputs. Allow
the item name, description, and Input links to be updated while it is queued.
Allow active items to be reordered.

### Prepare work

Return the next item to prepare. Agents use existing Intent tools, linked Inputs,
and the Queue Item description to help a human improve the item. Readiness is an
explicit operation; Guilloteam does not infer it.

### Execute work

Return the next item to execute, start it with concurrency-safe state validation,
and complete it with an optional summary.

## MCP surface

The MCP server must expose clear, storage-agnostic tools covering:

- Creating, listing, reading, and updating Inputs.
- Creating, listing, reading, and renaming Queues.
- Creating, reading, updating, listing, and moving Queue Items.
- Linking Inputs to a Queue Item.
- Getting the next item to prepare for a specified Queue.
- Marking an item ready or not ready.
- Getting the next item to execute for a specified Queue.
- Starting and completing an item.

Tool names and descriptions should use the domain vocabulary rather than expose
Postgres, HTTP, or package boundaries. Queue-scoped tools must accept `queueId`
explicitly. Agents can discover the available Queue IDs by listing Queues.

Existing MCP tools for Intent, Observations, and Evidence must continue to work.

## Service and authorization

- Persist Inputs, Queues, Queue Items, and Input links in Postgres through a new
  migration.
- Add a domain-shaped repository contract separate from `LearningRepository`.
- Expose the workflow through the existing Hono service and remote client layer.
- Require the agent-scoped token for every new read and write operation.
- The ingest-scoped application token must not read or mutate Inputs or Queues.
- Continue to assume one product per Guilloteam service deployment in v0;
  tenancy and project scoping are separate future work.

Package names may remain temporarily imperfect. Renaming `learning-client` or
performing a broad architecture cleanup is not required for this slice.

## Validation

Automated tests must demonstrate that:

- Inputs can be created, edited, listed, and filtered by whether they are linked.
- Multiple Queues can exist and maintain independent ordering.
- Queue Items can link only to existing Inputs.
- Creating, appending, and moving items produces deterministic positions.
- Readiness changes do not change priority.
- Next-to-prepare and next-to-execute return the correct eligible items.
- A not-ready item can be skipped when selecting work to execute.
- Starting the same item twice fails safely.
- Completing an item removes it from active selection and records its outcome.
- Agent credentials can use the new workflows and ingest credentials cannot.
- MCP tools exercise the same domain workflows as the HTTP service.
- Existing Intent, Observation, and Evidence tests remain green.

The repository must pass:

```text
bun run lint
bun run check-types
bun test
bun run build
```

## Completion criteria

The slice is complete when two MCP clients connected to the same Guilloteam
service can perform the North Star workflow: capture Inputs, create and shape an
ordered Queue Item, mark it ready, retrieve it as next to execute, start it
without double-claiming, and complete it while preserving the existing Product
Context behavior.
