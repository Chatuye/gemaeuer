---
inclusion: manual
---

# Gemäuer — Improvement Plan

## Completed

1. **Rename DataObject → StateObject** — all classes, properties, and files renamed to `StateObject` / `stateObject` / `XxxSO`.
2. **Layout presets** — created `zui/config/LayoutPresets.js` with `WORLD`, `SCREEN`, `SCREEN_RELATIVE`. Applied across all object creation sites. Moved `UIDefinitions.js` to `zui/config/`.
3. **README** — full architecture documentation with interaction reference, coordinate system explanation, and startup sequence.

## Remaining improvements (priority order)

### 1. ES Modules
Switch from `<script>` tag loading to `import`/`export`. No bundler needed — browsers handle `<script type="module">` natively. Start from the leaves (`StateObject.js`) and work up. This unlocks everything else.

### 2. Dependency injection (remove globals)
`dataManager`, `rootObject`, and `svgLoader` are globals that every class reaches into. Pass them via constructor parameters instead. `DataManager` should be the single entry point passed down.

### 3. Object registry (replace the switch statement)
`ObjectFactory` has a switch statement that must be updated for every new type. Replace with a registry pattern where each class registers itself: `objectFactory.register("CARD", Card)`.

### 4. Event system
Objects communicate by directly calling methods on each other. Add a simple event emitter so objects emit events like `"card:added"`, `"hand:raised"`. This decouples game logic from side effects and enables future features (undo, multiplayer sync, animation queues).

### 5. Save format versioning
Add a `version` field to the save format. Use plain arrays/objects in serialised form instead of the `dataType: 'Map'` magic key pattern. This prevents data loss on format changes and makes saves human-readable.

### 6. Rendering separation
Game logic and DOM manipulation are interleaved (e.g. `Card.pickUp()` sets CSS filters). Extract rendering into a dedicated layer so game objects emit state changes and a renderer translates them to DOM updates. Biggest effort, biggest long-term payoff.

## Architecture notes

- Three layers: `data-management/` → `zui/` → `game/`
- State/behaviour split: every object has a `StateObject` subclass (serialisable state) and a live class (behaviour)
- Coordinate system: position and dimensions controlled by `positionBehaviour` (ZOOM/FIXED), `positionType` (ABSOLUTE/RELATIVE), `dimensionsBehaviour`, `dimensionsType`, and `uiScaling`
- Layout presets: `WORLD` (zooms with viewport), `SCREEN` (fixed, resolution-adaptive), `SCREEN_RELATIVE` (fixed, fraction of parent)
- `cardDimensions` global in `Card.js` holds SVG width/height, populated by `SVGLoader` — candidate for cleanup
