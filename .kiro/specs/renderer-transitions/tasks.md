# Implementation Plan: Renderer Transitions

## Overview

This plan implements a generic CSS transition API on the Renderer singleton, removes `changedFields`/`firstRender` tracking in favour of unconditional writes guarded by active transitions, and migrates FlippableObject to use the new API. Tasks are ordered so that foundational changes land first, the transition system builds on top, and FlippableObject migration wires everything together at the end.

## Tasks

- [x] 1. Simplify Renderer internals — remove changedFields and firstRender
  - [x] 1.1 Remove `changedFields` and `firstRender` from entry creation and `setState`
    - In `rendering/Renderer.js`, remove `changedFields: new Set()` and `firstRender: true` from the entry object in `register()`
    - Simplify `setState` to only set `entry.dirty = true` (remove `entry.changedFields.add(field)`)
    - _Requirements: 8.1, 8.5_

  - [x] 1.2 Rewrite `applyDOM` to write all visual properties unconditionally
    - Remove the `applyAll` / `entry.firstRender` logic and all `entry.changedFields.has(...)` checks
    - Write zIndex, transformOrigin, transform, and filter on every dirty frame
    - Add a `transitions` parameter to `applyDOM` (pass empty Map for now) and skip properties guarded by active transitions
    - Remove `entry.firstRender = false` at the end
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 1.3 Update `tick()` to pass the transitions map to `applyDOM`
    - Add `this.transitions = new Map()` to the constructor
    - Pass `this.transitions` as the second argument to `applyDOM(entry, this.transitions)` in the tick loop
    - Remove `entry.changedFields.clear()` from the end of the tick loop body
    - _Requirements: 8.2, 8.3_

  - [x]* 1.4 Write property test for simplified setState (Property 13)
    - **Property 13: Simplified setState — dirty flag only**
    - **Validates: Requirements 8.5**
    - Update `tests/renderer.setState.test.js` to remove assertions about `changedFields` and test only dirty-flag behaviour

  - [x]* 1.5 Write property test for unconditional applyDOM writes (Property 12)
    - **Property 12: Unconditional property writes for dirty entries**
    - **Validates: Requirements 8.2**
    - Create test in `tests/renderer.applyDOM.test.js` verifying all visual properties are written for any dirty entry with no active transition

- [ ] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement the transition API core
  - [x] 3.1 Implement `startTransition(objectId, targetEl, descriptor)`
    - Add the public method to the Renderer class
    - Validate objectId is registered, resolve targetEl (default to entry.div), validate targetEl is entry.div or a descendant
    - Cancel any existing transition on the same element via `_cancelTransition`
    - Build the `ActiveTransition` tracking object with property set, listener, and callback
    - Store in `this.transitions` map keyed by the target element
    - Apply `transitionDuration`, `transitionProperty`, and target CSS values to the element
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.3, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3_

  - [x] 3.2 Implement `_cancelTransition(el)` and `_completeTransition(el)`
    - `_cancelTransition`: remove event listener, clear transitionDuration/transitionProperty styles, delete from map, do NOT call onComplete
    - `_completeTransition`: remove event listener, clear transitionDuration/transitionProperty styles, delete from map, call onComplete if provided
    - _Requirements: 3.1, 3.2, 3.3, 4.2_

  - [x] 3.3 Implement `_cancelTransitionsForObject(objectId)`
    - Iterate the transitions map, cancel all entries whose `objectId` matches
    - _Requirements: 6.1, 6.2_

  - [x] 3.4 Update `unregister` and `clear` to cancel transitions on cleanup
    - Call `_cancelTransitionsForObject(objectId)` in `unregister` before removing the entry
    - In `clear()`, iterate and cancel all transitions, then call `this.transitions.clear()`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.5 Update the `applyDOM` guard logic to check child-element transitions
    - The guard in `applyDOM` currently only checks `transitions.get(div)`. This is correct for the entry's main div. Child-element transitions are keyed by the child element, so they won't interfere with the main div's writes — no additional logic needed, but verify this is the case and add a comment.
    - _Requirements: 2.1, 2.2, 5.1_

  - [x] 3.6 Export `startTransition` in the module's public API
    - Ensure `startTransition` is accessible on the exported `renderer` singleton (it's a class method, so this is automatic — verify and add JSDoc)
    - _Requirements: 1.1, 7.1_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Property-based tests for the transition API
  - [ ]* 5.1 Write property test for transition application (Property 1)
    - **Property 1: Transition application applies styles correctly**
    - **Validates: Requirements 1.1, 1.4**
    - Create `tests/renderer.transitions.test.js` with randomized TransitionDescriptors; verify transitionDuration and target CSS values are set on the element

  - [ ]* 5.2 Write property test for unregistered objectId (Property 2)
    - **Property 2: Unregistered objectId is a no-op**
    - **Validates: Requirements 1.3**
    - Verify no error thrown, no entry added to transitions map, no DOM modification

  - [ ]* 5.3 Write property test for non-descendant target element (Property 3)
    - **Property 3: Non-descendant target element is a no-op**
    - **Validates: Requirements 5.3**
    - Generate random DOM elements not in the entry's subtree; verify silent no-op

  - [ ]* 5.4 Write property test for target element resolution (Property 4)
    - **Property 4: Target element resolution**
    - **Validates: Requirements 5.1, 5.2**
    - Test null targetEl resolves to entry.div; child elements resolve correctly

  - [ ]* 5.5 Write property test for guard invariant (Property 5)
    - **Property 5: Guard invariant — active transitions protect properties from applyDOM**
    - **Validates: Requirements 2.1, 8.3**
    - Start a transition, call applyDOM, verify guarded properties are not overwritten

  - [ ]* 5.6 Write property test for bounds independence (Property 6)
    - **Property 6: Bounds update independently of active transitions**
    - **Validates: Requirements 2.2**
    - Start a transition on transform, mark entry dirty, call applyDOM, verify left/top/width/height are still written

  - [ ]* 5.7 Write property test for unrelated state changes (Property 7)
    - **Property 7: Unrelated state changes do not affect active transitions**
    - **Validates: Requirements 2.3**
    - Start a transition guarding transform, setState on zIndex, verify zIndex is written and transition remains

  - [ ]* 5.8 Write property test for completion cleanup (Property 8)
    - **Property 8: Completion cleans up tracking, styles, and invokes callback**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Simulate transitionend events for all properties; verify map cleanup, style cleanup, callback invocation

  - [ ]* 5.9 Write property test for interruption (Property 9)
    - **Property 9: Interruption replaces the previous transition**
    - **Validates: Requirements 4.1**
    - Start two transitions on the same element; verify only the second remains in the map

  - [ ]* 5.10 Write property test for cancelled callback suppression (Property 10)
    - **Property 10: Cancelled transitions never invoke their callback**
    - **Validates: Requirements 4.2, 6.3**
    - Cancel via interruption, unregister, and clear; verify callback never called

  - [ ]* 5.11 Write property test for unregister/clear cleanup (Property 11)
    - **Property 11: Unregister and clear remove all transitions for the affected objects**
    - **Validates: Requirements 6.1, 6.2**
    - Register objects with transitions, call unregister/clear, verify transitions map is empty and listeners removed

- [ ] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Migrate FlippableObject to use the transition API
  - [x] 7.1 Rewrite `FlippableObject.flip()` to call `renderer.startTransition`
    - Import `renderer` in `zui/FlippableObject.js`
    - Replace direct `this.wrapper.style.*` writes with a `renderer.startTransition` call using `this.state.objectId`, `this.wrapper`, and a descriptor with `{ transform: targetValue }` and the duration
    - Keep the `state.facing` update logic
    - _Requirements: 7.1, 7.2, 7.3, 1.1, 5.1_

  - [x] 7.2 Update the constructor's initial flip for `BACK` facing
    - The constructor calls `flip(0)` for cards loaded in BACK state — verify this still works with duration 0 (instant transition via the API)
    - _Requirements: 1.1, 4.3_

  - [ ]* 7.3 Write unit test for FlippableObject migration
    - Verify `flip()` calls `renderer.startTransition` with correct arguments
    - Verify no direct `div.style.transitionDuration` writes remain in FlippableObject
    - _Requirements: 7.1_

- [x] 8. Wire test files into test.html and final integration
  - [x] 8.1 Add new test script imports to `tests/test.html`
    - Add `<script type="module">` entries for `renderer.transitions.test.js` and `renderer.applyDOM.test.js`
    - _Requirements: all (test infrastructure)_

  - [x] 8.2 Update existing `renderer.setState.test.js` for the new simplified API
    - Remove all `changedFields` assertions
    - Update property descriptions to match the new behaviour (dirty-flag only)
    - _Requirements: 8.1, 8.5_

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update documentation for all new and changed APIs
  - [x] 10.1 Update `rendering/rendering.architecture.md`
    - Replace the "Core Data Flow" diagram to remove `changedFields` references and show the simplified `setState → dirty → tick → computeBounds → applyDOM (with transition guards)` flow
    - Remove the "First Render Mechanism" section entirely (no longer applicable)
    - Update the "applyDOM — What Gets Written" table to reflect unconditional writes guarded by active transitions instead of `changedFields.has(...)` checks
    - Add a new "Transition System" section documenting: `startTransition` API, `ActiveTransition` tracking, guard mechanism in `applyDOM`, completion/interruption/cleanup lifecycle, and the `transitions` Map data structure
    - Update the "Public API Summary" table to include `startTransition(id, targetEl, descriptor)`
    - Update the "Save/Load Integration" section to mention that `clear()` now also cancels all active transitions

  - [x] 10.2 Update `README.md`
    - In the "Key concepts" section, update the "Rendering separation" bullet to mention the transition API (objects can also trigger one-shot CSS transitions via `renderer.startTransition` without direct DOM writes)
    - In the "Public API Summary" or architecture description, mention `startTransition` as part of the Renderer's interface

  - [x] 10.3 Add JSDoc to all new and modified methods in `rendering/Renderer.js`
    - Add JSDoc comments to `startTransition`, `_cancelTransition`, `_completeTransition`, `_cancelTransitionsForObject`
    - Update JSDoc on `setState` to reflect the simplified behaviour (no changedFields)
    - Update JSDoc on `register` to reflect the simplified entry structure (no changedFields, no firstRender)
    - Update JSDoc on `unregister` and `clear` to document transition cleanup behaviour

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vanilla JS with no bundler — all test files are ES modules loaded via `tests/test.html`
- The custom randomized test harness (100+ iterations) matches the existing pattern in `renderer.setState.test.js`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["3.1", "3.2"] },
    { "id": 5, "tasks": ["3.3", "3.5", "3.6"] },
    { "id": 6, "tasks": ["3.4"] },
    { "id": 7, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3"] },
    { "id": 10, "tasks": ["8.1", "8.2"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
