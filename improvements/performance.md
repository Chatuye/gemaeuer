# Performance Improvements

Identified overly-safe implementations that trade correctness-by-brute-force for unnecessary work. Ordered by estimated impact.

---

## 1. `notifyViewportChanged` — O(n) full scan on every pan/zoom frame

**Location:** `rendering/Renderer.js` → `notifyViewportChanged(viewportId)`

**Problem:** Iterates *every* entry in the map to find those matching the given `viewportId`. Only a subset of objects belongs to any given viewport, but the scan touches all of them. Called on every pan/zoom frame.

**Fix:** Maintain a reverse index `viewportChildren: Map<viewportId, Set<objectId>>` (analogous to the existing `childrenOf` index). Populate it in `register()`, clean it up in `unregister()`. Then `notifyViewportChanged` becomes O(k) where k = objects under that viewport.

**Impact:** High — runs every frame during interaction. Scales with total object count across all stages.

---

## 2. `StageZIndexManager.remove` — re-indexes all layer siblings

**Location:** `zui/StageZIndexManager.js` → `remove(object)`

**Problem:** When an object is removed from a layer, the method loops through all remaining objects in that layer and decrements their zIndex (via `obj.setZIndex()` → `renderer.setState()`). For a layer with N objects, that's N-1 setState calls, each marking a render node dirty and triggering a DOM write on the next frame.

**Note:** When a card is picked up from hand, the fan of card is currently only rearranged when the hand is lowered, not when the card is picked up. That is not related to the problem though.

**Example:** Picking up a card from a hand with 10 cards triggers ~9 unnecessary dirty marks + zIndex DOM writes.

**Fix options:**
- Use a stable zIndex scheme with gaps (e.g., multiply by 10) so removal doesn't require re-indexing.
- Only re-index on insertion conflicts rather than on every removal.
- At minimum, batch the updates so dirty is only set once per affected entry.

**Impact:** Medium — triggers during drag interactions. Proportional to number of siblings in the layer.

---

## 3. `Hand.positionCards` — 4× `setState` per card

**Location:** `game/Hand.js` → `positionCard()`

**Problem:** Each card gets 4 individual `renderer.setState()` calls (transformOrigin, rotation, x, y). Each call does a Map lookup, equality check, and dirty flag set. With 10 cards that's 40 calls; the dirty flag is redundantly set after the first call per card.

**Fix:** Add a `renderer.setStateMulti(objectId, fields)` batch method:
```js
setStateMulti(objectId, fields) {
    const entry = this.entries.get(objectId);
    if (!entry) return;
    let changed = false;
    for (const [field, value] of Object.entries(fields)) {
        if (entry.state[field] === value) continue;
        entry.state[field] = value;
        changed = true;
    }
    if (changed) entry.dirty = true;
}
```

**Impact:** Low-medium — reduces overhead during `positionCards` (called on layout change, raise/lower, add/remove card).

---

## 4. Redundant `markDirty` during window resize propagation

**Location:** `zui/rootObject.js` → `update()` / `zui/ZoomableElement.js` → `onParentChange()`

**Problem:** On window resize, the Renderer's `_onResize` handler calls `markAllDirty()` (all render nodes dirty). Then `rootObject.update()` calls `updateChildren()` which triggers `onParentChange()` on each child — now calling `renderer.markDirty(self)` on render nodes that are already dirty.

**Severity:** Negligible — `markDirty` is just a Map lookup + assignment on an already-true flag. The real purpose of `updateChildren` is to trigger `Stage.onParentChange()` → `viewPort.calculateScale()` → `notifyViewportChanged()`. The base-class `markDirty` is wasted but cheap.

**Fix (optional):** Guard with `if (!entry.dirty)` in `markDirty`, or accept the trivial cost.

**Impact:** Negligible.

---

## 5. `ViewPort.calculateScale` — recursive `getScreenDimensions` calls

**Location:** `zui/ViewPort.js` → `calculateScale()` → `getDimensions()` → `getScreenDimensions()` → `parent.getScreenDimensions()`

**Problem:** During a zoom/pan + `notifyChildStages` cascade, each nested stage recalculates its viewport scale. Each `calculateScale()` walks up to the parent's `getScreenDimensions()`, which may fall through to synchronous computation that itself recurses up the parent chain.

**Fix:** Cache parent screen dimensions during the propagation pass (pass them as a parameter down the `notifyChildStages` chain). Only relevant with 3+ levels of nesting.

**Impact:** Low — negligible with current nesting depth (typically 2-3 levels).

---

## Summary — Priority Order

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | Viewport index for `notifyViewportChanged` | High | Low |
| 2 | Stable zIndex scheme in `StageZIndexManager` | Medium | Medium |
| 3 | Batch `setStateMulti` for Hand positioning | Low-medium | Low |
| 4 | Redundant markDirty on resize | Negligible | Trivial |
| 5 | Cached parent dims in viewport cascade | Low | Medium |

## Completed

- ✅ `ZoomableElement.onParentChange` — was calling `markAllDirty()`, now calls `markDirty(self)` only.
