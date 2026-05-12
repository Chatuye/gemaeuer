# Gemäuer

A browser-based tabletop game engine. Provides a zoomable, pannable canvas for placing tiles, cards, and nested game stages.

## Running

No build step. Open `index.html` in a browser or use a local dev server (e.g. Live Server on port 5500).

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

Plain JavaScript, no bundler. Three layers loaded via `<script>` tags:

```
index.html / main.js          ← entry point
├── data-management/          ← object lifecycle and persistence
├── zui/                      ← layout, rendering, interaction primitives
│   └── config/               ← LayoutPresets, UIDefinitions
└── game/                     ← game-specific objects (Card, Tile, Deck, Hand, GameStage)
```

### Layers

**data-management/** — Object lifecycle and persistence. `StateObject` is the base class for all serialisable state. `ObjectFactory` instantiates the correct class by type string. `DataManager` is the central registry that creates, stores, and serialises everything.

**zui/** — The zoomable UI framework. `ZoomableElement` is the base for anything on a stage (positioning, drag/drop, coordinate conversion). `ZoomableObject` and `FlippableObject` extend it with SVG rendering. `Stage` is a container with its own `ViewPort` (pan/zoom) and `StageZIndexManager` (layering). `RootObject` is the top-level container wrapping the browser window. `config/` holds `LayoutPresets` and `UIDefinitions`.

**game/** — Game objects built on the zui layer. `GameStage` extends `Stage` with tile/card creation and hand interaction. `Tile` and `Card` are `FlippableObjects`. `Deck` spawns cards. `Hand` manages a fan of cards at the bottom of the stage that raises/lowers on cursor proximity.

### Key concepts

- **State/behaviour split** — every object has a `StateObject` subclass (`XxxSO`) holding serialisable state, and a live class holding logic.
- **Layout presets** — objects use `LayoutPresets.WORLD`, `.SCREEN`, or `.SCREEN_RELATIVE` to define how they position and size themselves. See `zui/config/LayoutPresets.js` for details.
- **DataManager** — central registry and factory. Single entry point for creating, retrieving, saving, and loading objects.

## Startup sequence

1. `SVGLoader` fetches and caches all SVG assets
2. `DataManager` is instantiated
3. `RootObject` is created (root viewport + z-index manager)
4. User clicks **New** to create a `GameStage` with a `Hand` and `Deck`
