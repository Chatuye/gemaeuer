# Improving Load/Restore with the Renderer

## Current Behaviour

When a save file is loaded, `DataManager.restoreData()`:
1. Clears `this.states` and `this.objects` Maps
2. Resets `objectRegistry.numObjects = 0`
3. Calls `this.rootObject.clearAll()` (removes DOM children)
4. Recreates the root object from serialized state — which cascades into recreating all child objects

Each recreated object's constructor calls `dataManager.registerObject(this)` and (after migration) `renderer.register(...)`.

## Problem

After migration, the Renderer holds entries for the old objects. When `restoreData` runs:
- Old entries still reference destroyed DOM elements and stale state
- New objects register fresh entries (overwriting by objectId works for duplicates, but objectId counter resets to 0 so IDs will collide with stale entries from the previous session)
- The render loop may process stale entries between the clear and the recreation

## Proposed Solution

Add a `renderer.clear()` method and integrate it into the restore flow:

```js
// rendering/Renderer.js
clear() {
    for (const [, entry] of this.entries) {
        entry.div.removeAttribute('data-object-id');
    }
    this.entries.clear();
    this.dragTarget = null;
}
```

Then in `DataManager.restoreData()`:

```js
restoreData(data) {
    renderer.stop();          // pause the loop during teardown

    this.states = new Map();
    this.objects = new Map();
    objectRegistry.numObjects = 0;

    renderer.clear();         // wipe all stale entries
    this.rootObject.clearAll();

    this.states = data.states;
    this.rootObject = this.createObject(this.states.get(data.rootObject));

    renderer.start(document.getElementById('content'));  // restart loop
    this.fileInput.value = null;
}
```

## Why Stop/Start Instead of Just Clear?

- Prevents the render loop from iterating a half-torn-down entries Map
- Ensures no stale `requestAnimationFrame` callback fires between clear and recreation
- Clean lifecycle: stop → clear → recreate → start

## Alternative: Keep Loop Running

If stopping feels heavy, you could just call `renderer.clear()` without stopping. The next `tick()` would find an empty entries Map, do nothing, and by the time objects re-register and mark themselves dirty, everything works. This is simpler but relies on the assumption that no code between clear and recreation triggers a `tick()` synchronously (which is safe since rAF is async).

## When to Implement

After the migration tasks (7–12) are complete and objects register with the Renderer in their constructors. This is a follow-up task, not part of the current rendering-separation spec.
