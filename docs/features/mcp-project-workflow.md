# MCP Project workflow

## Supported scenario

```text
Given an agent is connected with GUILLOTEAM_URL and an agent-scoped token
And the Project contains relevant Noise
When the agent uses the MCP capture and synthesis tools
Then those tools invoke the same Project HTTP command surface as the web app
And synthesis creates a signal-state Initiative with the selected Noise provenance
And the tool descriptions tell the agent when to attach Noise, defer synthesis,
or merge signals instead of creating duplicate work
And the MCP server does not grant the agent authority to graduate, start, or
complete an Initiative
```

```text
Given the MCP process starts outside a repository with no Guilloteam config file
When GUILLOTEAM_URL and GUILLOTEAM_TOKEN are configured
Then the agent can discover and invoke the Project workflow tools
And legacy Intent, Learning, Evidence, Input, and Queue Item tools are not
exposed alongside the Project workflow
```

## Initial boundary

The MCP server is an agent-oriented adapter over the Project HTTP API. It uses
only `GUILLOTEAM_URL` and the normal agent token; it does not need a repository,
`init`, or `.guilloteam/config.json`. It exposes Team setup, Project inspection,
Noise capture, synthesis, Workshop editing, and read-only Queue inspection. Its
descriptions explain the lifecycle and provenance rules that agents need to
choose the correct command.

The prior Intent/Learning MCP surface is intentionally not registered by this
server. Constitution and World Model context remain a future, explicit addition
to the new workflow rather than a hidden startup dependency.

Graduating an Initiative, starting the next Initiative, and completing an
Initiative intentionally remain absent from this agent-token MCP surface. An
agent can inspect the Workshop and Queue, make a recommendation to the user,
and wait for the user-authorized API or web application to make that commitment.
