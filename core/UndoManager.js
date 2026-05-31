/**
 * UndoManager — event-triggered delta-snapshot undo/redo.
 *
 * Listens to `action:` events on the eventBus. When an action completes,
 * diffs current state against the last baseline to produce a delta.
 * Undo/redo applies deltas via dataManager.restoreData() (full rebuild).
 *
 * Step 6 implementation: delta capture (low memory), full restore on undo.
 * Step 7 will replace restoreData() with surgical _applyReverse/_applyForward.
 */

import { dataManager } from './DataManager.js';
import { eventBus } from './EventBus.js';
import { renderer } from '../rendering/Renderer.js';



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

        // Detect modified and created objects
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

        // Detect destroyed objects
        for (const id in this.lastSnapshot) {
            if (!(id in current)) {
                delta.destroyed[id] = structuredClone(this.lastSnapshot[id]);
            }
        }

        // Only push if something actually changed
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

        // Reconstruct target state by applying reverse delta to current states
        const targetStates = this._applyReverseToStates(structuredClone(dataManager.states), delta);
        const targetData = { version: 0, rootObject: dataManager.rootObject.state.objectId, states: targetStates };
        dataManager.restoreData(targetData);
        this.lastSnapshot = this._cloneStates();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        if (renderer.isDragging()) return;

        const delta = this.redoStack.pop();
        this.undoStack.push(delta);

        // Reconstruct target state by applying forward delta to current states
        const targetStates = this._applyForwardToStates(structuredClone(dataManager.states), delta);
        const targetData = { version: 0, rootObject: dataManager.rootObject.state.objectId, states: targetStates };
        dataManager.restoreData(targetData);
        this.lastSnapshot = this._cloneStates();
    }

    /**
     * Apply a delta in reverse to a states object (for undo).
     * - Created objects → remove them
     * - Destroyed objects → restore them
     * - Modified objects → apply "before" state
     */
    _applyReverseToStates(states, delta) {
        // Remove created objects
        for (const id in delta.created) {
            delete states[id];
        }
        // Restore destroyed objects
        for (const id in delta.destroyed) {
            states[id] = structuredClone(delta.destroyed[id]);
        }
        // Revert modified objects to "before"
        for (const id in delta.modified) {
            states[id] = structuredClone(delta.modified[id].before);
        }
        return states;
    }

    /**
     * Apply a delta forward to a states object (for redo).
     * - Destroyed objects → remove them
     * - Created objects → restore them
     * - Modified objects → apply "after" state
     */
    _applyForwardToStates(states, delta) {
        // Remove destroyed objects
        for (const id in delta.destroyed) {
            delete states[id];
        }
        // Restore created objects
        for (const id in delta.created) {
            states[id] = structuredClone(delta.created[id]);
        }
        // Apply modified objects to "after"
        for (const id in delta.modified) {
            states[id] = structuredClone(delta.modified[id].after);
        }
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
    queueMicrotask(() => {
        if (!undoManager._captureScheduled) {
            undoManager.updateBaseline();
        }
    });
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
