# Design Document: Renderer Transitions

## Overview

This feature adds a generic, one-shot CSS transition API to the Renderer singleton. Game objects will call `renderer.startTransition(objectId, targetEl, descriptor)` to animate arbitrary CSS properties on managed DOM elements. The Renderer tracks active transitions, guards those properties from being overwritten by the dirty-flag loop, handles completion callbacks, and cleans up on interruption or unregister.

As a secondary change, the `changedFields` tracking and `firstRender` flag are removed from the dirty-flag loop. Instead, `applyDOM` writes all visual properties unconditionally on every dirty frame, skipping only properties currently owned by an active transition. This simplifies the Renderer's internal state and provides a single, clear rule for when a property is written vs. guarded.

The design is intentionally generic — the Renderer has no knowledge of flip, slide, fade, or any specific animation. Game objects own the semantics; the Renderer owns the mechanism.

## Architecture

```mermaid
flowchart TD
    subgraph "Game Object (e.g. FlippableObject)"
        call["renderer.startTransition(objectId, targetEl, descriptor)"]
    end

    subgraph "Renderer"
        track["Store ActiveTransition in transitions Map"]
        apply["Apply transitionDuration + target values to element"]
        guard["Guard transitioning properties in applyDOM"]
        listen["Listen for transitionend events"]
        complete["On completion: remove guard, invoke callback, clean up"]
        interrupt["On new transition: cancel previous, skip old callback"]
    end

    subgraph "DOM / Browser"
        css["CSS transition runs (browser interpolation)"]
        event["transitionend event fires"]
    end

    call --> track
    track --> apply
    apply --> css
    css --> event
    event --> listen
    listen --> complete
    call -->|"same element"| interrupt
    interrupt --> track

    subgraph "Dirty-Flag Loop (tick)"
        dirty["entry.dirty = true"]
        bounds["computeBounds()"]
        dom["applyDOM() — skips guarded properties"]
    end

    guard -.->|"blocks writes"| dom
```

### Integration with Existing Loop

The transition system runs **alongside** the dirty-flag loop, not inside it:

1. `startTransition()` is called synchronously by game objects (outside `tick()`).
2. The browser's CSS transition engine handles interpolation — no per-frame JS work.
3. `tick()` continues running. `applyDOM()` checks the `transitions` map and skips any CSS property currently owned by an active transition on the target element.
4. When `transitionend` fires, the guard is removed and the property returns to normal dirty-flag control.

### Data Ownership

| Concern | Owner |
|---------|-------|
| Which properties to animate, values, duration | Game Object (via Transition_Descriptor) |
| Applying/removing CSS transition styles | Renderer |
| Guarding properties during animation | Renderer |
| Tracking active transitions, cleanup | Renderer |
| Completion semantics (what to do after) | Game Object (via callback) |

## Components and Interfaces

### New Public API

```javascript
/**
 * Start a CSS transition on a target element within a registered object.
 *
 * @param {number} objectId — registered object that owns the element
 * @param {HTMLElement|null} targetEl — child element to transition, or null for the entry's main div
 * @param {TransitionDescriptor} descriptor — transition specification
 */
renderer.startTransition(objectId, targetEl, descriptor)
```

### TransitionDescriptor (plain object)

```javascript
{
    duration: 800,              // milliseconds
    properties: {               // CSS property-value pairs
        transform: 'rotateY(180deg)',
        opacity: '0.5'
    },
    onComplete: () => { ... }   // optional callback, invoked on natural completion only
}
```

- `duration` (number, required): transition duration in milliseconds.
- `properties` (object, required): keys are CSS property names (camelCase for `style.*` access), values are the target CSS values as strings.
- `onComplete` (function, optional): called once when all properties finish transitioning. NOT called on interruption or unregister.

### ActiveTransition (internal tracking object)

```javascript
{
    objectId,           // owning registered object
    targetEl,           // the DOM element being transitioned
    properties,         // Set of CSS property names being guarded
    onComplete,         // callback reference (or null)
    listener            // bound transitionend handler (for removal)
}
```

### Internal Data Structures

```javascript
class Renderer {
    constructor() {
        // ... existing fields ...
        this.transitions = new Map();  // targetEl → ActiveTransition
    }
}
```

The key is the DOM element reference (`targetEl`), not the objectId. This allows one object to have transitions on multiple child elements simultaneously (though the common case is one per object). If a new transition arrives for the same `targetEl`, the previous one is cancelled.

### Modified `applyDOM` (simplified, no changedFields)

```javascript
function applyDOM(entry, transitions) {
    const div = entry.div;
    const b = entry.bounds;
    const s = entry.state;

    // Bounds are always written (position/dimensions)
    div.style.left = b.x + 'px';
    div.style.top = b.y + 'px';
    div.style.width = b.width + 'px';
    div.style.height = b.height + 'px';

    // Visual properties — skip if guarded by an active transition on this element
    const guarded = transitions.get(div)?.properties;

    if (!guarded?.has('zIndex')) {
        div.style.zIndex = s.zIndex;
    }
    if (!guarded?.has('transform') && !guarded?.has('transformOrigin')) {
        div.style.transformOrigin = s.transformOrigin || '50% 50%';
        div.style.transform = s.rotation ? `rotate(${s.rotation}rad)` : 'none';
    }
    if (!guarded?.has('filter')) {
        div.style.setProperty('-webkit-filter', s.filter || 'none');
    }
}
```

Note: The guard check uses the `transitions` map keyed by element. For child elements (e.g., `wrapper` inside FlippableObject), the guard only applies to that child — the entry's main `div` continues receiving normal updates.

### Modified `setState`

```javascript
setState(objectId, field, value) {
    const entry = this.entries.get(objectId);
    if (!entry) return;
    if (entry.state[field] === value) return;

    entry.state[field] = value;
    entry.dirty = true;
    // No changedFields tracking — applyDOM writes all properties unconditionally
}
```

### Modified Entry Structure

```javascript
const entry = {
    objectId,
    state,
    div,
    dirty: true,
    // REMOVED: firstRender
    // REMOVED: changedFields
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    layoutPreset: { ... },
    parentId,
    viewportId
};
```

### `startTransition` Implementation

```javascript
startTransition(objectId, targetEl, descriptor) {
    const entry = this.entries.get(objectId);
    if (!entry) return;

    // Default to entry's main div
    const el = targetEl ?? entry.div;

    // Validate child element is within the managed subtree
    if (el !== entry.div && !entry.div.contains(el)) return;

    // Cancel any existing transition on this element
    this._cancelTransition(el);

    // Build the set of guarded property names
    const propertyNames = new Set(Object.keys(descriptor.properties));

    // Set up transitionend listener
    let remaining = propertyNames.size;
    const listener = (e) => {
        // Only count properties we're tracking
        if (!propertyNames.has(e.propertyName)) return;
        remaining--;
        if (remaining <= 0) {
            this._completeTransition(el);
        }
    };
    el.addEventListener('transitionend', listener);

    // Store active transition
    const active = {
        objectId,
        targetEl: el,
        properties: propertyNames,
        onComplete: descriptor.onComplete || null,
        listener
    };
    this.transitions.set(el, active);

    // Apply transition styles
    el.style.transitionDuration = descriptor.duration + 'ms';
    el.style.transitionProperty = [...propertyNames].join(', ');
    for (const [prop, value] of Object.entries(descriptor.properties)) {
        el.style[prop] = value;
    }
}
```

### `_cancelTransition` (internal)

```javascript
_cancelTransition(el) {
    const active = this.transitions.get(el);
    if (!active) return;

    el.removeEventListener('transitionend', active.listener);
    el.style.transitionDuration = '';
    el.style.transitionProperty = '';
    this.transitions.delete(el);
    // Note: onComplete is NOT called on cancellation
}
```

### `_completeTransition` (internal)

```javascript
_completeTransition(el) {
    const active = this.transitions.get(el);
    if (!active) return;

    el.removeEventListener('transitionend', active.listener);
    el.style.transitionDuration = '';
    el.style.transitionProperty = '';
    this.transitions.delete(el);

    if (active.onComplete) active.onComplete();
}
```

### Modified `unregister`

```javascript
unregister(objectId) {
    const entry = this.entries.get(objectId);
    if (!entry) return;

    // Cancel any transitions on the main div or child elements owned by this object
    this._cancelTransitionsForObject(objectId);

    entry.div.removeAttribute('data-object-id');
    this.childrenOf.get(entry.parentId)?.delete(objectId);
    this.entries.delete(objectId);
}
```

### `_cancelTransitionsForObject` (internal)

```javascript
_cancelTransitionsForObject(objectId) {
    for (const [el, active] of this.transitions) {
        if (active.objectId === objectId) {
            el.removeEventListener('transitionend', active.listener);
            el.style.transitionDuration = '';
            el.style.transitionProperty = '';
            this.transitions.delete(el);
        }
    }
}
```

### Modified `clear`

```javascript
clear() {
    // Cancel all active transitions
    for (const [el, active] of this.transitions) {
        el.removeEventListener('transitionend', active.listener);
        el.style.transitionDuration = '';
        el.style.transitionProperty = '';
    }
    this.transitions.clear();

    for (const [, entry] of this.entries) {
        entry.div.removeAttribute('data-object-id');
    }
    this.entries.clear();
    this.childrenOf.clear();
    this.dragTarget = null;
}
```

### FlippableObject Migration Example

```javascript
// Before (direct DOM manipulation):
flip(d) {
    if (this.state.facing == "FRONT") {
        this.wrapper.style.transitionDuration = d + "ms";
        this.wrapper.style.transform = "rotateY(180deg)";
        this.state.facing = "BACK";
    } else {
        this.wrapper.style.transitionDuration = d + "ms";
        this.wrapper.style.transform = "none";
        this.state.facing = "FRONT";
    }
}

// After (using Renderer transition API):
flip(d) {
    const targetTransform = this.state.facing === "FRONT"
        ? "rotateY(180deg)"
        : "none";
    this.state.facing = this.state.facing === "FRONT" ? "BACK" : "FRONT";

    renderer.startTransition(this.state.objectId, this.wrapper, {
        duration: d,
        properties: { transform: targetTransform },
        onComplete: null
    });
}
```

## Data Models

### TransitionDescriptor

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration` | number | yes | Duration in milliseconds |
| `properties` | object | yes | CSS property names (camelCase) → target value strings |
| `onComplete` | function \| null | no | Callback on natural completion |

### ActiveTransition (internal)

| Field | Type | Description |
|-------|------|-------------|
| `objectId` | number | Owning registered object's ID |
| `targetEl` | HTMLElement | DOM element being transitioned |
| `properties` | Set\<string\> | CSS property names being guarded |
| `onComplete` | function \| null | Completion callback |
| `listener` | function | Bound `transitionend` handler for cleanup |

### Modified Entry (removals)

| Removed Field | Reason |
|---------------|--------|
| `changedFields` | Replaced by unconditional writes + transition guards |
| `firstRender` | No longer needed — all properties written every dirty frame |

### Transitions Map

```
Map<HTMLElement, ActiveTransition>
```

Keyed by DOM element reference. One active transition per element at a time. Multiple elements per object are supported (main div + child elements).

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transition application applies styles correctly

*For any* registered object, valid target element, and TransitionDescriptor containing an arbitrary set of CSS property-value pairs and a positive duration, calling `startTransition` SHALL result in the target element's `style.transitionDuration` being set to the specified duration and each specified CSS property being set to its target value.

**Validates: Requirements 1.1, 1.4**

### Property 2: Unregistered objectId is a no-op

*For any* objectId that is not present in the Renderer's entries map, calling `startTransition` SHALL not throw an error, SHALL not add any entry to the transitions map, and SHALL not modify any DOM element.

**Validates: Requirements 1.3**

### Property 3: Non-descendant target element is a no-op

*For any* registered object and any DOM element that is neither the entry's main div nor a descendant of it, calling `startTransition` SHALL not throw an error and SHALL not add any entry to the transitions map.

**Validates: Requirements 5.3**

### Property 4: Target element resolution

*For any* registered object, if `targetEl` is null then the transition SHALL be applied to the entry's main div; if `targetEl` is a descendant of the entry's div then the transition SHALL be applied to that child element.

**Validates: Requirements 5.1, 5.2**

### Property 5: Guard invariant — active transitions protect properties from applyDOM

*For any* active transition guarding a set of CSS properties on a target element, calling `applyDOM` on the owning entry SHALL NOT overwrite those guarded properties on that target element, regardless of the entry's current state values.

**Validates: Requirements 2.1, 8.3**

### Property 6: Bounds update independently of active transitions

*For any* entry with an active transition on any property, when the entry is dirty and `applyDOM` is called, the entry's bounds (left, top, width, height) SHALL still be written to the entry's main div.

**Validates: Requirements 2.2**

### Property 7: Unrelated state changes do not affect active transitions

*For any* active transition guarding property set P, a `setState` call on a field whose corresponding CSS property is not in P SHALL result in that property being written by `applyDOM`, and the active transition SHALL remain in the transitions map with its original properties unchanged.

**Validates: Requirements 2.3**

### Property 8: Completion cleans up tracking, styles, and invokes callback

*For any* active transition with N properties, after `transitionend` fires for all N properties, the transition SHALL be removed from the transitions map, `transitionDuration` and `transitionProperty` SHALL be cleared from the target element's style, and if an `onComplete` callback was provided it SHALL be invoked exactly once.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 9: Interruption replaces the previous transition

*For any* target element with an active transition, starting a new transition on the same element SHALL result in the transitions map containing only the new transition for that element, with the new transition's properties and callback.

**Validates: Requirements 4.1**

### Property 10: Cancelled transitions never invoke their callback

*For any* transition that is cancelled (whether by interruption via a new `startTransition` on the same element, by `unregister` of the owning object, or by `clear()`), the cancelled transition's `onComplete` callback SHALL never be invoked, even if `transitionend` events subsequently fire.

**Validates: Requirements 4.2, 6.3**

### Property 11: Unregister and clear remove all transitions for the affected objects

*For any* object with one or more active transitions, calling `unregister(objectId)` SHALL remove all transitions owned by that object from the transitions map and remove their event listeners. Calling `clear()` SHALL remove all transitions from the transitions map and remove all event listeners.

**Validates: Requirements 6.1, 6.2**

### Property 12: Unconditional property writes for dirty entries

*For any* dirty entry with no active transition on its main div, `applyDOM` SHALL write all visual properties (zIndex, transform, transformOrigin, filter) to the element's style, regardless of which state fields were modified.

**Validates: Requirements 8.2**

### Property 13: Simplified setState — dirty flag only

*For any* registered object and any state field, calling `setState` with a value different from the current value SHALL set `entry.dirty = true` and update the state field, without tracking which field changed. Calling `setState` with the same value SHALL not modify the entry.

**Validates: Requirements 8.5**

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `startTransition` with unregistered objectId | Silent no-op (return early) |
| `startTransition` with targetEl not in entry's subtree | Silent no-op (return early) |
| `startTransition` with empty `properties` object | No transition started (no properties to guard) |
| `transitionend` fires for a property not in the tracked set | Ignored (listener filters by property name) |
| `transitionend` fires after transition was cancelled | Listener already removed — event won't reach handler |
| `unregister` called during active transition | Transition cancelled, callback not invoked, listener removed |
| `clear` called during active transitions | All transitions cancelled, callbacks not invoked, listeners removed |
| Multiple rapid `startTransition` calls on same element | Each cancels the previous; only the last one runs |

No errors are thrown to callers. The transition API is fire-and-forget from the game object's perspective — invalid requests are silently ignored, matching the existing `setState` pattern.

## Testing Strategy

### Property-Based Tests

The project uses vanilla JS with no bundler. Tests run in the browser via `tests/test.html`. Property-based tests will be implemented using a lightweight custom test harness (matching the existing pattern in `tests/renderer.setState.test.js`) with randomized inputs and 100+ iterations per property.

**Library**: Custom randomized test harness (no external PBT library — consistent with project's no-dependencies constraint).

**Configuration**: Minimum 100 iterations per property test.

**Tag format**: `Feature: renderer-transitions, Property {number}: {property_text}`

Each correctness property maps to a single property-based test file or test function. The tests will:
- Generate random TransitionDescriptors with varying property sets, durations, and callbacks
- Generate random registered/unregistered objectIds
- Generate random DOM subtrees with child elements
- Simulate `transitionend` events programmatically
- Verify internal state (transitions map) and DOM state (element.style) after operations

### Unit Tests (Example-Based)

| Test | Validates |
|------|-----------|
| Descriptor with missing duration is handled gracefully | Req 1.2 |
| FlippableObject.flip() uses startTransition correctly | Req 7.1 (migration) |
| Entry has no `changedFields` or `firstRender` after register | Req 8.1, 8.4 |
| Interruption doesn't reset element style before applying new values | Req 4.3 |

### Integration Tests

| Test | Validates |
|------|-----------|
| FlippableObject flip animation runs visually in browser | End-to-end |
| Rapid double-click on card produces correct final facing | Req 4.1 |
| Card draw + flip while hand repositions (concurrent dirty + transition) | Req 2.2 |

### Test File Structure

```
tests/
  renderer.transitions.test.js       — property-based tests for the transition API
  renderer.applyDOM.test.js          — property-based tests for unconditional writes + guards
  renderer.setState.test.js          — updated to remove changedFields assertions
```

