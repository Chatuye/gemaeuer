# Gemäuer — Architecture

- Three layers: `dataManagement/` → `zui/` → `game/`
- State/behaviour split: every object has a `StateObject` subclass (serialisable state) and a live class (behaviour)
- Coordinate system: position and dimensions controlled by `positionBehaviour` (ZOOM/FIXED), `positionType` (ABSOLUTE/RELATIVE), `dimensionsBehaviour`, `dimensionsType`, and `uiScaling`
- Layout presets: `WORLD` (zooms with viewport), `SCREEN` (fixed, resolution-adaptive), `SCREEN_RELATIVE` (fixed, fraction of parent)
- Singletons: `svgLoader` (from `assets/SVGLoader.js`), `dataManager` (from `dataManagement/DataManager.js`), and `objectRegistry` (from `dataManagement/ObjectRegistry.js`) are module-level instances imported where needed
- `dataManagement/registry.js` is the barrel file for object type registration — add new types there
- `utils.js` at project root holds general-purpose utility functions
- `assets/svgData/index.js` is the barrel file for SVG data — add new SVGs there
