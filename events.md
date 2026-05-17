# Event System

All events emitted via the global `eventBus` singleton (`core/EventBus.js`).

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
| `card:droppedOnStage` | GameStage | `{ card }` | GameStage decided the card goes onto the world |
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
  → emits card:dropped { card }
    → GameStage listens → if card.parent !== this: skip
      → RAISED: emits card:droppedInHand { card }
        → Hand listens → if card.parent === this.stage: addCard(card)
      → LOWERED: emits card:droppedOnStage { card }
        → Card listens (self-filter: card !== this) → positions itself on world
```
