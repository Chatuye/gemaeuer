/**
 * UndoManager — event-triggered full-snapshot undo/redo.
 *
 * Listens to `action:` events on the eventBus. When an action completes,
 * captures a full snapshot of all states. Undo/redo restores from snapshots
 * using dataManager.restoreData().
 *
 * This is the Step 2 implementation (full snapshots). Steps 6–7 will replace
 * internals with delta snapshots for better performance.
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
    'selection:changed',
];

class UndoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this._captureScheduled = false;
    }

    /** Take initial baseline after game setup or load */
    init() {
        this.undoStack = [];
        this.redoStack = [];
        this._captureScheduled = false;
        // Push initial snapshot so first undo has something to restore to
        this.undoStack.push(this._snapshot());
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
        const snapshot = this._snapshot();
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length <= 1) return; // need at least 2: current + previous
        if (renderer.isDragging()) return;

        const current = this.undoStack.pop();
        this.redoStack.push(current);

        const previous = this.undoStack[this.undoStack.length - 1];
        this._restore(previous);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        if (renderer.isDragging()) return;

        const snapshot = this.redoStack.pop();
        this.undoStack.push(snapshot);
        this._restore(snapshot);
    }

    _snapshot() {
        return structuredClone(dataManager.gatherData());
    }

    _restore(snapshot) {
        dataManager.restoreData(structuredClone(snapshot));
    }
}

export const undoManager = new UndoManager();

// Wire action events to capture
const scheduleCapture = () => undoManager.scheduleCapture();
UNDOABLE_EVENTS.forEach(evt => eventBus.on(evt, scheduleCapture));

// Wire baseline events — advance snapshot without creating an undo entry
BASELINE_EVENTS.forEach(evt => eventBus.on(evt, () => {
    queueMicrotask(() => {
        if (!undoManager._captureScheduled) {
            // Replace the top of the undo stack with current state
            // so the next undo restores to post-selection state
            undoManager.undoStack[undoManager.undoStack.length - 1] = undoManager._snapshot();
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
