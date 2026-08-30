# Team and Project Foundation

## Supported scenario

```text
Given Ava creates the Guilloteam Team
When Ben joins that Team
And Ben creates the "Mobile app" Project in it
Then the Project belongs to the Guilloteam Team
And its Noise, Workshop, Queue, and outcomes are all empty
```

## Initial boundary

This slice persists Teams, Team memberships, and Projects. A membership refers
to an opaque user ID supplied to the command. Authentication, user profiles,
invitations, and richer roles are deliberately deferred; the current service's
agent credential remains the transport-level authorization boundary.

The Project workspace is represented by counts for its four work surfaces.
Noise is now persisted and counted; Initiative, Queue, and outcome counts remain
empty summaries until their respective data models are introduced.
