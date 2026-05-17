# Architectural Issues

Identified issues ordered by severity. Issues #2 and #4 are the most likely to cause real bugs in practice.

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Layer violation (zui → game) | Medium | Low |
| 2 | No destruction lifecycle / listener leaks | High | Medium |
| 3 | Hidden lazy-creation in getObject() | Medium | Low |
| 4 | Fragile ID counter after load | High | Low |
| 5 | StateObject too thin / unclear serialization boundary | Medium | Medium |
| 6 | Children array never pruned | Medium | Low |
| 7 | Singleton DOM access at import time | Low | Low |
| 8 | Array used as dictionary in SVGLoader | Low | Trivial |
| 9 | No error isolation in EventBus | Low | Low |

---

## 1. Layer Violation: `zui/rootObject.js` imports from `game/`

`rootObject.js` (in the `zui/` layer) imports `GameStageState`, `HandState`, and `DeckState` from the `game/` layer. According to the documented architecture (`core → rendering → zui → game`), `zui/` should not depend on `game/`.

This makes `RootObject` a de facto game-layer orchestrator disguised as a ZUI component.

**Impact:** The ZUI layer cannot be reused without the game layer. Adding new game types forces changes in `zui/`.

**Fix:** Move `createGameStage()` out of `RootObject` into a game-layer factory (e.g., `game/GameFactory.js`) that receives the root object and builds the stage. Alternatively, promote `RootObject` to the `game/` layer since it's already game-specific.

---

## 2. No Object Destruction / Memory Leaks

Only `Card`, `Hand`, and `GameStage` have `destroy()` methods, and **nothing ever calls them**. When a game is loaded via `restoreData()`:

- `DataManager.restoreData()` clears `states` and `objects`, calls `renderer.clear()` and `rootObject.clearAll()`
- But `clearAll()` only removes DOM children — it never calls `destroy()` on game objects
- EventBus listeners from the old `Hand`, `Card`, and `GameStage` instances remain registered
- The `RootObject`'s resize listener (`window.addEventListener("resize", ...)`) is never removed
- `GameStage`'s `contextmenu` and `mousemove` DOM listeners are never removed

**Impact:** After save/load, ghost event handlers fire on stale objects. Over multiple load cycles, listener count grows unboundedly.

**Fix:** Implement a recursive `destroy()` protocol. `clearAll()` (or a new `destroyAll()`) should walk the object tree and call `destroy()` on each object. Every class that registers listeners must implement `destroy()` to clean them up. Consider having `DataManager.unregisterObject()` call `destroy()` automatically.

---

## 3. `DataManager.getObject()` Has Hidden Lazy-Creation Side Effect

```js
getObject(id) {
    if (this.objects.has(id)) {
        return this.objects.get(id);
    } else {
        return objectRegistry.create(this.states[id]);
    }
}
```

If an object isn't in the live cache, it silently creates a new instance from serialized state. This is presumably for save/load hydration, but it means any `getObject()` call can trigger construction with all its side effects (DOM creation, event subscriptions, renderer registration).

**Impact:** Hard to reason about when objects are alive. A typo or stale ID could silently spawn a duplicate object. No distinction between "get existing" and "hydrate from save."

**Fix:** Split into two explicit methods: `getObject(id)` (returns existing or null) and `hydrateObject(id)` (creates from state). Make the hydration path explicit and only used during load.

---

## 4. Fragile ID Counter After Load

IDs are assigned by a simple incrementing counter in `ObjectRegistry`:

```js
create(state) {
    if (state.objectId == -1) {
        state.objectId = this.numObjects;
    }
    this.numObjects += 1;  // Always increments, even for pre-assigned IDs
}
```

On `restoreData()`, the counter is reset to 0. If a loaded save file has objects with IDs higher than the total object count (e.g., objects were deleted during the session), the counter could assign duplicate IDs. For example, if the save had IDs [0, 1, 5, 8] (gaps from deleted objects), after loading 4 objects the counter is at 4. New objects would get IDs 4, 5, 6... colliding with existing ones.

**Impact:** Potential ID collisions after loading saves with gaps, causing silent data corruption.

**Fix:** After restore, set `numObjects` to `Math.max(...allLoadedIds) + 1` instead of relying on the count of created objects.

---

## 5. `StateObject` Is Too Thin to Enforce Its Contract

The architecture doc says "any mutation that affects an object's persistent state must be written to its StateObject." But `StateObject` is just:

```js
export class StateObject {
    constructor() {
        this.objectId = -1;
        this.objectType = "STATEOBJECT";
    }
}
```

There's no validation, no change tracking, no schema. State fields are added ad-hoc in subclass constructors. The `Hand` class stores runtime-only fields like `mode`, `interactionY`, `x`, `y` directly on the live object — but `mode` arguably should be persisted (is the hand raised or lowered on reload?).

**Impact:** Unclear which fields are serialized and which are transient. The save file captures everything on the state object (including `children` arrays with IDs of potentially destroyed objects).

**Fix options:**
- Add a `transientFields` set or `serialize()` method to StateObject that explicitly declares what gets saved
- Or adopt a convention where state objects declare all fields in the constructor and runtime-only fields live exclusively on the live object
- Document the boundary clearly per class

---

## 6. `children` Array Is Never Cleaned Up

`Stage.registerChild()` and `RootObject.registerChild()` push to `this.children` and `this.state.children`, but there's no `unregisterChild()`. If an object is conceptually removed (e.g., a card moved between stages), it remains in the parent's children array forever.

**Impact:** `notifyChildStages()` iterates stale references. The serialized `state.children` array grows monotonically. On reload, it would attempt to hydrate removed objects.

**Fix:** Add `unregisterChild(child)` that splices from both `this.children` and `this.state.children`. Call it when objects are reparented or destroyed.

---

## 7. Inconsistent Singleton Initialization Order

`DataManager` is instantiated at module load time and immediately calls `createSaveButton()` and `createLoadButton()`, which access `document.getElementById(...)`. If the module is imported before the DOM is ready, these calls would fail.

Currently this works because `main.js` uses `type="module"` (deferred by default), but it's a fragile implicit dependency on load order.

**Impact:** Low — works today, but would break if the import structure changes or if modules are loaded differently.

**Fix:** Defer DOM-dependent initialization to an explicit `init()` call made after DOMContentLoaded, rather than running it in the constructor.

---

## 8. `SVGLoader` Uses an Array as a Dictionary

```js
this.svgs = new Array();
// ...
this.svgs[key] = mySVGParent.firstElementChild;
```

Using string keys on an Array object works in JS but is semantically wrong — it creates non-enumerable properties that don't participate in `.length`, `for...of`, etc.

**Fix:** Use a `Map` or plain object (`{}`) instead.

---

## 9. No Error Boundaries in the Event System

`EventBus.emit()` calls all listeners synchronously with no try/catch:

```js
for (const cb of callbacks) {
    cb(data);
}
```

If any listener throws, subsequent listeners for the same event are skipped. Given the chained event flows (`card:dropped` → `card:droppedOnStage` → card positioning), one error can leave the system in an inconsistent state.

**Fix:** Wrap each callback invocation in try/catch and log errors without interrupting the remaining listeners:

```js
for (const cb of callbacks) {
    try {
        cb(data);
    } catch (e) {
        console.error(`[EventBus] Error in listener for "${eventName}":`, e);
    }
}
```
