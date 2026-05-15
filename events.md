# Event System

All events emitted via the global `eventBus` singleton (`core/EventBus.js`).

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
    → Hand listens → addCard(card)
```

### Grabbing a card from the hand

```
Card.grabbed()
  → emits card:grabbed { card }
    → Hand listens → removeCard(card) if card is in its collection
```

### Dropping a card

```
Card.drop()
  → emits card:dropped { card }
    → GameStage listens, checks hand.mode
      → RAISED: emits card:droppedInHand { card }
        → Hand listens → addCard(card)
      → LOWERED: emits card:droppedOnStage { card }
        → Card listens → positions itself on world
```
