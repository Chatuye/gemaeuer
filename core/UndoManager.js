/**
 * UndoManager — event-triggered delta-snapshot undo/redo with surgical apply.
 *
 * Listens to `action:` events on the eventBus. When an action completes,
 * diffs current state against the last baseline to produce a delta.
 * Undo/redo applies deltas surgically (patch/destroy/recreate individual objects).
 * Falls back to full restoreData() if surgical apply throws.
 */

import { dataManager } from './DataManager.js';
import { eventBus } from './EventBus.js';
import { renderer } from '../rendering/Renderer.js';
import { objectRegistry } from './ObjectRegistry.js';



const UNDOABLE_EVENTS = [
    'action:cardDrawn',
    'action:cardPlaced',
    'action:cardReturnedToHand',
    'action:objectCreated',
    'action:objectMoved',
    'action:objectDeleted',
    'action:objectFlipped',
];

// Non-undoable events that mutate persistent state — advance the baseline
// so the next capture doesn't accidentally revert them.
const BASELINE_EVENTS = [
    'object:grabbed',     // freeze pre-drag state
    'viewport:changed',   // scroll-wheel pan/zoom
    'selection:changed',  // selection is persisted but not independently undoable
];

class UndoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this._captureScheduled = false;
        this.lastSnapshot = null;
    }

    /** Take initial baseline after game setup or load */
    init() {
        this.undoStack = [];
        this.redoStack = [];
        this._captureScheduled = false;
        this.lastSnapshot = this._cloneStates();
    }

    /** Schedule a capture via microtask (deduplicates multiple action events in one tick) */
    scheduleCapture() {
        if (this._captureScheduled) return;
        this._captureScheduled = true;
        queueMicrotask(() => {
            this._capture();
            this._captureScheduled = false;
        });
    }

    _capture() {
        const current = dataManager.states;
        const delta = { modified: {}, created: {}, destroyed: {} };

        for (const id in current) {
            if (!(id in this.lastSnapshot)) {
                delta.created[id] = structuredClone(current[id]);
            } else if (JSON.stringify(current[id]) !== JSON.stringify(this.lastSnapshot[id])) {
                delta.modified[id] = {
                    before: structuredClone(this.lastSnapshot[id]),
                    after: structuredClone(current[id])
                };
            }
        }

        for (const id in this.lastSnapshot) {
            if (!(id in current)) {
                delta.destroyed[id] = structuredClone(this.lastSnapshot[id]);
            }
        }

        if (Object.keys(delta.modified).length === 0 &&
            Object.keys(delta.created).length === 0 &&
            Object.keys(delta.destroyed).length === 0) return;

        this.undoStack.push(delta);
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
        this.lastSnapshot = this._cloneStates();
    }

    /** Advance baseline without creating an undo entry */
    updateBaseline() {
        this.lastSnapshot = this._cloneStates();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        if (renderer.isDragging()) return;

        const delta = this.undoStack.pop();
        this.redoStack.push(delta);

        try {
            eventBus.mute();
            this._applyReverse(delta);
            eventBus.unmute();
        } catch (e) {
            eventBus.unmute();
            console.warn('[UndoManager] Surgical undo failed, falling back to restoreData:', e);
            const targetStates = this._applyReverseToStates(structuredClone(dataManager.states), delta);
            const targetData = { version: 0, rootObject: dataManager.rootObject.state.objectId, states: targetStates };
            dataManager.restoreData(targetData);
        }
        this.lastSnapshot = this._cloneStates();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        if (renderer.isDragging()) return;

        const delta = this.redoStack.pop();
        this.undoStack.push(delta);

        try {
            eventBus.mute();
            this._applyForward(delta);
            eventBus.unmute();
        } catch (e) {
            eventBus.unmute();
            console.warn('[UndoManager] Surgical redo failed, falling back to restoreData:', e);
            const targetStates = this._applyForwardToStates(structuredClone(dataManager.states), delta);
            const targetData = { version: 0, rootObject: dataManager.rootObject.state.objectId, states: targetStates };
            dataManager.restoreData(targetData);
        }
        this.lastSnapshot = this._cloneStates();
    }

    // ─── Surgical Apply ──────────────────────────────────────────────────

    _applyReverse(delta) {
        this._destroyObjects(delta.created);
        this._recreateObjects(delta.destroyed);
        this._patchModified(delta.modified, 'before');
    }

    _applyForward(delta) {
        this._destroyObjects(delta.destroyed);
        this._recreateObjects(delta.created);
        this._patchModified(delta.modified, 'after');
    }

    /**
     * Two-pass patch:
     * 1. Apply state values, reconcile parent/renderer for all objects
     * 2. Call applyState() hooks (depend on other objects being settled)
     */
    _patchModified(modifiedMap, key) {
        const deferred = [];

        // Pass 1: patch state + renderer
        for (const id in modifiedMap) {
            const numId = Number(id);
            const newState = modifiedMap[id][key];
            const obj = dataManager.getObject(numId);
            if (!obj) continue;

            // Replace state (remove stale keys, apply new values)
            for (const k of Object.keys(obj.state)) {
                if (k === 'objectId' || k === 'objectType') continue;
                if (!(k in newState)) delete obj.state[k];
            }
            Object.assign(obj.state, newState);
            dataManager.states[numId] = obj.state;

            // Reconcile renderer (reparent, layout, dirty)
            if (renderer.renderNodes.has(numId)) {
                this._reconcileParent(numId, obj);
                renderer.updateLayoutPreset(numId);
                renderer.markDirty(numId);
            }

            if (obj.applyState) deferred.push(obj);
        }

        // Pass 2: custom reconciliation hooks
        for (const obj of deferred) obj.applyState();
    }

    /** Reparent a rendered object if state.parent.referenceId changed. */
    _reconcileParent(id, obj) {
        if (!obj.parent || obj.state.parent?.referenceId == null) return;
        const newParent = dataManager.getObject(obj.state.parent.referenceId);
        if (!newParent || newParent === obj.parent) return;

        const node = renderer.renderNodes.get(id);
        const oldParentId = node.parentId;
        const newParentId = newParent.state.objectId;
        const newViewportId = newParent.viewPort?.state?.objectId ?? null;

        // Update renderer indexes
        renderer.childrenOf.get(oldParentId)?.delete(id);
        if (!renderer.childrenOf.has(newParentId)) renderer.childrenOf.set(newParentId, new Set());
        renderer.childrenOf.get(newParentId).add(id);

        if (node.viewportId != null) renderer.viewportChildren.get(node.viewportId)?.delete(id);
        if (newViewportId != null) {
            if (!renderer.viewportChildren.has(newViewportId)) renderer.viewportChildren.set(newViewportId, new Set());
            renderer.viewportChildren.get(newViewportId).add(id);
        }

        node.parentId = newParentId;
        node.viewportId = newViewportId;
        newParent.div.appendChild(obj.div);
        obj.parent = newParent;
    }

    _destroyObject(id) {
        const obj = dataManager.getObject(id);
        if (obj) {
            const parentId = obj.state.parent?.referenceId;
            const parent = dataManager.getObject(parentId);
            if (parent?.unregisterChild && parent.state.children?.includes(id)) {
                parent.unregisterChild(obj);
            }
            if (obj.destroy) obj.destroy();
        }
        delete dataManager.states[id];
        dataManager.objects.delete(id);
    }

    /** Destroy multiple objects. Top-level objects (whose parent survives) are
     *  destroyed normally. Internal objects (whose parent is also in the delta)
     *  are just removed from dataManager — their parent's destroy() handles cleanup. */
    _destroyObjects(objectMap) {
        const ids = Object.keys(objectMap).map(Number);
        if (ids.length === 0) return;

        const idSet = new Set(ids);
        const topLevel = [];
        const internal = [];

        for (const id of ids) {
            const parentId = objectMap[id].parent?.referenceId;
            if (parentId != null && !idSet.has(parentId)) {
                topLevel.push(id);
            } else {
                internal.push(id);
            }
        }

        // Destroy top-level objects (unregister from parent + destroy())
        for (const id of topLevel) this._destroyObject(id);

        // Clean up internal objects from dataManager only
        for (const id of internal) {
            delete dataManager.states[id];
            dataManager.objects.delete(id);
        }
    }

    _recreateObject(id, state) {
        dataManager.createObject(structuredClone(state));
    }

    /** Recreate multiple objects in parent-before-child order. */
    _recreateObjects(objectMap) {
        const ids = Object.keys(objectMap).map(Number);
        if (ids.length === 0) return;

        // Pre-populate dataManager.states so hydrateObject() can find them
        // during construction (e.g., Stage constructor hydrates its ViewPort)
        for (const id of ids) {
            dataManager.states[id] = structuredClone(objectMap[id]);
        }

        const idSet = new Set(ids);
        const order = [];
        const visited = new Set();

        const visit = (id) => {
            if (visited.has(id)) return;
            visited.add(id);
            const parentId = objectMap[id].parent?.referenceId;
            if (parentId != null && idSet.has(parentId)) {
                visit(parentId);
            }
            order.push(id);
        };

        for (const id of ids) visit(id);

        // Only recreate objects not already hydrated (constructor may have
        // hydrated internal objects like ViewPort/zManager via hydrateObject)
        for (const id of order) {
            if (!dataManager.objects.has(id)) {
                this._recreateObject(id, objectMap[id]);
            }
        }
    }

    // ─── Fallback: state-level apply (Step 6 approach) ───────────────────

    _applyReverseToStates(states, delta) {
        for (const id in delta.created) delete states[id];
        for (const id in delta.destroyed) states[id] = structuredClone(delta.destroyed[id]);
        for (const id in delta.modified) states[id] = structuredClone(delta.modified[id].before);
        return states;
    }

    _applyForwardToStates(states, delta) {
        for (const id in delta.destroyed) delete states[id];
        for (const id in delta.created) states[id] = structuredClone(delta.created[id]);
        for (const id in delta.modified) states[id] = structuredClone(delta.modified[id].after);
        return states;
    }

    _cloneStates() {
        return structuredClone(dataManager.states);
    }
}

export const undoManager = new UndoManager();

// Wire action events to capture
const scheduleCapture = () => undoManager.scheduleCapture();
UNDOABLE_EVENTS.forEach(evt => eventBus.on(evt, scheduleCapture));

// Wire baseline events — advance baseline without creating an undo entry
BASELINE_EVENTS.forEach(evt => eventBus.on(evt, () => {
    if (evt === 'object:grabbed') {
        // Grabbed must advance baseline synchronously — coordination events
        // (card:grabbed → Hand removes card) fire in the same synchronous block
        // AFTER object:grabbed. If we defer, the baseline would include those
        // mutations, making them invisible to the next delta.
        if (!undoManager._captureScheduled) {
            undoManager.updateBaseline();
        }
    } else {
        queueMicrotask(() => {
            if (!undoManager._captureScheduled) {
                undoManager.updateBaseline();
            }
        });
    }
}));

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoManager.undo();
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        undoManager.redo();
    }
});
