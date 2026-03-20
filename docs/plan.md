# guilloteam — Product Plan

## The Problem

Organizations are good at setting high-level goals. They're bad at knowing which ground-level problems are actually blocking progress toward those goals. The people who know what's broken are the individuals doing the work — but there's no reliable signal from the boots on the ground to leadership. Important problems stay invisible. Work gets prioritized by whoever speaks loudest, not by what actually matters most.

## The Solution

guilloteam is an **organizational signal platform**. Teams surface their problems publicly as Bounties. Members back the Bounties they care most about using the team's currency. The result is a real-time, conviction-weighted view of what actually needs solving — visible to everyone, including leadership.

This is not a task manager. It's a priority market.

## Core Concept

Every team has a **Most Wanted** list — a public bounty board of problems they want solved. Members post Bounties to the list. Other members Back them by spending the team's currency. The most-backed Bounties rise to the top.

The currency is finite. Backing one Bounty costs you the ability to back another. This forces honest prioritization: if you spend half your allotment on a problem, everyone knows you mean it.

> "We're working on X right now. If you want us to prioritize Y instead, join our guilloteam and back it."

This is the adoption mechanic. It replaces "can you add this to your backlog?" with a structured, public signal.

## Primitives

### Team
The core unit. A team owns a Most Wanted list, issues a named currency, and controls its own economy. The team creator is the owner by default.

### Currency
Each team names their own currency — Buckos, Moolah, whatever fits. One currency per team. Members receive a periodic allotment and spend it by backing Bounties on their team's Most Wanted list.

**Currency mechanics:**
- Allotment is per-member (larger teams have more collective influence)
- Unspent allotment expires at the end of the period (period length is configurable by the owner)
- Backed currency does not expire — a long-lived Bounty holds its backing
- When a Bounty is resolved, backed currency is archived as a historical record (no payout)

### Member
A user belonging to a team. Must be invited to join (invite-only by default). Has a role:
- **Owner** — created the team; controls currency name, period length, allotment; can resolve Bounties
- **Builder** — team members doing the work (engineers, designers, etc.)
- **User** — external stakeholders, customers, or adjacent team members who have skin in the game

Role is preserved on each Backing so the signal breakdown is meaningful: how much came from builders vs. users tells a different story than the total alone.

### Bounty
A structured problem posted to the Most Wanted list. Not a task — a problem statement. Required fields:
- **Title** — short, scannable
- **Problem** — what's broken or missing
- **Success criteria** — how you'd know it's solved

Bounties are open by default. The owner (or poster) can mark a Bounty resolved when the problem is solved.

### Backing
A member committing currency to a Bounty. Append-only — you can't un-back a Bounty. The total Backing on a Bounty is the sum of all individual Backings, broken down by role.

## MVP Scope

The MVP is a single team with a Most Wanted list. No organization layer yet.

**In scope:**
- Team creation with a named currency
- Invite-only membership with owner / builder / user roles
- Post a Bounty (title, problem, success criteria)
- Back a Bounty with currency
- Most Wanted list ranked by total Backing, with role breakdown
- Owner resolves a Bounty (archives Backing history)
- Configurable period length and allotment per member

**Out of scope (next):**
- Organization layer and org-level currency
- Cross-team Bounties
- Dependency and bottleneck graphs
- Agent integration
- Public-facing Most Wanted (currently invite-only read)

## Roadmap

### Phase 1 — Team story (MVP)
Single team, Most Wanted list, currency, Backing mechanics.

### Phase 2 — Organization story
An org groups multiple teams. Introduces an org-level currency (leadership signal layer). Cross-team Bounties: Team A backs a Bounty on Team B's Most Wanted, signaling a dependency. Org-wide ranked view.

### Phase 3 — Intelligence layer
Dependency graph (which teams depend on which). Bottleneck detection (teams receiving the most external Backing). Resourcing signals derived from Backing patterns.

### Phase 4 — Agent integration
Standardized Bounty specs become machine-readable. Agents can discover high-signal Bounties and work on them. Agents as first-class members.
