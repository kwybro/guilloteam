# Noise-to-Initiative synthesis

## Supported scenario

```text
Given Ben belongs to the Guilloteam Team
And Mobile app contains two Noise items
When Ben asks an agent to synthesize those two Noise items into
"Make invitation recovery reliable"
Then Mobile app has one Initiative in its Workshop with state signal
And that Initiative preserves references to exactly those two Noise items
And its workspace reports two Noise items and one Workshop item
And Noise from another Project cannot support the Initiative
```

```text
Given Ben has a signal-state Initiative supported by one Mobile app Noise item
And Mobile app has a second, relevant Noise item
When Ben asks an agent to attach that second Noise item to the Initiative
Then the Initiative preserves both supporting Noise references in attachment order
And the same Noise item cannot be attached to that Initiative twice
```

```text
Given an agent reviews selected Mobile app Noise during synthesis
And the Noise does not warrant work yet
When the agent determines no Initiative should be created,
with a concise rationale
Then Guilloteam records a deferred synthesis decision with its supporting Noise
And Mobile app's Workshop remains empty
And the Noise remains available for later synthesis
```

## Initial boundary

The agent supplies the concise synthesized statement and selected Noise IDs;
the shared command layer records and validates the decision. Synthesis and
attachment requests must select one or more existing Noise items from the same
Project and be requested by a member of that Project's Team. Noise can be added
only while an Initiative remains in `signal` state.

Supported synthesis outcomes are now creating a new signal-state Initiative,
attaching Noise to an existing signal-state Initiative, and recording a
deferred synthesis decision. Deferral is an agent's judgment during review, not
a user-requested action. A deferred decision retains the concise rationale,
requester, and Noise provenance without marking its Noise as consumed; future
synthesis can revisit it. Initiative merging, Workshop editing, and queue
graduation are specified in
[the Initiative Workshop lifecycle feature](initiative-workshop-lifecycle.md).
