# Gemäuer

A browser-based tabletop game engine. Provides a zoomable, pannable canvas for placing tiles, cards, and nested game stages.

## Running

No build step. Serve the project with any static file server (e.g. Live Server on port 5500). The app uses native ES Modules (`<script type="module">`), so opening `index.html` directly via `file://` will not work due to CORS restrictions — a server is required.

## Menu

- **New** — creates a game stage with a hand and a deck
- **Save** — downloads the current state as `gemaeuer.json`
- **Load** — restores a previously saved state

## Interactions

| Action | Result |
|---|---|
| Double-click on stage | Places a tile |
| Right-click on stage | Creates a nested stage |
| Click on deck | Draws a card into the hand |
| Click on card/tile | Flips it |
| Hold + drag card/tile | Picks it up and moves it |
| Drop card near bottom | Adds it to the hand |
| Mouse near bottom | Raises the hand |
| Scroll wheel | Zooms the viewport |
| Drag on empty area | Pans the viewport |

## Architecture

Plain JavaScript, no bundler. ES Modules with a single entry point:

```
index.html                     ← <script type="module" src="main.js">
main.js                        ← bootstraps svgLoader and dataManager
utils.js                       ← general-purpose utility functions
├── assets/
│   ├── SVGLoader.js           ← singleton, parses and caches SVGs
│   └── svgData/               ← SVG strings as modules, barrel file index.js
├── data-management/
│   ├── StateObject.js         ← base class for all serialisable state
│   ├── ObjectFactory.js       ← instantiates classes by type string
│   └── DataManager.js         ← singleton, central registry and persistence
├── zui/
│   ├── config/                ← LayoutPresets, UIDefinitions
│   ├── ZoomableElement.js     ← base: positioning, drag/drop, coordinates
│   ├── ZoomableObject.js      ← extends with single SVG rendering
│   ├── FlippableObject.js     ← extends with front/back SVG flipping
│   ├── ViewPort.js            ← pan/zoom state and scale calculation
│   ├── StageZIndexManager.js  ← layered z-index management
│   ├── Stage.js               ← container with viewport and children
│   └── rootObject.js          ← top-level container (browser window)
└── game/
    ├── GameStage.js           ← stage with tile/card creation and hand
    ├── Tile.js                ← flippable tile with a numeric value
    ├── Card.js                ← flippable card, can be picked up/dropped
    ├── Deck.js                ← spawns cards on click
    └── Hand.js                ← fan of cards, raises/lowers on hover
```

### Layers

**data-management/** — Object lifecycle and persistence. `StateObject` is the base class for all serialisable state. `ObjectFactory` instantiates the correct class by type string. `DataManager` is the central registry that creates, stores, and serialises everything.

**zui/** — The zoomable UI framework. `ZoomableElement` is the base for anything on a stage (positioning, drag/drop, coordinate conversion). `ZoomableObject` and `FlippableObject` extend it with SVG rendering. `Stage` is a container with its own `ViewPort` (pan/zoom) and `StageZIndexManager` (layering). `RootObject` is the top-level container wrapping the browser window. `config/` holds `LayoutPresets` and `UIDefinitions`.

**game/** — Game objects built on the zui layer. `GameStage` extends `Stage` with tile/card creation and hand interaction. `Tile` and `Card` are `FlippableObjects`. `Deck` spawns cards. `Hand` manages a fan of cards at the bottom of the stage that raises/lowers on cursor proximity.

### Key concepts

- **ES Modules** — all files use `import`/`export`. No globals. The browser resolves the dependency graph from `main.js`.
- **Singletons** — `svgLoader` (from `assets/SVGLoader.js`) and `dataManager` (from `data-management/DataManager.js`) are module-level instances, imported where needed.
- **State/behaviour split** — every object has a `StateObject` subclass (`XxxSO`) holding serialisable state, and a live class holding logic.
- **Layout presets** — objects use `LayoutPresets.WORLD`, `.SCREEN`, or `.SCREEN_RELATIVE` to define how they position and size themselves. See `zui/config/LayoutPresets.js` for details.
- **DataManager** — central registry and factory. Owns `rootObject`. Single entry point for creating, retrieving, saving, and loading objects.
- **SVG data** — raw SVG strings live in `assets/svgData/` as module exports. The barrel file `index.js` re-exports all. Add new SVGs there.

## Startup sequence

1. Modules load: `main.js` imports `svgLoader` and `dataManager` (both instantiated at module level)
2. `DOMContentLoaded` fires → `svgLoader.loadAll()` parses all SVG data
3. `RootObjectSO` is created and passed to `dataManager.createObject()` → `RootObject` is built (viewport + z-index manager)
4. `dataManager.rootObject` is set
5. User clicks **New** to create a `GameStage` with a `Hand` and `Deck`
