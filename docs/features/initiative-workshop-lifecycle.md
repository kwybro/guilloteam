# Initiative Workshop lifecycle

## Supported scenarios

```text
Given two unmerged signal-state Initiatives in the same Project
When a Team member merges one into the other
Then the surviving Initiative retains its supporting Noise and gains the
absorbed Initiative's distinct supporting Noise
And the absorbed Initiative remains a durable record linked to its survivor
And only the survivor remains in the Workshop
```

```text
Given a signal-state Initiative in a Project Workshop
When a Team member updates its concise statement
Then the Workshop shows the revised statement
And its supporting Noise and state are unchanged
```

```text
Given a signal-state Initiative in a Project Workshop
When a Team member graduates it through the user-authorized command
Then its state changes to queued
And it leaves the Workshop and becomes the first item in that Project's queue
And an agent credential alone cannot perform that graduation
```

```text
Given a Project queue with two queued Initiatives
When a Team member starts the next Initiative through the user-authorized command
Then only the Initiative at position 1 changes to executing
And Guilloteam records who started it and when
And it leaves the waiting queue while the former position-2 Initiative advances to position 1
And an agent credential alone cannot start work
```

```text
Given an executing Initiative in a Project
When a Team member completes it through the user-authorized command with an outcome summary
Then its state changes to completed
And Guilloteam records who completed it, when, and the outcome summary
And the Project workspace reports one outcome
And an agent credential alone cannot complete work
```

## Initial boundary

Merges are restricted to unmerged Initiatives in `signal` state and remain
auditable: the absorbed Initiative is retained and linked to its survivor,
while its distinct Noise provenance is appended to the survivor. Only the
surviving Initiative is shown in the Workshop.

Workshop editing changes only a signal Initiative's concise statement. Queue
graduation requires the service's user authorization channel plus Team
membership; the current user ID remains opaque until full identity support is
introduced. Graduation appends the Initiative to its Project's shared queue.

Starting work is only available through `startNextInitiative`; there is no
command to bypass queue order. It also requires the user authorization channel
and Team membership. Completion has the same authority boundary and stores its
outcome directly on the completed Initiative; a distinct execution-attempt or
outcome entity remains future work.
