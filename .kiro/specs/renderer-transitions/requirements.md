# Requirements Document

## Introduction

The Renderer currently manages all DOM updates through a dirty-flag mechanism and requestAnimationFrame loop. However, FlippableObject bypasses this system by directly writing CSS transition styles for its flip animation. As more animations are planned (card slide, tile fade, hand raise/lower), a general-purpose transition system integrated into the Renderer is needed to avoid accumulating per-animation exceptions to the "no direct div.style.*" rule.

This feature introduces a generic transition API on the Renderer that allows game objects to trigger one-shot CSS transitions on managed elements without directly manipulating the DOM, while coexisting with the existing dirty-flag render loop.

## Glossary

- **Renderer**: The singleton (`rendering/Renderer.js`) that owns the render loop, tracks dirty objects, computes screen bounds, and applies DOM updates each frame
- **Transition**: A one-shot, time-limited CSS transition applied to a managed DOM element, defined by target CSS properties, their end values, and a duration
- **Transition_Descriptor**: A plain object specifying the CSS properties, target values, and duration for a transition request
- **Active_Transition**: A transition currently in progress on a managed element, tracked by the Renderer until completion or interruption
- **Managed_Element**: A DOM element registered with the Renderer via `register()` and identified by an objectId
- **Target_Element**: The specific DOM element (either the entry's main div or a child element) on which a transition is applied
- **Dirty_Flag_Loop**: The existing `tick()` mechanism that recomputes bounds and applies DOM updates for entries marked dirty
- **Game_Object**: Any object in the `zui/` or `game/` layer that is registered with the Renderer

## Requirements

### Requirement 1: Start a Transition

**User Story:** As a game object developer, I want to request a CSS transition through the Renderer, so that I can animate visual properties without directly manipulating DOM styles.

#### Acceptance Criteria

1. WHEN a Game_Object calls the transition method with a valid objectId, a Target_Element reference, and a Transition_Descriptor, THE Renderer SHALL apply the specified CSS `transitionDuration` and target property values to the Target_Element
2. THE Transition_Descriptor SHALL contain a `duration` field (in milliseconds), and one or more CSS property-value pairs to transition
3. WHEN the transition method is called with an objectId that is not registered, THE Renderer SHALL ignore the request without throwing an error
4. THE Renderer SHALL support transitioning any CSS property that the browser can natively transition (transform, opacity, filter, and others)

### Requirement 2: Transition Isolation from Dirty-Flag Loop

**User Story:** As a game object developer, I want transitions to run independently of the dirty-flag render loop, so that unrelated state changes do not restart or interfere with in-progress animations.

#### Acceptance Criteria

1. WHILE an Active_Transition is in progress on a Target_Element, THE Renderer SHALL NOT overwrite the transitioning CSS properties on that Target_Element during the Dirty_Flag_Loop
2. WHILE an Active_Transition is in progress, THE Dirty_Flag_Loop SHALL continue to update bounds (left, top, width, height) on the entry's main div without affecting the Active_Transition
3. WHEN a `setState` call modifies a field unrelated to an Active_Transition, THE Renderer SHALL apply that change normally without restarting the Active_Transition

### Requirement 3: Transition Completion

**User Story:** As a game object developer, I want to know when a transition finishes, so that I can perform follow-up logic (e.g., updating persistent state after a flip completes).

#### Acceptance Criteria

1. WHEN an Active_Transition completes (the CSS `transitionend` event fires for all transitioning properties), THE Renderer SHALL remove the Active_Transition from its internal tracking
2. WHEN an Active_Transition completes, THE Renderer SHALL invoke an optional completion callback provided in the transition request
3. WHEN an Active_Transition completes, THE Renderer SHALL remove the `transitionDuration` style from the Target_Element so that subsequent style writes do not inadvertently animate

### Requirement 4: Transition Interruption

**User Story:** As a game object developer, I want a new transition on the same element to cleanly override a previous in-progress transition, so that rapid user interactions (e.g., double-clicking a card) produce correct visual results.

#### Acceptance Criteria

1. WHEN a new transition is requested on a Target_Element that already has an Active_Transition, THE Renderer SHALL cancel the previous Active_Transition before starting the new one
2. WHEN a previous Active_Transition is cancelled due to interruption, THE Renderer SHALL NOT invoke the completion callback of the cancelled transition
3. WHEN a previous Active_Transition is cancelled, THE Renderer SHALL apply the new transition starting from the element's current computed style (the browser's mid-transition interpolated value)

### Requirement 5: Child Element Targeting

**User Story:** As a game object developer, I want to run transitions on child elements within a managed object (e.g., the wrapper div inside a FlippableObject), so that the transition system supports the existing flip animation structure.

#### Acceptance Criteria

1. THE Renderer transition method SHALL accept an optional Target_Element parameter that specifies a child DOM element within the Managed_Element's subtree
2. WHEN no Target_Element is specified, THE Renderer SHALL apply the transition to the entry's main div
3. WHEN a Target_Element is specified that is not a descendant of the Managed_Element's div, THE Renderer SHALL ignore the request without throwing an error

### Requirement 6: Transition Cleanup on Unregister

**User Story:** As a system maintainer, I want active transitions to be cleaned up when an object is unregistered or the Renderer is cleared, so that no stale event listeners or tracking data remain.

#### Acceptance Criteria

1. WHEN an object with an Active_Transition is unregistered via `unregister(objectId)`, THE Renderer SHALL cancel the Active_Transition and remove all associated event listeners
2. WHEN `clear()` is called on the Renderer, THE Renderer SHALL cancel all Active_Transitions and remove all associated event listeners
3. WHEN an Active_Transition is cancelled due to unregister or clear, THE Renderer SHALL NOT invoke the completion callback

### Requirement 7: No Animation-Specific Knowledge in Renderer

**User Story:** As a system architect, I want the Renderer to provide a generic transition mechanism without encoding knowledge of specific animation types, so that new animations can be added without modifying the Renderer.

#### Acceptance Criteria

1. THE Renderer SHALL NOT contain logic specific to any particular animation (flip, slide, fade, or others)
2. THE Renderer transition API SHALL accept arbitrary CSS property names and values as defined by the calling Game_Object
3. THE Renderer SHALL treat all transitions uniformly regardless of which CSS properties are being animated

### Requirement 8: Remove changedFields in Favour of Transition Guards

**User Story:** As a system architect, I want to simplify the dirty-flag loop by removing `changedFields` tracking and writing all visual properties unconditionally, guarded only by active transitions, so that the Renderer has fewer moving parts and a single clear rule for when properties are written.

#### Acceptance Criteria

1. THE Renderer SHALL remove the `changedFields` Set from entries and the `.add(field)` call from `setState`
2. THE `applyDOM` function SHALL write all visual properties (position, dimensions, zIndex, transform, transformOrigin, filter) unconditionally for every dirty entry
3. THE `applyDOM` function SHALL skip writing a CSS property IF that property is currently owned by an Active_Transition on the same Target_Element
4. THE `firstRender` flag SHALL be removed since all properties are now written unconditionally on every dirty frame
5. THE `setState` method SHALL only set `entry.dirty = true` (no field tracking) when the value changes
