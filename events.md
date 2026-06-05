# Event System

All events emitted via the global `eventBus` singleton (`core/EventBus.js`).

The eventBus supports `mute()`/`unmute()` — when muted, `emit()` is a no-op. The UndoManager mutes during surgical undo/redo apply to prevent coordination events from firing and causing double-mutations.

## Multi-Stage Filtering Rule

**CRITICAL:** When multiple GameStages exist simultaneously, all event handlers
must filter events to only process those belonging to their own stage. Without
filtering, a card dropped on stage 2 would be processed by stage 1's handlers
too, causing incorrect state changes.

Every handler that receives a `{ card }` payload should check `card.parent === this.stage`
(or `card.parent === this` for GameStage). Every handler that receives `{ stage }`
should check `stage === this.stage`.

## Event types

### Card events

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `card:drawn` | Deck | `{ card }` | A new card was drawn from the deck |
| `card:grabbed` | Card | `{ card }` | A card was grabbed (by the user dragging it) |
| `card:dropped` | Card | `{ card }` | A card was released after being dragged |
| `card:droppedOnStage` | GameStage | `{ card }` | GameStage decided the card goes onto the world (no active listener — positioning handled by `_placeOnStage`) |
| `card:droppedInHand` | GameStage | `{ card }` | GameStage decided the card goes into the hand |

### Hand events

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `cursor:enteredHandZone` | GameStage | `{ stage }` | Cursor entered the hand interaction zone |
| `cursor:leftHandZone` | GameStage | `{ stage }` | Cursor left the hand interaction zone |

### Layout events

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `layout:changed` | GameStage | `{ stage }` | Stage dimensions or viewport changed |

### Selection events

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `selection:changed` | StageSelectionManager | `{ selectionManagerId, selection }` | Selection changed (select, toggle, add, remove, or clear). `selectionManagerId` is the manager's objectId; `selection` is the array of currently selected live objects. |

### Object lifecycle events

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `card:deleted` | Card.destroy() | `{ card }` | A card was destroyed. Emitted at the start of `destroy()`. |
| `tile:deleted` | Tile.destroy() | `{ tile }` | A tile was destroyed. Emitted at the start of `destroy()`. |
| `object:grabbed` | ZoomableElement.grabbed() | `{ object }` | An existing object was grabbed for dragging. Not emitted for newly spawned objects (`_isNewlySpawned` guard). Used by UndoManager for baseline advancement. |
| `viewport:changed` | Stage.pan() / Stage.zoom() | `{ stage }` | A stage's viewport was panned or zoomed. Used by UndoManager for baseline advancement. |

### Action events (undo/redo timing)

Action events use the `action:` prefix and fire at the end of a completed user action, after all coordination events have settled. The UndoManager subscribes to these for delta capture.

| Event | Emitted by | Payload | Description |
|-------|-----------|---------|-------------|
| `action:cardDrawn` | Deck.onMouseUp() | `{ card }` | A card was drawn from the deck |
| `action:cardPlaced` | GameStage drop handler | `{ card }` | A card was placed on the world stage |
| `action:cardReturnedToHand` | GameStage drop handler | `{ card }` | A card was returned to the hand |
| `action:objectCreated` | ZoomableElement.drop() / GameStage.onDoubleClick() | `{ object }` | A new object was placed (spawner drop or double-click) |
| `action:objectMoved` | ZoomableElement.drop() | `{ object }` | An existing object was moved to a new position |
| `action:objectDeleted` | GameStage delete handler | `{ object }` | An object was destroyed via the settings panel |
| `action:objectFlipped` | FlippableObject.flip() | `{ object }` | A flippable object was flipped (only when animated, not on load) |

## Event flows

How events chain together during key interactions.

### Drawing a card

```
Deck.onMouseUp()
  → emits card:drawn { card }
    → Hand listens → if card.parent === this.stage: addCard(card)
```

### Grabbing a card from the hand

```
Card.grabbed()
  → emits card:grabbed { card }
    → Hand listens → if card is in its collection: removeCard(card)
```

### Dropping a card

```
Card.drop()
  → super.drop() → _placeOnStage()
    → hit-tests cursor to find targetStage
    → converts cursor to WORLD coordinates on targetStage
    → if targetStage !== current parent: reparentTo(targetStage)
    → sets WORLD layout, positions object
  → emits card:dropped { card }
    → GameStage listens → if card.parent !== this: skip
      → RAISED: emits card:droppedInHand { card }
        → Hand listens → if card.parent === this.stage: addCard(card)
      → LOWERED: emits card:droppedOnStage { card }
        → (no listener — positioning already handled by _placeOnStage)
```

### Selecting an object

```
ZoomableElement.onMouseUp() [click without drag]
  → getResponsibleSelectionManager() walks up parent chain
  → if object is GAMESTAGE: selectionManager.clear()
  → otherwise: selectionManager.select(this)
    → StageSelectionManager emits selection:changed { selectionManagerId, selection }
      → GameStage listens → if selectionManagerId !== this.state.selectionManager: skip
        → onSelectionChanged(selection) → updates settings panel
```

### Deleting an object

```
GameStage.onSelectionChanged() → Delete button clicked
  → selectionManager.clear()
  → parent.unregisterChild(obj) → removes from children/state arrays + zManager
  → obj.destroy()
    → emits <type>:deleted { <type>: obj }  (e.g. card:deleted, tile:deleted)
      → Hand listens for card:deleted → if card is in its collection: removeCard, positionCards()
    → removes DOM element
    → unregisters from Renderer
```
