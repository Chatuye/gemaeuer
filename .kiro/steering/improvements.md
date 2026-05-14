---
inclusion: manual
---

# Gemäuer — Improvement Plan

## Completed

1. **Rename DataObject → StateObject** — all classes, properties, and files renamed to `StateObject` / `stateObject` / `XxxSO`.
2. **Layout presets** — created `zui/config/LayoutPresets.js` with `WORLD`, `SCREEN`, `SCREEN_RELATIVE`. Applied across all object creation sites. Moved `UIDefinitions.js` to `zui/config/`.
3. **README** — full architecture documentation with interaction reference, coordinate system explanation, and startup sequence.
4. **ES Modules** — all files converted to `import`/`export`. Single entry point `<script type="module" src="main.js">`. No bundler.
5. **Remove globals** — `dataManager`, `rootObject`, `svgLoader`, `cardDimensions`, and `randomHexColorCode` eliminated. `svgLoader` and `dataManager` are module-level singletons. `rootObject` is a property on `dataManager`. `cardDimensions` replaced by `HandSO.cardWidth`/`cardHeight`. `randomHexColorCode` moved to `utils.js`.
6. **cardDimensions removal** — `SVGLoader` gained a generic `getDimensions(key)` method. The special-case card logic was removed. Card dimensions are stored in `HandSO` and set at creation time.
7. **SVG data as modules** — `svgData/` files export their SVG strings. Barrel file `svgData/index.js` re-exports all. Filenames and keys converted to camelCase.
8. **Object registry** — replaced the `ObjectFactory` switch statement with a registry pattern. `objectRegistry` is a module-level singleton (`dataManagement/ObjectRegistry.js`). Each class self-registers via `objectRegistry.register("TYPE", Class)`. Barrel file `dataManagement/registry.js` imports all classes to trigger registration. The registry has zero knowledge of specific types.

## Remaining improvements (priority order)

### 1. Event system
Objects communicate by directly calling methods on each other. Add a simple event emitter so objects emit events like `"card:added"`, `"hand:raised"`. This decouples game logic from side effects and enables future features (undo, multiplayer sync, animation queues).

### 2. Save format versioning
Add a `version` field to the save format. Use plain arrays/objects in serialised form instead of the `dataType: 'Map'` magic key pattern. This prevents data loss on format changes and makes saves human-readable.

### 3. Rendering separation
Game logic and DOM manipulation are interleaved (e.g. `Card.pickUp()` sets CSS filters). Extract rendering into a dedicated layer so game objects emit state changes and a renderer translates them to DOM updates. Biggest effort, biggest long-term payoff.

