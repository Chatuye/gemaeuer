# Gemäuer — Architecture

- Four layers: `core/` → `rendering/` → `zui/` → `game/`
- State/behaviour split: every object has a `StateObject` subclass (serialisable state) and a live class (behaviour). The StateObject is the single source of truth — any mutation that affects an object's persistent state must be written to its StateObject so that serialization always reflects the current state without additional synchronization. 
- Rendering separation: game objects mutate state via `renderer.setState()`, the Renderer applies DOM changes once per frame via `requestAnimationFrame`. Objects never write to `div.style.*` directly (except FlippableObject's CSS transition for flip animation).
- Coordinate system: position and dimensions controlled by `positionBehaviour` (ZOOM/FIXED), `positionType` (ABSOLUTE/RELATIVE), `dimensionsBehaviour`, `dimensionsType`, and `scaleWithWindowSize`
- Layout presets: `WORLD` (zooms with viewport), `SCREEN` (fixed, resolution-adaptive), `SCREEN_RELATIVE` (fixed, fraction of parent)
- Singletons: `svgLoader` (from `assets/SVGLoader.js`), `dataManager` (from `core/DataManager.js`), `objectRegistry` (from `core/ObjectRegistry.js`), `eventBus` (from `core/EventBus.js`), and `renderer` (from `rendering/Renderer.js`) are module-level instances imported where needed
- `core/registry.js` is the barrel file for object type registration — add new types there
- `utils.js` at project root holds general-purpose utility functions
- `assets/svgData/index.js` is the barrel file for SVG data — add new SVGs there
- The project uses vanilla JavaScript with no bundler — all imports are relative `.js` paths
- No external libraries or dependencies — everything is implemented from scratch
- Event system: objects communicate via named events on the `eventBus`. See `events.md` for the full vocabulary and interaction flows.
- Input handling: centralized on the Renderer's root element. Hit testing via `data-object-id` attributes. Wheel events bubble up the object hierarchy. Drag capture via `startDrag`/`endDrag`.
- Viewport propagation: `Stage.notifyChildStages()` recursively triggers `onParentChange()` on nested stages, which recalculates viewport scales. The Renderer only handles DOM dirty propagation, not viewport logic.
