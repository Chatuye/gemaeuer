# Undo/Redo — Design Document

## Prerequisite: Event Taxonomy

The undo system relies on the eventBus for timing. This requires a clear separation
between two kinds of events currently mixed on the bus.

### Current problem

The existing events conflate two concerns:

- **Action events** — represent a completed user action with a state outcome
- **Coordination events** — internal wiring so objects can react to each other
  without direct references

Examples of the mix:

| Event | Type | Purpose |
|-------|------|---------|
| `card:drawn` | Action | A card was created and placed |
| `card:deleted` | Action | A card was destroyed |
| `card:grabbed` | Coordination | Tells Hand to remove card from its array |
| `card:dropped` | Coordination | Tells GameStage to decide hand vs. world |
| `card:droppedInHand` | Coordination | Tells Hand to add card back |
| `card:droppedOnStage` | Coordination | Currently no listener |
| `cursor:enteredHandZone` | Coordination | Tells Hand to raise |
| `cursor:leftHandZone` | Coordination | Tells Hand to lower |
| `layout:changed` | Coordination | Tells Hand to reposition |
| `selection:changed` | Coordination | Tells GameStage to update panel |

The undo system needs to subscribe to action events only. Coordination events are
internal plumbing — they fire *during* an action chain, not at the end.

### Solution: `action:` prefixed events

Introduce a naming convention. Action events use the `action:` prefix and fire at
the **true end** of an action chain — after all coordination events have settled
and all state mutations are complete.

| Action event | Fires after | Meaning |
|--------------|-------------|---------|
| `action:cardDrawn` | Card created + Hand added + positioned | A card was drawn from the deck |
| `action:cardPlaced` | Drop + reparent + WORLD layout set | A card was placed on the world stage |
| `action:cardReturnedToHand` | Drop + Hand added + positioned | A card was returned to the hand |
| `action:objectCreated` | Object created + placed (spawner drop or double-click) | A new object was placed on the stage |
| `action:objectMoved` | Drop + reparent + positioned | An existing object was moved |
| `action:objectDeleted` | Destroy + parent cleanup + Hand update | An object was destroyed |
| `action:objectFlipped` | Facing state toggled + transition started | A flippable object was flipped |
| `action:zoomAction` | Viewport updated | An explicit zoom preset was applied |

Coordination events keep their current names unchanged — they remain on the same
eventBus and continue to work as before.

### Where action events are emitted

Action events fire at the outermost call site — the place that initiated the action
chain, *after* all synchronous side effects have settled:

```js
// Deck.onMouseUp() — end of the method, after emit('card:drawn') and all
// coordination listeners have run:
eventBus.emit('action:cardDrawn', { card });

// GameStage drop handler — after deciding hand vs. world and all coordination
// events have fired:
eventBus.emit('action:cardReturnedToHand', { card });
// or
eventBus.emit('action:cardPlaced', { card });
```

Since coordination events dispatch synchronously, by the time the originating
function emits the `action:` event, all state is settled.

**`action:objectMoved` vs `action:objectCreated` — drop event logic:**

`ZoomableElement.drop()` checks `_isNewlySpawned` to decide which event to emit.
Objects created by the spawner have `_isNewlySpawned = true` set at creation time;
on drop they emit `action:objectCreated` and clear the flag. Existing objects emit
`action:objectMoved`. This distinction ensures undo correctly destroys newly spawned
objects vs. reverting position for existing ones.

For Cards, the GameStage drop handler additionally emits a more specific action
event (`action:cardPlaced` or `action:cardReturnedToHand`) after `action:objectMoved`
has already fired. This is fine — the `captureScheduled` deduplication flag coalesces
multiple action events within the same synchronous call stack into a single undo step.

```js
// ZoomableElement.drop() — base class:
drop() {
    this._placeOnStage();
    if (this._isNewlySpawned) {
        this._isNewlySpawned = false;
        eventBus.emit('action:objectCreated', { object: this });
    } else {
        eventBus.emit('action:objectMoved', { object: this });
    }
}

// Card.drop() — override, emits coordination event that triggers GameStage:
drop() {
    super.drop();  // ← fires action:objectMoved (cards are never _isNewlySpawned)
    eventBus.emit('card:dropped', { card: this });
    // → GameStage handler fires action:cardPlaced or action:cardReturnedToHand
    // → captureScheduled deduplicates into one undo step
}
```

Tiles spawned via the spawner get `action:objectCreated` from the base class.
Tiles dragged after placement get `action:objectMoved`.
Cards always get `action:objectMoved` plus a specific action event — deduplicated
automatically.

**Note on emission timing:** `action:objectMoved` fires from `super.drop()` before
`card:dropped` triggers the GameStage handler (which emits `action:cardPlaced` or
`action:cardReturnedToHand`). At the moment `action:objectMoved` fires, the Hand's
`state.cards` hasn't been updated yet. This is safe because `capture()` runs in a
microtask — by the time it executes, the entire synchronous chain has completed and
all state is settled. Correctness depends on the microtask deferral, not emission order.

**Double-click creation:** `GameStage.onDoubleClick()` creates a tile and emits
`action:objectCreated` directly — no drag involved. Same event, same undo behavior
as the spawner path.

### Migration path

1. Add `action:` events at the end of existing action chains (no changes to
   coordination events or their listeners).
2. The UndoManager subscribes only to `action:` events.
3. Existing coordination events remain untouched — no refactoring needed.

---

## Approach: Event-Triggered Delta Snapshots

A hybrid design combining the eventBus (for timing) with state deltas (for undo data).

- **Action events** tell us *when* a user action completed.
- **Delta snapshots** tell us *what changed* — no hand-written inverses needed.

---

## Why this approach

### Alternatives considered

| Approach | Memory | Restore cost | Implementation complexity |
|----------|--------|-------------|--------------------------|
| Full snapshot | High at scale | Full rebuild (expensive) | Low — `restoreData()` already exists |
| Delta snapshot | Low | Surgical (fast) | Medium — need diffing + `applyState()` per type |
| Event/command log | Minimal | Surgical (fast) | High — hand-written inverse per action + all side effects |

### Decision rationale

- **Full snapshots** don't scale. With hundreds of objects, each snapshot is large
  and restore requires destroying/recreating the entire DOM tree.
- **Event sourcing** is tempting given the existing eventBus, but events only
  describe *what happened* — undoing them requires understanding every downstream
  side effect (Hand repositioning, z-index changes, layout swaps). Every new feature
  would need its own undo handler.
- **Delta snapshots** give automatic coverage: if a mutation touches state, the diff
  catches it. New action types don't require new undo logic. The inverse is
  mechanical (swap `before`/`after`), not hand-written.

The eventBus solves the *timing* problem (when to capture) without being the undo
mechanism itself.

---

## Undoable vs non-undoable actions

Not all persistent state mutations are undoable. Pan/zoom changes viewport position
and zoom factor (persisted in save files), but Ctrl+Z should not reverse a pan.

### Classification rule

An action is **undoable** if:
1. It mutates persistent state, AND
2. It represents a discrete user decision that they'd expect Ctrl+Z to reverse

| Action | Persistent? | Undoable? | Reason |
|--------|-------------|-----------|--------|
| Draw card | Yes | Yes | Discrete game action |
| Create object | Yes | Yes | Discrete creation (spawner drop or double-click) |
| Drop card/tile | Yes | Yes | Intentional placement |
| Delete object | Yes | Yes | Destructive, user expects to undo |
| Zoom to fit (explicit) | Yes | Yes | Intentional preset action |
| Flip object | Yes | Yes | Discrete user decision, changes facing |
| Pan viewport | Yes | No | Navigation, not a "decision" |
| Scroll-wheel zoom | Yes | No | Navigation |
| Select object | Yes | No | Persisted, but restored as side effect of other deltas |
| Raise/lower hand | No | No | Transient UI state |

**Note on selection after undo:** Selection is persisted and restored by undo/redo.
Example: user selects a card, moves it, then undoes — the card returns to its
original position and remains selected. If the selected object was deleted and then
undone, it reappears and selection is restored via `StageSelectionManager.applyState()`.

### The stale-baseline problem

If the user pans, then draws a card, the diff between `lastSnapshot` and current
state includes both the pan *and* the card draw. Undoing the card draw would
accidentally revert the pan.

### Solution: baseline advancement for non-undoable mutations

Non-undoable actions that mutate persistent state must advance the baseline without
creating an undo entry. This keeps the diff clean — the next undoable capture only
sees changes since the last baseline update.

```js
// UndoManager
updateBaseline() {
    this.lastSnapshot = this._cloneStates();
}
```

### Drag operations: grab/drop baseline pattern

Dragging is a continuous state mutation (position updates every frame) that should
result in a single undo step. The pattern:

1. **On grab** — advance the baseline to freeze the "before" state.
2. **During drag** — position changes are ignored (no capture, no baseline update).
3. **On drop** — the action event fires, triggering a capture. The delta contains
   only the net change from grab-start to final position.

This applies to all draggable objects (cards, tiles, or any future draggable type).
The grab/drop boundary is handled at the `ZoomableElement` level:

```js
// ZoomableElement.grabbed() or equivalent base class hook
undoManager.updateBaseline();

// After drop + all side effects settle → action event fires → capture()
```

Because `updateBaseline()` is called at grab-start, intermediate position updates
during drag never pollute the delta. The capture on drop sees only the difference
between the grab-start state and the final settled state.

This also covers the case where non-undoable mutations (like a pan) happened
*before* the grab — the baseline advancement at grab-start absorbs them.

**Spawner and `_isNewlySpawned`:** The tile spawner creates a tile and immediately
starts a drag in the same synchronous block. The tile is marked with
`_isNewlySpawned = true`. On drop, `ZoomableElement.drop()` checks this flag and
emits `action:objectCreated` instead of `action:objectMoved`. The capture sees the
full delta from "no tile" to "tile at final position." Undo destroys the tile entirely.

The baseline must NOT advance at this grab — otherwise the baseline would include
the newly created tile, and the delta on drop would only show a position change
(not a creation). Undoing would revert position but leave the tile alive.

Rule: the spawner does not emit `object:grabbed`. It calls `renderer.startDrag()`
and `tile.grabbed()` directly, bypassing the baseline event. The baseline stays at
pre-spawn state.

Implementation: emit `object:grabbed` from the Renderer's input handler (the code
path that initiates a user-driven grab via mousedown hit-testing), NOT from inside
`ZoomableElement.grabbed()` itself. The spawner calls `tile.grabbed()` directly,
bypassing the Renderer's input handler — so it naturally bypasses the event emission.
No flags, no special-casing needed.

### Wiring for other non-undoable mutations

For non-undoable mutations that happen *outside* of drag (e.g., scroll-wheel
pan/zoom when nothing is grabbed), the same `BASELINE_EVENTS` list handles them.
See the Event Wiring section under Architecture for the full subscription setup.

### Summary

The UndoManager has two explicit relationships with the eventBus — two subscription
lists with distinct purposes:

**1. Action events → capture delta (create undo entry)**

```js
const UNDOABLE_EVENTS = [
    'action:cardDrawn',
    'action:cardPlaced',
    'action:cardReturnedToHand',
    'action:objectMoved',
    'action:objectDeleted',
    'action:zoomAction',
];
```

**2. Baseline events → advance baseline (no undo entry)**

```js
const BASELINE_EVENTS = [
    'object:grabbed',     // freeze "before" state at drag start
    'viewport:changed',   // scroll-wheel pan/zoom
];
```

Neither list involves the UndoManager doing game logic — it's purely bookkeeping
triggered by signals that already exist on the bus.

The flow for a drag operation:
- `object:grabbed` → baseline advances (freezes pre-drag state)
- During drag → position changes, no events in either list fire
- Drop settles → `action:objectMoved` (or `action:cardPlaced`, etc.) → capture records net delta from grab to final position
- For spawned objects: no `object:grabbed` (baseline stays at pre-spawn) → drop emits `action:objectCreated` → capture records full creation + placement

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│  User Action (draw card, drop tile, delete, …)  │
└──────────────────────┬──────────────────────────┘
                       │ coordination events fire (synchronous)
                       │ all side effects settle
                       │ action event emitted at end
                       ▼
              ┌─────────────────┐
              │    EventBus     │
              │  action:*       │
              └────────┬────────┘
                       │ UndoManager listens (via queueMicrotask)
                       ▼
              ┌─────────────────┐
              │  UndoManager    │
              │                 │
              │  1. Diff current states vs lastSnapshot
              │  2. Store delta (before/after per changed object)
              │  3. Push to undoStack, clear redoStack
              └─────────────────┘
```

### UndoManager (core/UndoManager.js)

```js
import { dataManager } from './DataManager.js';
import { eventBus } from './EventBus.js';

class UndoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.lastSnapshot = null;
    }

    /** Take initial baseline after game setup */
    init() {
        this.lastSnapshot = this._cloneStates();
        this.undoStack = [];
        this.redoStack = [];
    }

    /** Called via queueMicrotask when an action event fires */
    capture() {
        // dataManager.states is read as a live reference — safe because this runs
        // in a microtask after all synchronous mutations have settled. Values stored
        // in the delta are deep-cloned via structuredClone() below.
        const current = dataManager.states;
        const delta = { modified: {}, created: {}, destroyed: {} };

        // Detect modified and created objects
        for (const id in current) {
            if (!(id in this.lastSnapshot)) {
                delta.created[id] = structuredClone(current[id]);
            } else if (JSON.stringify(current[id]) !== JSON.stringify(this.lastSnapshot[id])) {
                delta.modified[id] = {
                    before: structuredClone(this.lastSnapshot[id]),
                    after: structuredClone(current[id])
                };
            }
        }

        // Detect destroyed objects
        for (const id in this.lastSnapshot) {
            if (!(id in current)) {
                delta.destroyed[id] = structuredClone(this.lastSnapshot[id]);
            }
        }

        // Only push if something actually changed
        if (Object.keys(delta.modified).length === 0 &&
            Object.keys(delta.created).length === 0 &&
            Object.keys(delta.destroyed).length === 0) return;

        this.undoStack.push(delta);
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
        this.lastSnapshot = this._cloneStates();
    }

    /** Advance baseline without creating an undo entry */
    updateBaseline() {
        this.lastSnapshot = this._cloneStates();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        if (renderer.isDragging()) return; // no undo mid-drag (add isDragging() to Renderer)
        const delta = this.undoStack.pop();
        this.redoStack.push(delta);
        eventBus.mute();
        this._applyReverse(delta);
        eventBus.unmute();
        this.lastSnapshot = this._cloneStates();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        if (renderer.isDragging()) return; // no redo mid-drag (add isDragging() to Renderer)
        const delta = this.redoStack.pop();
        this.undoStack.push(delta);
        eventBus.mute();
        this._applyForward(delta);
        eventBus.unmute();
        this.lastSnapshot = this._cloneStates();
    }

    _applyReverse(delta) {
        // Undo created objects → destroy them (children before parents)
        this._destroyObjects(delta.created);
        // Undo destroyed objects → recreate them (parents before children)
        this._recreateObjects(delta.destroyed);
        // Undo modified objects → apply "before" state
        for (const id in delta.modified) {
            this._patchObject(Number(id), delta.modified[id].before);
        }
    }

    _applyForward(delta) {
        // Redo destroyed objects → destroy them again (children before parents)
        this._destroyObjects(delta.destroyed);
        // Redo created objects → recreate them (parents before children)
        this._recreateObjects(delta.created);
        // Redo modified objects → apply "after" state
        for (const id in delta.modified) {
            this._patchObject(Number(id), delta.modified[id].after);
        }
    }

    _destroyObject(id) {
        const obj = dataManager.getObject(id);
        if (obj) {
            // Unregister from parent's live arrays (children[], zManager) before
            // destroying. Mirrors the normal delete flow (GameStage calls
            // parent.unregisterChild before destroy). Safe with muted eventBus —
            // unregisterChild is direct cleanup, not event-driven.
            const parent = dataManager.getObject(obj.state.parent?.referenceId);
            if (parent?.unregisterChild) parent.unregisterChild(obj);
            obj.destroy();
        }
        delete dataManager.states[id];
        dataManager.objects.delete(id);
    }

    /** Destroy multiple objects in child-before-parent order (reverse topological). */
    _destroyObjects(objectMap) {
        const ids = Object.keys(objectMap).map(Number);
        const idSet = new Set(ids);
        const order = [];
        const visited = new Set();

        const visit = (id) => {
            if (visited.has(id)) return;
            visited.add(id);
            // Visit children first (any object in the set whose parent is this id)
            for (const otherId of ids) {
                if (objectMap[otherId].parent?.referenceId === id && idSet.has(otherId)) {
                    visit(otherId);
                }
            }
            order.push(id);
        };

        for (const id of ids) visit(id);

        for (const id of order) {
            this._destroyObject(id);
        }
    }

    _recreateObject(id, state) {
        // No need to pre-set dataManager.states[id] — registerObject() does it.
        // The constructor handles self-registration (dataManager, Renderer, DOM).
        // Parent-child linkage (parent.children[], state.children[], zManager) is
        // restored by _patchObject() on the parent via applyState() — not here.
        const obj = dataManager.createObject(state);
    }

    _patchObject(id, newState) {
        const obj = dataManager.getObject(id);
        if (!obj) return;
        // Remove keys not in newState (handles layout preset key additions).
        // Skip identity keys — objectId and objectType must never be deleted.
        for (const key of Object.keys(obj.state)) {
            if (key === 'objectId' || key === 'objectType') continue;
            if (!(key in newState)) delete obj.state[key];
        }
        // Apply new values — same object reference, no stale pointers
        Object.assign(obj.state, newState);
        dataManager.states[id] = obj.state;
        // If the object has a custom reconciliation hook, call it.
        // Otherwise fall back to generic Renderer update.
        if (obj.applyState) {
            obj.applyState();
        } else {
            // renderer.updateLayoutPreset(id);
        }
    }

    _cloneStates() {
        // Use structuredClone for consistency with delta entries.
        // Avoids edge cases where JSON round-trip strips undefined values.
        return structuredClone(dataManager.states);
    }
}

export const undoManager = new UndoManager();
```

### Event wiring

The UndoManager subscribes to two explicit event lists:

**Action events** — trigger a delta capture (create undo entry):

```js
const UNDOABLE_EVENTS = [
    'action:cardDrawn',
    'action:cardPlaced',
    'action:cardReturnedToHand',
    'action:objectCreated',
    'action:objectMoved',
    'action:objectDeleted',
    'action:objectFlipped',
    'action:tileSpawned',
    'action:zoomAction',
];

let captureScheduled = false;

function scheduleCapture() {
    if (captureScheduled) return;
    captureScheduled = true;
    queueMicrotask(() => {
        undoManager.capture();
        captureScheduled = false;
    });
}

UNDOABLE_EVENTS.forEach(evt => eventBus.on(evt, scheduleCapture));
```

**Baseline events** — advance the baseline without creating an undo entry:

```js
const BASELINE_EVENTS = [
    'object:grabbed',     // freeze pre-drag state
    'viewport:changed',   // scroll-wheel pan/zoom
    'selection:changed',  // selection is persisted but not independently undoable
];

BASELINE_EVENTS.forEach(evt => eventBus.on(evt, () => {
    queueMicrotask(() => {
        if (!captureScheduled) undoManager.updateBaseline();
    });
}));
```

Note: baseline advancement is skipped if a capture is already scheduled for the
same tick — the capture itself advances the baseline, so doing both would be
redundant and could mask the delta.

### Keyboard binding

Requires adding `isDragging()` to the Renderer (doesn't exist yet):

```js
// Renderer
isDragging() { return this.dragTarget != null; }
```

```js
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') { undoManager.undo(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'y') { undoManager.redo(); e.preventDefault(); }
});
```

---

## Implementation details

### Object reconciliation (`_patchObject`)

The trickiest part. When patching a live object's state, the object and Renderer
need to reflect the change.

**Full replacement, not merge.** `_patchObject` must remove stale keys and apply
new values on the *same object* (not replace the reference). Layout preset swaps
add keys like `scaleWithWindowSize` — a plain `Object.assign` of the `before`
snapshot wouldn't remove them. Deleting extra keys first, then assigning, ensures
the state shape matches the snapshot exactly while preserving the object reference.

This avoids the stale-reference problem: any code holding a pointer to `obj.state`
(e.g., Renderer render nodes) continues to work without needing updates.

Considerations per object type:

1. **Simple positional objects (Card, Tile):** Replace state +
   `renderer.updateLayoutPreset(id)` + mark dirty. The next frame picks up new
   x/y/width/height.
2. **Container objects (Stage, Hand):** May need to reconcile children arrays. If
   `state.children` changed, register/unregister children accordingly.
3. **Objects with derived runtime state (Hand):** After patching `state.cards`, the
   Hand needs to rebuild its `this.cards` array and call `positionCards()`.

Each object type that needs reconciliation implements an `applyState()` method.
`_patchObject` does the generic state patching (key deletion + assign) first, then
calls `obj.applyState()` if it exists. Types without `applyState()` fall back to a
generic Renderer update (`renderer.updateLayoutPreset(id)`).

```js
// On Hand:
applyState() {
    this.cards = this.state.cards.map(id => dataManager.getObject(id));
    this.positionCards();
}
```

### Event suppression during undo/redo

Coordination event listeners (e.g., Hand reacting to `card:deleted`) were designed
to maintain consistency during normal gameplay. During undo/redo, the UndoManager is
restoring a known-good state — those listeners firing causes double-mutations or
inconsistent intermediate states.

**Solution: mute the eventBus during apply.**

Add `mute()`/`unmute()` to EventBus:

```js
// EventBus
mute()   { this.muted = true; }
unmute() { this.muted = false; }
emit(eventName, data) {
    if (this.muted) return;
    // ... existing logic ...
}
```

The UndoManager mutes before applying a delta, unmutes after:

```js
undo() {
    if (this.undoStack.length === 0) return;
    if (renderer.isDragging()) return; // no undo mid-drag
    const delta = this.undoStack.pop();
    this.redoStack.push(delta);
    eventBus.mute();
    this._applyReverse(delta);
    eventBus.unmute();
    this.lastSnapshot = this._cloneStates();
}

redo() {
    if (this.redoStack.length === 0) return;
    if (renderer.isDragging()) return; // no redo mid-drag
    const delta = this.redoStack.pop();
    this.undoStack.push(delta);
    eventBus.mute();
    this._applyForward(delta);
    eventBus.unmute();
    this.lastSnapshot = this._cloneStates();
}
```

This also prevents `action:` events from firing during undo — which is correct,
since undo/redo should not be captured as undoable actions.

**Prerequisite:** No object's `destroy()` may rely on event listeners for its own
cleanup. In this architecture, `destroy()` handles cleanup directly (removes DOM,
unregisters from Renderer, unsubscribes listeners). Events are notifications to
*other* objects, not self-cleanup mechanisms. This invariant must be maintained.

### Ordering: destroy before create

When applying a delta, order matters:
- **Undo:** Destroy created objects first (they may reference parents that are about
  to be modified), then recreate destroyed objects, then patch modified ones.
- **Redo:** Destroy first, recreate, then patch.

**Recreation ordering:** Objects must be recreated parent-before-child because
constructors call `dataManager.getObject(state.parent.referenceId)` and append to
the parent's DOM. If the parent doesn't exist yet, the constructor crashes.

**Destruction ordering:** Objects must be destroyed child-before-parent because
`destroy()` accesses the parent's DOM (to remove the child element) and
`unregisterChild` modifies the parent's arrays. If the parent is already destroyed,
the child's cleanup crashes.

In practice, the parent is rarely in the `destroyed` set alongside its children:
- Single object delete → only the child is destroyed, parent is `modified`.
- Compound delete (GameStage) → handled by atomic subtree/factory strategy.
- Multi-select delete of siblings → same parent (not destroyed), any order works.

For the general case, sort by parent dependency before recreating:

```js
_recreateObjects(destroyedMap) {
    const ids = Object.keys(destroyedMap).map(Number);
    // Build a proper topological order: parents before children at any depth.
    // Walk each object's parent chain — if an ancestor is in the set, it must
    // come first.
    const idSet = new Set(ids);
    const order = [];
    const visited = new Set();

    const visit = (id) => {
        if (visited.has(id)) return;
        visited.add(id);
        const parentId = destroyedMap[id].parent?.referenceId;
        if (parentId != null && idSet.has(parentId)) {
            visit(parentId); // ensure parent is placed first
        }
        order.push(id);
    };

    for (const id of ids) visit(id);

    for (const id of order) {
        this._recreateObject(id, destroyedMap[id]);
    }
}
```

**Note on Hand ↔ Card ordering:** Cards' `state.parent.referenceId` points to
GameStage, not Hand — so a parent-reference sort naturally recreates cards before
patching Hand. This is correct: `_recreateObject` creates the card (which registers
itself in `dataManager.objects`), then `_patchObject` on Hand calls `applyState()`
which resolves card IDs via `dataManager.getObject(id)` — the cards exist by then.

---

## Implementation plan

Each step is independently testable and doesn't break existing behavior.

### Step 1: Add `action:` events ✅

Add `eventBus.emit('action:...')` calls at the end of existing action chains.
No new modules, no behavioral changes.

Where to emit:
- `Deck.onMouseUp()` → `action:cardDrawn` (after `card:drawn` and all listeners settle)
- `GameStage` drop handler → `action:cardPlaced` or `action:cardReturnedToHand`
- `GameStage` delete handler → `action:objectDeleted`
- `GameStage.onDoubleClick()` → `action:objectCreated` (after tile is created and registered)
- `ZoomableElement.drop()` → `action:objectCreated` (if `_isNewlySpawned`) or `action:objectMoved` (existing objects)
- `FlippableObject.flip()` → `action:objectFlipped` (only when `d > 0`, skips constructor's initial flip)

**Test:** Open console, run `eventBus.on('action:cardDrawn', (e) => console.log('action', e))`.
Draw a card. Verify the event fires once, after the card is in the hand.

### Step 2: UndoManager with full snapshots ✅

Create `core/UndoManager.js` with `scheduleCapture()`, `undo()`, `redo()`, `init()`.
Internally use `gatherData()`/`restoreData()` — simple and correct, optimization
comes later.

Wire to `action:` events via `queueMicrotask`. Add Ctrl+Z / Ctrl+Y keyboard
shortcuts. Call `undoManager.init()` after `createGameStage()` in `main.js`.
Also call `init()` after `restoreData()` in the load handler and after "New".

Baseline events (`selection:changed`) advance the top of the undo stack without
creating a new entry, preventing non-undoable persistent mutations from being
accidentally reverted by the next undo.

**Test:** Draw a card → Ctrl+Z → card disappears → Ctrl+Y → card reappears.

**Known limitation:** `restoreData()` destroys the entire DOM tree and recreates
everything from scratch. Even undoing a single card draw rebuilds the full game.
This may cause a visible flash/flicker. Acceptable as a working baseline — Steps
6–7 replace this with surgical patching that only touches affected objects.

### Step 3: Add baseline events ✅

Emit `object:grabbed` from `ZoomableElement.grabbed()` (skipped for newly spawned
objects via `_isNewlySpawned` guard). Emit `viewport:changed` from `Stage.pan()`
and `Stage.zoom()`. Both are wired to baseline advancement in the UndoManager.

**Test:** Pan the viewport, draw a card, Ctrl+Z. Only the card draw is undone —
viewport stays where it is.

### Step 4: UI buttons ✅

Add Undo/Redo buttons in `MenuController.js` alongside New, Save, Load.
Wire to `undoManager.undo()` / `undoManager.redo()`.

**Test:** Click Undo button — same behavior as Ctrl+Z.

### Step 5: Save/Load integration ✅

Call `undoManager.init()` after `dataManager.restoreData()` in the load handler.
Save does not touch the undo stacks.

**Test:** Draw cards, save, draw more, load. Undo stack is empty after load —
Ctrl+Z does nothing.

### Step 6: Replace internals with delta snapshots ✅

Swap `capture()` internals from full-state cloning to diffing against `lastSnapshot`.
Each undo entry now stores only the delta (created/destroyed/modified objects with
before/after values). Undo/redo reconstructs the target state by applying the delta
in reverse/forward to the current `dataManager.states`, then calls `restoreData()`
to rebuild the DOM. External API unchanged.

**Test:** Same manual tests as step 2. If anything breaks, revert to full snapshots
for that case (fallback strategy).

### Step 7: Surgical object reconciliation ✅

Replace `restoreData()` in undo/redo with direct object manipulation. Broken into
sub-steps, each independently testable:

#### Step 7a: Infrastructure

Core plumbing — no visual correctness yet, just the mechanical framework.

- Add `mute()`/`unmute()` to EventBus (guard `emit()` with a `this.muted` flag)
- Guard `_destroyObject` against types without a `destroy()` method (ViewPort,
  StageSelectionManager have none — call `obj.destroy?.()` or add no-op stubs)
- Replace `restoreData()` calls in undo/redo with `_applyReverse`/`_applyForward`
- Implement `_patchObject` (generic: key deletion + assign + `applyState()` hook,
  with fallback to `renderer.updateLayoutPreset()` + mark dirty for registered objects)
- Implement `_destroyObject` / `_destroyObjects` (child-before-parent ordering)
- Implement `_recreateObject` / `_recreateObjects` (parent-before-child ordering)
- No `applyState()` on any type yet — objects get patched but may be visually stale

**Test:** Verify via console that undo/redo doesn't throw. State values revert
correctly (inspect `dataManager.states[id]`), but visual may be stale. Specifically:
flip a card, Ctrl+Z, check `dataManager.getObject(cardId).state.facing` reverted.

#### Step 7b: Positional types + FlippableObject

Make simple state patches produce correct visuals.

- Add generic renderer update in `_patchObject` fallback: if the object has a
  render node (`renderer.renderNodes.has(id)`), call `renderer.updateLayoutPreset(id)`.
  This handles x/y/width/height and layout preset changes for all ZoomableElements.
- Add `applyState()` to FlippableObject: re-apply the correct wrapper transform
  based on `state.facing` (set `this.wrapper.style.transform` directly — no
  transition during undo). Without this, undoing a flip reverts the state field
  but the CSS `rotateY(180deg)` on the wrapper stays stale.
- Add `applyState()` to ViewPort: call `this.calculateScale()` to recompute
  derived `scaleX`/`scaleY` from the patched width/height/type fields. Then
  trigger `renderer.notifyViewportChanged(this.state.objectId)` and
  `this.parent.notifyChildStages()` so children re-layout.

**Test:** Move a tile → Ctrl+Z → tile returns to original position (no DOM rebuild).
Flip a card → Ctrl+Z → card visually flips back (wrapper transform updated).

#### Step 7c: Container types

Reconcile parent-child relationships after patching.

- Add `applyState()` to Stage: rebuild `this.children` array from `state.children`
  by resolving each ID via `dataManager.getObject(id)`, filtering out nulls (a child
  may have been destroyed in the same delta — `_destroyObjects` runs first).
- Add `applyState()` to GameStage: call `super.applyState()`, then rebuild
  `this.hand = dataManager.getObject(this.state.hand)` and
  `this.settingsPanel = dataManager.getObject(this.state.settingsPanel)`.
  If the settings panel exists, call `this._renderPanel([])` to reset its content.
- Add `applyState()` to StageSelectionManager: clear `this.selected` map, rebuild
  from `state.selection` (skip IDs where `dataManager.getObject(id)` returns null —
  the selected object may have been destroyed). Reapply/remove `.selected` CSS class
  on each object's div. Emit `selection:changed` after unmute so the panel updates.

**Note on emission after unmute:** StageSelectionManager's `applyState()` should
NOT emit `selection:changed` itself (eventBus is muted during apply). Instead,
after `eventBus.unmute()` in `undo()`/`redo()`, emit a synthetic
`selection:changed` for any patched selection manager so GameStage re-renders
the panel. Alternatively, call `gameStage._renderPanel(selMgr.getSelection())`
directly from `applyState()` — simpler, no event needed.

**Test:** Draw a card → Ctrl+Z → card destroyed, stage's `this.children` array
no longer contains it, no stale references.

#### Step 7d: Hand

Hand is the most complex reconciliation because it manages card positioning.

- Add `applyState()` to Hand:
  1. Rebuild `this.cards` from `state.cards` (resolve IDs, filter nulls)
  2. Recalculate `this.stage` reference (`dataManager.getObject(this.state.stage.referenceId)`)
  3. Recalculate coordinates and card dimensions (`calculateCoordinates()`,
     `getCardScreenDimensions()`, `calculateInteractionY()`)
  4. Call `positionCards()` to reposition all cards in the fan

**Ordering note:** `_recreateObjects` runs before `_patchObject` on the parent.
Cards are recreated first (they register in `dataManager.objects`), then Hand is
patched — `applyState()` resolves card IDs and finds them alive. This ordering is
guaranteed by the `_applyReverse`/`_applyForward` sequence: destroy → recreate → patch.

**Single-frame visual note:** `positionCards()` calls `card.getScreenDimensions()`
which reads from the Renderer's cached bounds. A just-recreated card has `dirty: true`
bounds (not yet ticked). The first render frame corrects this — a brief single-frame
layout jump is possible but acceptable.

**Test:** Draw card → Ctrl+Z → card gone from hand, remaining cards reposition
correctly. Draw 3 cards → Ctrl+Z → only last card removed, fan re-centers.

#### Step 7e: Fallback safety net

- Wrap `_applyReverse`/`_applyForward` in try/catch
- On failure: log a warning with the error and delta summary
- Fall back to the Step 6 approach: reconstruct target states from the delta
  (using `_applyReverseToStates`/`_applyForwardToStates` which still exist),
  then call `dataManager.restoreData()` for a full rebuild
- This ensures no undo operation ever crashes the app — worst case is a flicker

**Test:** All previous tests still pass. Intentionally break one `applyState()`
(e.g., throw in Hand.applyState), verify fallback fires and state is still correct.

Steps 1–5 deliver a fully working undo/redo feature. Steps 6–7 are performance
optimizations — add them when object count makes full snapshots noticeably slow.

## Fallback strategy

If `_patchObject` hits an edge case during development where surgical restore
produces incorrect results (e.g., a complex container object doesn't reconcile
properly), temporarily fall back to `dataManager.restoreData()` with a full
snapshot for that specific undo step. This is a debugging escape hatch, not a
planned phase — the goal is to make surgical restore work for all object types.

## Future optimizations

- Skip diffing unchanged objects (track dirty IDs via Renderer or eventBus)
- Compress old deltas (merge adjacent small deltas)
- Lazy cloning (copy-on-write for lastSnapshot)

---

## UI

Undo and Redo buttons in the menu bar (alongside New, Save, Load). No disabled/greyed-out
state for now — buttons are always visible and clickable. If the stack is empty, clicking
does nothing.

Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo).

---

## Save/Load interaction

- **Save** does not touch the undo/redo stacks. You can still undo after saving.
- **Load** clears both stacks and re-initializes the baseline. The loaded state
  becomes the new starting point with no history.
- The undo stack is **not** persisted in save files — it's session-only state that
  resets on load or page refresh.

Rationale: deltas reference object IDs and state shapes that may not survive across
sessions or versions. Undo is a short-term "oops" tool, not a persistent history.

```js
// After restoreData() in the load handler:
undoManager.init();
```

---

## Open questions

(None currently.)
