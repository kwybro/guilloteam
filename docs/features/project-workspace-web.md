# Project workspace web application

## Supported scenario

```text
Given a signed-in Team member opens one Project in the web application
When they view its workspace
Then they can move left to right through counted Noise, Workshop, Queue, and
Outcomes tabs
And each tab presents the interaction shape appropriate to that work surface
And the Queue is a numbered vertical order rather than a board
And the member can capture Noise, graduate a Workshop Initiative, and start
only the next queued Initiative
And agent-authorized synthesis remains visible through its resulting Noise and
Initiative provenance rather than pretending the user performed it
```

## Team Project selection scenario

```text
Given a signed-in member opens the web application
When it loads their Teams and Projects from the Project API
Then it shows every Team they belong to and its Projects by name
And the member can select a Project without knowing its ID
And the member can create a Project in one of their existing Teams
And the newly created Project is selected and begins with empty work surfaces
```

## Focused workspace scenario

```text
Given admin selects a Project in the web application
When the selection changes
Then the API persists admin's focused Team and Project
And the MCP agent can retrieve that focused workspace before it performs work
And the focused Project always belongs to the focused Team and to admin
```

```text
Given admin has a focused workspace
When the MCP agent invokes a Project tool without a Project ID
Then the tool uses admin's persisted focused Project
And an explicit Project ID remains an intentional cross-Project override
```

## Initial boundary

The first web slice is scoped to a configured existing user ID. It reads the
shared Project API with a user-scoped credential and offers only the current
user-authorized commands. Team setup, identity, agent activity history, queue
reordering, and a production browser-session auth model are deliberately
deferred.

The Vite development server proxies `/v1` to the Guilloteam service. Production
hosting and serving the built web application from the self-hosted image are a
subsequent deployment slice.
