# Project-scoped Noise capture

## Supported scenario

```text
Given Ben belongs to the Guilloteam Team
And the Team has "Mobile app" and "Website" Projects
When Ben captures the fleeting thought "Make invitations recoverable" in Mobile app
Then the Noise records its content, source, optional metadata, and Ben as its capturer
And Mobile app's workspace reports one Noise item and empty Workshop, Queue, and outcomes
And listing Website Noise returns no items
```

## Initial boundary

Noise is always captured within an existing Project. The capture command verifies
that the supplied user ID is a member of the Project's Team. Source is a
descriptive string for now (for example `fleeting_thought`, `conversation`, or
`article`); source-specific fields can live in metadata until they earn a
first-class shape.

This slice deliberately does not synthesize Noise or create Initiatives. It
establishes the project-local, provenance-preserving raw material those future
commands will use.
