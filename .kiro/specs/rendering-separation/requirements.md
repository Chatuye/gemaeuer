# Requirements Document

## Introduction

The Gemäuer project currently interleaves DOM manipulation with game logic. Classes like ZoomableElement, FlippableObject, Card, Hand, and Tile directly create DOM elements, set CSS styles, and attach event listeners inside game logic methods. This feature introduces a Renderer singleton that decouples state mutations from DOM updates via a dirty-flag mechanism and a requestAnimationFrame render loop. Game objects mutate state, the Renderer applies DOM changes once per frame.

## Glossary

- **Renderer**: A module-level singleton that owns the render loop, tracks dirty objects, computes screen bounds, and applies DOM updates
- **Dirty_Flag**: A per-object marker indicating that renderable state has changed since the last frame
- **Renderable_State**: The subset of an object's state fields that affect visuals (x, y, width, height, zIndex, facing, rotation, transformOrigin, filter)
- **Computed_Bounds**: The resolved screen-pixel position and dimensions for an object, calculated from its state, its parent's bounds, and viewport state
- **Layout_Preset**: One of the three existing positioning modes (WORLD, SCREEN, SCREEN_RELATIVE) defined in LayoutPresets.js

## Requirements

### Requirement 1: Renderer Singleton with Render Loop

**User Story:** As a developer, I want a dedicated Renderer module that owns a requestAnimationFrame loop and applies DOM updates for dirty objects, so that rendering logic is centralized and decoupled from game logic.

#### Acceptance Criteria

1. THE Renderer SHALL be a module-level singleton exported from a dedicated file in a `rendering/` directory
2. THE Renderer SHALL run a requestAnimationFrame-based render loop that processes dirty objects once per frame
3. WHEN a registered object is marked dirty, THE Renderer SHALL compute its Computed_Bounds and apply the corresponding DOM style changes (position, dimensions, z-index, transform, filter) during the next frame
4. AFTER processing a dirty object, THE Renderer SHALL clear its dirty flag and changed-field set
5. THE Renderer SHALL NOT use the existing EventBus for dirty-flag propagation — dirty tracking is internal to the Renderer

### Requirement 2: Dirty-Flag State Mutation

**User Story:** As a developer, I want state mutations to automatically mark objects as dirty, so that DOM updates are batched per frame without manual bookkeeping.

#### Acceptance Criteria

1. WHEN a registered object's Renderable_State field is modified via the Renderer's setState method, THE Renderer SHALL write the new value to the object's StateObject, mark that object dirty, and record which field changed
2. IF setState is called but the new value equals the current value, THEN THE object SHALL NOT be marked dirty and the StateObject SHALL NOT be modified
3. WHEN multiple fields are modified within the same frame, THE Renderer SHALL process that object exactly once, with all changed fields applied together
4. IF an object is not registered with the Renderer, THEN setState calls for that object SHALL have no effect
5. THE Renderer SHALL always write state changes to the object's StateObject (the same reference used for serialization), so that serialization continues to reflect the current state without additional synchronization

### Requirement 3: Layout Computation

**User Story:** As a developer, I want the Renderer to compute screen positions and dimensions using the existing layout rules, so that game objects don't need access to DOM measurements or viewport internals.

#### Acceptance Criteria

1. THE Renderer SHALL compute screen positions using: ZOOM+ABSOLUTE → `(state.x - viewport.x) * viewport.scaleX`; FIXED+ABSOLUTE → `state.x`; RELATIVE → `state.x * parent.bounds.width`
2. THE Renderer SHALL compute screen dimensions using: RELATIVE → `state.width * parent.bounds.width`; ZOOM+ABSOLUTE → `state.width * viewport.scaleX`; FIXED+ABSOLUTE+scaleWithWindowSize → `state.width * uiScale` where uiScale = min(stage.width/1920, stage.height/1080)
3. THE Renderer SHALL expose a method to query an object's current Computed_Bounds by objectId
4. THE Renderer SHALL support all three existing Layout_Presets (WORLD, SCREEN, SCREEN_RELATIVE) by applying the computation rules matching each preset's field values

### Requirement 4: Viewport and Resize Propagation

**User Story:** As a developer, I want the Renderer to handle viewport changes and window resizes by marking affected objects dirty, so that game objects don't need to listen to browser events for layout purposes.

#### Acceptance Criteria

1. WHEN the browser window is resized, THE Renderer SHALL mark all registered objects as dirty (since resize affects all layout modes)
2. WHEN a viewport's state changes (pan/zoom), THE Renderer SHALL mark only ZOOM-dependent registered objects under that viewport as dirty
3. THE render loop's once-per-frame processing SHALL serve as natural debouncing for rapid resize or viewport events

### Requirement 5: Input Handling Separation

**User Story:** As a developer, I want mouse input events to be captured centrally on the rendering surface and forwarded to the appropriate game object, so that per-element event listeners are no longer needed for migrated objects.

#### Acceptance Criteria

1. THE Renderer SHALL register mouse event listeners (mousedown, mousemove, mouseup, dblclick, wheel) on the root rendering surface during initialization
2. WHEN a mouse event occurs, THE Renderer SHALL determine the target object using DOM hit testing (elementFromPoint or event.target with data-attribute lookup) and forward the event payload to that object
3. WHEN a drag operation is active, THE Renderer SHALL forward mousemove and mouseup events to the dragging object regardless of cursor position until mouseup ends the drag
4. Game objects SHALL process interaction logic and call setState to update Renderable_State — they SHALL NOT directly modify DOM styles

### Requirement 6: Hand Fan Layout

**User Story:** As a developer, I want the Hand to compute card positions as data and let the Renderer apply them, so that Hand no longer directly manipulates card DOM elements.

#### Acceptance Criteria

1. WHEN the Hand computes fan positions, THE Hand SHALL call setState on each card's position (x, y), rotation, and transformOrigin — marking each card dirty for the next frame
2. THE Hand SHALL NOT directly access or modify any card's DOM element (no `card.div.style`, no `card.repositionDiv()`)
3. THE Hand SHALL use the Renderer's bounds query method to obtain card screen dimensions for fan calculations, instead of calling `card.getScreenDimensions()`
4. WHEN hand mode changes, cards are added/removed, or a layout:changed event fires, THE Hand SHALL recompute fan positions and update card state accordingly

### Requirement 7: Coordinate Conversion

**User Story:** As a developer, I want the Renderer to expose coordinate conversion utilities, so that game objects can convert between screen and local/viewport coordinates without accessing DOM elements.

#### Acceptance Criteria

1. THE Renderer SHALL expose a screen-to-local method: given (clientX, clientY) and an objectId, return `{x: clientX - bounds.x, y: clientY - bounds.y}` using the object's Computed_Bounds
2. THE Renderer SHALL expose a local-to-viewport method: given (localX, localY) and a stage objectId, return viewport coordinates using the stage's viewport state
3. THESE methods SHALL produce equivalent results to the current `convertScreenPosToDivPos()` and `convertDivPosToViewPortPos()` methods

### Requirement 8: Incremental Migration

**User Story:** As a developer, I want to migrate objects to the Renderer one at a time without breaking existing functionality, so that the refactor can proceed safely and incrementally.

#### Acceptance Criteria

1. THE Renderer SHALL only manage DOM elements for objects that are explicitly registered with it
2. WHILE an object has not been registered, THE object SHALL continue managing its own DOM using the existing pattern
3. WHEN an object is registered with the Renderer, THE object SHALL stop creating or modifying DOM directly and rely on setState for all visual updates
4. THE Renderer SHALL coexist with non-migrated objects on the same rendering surface, preserving correct z-ordering across both managed and unmanaged elements
5. THE rendering layer SHALL use only vanilla JavaScript and browser APIs — no external dependencies, no bundler required

### Requirement 9: Documentation Updates

**User Story:** As a developer, I want the project documentation to reflect the new rendering layer, so that contributors understand the architecture without reading implementation details.

#### Acceptance Criteria

1. THE `README.md` architecture section SHALL be updated to include the `rendering/` directory, the Renderer singleton, and its role in the startup sequence
2. THE `.kiro/steering/architecture.md` SHALL be updated to list the Renderer as a singleton and describe the rendering layer's place in the layer hierarchy
3. THE Renderer's public methods (register, unregister, setState, getComputedBounds, screenToLocal, localToViewport, startDrag, endDrag, start, stop, notifyViewportChanged, markAllDirty) SHALL have brief JSDoc comments describing purpose and parameters
