# Implementation Plan: Rendering Separation

## Overview

Introduce a Renderer singleton (`rendering/Renderer.js`) that decouples DOM manipulation from game logic. Objects mutate state via `renderer.setState()`, the Renderer batches changes and applies them once per frame via `requestAnimationFrame`. Migration proceeds incrementally: ZoomableElement → FlippableObject → Card → Hand → Stage.

## Tasks

- [x] 1. Create Renderer singleton with core infrastructure
  - [x] 1.1 Create `rendering/Renderer.js` with class skeleton and module-level singleton export
    - Create the `rendering/` directory and `Renderer.js` file
    - Implement constructor with `entries` Map, `rootEl`, `running`, `frameId`, `dragTarget` fields
    - Export `renderer` singleton instance
    - Import `dataManager` from `../core/DataManager.js`
    - The Renderer MUST NOT import or use EventBus — dirty tracking is entirely internal
    - _Requirements: 1.1, 1.5, 8.5_

  - [x] 1.2 Implement `register` and `unregister` methods
    - `register(objectId, { state, div, parentId, viewportId })` — creates entry with dirty flag, changedFields Set, bounds object, layoutPreset extracted from state
    - Set `data-object-id` attribute on the div during registration
    - `unregister(objectId)` — removes entry, removes data attribute from div
    - Handle duplicate id by overwriting existing entry
    - Handle unknown id in unregister as no-op
    - _Requirements: 8.1, 8.3, 5.2_

  - [x] 1.3 Implement `setState` method with dirty-flag management
    - Compare new value against `entry.state[field]` — skip if equal
    - Write new value to `entry.state[field]` (the StateObject reference)
    - Mark entry dirty, add field to `changedFields` Set
    - Silently ignore calls for unregistered objectIds
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 1.4 Write property test for setState dirty-flag management
    - **Property 3: setState dirty-flag management**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Implement layout computation and render loop
  - [x] 2.1 Implement `computeBounds` function
    - Pure function taking entry and entries Map
    - Position: RELATIVE → `state.val * parent.bounds.dimension`; ZOOM+ABSOLUTE → `(state.val - vp.val) * vp.scale`; FIXED+ABSOLUTE → `state.val`
    - Dimensions: RELATIVE → `state.val * parent.bounds.dimension`; ZOOM+ABSOLUTE → `state.val * vp.scale`; FIXED+ABSOLUTE+scaleWithWindowSize → `state.val * uiScale`
    - `getUIScale()` helper: `Math.min(root.width/1920, root.height/1080)`
    - Fallback to root element bounds when parent missing; log warning once for missing viewport
    - _Requirements: 3.1, 3.2, 3.4_

  - [x]* 2.2 Write property test for layout computation correctness
    - **Property 1: Layout computation correctness**
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 2.3 Implement `applyDOM` function
    - Set `left`, `top`, `width`, `height` from computed bounds
    - Conditionally apply `zIndex`, `transform: rotate()`, `transformOrigin`, `-webkit-filter` based on changedFields
    - _Requirements: 1.3_

  - [x] 2.4 Implement `tick` render loop with parent-first processing
    - Iterate entries in registration order (parent-first guaranteed by project creation flow)
    - For each dirty entry: compute bounds, compare with old bounds, mark children dirty if bounds changed
    - Call `applyDOM`, clear dirty flag and changedFields
    - Schedule next frame with `requestAnimationFrame` if running
    - _Requirements: 1.2, 1.4_

  - [ ]* 2.5 Write property test for dirty processing completeness
    - **Property 2: Dirty processing completeness**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.6 Implement `start(rootEl)` and `stop()` lifecycle methods
    - `start`: store rootEl, set running=true, kick off first `requestAnimationFrame`
    - `stop`: set running=false, cancel pending frame with `cancelAnimationFrame`
    - _Requirements: 1.2_

- [x] 3. Implement viewport/resize propagation and queries
  - [x] 3.1 Implement `notifyViewportChanged(viewportId)` method
    - Iterate entries, mark dirty only those where `entry.viewportId === viewportId` AND layout uses ZOOM behaviour (positionBehaviour or dimensionsBehaviour)
    - _Requirements: 4.2_

  - [x] 3.2 Implement `markAllDirty()` and window resize listener
    - `markAllDirty()` marks every entry dirty
    - In `start()`, add `window.addEventListener('resize', ...)` calling `markAllDirty()`
    - In `stop()`, remove the resize listener
    - _Requirements: 4.1, 4.3_

  - [ ]* 3.3 Write property test for viewport and resize dirty propagation
    - **Property 4: Viewport and resize dirty propagation**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 3.4 Implement `getComputedBounds(objectId)` query method
    - Return `entry.bounds` copy or `null` for unknown ids
    - _Requirements: 3.3_

- [ ] 4. Checkpoint - Ensure core Renderer works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement input handling
  - [x] 5.1 Register centralized mouse event listeners in `start()`
    - Attach mousedown, mousemove, mouseup, dblclick, wheel listeners on rootEl
    - Remove listeners in `stop()`
    - _Requirements: 5.1_

  - [x] 5.2 Implement hit testing and event forwarding
    - Use `document.elementFromPoint` + `closest('[data-object-id]')` to find target
    - Look up object via `dataManager.getObject(Number(objectId))`
    - Forward event to object's `onMouseDown`, `onDoubleClick`, `onWheel` methods if they exist
    - _Requirements: 5.2_

  - [x] 5.3 Implement drag capture with `startDrag` / `endDrag`
    - `startDrag(objectId)` sets `this.dragTarget`
    - While dragTarget is set, route mousemove/mouseup to drag target regardless of cursor position
    - `endDrag()` clears dragTarget
    - _Requirements: 5.3, 5.4_

  - [ ]* 5.4 Write property test for input event routing
    - **Property 5: Input event routing**
    - **Validates: Requirements 5.2, 5.3**

- [x] 6. Implement coordinate conversion utilities
  - [x] 6.1 Implement `screenToLocal(clientX, clientY, objectId)`
    - Return `{ x: clientX - bounds.x, y: clientY - bounds.y }` using entry's computed bounds
    - Return `null` for unknown objectId
    - _Requirements: 7.1_

  - [x] 6.2 Implement `localToViewport(localX, localY, stageObjectId)`
    - Look up entry, get viewport via `dataManager.getObject(entry.viewportId)`
    - Compute relative position within bounds, map to viewport coordinates
    - Return `null` for unknown stageObjectId
    - _Requirements: 7.2, 7.3_

  - [ ]* 6.3 Write property test for coordinate conversion equivalence
    - **Property 6: Coordinate conversion equivalence**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 7. Migrate ZoomableElement to use Renderer
  - [ ] 7.1 Register ZoomableElement with Renderer in constructor
    - Call `renderer.register(this.state.objectId, { state: this.state, div: this.div, parentId: this.parent.state.objectId, viewportId: ... })`
    - Extract viewportId from parent's viewport if parent is a Stage
    - _Requirements: 8.1, 8.3_

  - [ ] 7.2 Replace `repositionDiv()` and `resizeDiv()` with setState calls
    - `moveTo(x, y)` → `renderer.setState(id, 'x', x); renderer.setState(id, 'y', y);`
    - Remove direct `div.style.left/top/width/height` writes
    - Replace `setZIndex` to use `renderer.setState(id, 'zIndex', value)`
    - _Requirements: 8.3, 5.4_

  - [ ] 7.3 Remove per-element mouse event listeners
    - Remove `div.addEventListener('mousedown', ...)` and `div.addEventListener('dblclick', ...)`
    - Keep `onMouseDown`, `onMouseMove`, `onMouseUp` methods as event handlers called by Renderer
    - Update `grabbed()` to call `renderer.startDrag(this.state.objectId)`
    - Update `drop()` to call `renderer.endDrag()`
    - Remove document-level mousemove/mouseup listeners (Renderer handles capture)
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 7.4 Replace `getScreenDimensions()` / `getScreenPosition()` with Renderer queries
    - Use `renderer.getComputedBounds(this.state.objectId)` where screen dimensions are needed
    - Keep `convertScreenPosToDivPos` delegating to `renderer.screenToLocal`
    - _Requirements: 3.3, 7.1_

- [ ] 8. Migrate FlippableObject to use Renderer
  - [ ] 8.1 Add `facing` state handling via setState
    - Replace direct `wrapper.style.transform` manipulation with `renderer.setState(id, 'facing', value)`
    - Extend `applyDOM` in Renderer to handle `facing` field (apply rotateY transform on wrapper)
    - _Requirements: 8.3_

  - [ ] 8.2 Remove DOM construction from FlippableObject constructor
    - Move wrapper/front/back div creation into Renderer's registration or a dedicated setup
    - Renderer creates the flip DOM structure when registering a FlippableObject-type entry
    - _Requirements: 8.3_

- [ ] 9. Migrate Card to use Renderer
  - [ ] 9.1 Replace direct DOM style manipulation in Card
    - `grabbed()`: use `renderer.setState` for filter, position changes instead of `div.style.*`
    - `drop()`: use `renderer.setState` for filter reset
    - `setDefaultStyle()`: use `renderer.setState(id, 'filter', ...)`
    - Remove `card.div.style.transform = "none"` — use setState for rotation/transform
    - _Requirements: 8.3, 5.4_

  - [ ] 9.2 Update Card coordinate conversion to use Renderer utilities
    - Replace `this.convertScreenPosToDivPos(...)` with `renderer.screenToLocal(...)`
    - Replace `this.parent.convertDivPosToViewPortPos(...)` with `renderer.localToViewport(...)`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. Checkpoint - Verify ZoomableElement/FlippableObject/Card migration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Migrate Hand to use Renderer
  - [ ] 11.1 Replace direct card DOM manipulation in Hand with setState calls
    - `positionCard()`: replace `card.div.style.transform`, `card.div.style.transformOrigin`, `card.moveTo()` with `renderer.setState` calls for x, y, rotation, transformOrigin on each card
    - _Requirements: 6.1, 6.2_

  - [ ] 11.2 Use Renderer bounds query for card dimensions
    - Replace `card.getScreenDimensions()` with `renderer.getComputedBounds(card.state.objectId)`
    - Replace `this.stage.getScreenDimensionsOfChild(...)` with Renderer bounds query
    - Replace `this.stage.getScreenDimensions()` with `renderer.getComputedBounds(this.stage.state.objectId)`
    - _Requirements: 6.3_

  - [ ] 11.3 Ensure hand mode changes trigger setState updates
    - `raise()` and `lower()` call `positionCards()` which now uses setState — cards get marked dirty
    - Verify `onParentChange()` / `layout:changed` event triggers recomputation via setState
    - _Requirements: 6.4_

- [ ] 12. Migrate Stage to use Renderer input forwarding
  - [ ] 12.1 Remove per-element wheel listener from Stage
    - Remove `this.div.addEventListener('wheel', ...)` from Stage constructor
    - Keep `onWheel(e)` method as handler called by Renderer's event forwarding
    - _Requirements: 5.1, 5.4_

  - [ ] 12.2 Update Stage pan/zoom to notify Renderer of viewport changes
    - After `viewPort.pan(...)` and `viewPort.zoom(...)`, call `renderer.notifyViewportChanged(this.viewPort.state.objectId)`
    - Remove manual `updateChildren()` callback chain — Renderer handles dirty propagation
    - _Requirements: 4.2_

  - [ ]* 12.3 Write property test for z-order preservation
    - **Property 7: Z-order preservation across managed and unmanaged objects**
    - **Validates: Requirements 8.4**

- [ ] 13. Checkpoint - Full migration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Remove dead code from migrated classes
  - [ ] 14.1 Remove dead methods from ZoomableElement
    - Delete `repositionDiv()` — replaced by Renderer's `applyDOM` via dirty-flag processing
    - Delete `resizeDiv()` — replaced by Renderer's `applyDOM` via dirty-flag processing
    - Delete `getScreenPosition()` — replaced by `renderer.getComputedBounds()`
    - Delete `getScreenDimensions()` — replaced by `renderer.getComputedBounds()`
    - Delete `convertScreenPosToDivPos()` — replaced by `renderer.screenToLocal()`
    - Delete `clearMouseEvents()` — Renderer handles drag capture centrally
    - Delete `onParentMutation()`, `onParentMutationHelper()`, `onDivObserved()` and the `MutationObserver` setup — Renderer manages div lifecycle
    - Delete `getMainStage()` — only used by the now-removed `getUIScale` call chain
    - _Requirements: 8.3_

  - [ ] 14.2 Remove dead methods from Stage
    - Delete `getUIScale(keepAspectRatio)` — replaced by Renderer's internal `getUIScale()` helper
    - Delete `getScreenDimensionsOfChild()` — replaced by `renderer.getComputedBounds()`
    - Delete `convertDivPosToViewPortPos()` — replaced by `renderer.localToViewport()`
    - Delete `getViewPort()` — Renderer accesses viewport state directly via `entry.viewportId`
    - Delete `updateChildren()` — Renderer's dirty propagation handles child updates
    - Remove the `onParentChange()` override that calls `viewPort.calculateScale(this.updateChildren.bind(this))` — Renderer handles resize propagation
    - _Requirements: 8.3_

  - [ ] 14.3 Remove dead code from FlippableObject
    - Delete `onDivObserved()`, `onDivMutation()`, `onDivMutationHelper()`, `onSVGObserved()` and the `MutationObserver` setup — Renderer manages flip DOM structure on registration
    - Delete direct `wrapper.style.transform` / `wrapper.style.transitionDuration` writes from `flip()` — replaced by `renderer.setState(id, 'facing', ...)`
    - _Requirements: 8.3_

  - [ ] 14.4 Remove dead code from Card
    - Delete calls to `this.resizeDiv()` and `this.repositionDiv()` in `grabbed()` and `onDroppedOnStage` — replaced by setState
    - Delete `this.div.style.transform = "none"` in `grabbed()` — replaced by `renderer.setState(id, 'rotation', 0)`
    - Delete `this.convertScreenPosToDivPos(...)` calls — replaced by `renderer.screenToLocal(...)`
    - Delete `this.parent.convertDivPosToViewPortPos(...)` calls — replaced by `renderer.localToViewport(...)`
    - Delete `this.getScreenDimensions()` calls — replaced by `renderer.getComputedBounds(...)`
    - _Requirements: 8.3_

  - [ ] 14.5 Remove dead code from ViewPort
    - Delete `getScreenDimensions()` — Renderer computes parent screen dimensions internally
    - Delete `getScaleX()`, `getScaleY()`, `getX()`, `getY()` trivial getters — Renderer reads `state.scaleX`/`state.scaleY`/`state.x`/`state.y` directly
    - Evaluate if `calculateScale()` callback pattern is still needed — if Renderer calls it without callback, simplify to a void method
    - _Requirements: 8.3_

  - [ ] 14.6 Verify no remaining references to deleted methods
    - Search codebase for any remaining calls to deleted methods
    - Fix or remove any stale references found
    - Ensure the application still loads and functions correctly
    - _Requirements: 8.3_

- [ ] 15. Documentation updates
  - [ ] 15.1 Add JSDoc comments to Renderer public methods
    - Document `register`, `unregister`, `setState`, `getComputedBounds`, `screenToLocal`, `localToViewport`, `startDrag`, `endDrag`, `start`, `stop`, `notifyViewportChanged`, `markAllDirty`
    - Brief purpose and parameter descriptions
    - _Requirements: 9.3_

  - [ ] 15.2 Update `README.md` architecture section
    - Add `rendering/` directory to project structure
    - Describe Renderer singleton and its role in the startup sequence
    - _Requirements: 9.1_

  - [ ] 15.3 Update `.kiro/steering/architecture.md`
    - Add Renderer to the singletons list
    - Describe rendering layer's place in the layer hierarchy (core/ → rendering/ → zui/ → game/)
    - _Requirements: 9.2_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vanilla JavaScript with no bundler — all imports are relative `.js` paths
- Migration order (ZoomableElement → FlippableObject → Card → Hand → Stage) ensures base classes are migrated before subclasses
- Non-migrated objects continue working unchanged during incremental migration

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.6"] },
    { "id": 4, "tasks": ["2.4", "3.1", "3.2", "3.4"] },
    { "id": 5, "tasks": ["2.5", "3.3", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 7, "tasks": ["5.4", "6.3"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 10, "tasks": ["8.1", "8.2"] },
    { "id": 11, "tasks": ["9.1", "9.2"] },
    { "id": 12, "tasks": ["11.1", "11.2"] },
    { "id": 13, "tasks": ["11.3", "12.1", "12.2"] },
    { "id": 14, "tasks": ["12.3"] },
    { "id": 15, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 16, "tasks": ["14.6"] },
    { "id": 17, "tasks": ["15.1", "15.2", "15.3"] }
  ]
}
```
