# Noise-to-Execution Product Direction

**Status:** ratified product direction, before implementation planning.

This document records the decisions behind Guilloteam's next product model. It
is deliberately a product and domain document, not a storage schema or a
technology choice. New detail should be added only when real use of the
workflow makes it necessary.

## Purpose

Guilloteam helps a team turn abundant, imperfect information into the next
piece of work it has explicitly chosen to execute.

```text
Noise -> synthesized Initiative -> user-curated Queue -> execution -> outcome
```

Noise is cheap and may be incomplete, contradictory, or transient. An
Initiative is a synthesized candidate for action. The Queue is a team
commitment: every Initiative in it is ready to wait its turn for execution.

Guilloteam owns the context, workflows, and durable record of those decisions.
Agents provide synthesis and execution help; Guilloteam does not own model
inference.

## Core language

### Noise

Noise is an atomic input that may become useful evidence. Sources may include a
fleeting thought, a conversation, an article, social-media research, a user
request, or a user vote. It always belongs to one Project and retains its
source and provenance.

### Initiative

An Initiative is the durable object that begins life as a synthesized signal
and can mature into completed work. `Initiative` is intentionally broad enough
to cover a feature, problem, research question, operational improvement, or
strategic bet.

An Initiative in its initial `signal` state needs only:

- a concise synthesized statement; and
- references to its supporting Noise.

The executable-work schema will grow from actual use rather than being designed
up front.

### Project and Team

A Team is the ownership and collaboration boundary. It owns members, roles,
integrations, and one or more Projects.

A Project is the operating boundary. It owns its shared Noise, Initiative
Workshop, execution Queue, and outcomes.

```text
Team
└── Project
    ├── Noise
    ├── Initiative Workshop
    ├── execution Queue
    └── outcomes
```

This supports a Personal Team with multiple side-project queues and a work Team
with a project shared by the people building a set of applications. A Project
is required when capturing Noise in the first version. A Team-level dumping
ground that can synthesize new Projects is a possible later capability, not an
initial exception to that rule.

## Workflow

### 1. Capture Noise

A user or their agent captures Noise in a selected Project. Capturing is
deliberately low-friction but records where the information came from.

### 2. Synthesize

A user asks an agent to synthesize selected or relevant Noise. Synthesis is a
curation operation, not a ticket factory. It may:

- create a new signal-state Initiative from one or more Noise items;
- attach new Noise to an existing Initiative;
- report that no actionable Initiative should be created; or
- merge one or more related signal-state Initiatives.

Only Initiatives in `signal` state may be merged. A merge preserves the
absorbed Initiatives' history, supporting Noise, and prior reasoning on the
surviving Initiative.

### 3. Workshop

The Workshop is the view of signal-state Initiatives. There is no separate
`shaping` or `ready` state. Users and agents can improve the statement,
incorporate evidence, research, clarify scope, or split and discard ideas while
the Initiative remains a signal.

### 4. Queue

Only a user can graduate an Initiative from `signal` to `queued` in the first
version. Queueing means both that the Initiative is ready enough and that the
team is committing it to execution order.

The Queue contains only queued Initiatives, ordered within a Project. Its order
is meaningful: the first item is the next eligible item to execute. Users may
explicitly reorder it.

### 5. Execute and record the outcome

The user and their agent start the queue's next Initiative and complete it.
Initial lifecycle states are:

```text
signal -> queued -> executing -> completed
```

The first implementation should offer `startNextInitiative`, which atomically
starts the Queue's current top Initiative rather than allowing an arbitrary
queued item to bypass the order. Completion records a useful outcome summary.
Exact terminal states for stopped or unsuccessful work, and a distinct
execution-attempt entity, remain future design decisions.

## Authority and provenance

Users retain control over commitments. An agent may recommend that a signal be
queued, reordered, or changed, but user authority for those actions must be
enforced by the application—not only by agent instructions.

Noise is evidence, not disposable input. An Initiative must retain the
supporting Noise and the record of synthesis/merge decisions that explain why
it exists. This keeps the Workshop inspectable and lets a team challenge or
revise a conclusion without losing its source material.

## Constitution and World Model

The Constitution and World Model remain part of Guilloteam's operating context.
They inform synthesis, prioritization, and execution without becoming additional
objects in this core workflow:

- the World Model helps interpret relevance, relationships, and dependencies;
- the Constitution guides trade-offs, constraints, and when an agent must defer
  to a person.

Whether they live in a repository, the database, or a hybrid remains an
implementation decision. The core workflow must be able to use them without
requiring that decision now.

## Shared application surface

The web application and MCP server will expose the same domain workflows via a
shared command layer. The command layer owns validation, authorization, audit
behavior, and transaction boundaries. HTTP/RPC and MCP are adapters around it;
neither is the source of truth.

The initial conceptual operations are:

- capture and retrieve Noise;
- synthesize Noise;
- retrieve and update an Initiative's workshop content;
- queue and reorder an Initiative through user-authorized operations;
- start the next Initiative; and
- finish an Initiative with an outcome.

`createInitiative` is not part of the normal agent workflow at this stage:
synthesis creates Initiatives. A direct user-authored creation path can be
introduced later if it proves useful.

Schemas, types, and API documentation can be shared or generated from the
command contracts. MCP tool descriptions should remain intentionally authored,
because agents need behavioral guidance that an HTTP client does not.

## Deployment and data ownership

Guilloteam should be open-source and self-hostable, while also being available
as a hosted service. These are two ways to operate the same core server, not
two different products.

The self-hosted path should provide a Guilloteam server image plus a small
Docker Compose setup that runs the server alongside Postgres with durable
storage. The hosted path should reduce operations burden while preserving data
portability through exports, backups, and documented integrations.

This model gives work teams a credible path to control their data and
integrations, while retaining the convenience of managed hosting for personal
projects and teams that prefer it.

## Initial technology stack

The initial stack favors a small number of portable, well-understood pieces:

- TypeScript and Bun for the monorepo and server runtime;
- Hono for the HTTP API and remote MCP endpoint;
- React and Vite for the web application;
- Postgres as the only database;
- Drizzle with the standard `pg` driver for typed queries and migrations; and
- Docker Compose for the self-hosted installation.

The Guilloteam application is packaged as one Docker image. It uses one
standard `DATABASE_URL` and ordinary Postgres features, so the same server,
schema, migrations, and query layer run in both deployment modes:

```text
Self-hosted: Docker Compose runs Guilloteam + Postgres + a durable database volume
Hosted:      a container host runs Guilloteam + managed Neon Postgres
```

The Postgres volume persists across container restarts and replacements, but it
is not itself a backup. Self-hosters accept responsibility for backups,
upgrades, monitoring, and recovery, or connect Guilloteam to an existing
managed Postgres service. Guilloteam should eventually provide a documented
`pg_dump` backup and restore path.

Neon is a hosted deployment choice, not a core dependency. Guilloteam will not
rely on Neon-specific SQL or data APIs, preserving ordinary Postgres portability
and avoiding a storage-level vendor lock-in.

Cloudflare is intentionally not part of the first required deployment. It can
later provide static web delivery, DNS, edge protection, or container hosting
if a concrete operational need warrants it.

## Deliberate deferrals

The following are valuable but not required to begin implementing this model:

- a Team-level stray-idea or Project-creation incubator;
- agent-initiated queueing or autonomous execution decisions;
- a richer executable-work schema and readiness scoring;
- complex visibility and permission models beyond Team/Project membership;
- cross-project queues or scheduling;
- exact storage location and revision model for the Constitution and World
  Model; and
- stopped/failed/retried execution semantics and multiple execution attempts.
