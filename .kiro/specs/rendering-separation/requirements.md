# Requirements Document

## Introduction

This feature extracts DOM manipulation from game logic into a dedicated rendering layer. Currently, game objects (Card, Hand, Tile) directly manipulate CSS properties, set transforms, and update SVG content inline with their behavioral logic. The goal is to introduce a reactive state-change notification mechanism and a Renderer that subscribes to those notifications, delegating visual updates to a pluggable backend. Game objects will emit declarative state changes; the Renderer will be the sole owner of visual output. The architecture is designed so that the initial DOM-based backend can later be replaced by a Canvas backend without changing game logic.

## Glossary

- **Game_Object**: Any live class in the game/ or zui/ layer that holds state and behavior (e.g. Card, Tile, Hand, ZoomableElement)
- **State_Property**: A named field on a StateObject subclass whose value drives visual output (e.g. x, y, width, height, zIndex, facing, filter)
- **State_Change_Event**: A notification emitted when a State_Property is modified, carrying the object identity, property name, old value, and new value
- **Render_Backend_Interface**: The abstract contract that all Render_Backends implement, defining methods for element creation, destruction, and property updates
- **Render_Backend**: A concrete implementation of the Render_Backend_Interface that performs visual output using a specific technology (e.g. DOM, Canvas)
- **DOM_Backend**: The Render_Backend implementation that uses HTML elements and CSS for visual output (the initial and default backend)
- **Renderer**: A dedicated module that subscribes to State_Change_Events and delegates visual updates to the active Render_Backend
- **Render_Strategy**: A per-object-type mapping that defines how a given State_Property change translates to a specific visual operation on the active Render_Backend
- **EventBus**: The existing global pub/sub singleton (core/EventBus.js) used for decoupled communication
- **Visual_State**: The subset of an object's state that has a visual representation (position, size, rotation, filter, flip facing, text content)
- **Batch_Update**: A mechanism that groups multiple State_Change_Events within a single logical operation and applies their visual effects together
- **Scene_Graph**: A logical tree of Game_Objects with parent-child relationships that the Renderer maintains independently of any backend-specific element hierarchy

## Requirements

### Requirement 1: Reactive State Change Detection

**User Story:** As a developer, I want state property mutations to be automatically detected and broadcast, so that rendering logic does not need to be invoked manually after every state change.

#### Acceptance Criteria

1. WHEN a Visual_State property is assigned a new value on a Game_Object, THE State_Change_Event system SHALL emit a State_Change_Event containing the object identifier, property name, previous value, and new value
2. WHEN a Visual_State property is assigned the same value it already holds, THE State_Change_Event system SHALL NOT emit a State_Change_Event
3. THE State_Change_Event system SHALL support observation of the following property categories: position (x, y), dimensions (width, height), z-index (zIndex), visual filter (filter), flip facing (facing), rotation (rotation), and text content (textContent)
4. THE State_Change_Event system SHALL use ES module Proxy or Object.defineProperty to intercept property writes without requiring callers to use setter methods

### Requirement 2: Render Backend Interface

**User Story:** As a developer, I want the Renderer to delegate visual operations to a backend behind a stable interface, so that I can later swap the DOM backend for a Canvas backend without modifying game logic or the Renderer core.

#### Acceptance Criteria

1. THE Render_Backend_Interface SHALL define the following methods: createElement, destroyElement, updatePosition, updateDimensions, updateZIndex, updateFilter, updateRotation, updateFacing, updateTextContent, and attachToParent
2. THE Render_Backend_Interface SHALL accept an object identifier and the relevant property values as parameters for each update method
3. THE Renderer SHALL interact with visual output exclusively through the Render_Backend_Interface methods
4. THE Renderer SHALL accept a Render_Backend at initialization and use it for all visual operations
5. WHEN a different Render_Backend is provided, THE Renderer SHALL function correctly without changes to its own code or to game logic

### Requirement 3: DOM Backend

**User Story:** As a developer, I want a DOM-based backend as the initial implementation, so that the game continues to render using HTML elements and CSS as it does today.

#### Acceptance Criteria

1. THE DOM_Backend SHALL implement the Render_Backend_Interface using HTML div elements and CSS style properties
2. WHEN updatePosition is called, THE DOM_Backend SHALL set style.left and style.top on the target element
3. WHEN updateDimensions is called, THE DOM_Backend SHALL set style.width and style.height on the target element
4. WHEN updateZIndex is called, THE DOM_Backend SHALL set style.zIndex on the target element
5. WHEN updateFilter is called, THE DOM_Backend SHALL set the CSS filter property on the target element
6. WHEN updateFacing is called, THE DOM_Backend SHALL set the flip wrapper's transform to show the correct face
7. WHEN updateRotation is called, THE DOM_Backend SHALL set style.transform and style.transformOrigin on the target element
8. WHEN updateTextContent is called, THE DOM_Backend SHALL set the target SVG text element's innerHTML
9. WHEN createElement is called for a FlippableObject, THE DOM_Backend SHALL create the wrapper, front-face, and back-face child elements and attach the SVG content

### Requirement 4: Renderer Module

**User Story:** As a developer, I want a single Renderer module responsible for coordinating all visual updates, so that game logic never directly touches visual output.

#### Acceptance Criteria

1. THE Renderer SHALL subscribe to State_Change_Events and delegate each event to the active Render_Backend via the appropriate interface method
2. THE Renderer SHALL be the sole module that invokes Render_Backend_Interface methods for Game_Objects
3. THE Renderer SHALL maintain a Scene_Graph that tracks parent-child relationships between Game_Objects independently of the backend
4. WHEN a Game_Object's parent changes, THE Renderer SHALL update the Scene_Graph and call attachToParent on the Render_Backend

### Requirement 5: Render Strategy Registration

**User Story:** As a developer, I want to register per-object-type rendering strategies, so that the Renderer knows how to map state changes to backend operations for each type of Game_Object.

#### Acceptance Criteria

1. THE Renderer SHALL provide a registerStrategy method that accepts an object type identifier and a Render_Strategy
2. WHEN a State_Change_Event is received for an object type with no registered Render_Strategy, THE Renderer SHALL apply a default strategy that handles position, dimensions, and zIndex
3. WHEN a Render_Strategy is registered for an object type, THE Renderer SHALL use that strategy instead of the default for all State_Change_Events of that type
4. THE Render_Strategy interface SHALL define a method for each supported property category that receives the object identifier and the new value

### Requirement 6: Batch Updates

**User Story:** As a developer, I want to group multiple state changes into a single rendering pass, so that operations like Hand.positionCards() do not cause excessive intermediate visual updates.

#### Acceptance Criteria

1. THE Renderer SHALL provide a batch method that accepts a callback function
2. WHILE a batch callback is executing, THE Renderer SHALL queue State_Change_Events instead of applying them immediately
3. WHEN the batch callback completes, THE Renderer SHALL apply all queued changes in a single pass, keeping only the latest value per object-property pair
4. IF an error occurs inside a batch callback, THEN THE Renderer SHALL discard the queued changes and re-throw the error

### Requirement 7: Element Lifecycle Management

**User Story:** As a developer, I want the Renderer to handle visual element creation and teardown, so that Game_Objects do not create or remove their own visual elements.

#### Acceptance Criteria

1. WHEN a new Game_Object is constructed, THE Renderer SHALL call createElement on the Render_Backend and register the result in its internal mapping
2. WHEN a Game_Object is destroyed, THE Renderer SHALL call destroyElement on the Render_Backend and remove the entry from its internal mapping
3. THE Renderer SHALL store a mapping from object identifier to backend-specific element handle so that State_Change_Events can be resolved to their target
4. THE Game_Object classes SHALL NOT directly create, reference, or manipulate DOM elements or any backend-specific visual handles

### Requirement 8: Remove Direct DOM Manipulation from Game Logic

**User Story:** As a developer, I want game logic classes to contain zero visual output code, so that the rendering layer is fully decoupled and game logic is testable without a browser.

#### Acceptance Criteria

1. THE Card class SHALL express the grabbed visual effect by setting a filter State_Property instead of calling div.style.setProperty
2. THE Card class SHALL express the dropped-on-stage layout change by updating position and layout State_Properties instead of calling repositionDiv() and resizeDiv()
3. THE Hand class SHALL express card positioning by setting rotation and position State_Properties on each card instead of writing to card.div.style.transform and card.div.style.transformOrigin
4. THE Tile class SHALL express its displayed value by setting a textContent State_Property instead of writing to svgFront.getElementById("text").firstChild.innerHTML
5. THE ZoomableElement class SHALL NOT contain repositionDiv() or resizeDiv() methods; position and size updates SHALL occur through State_Property assignment only
6. THE FlippableObject class SHALL express flip state by setting the facing State_Property instead of directly manipulating wrapper.style.transform
7. THE Game_Object classes SHALL NOT hold references to DOM elements (no this.div, this.wrapper, this.svgFront properties)

### Requirement 9: Input Handling Separation

**User Story:** As a developer, I want mouse and keyboard event handling to be decoupled from DOM elements owned by game objects, so that input can later be routed through a Canvas hit-testing system instead of DOM event bubbling.

#### Acceptance Criteria

1. THE Renderer SHALL register DOM event listeners on behalf of Game_Objects and translate DOM events into game-level input events
2. WHEN a mousedown event occurs on a Game_Object's visual element, THE Renderer SHALL emit a game-level input event containing the object identifier and cursor coordinates
3. THE Game_Object classes SHALL subscribe to game-level input events instead of attaching DOM event listeners directly
4. THE input event translation SHALL be part of the Render_Backend_Interface so that a Canvas backend can provide hit-testing-based input instead of DOM event bubbling

### Requirement 10: Backward Compatibility

**User Story:** As a developer, I want the rendering separation to preserve all existing game behavior, so that users see no difference in how the game looks and responds.

#### Acceptance Criteria

1. WHEN a card is drawn from the deck, THE system SHALL display the card in the hand at the bottom of the screen with the same visual appearance as before the refactor
2. WHEN a card is grabbed, THE system SHALL display the drop-shadow filter effect and allow dragging with the same responsiveness as before the refactor
3. WHEN the hand is raised, THE system SHALL fan cards upward with rotation and spacing identical to the current implementation
4. WHEN a tile is created, THE system SHALL display the tile's numeric value on its front face
5. WHEN a FlippableObject is clicked without dragging, THE system SHALL animate the flip with the same 800ms transition duration
6. WHEN the viewport is panned or zoomed, THE system SHALL reposition all WORLD-layout children correctly

### Requirement 11: No External Dependencies

**User Story:** As a developer, I want the rendering layer to use only browser-native APIs and existing project infrastructure, so that the project remains dependency-free.

#### Acceptance Criteria

1. THE Renderer module SHALL be implemented using only ES module syntax, browser APIs, and the existing EventBus
2. THE State_Change_Event system SHALL be implemented using only ES module syntax and native JavaScript features (Proxy or Object.defineProperty)
3. THE rendering-separation feature SHALL NOT introduce any npm packages, bundlers, or build tools
