/**
 * StageSelectionManager — manages selection of objects within a Stage.
 *
 * Unlike StageZIndexManager (where every stage has its own instance), nested
 * stages share the parent's StageSelectionManager. This means a selection
 * spans the entire stage hierarchy rooted at the top-level stage that owns
 * the manager.
 *
 * Usage:
 *   selectionManager.select(object)      — select a single object (clears previous)
 *   selectionManager.toggle(object)      — add/remove from selection
 *   selectionManager.clear()             — deselect everything
 *   selectionManager.isSelected(object)  — check membership
 *   selectionManager.getSelection()      — get current selection as array
 */

import { StateObject } from '../core/StateObject.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';



export class StageSelectionManagerState extends StateObject {
    constructor() {
        super();

        this.objectType = "STAGESELECTIONMANAGER";
    }
}

export class StageSelectionManager {
    constructor(state) {
        this.state = state;
        dataManager.registerObject(this);

        /** @type {Map<number, object>} objectId → live object */
        this.selected = new Map();
    }

    /**
     * Select a single object, clearing any previous selection.
     */
    select(object) {
        if (this.selected.size === 1 && this.selected.has(object.state.objectId)) {
            return; // already the sole selection
        }
        this._clearSilent();
        this._add(object);
        this._notifyChanged();
    }

    /**
     * Toggle an object in/out of the selection.
     */
    toggle(object) {
        if (this.selected.has(object.state.objectId)) {
            this._remove(object);
        } else {
            this._add(object);
        }
        this._notifyChanged();
    }

    /**
     * Add an object to the selection without clearing.
     */
    addToSelection(object) {
        if (!this.selected.has(object.state.objectId)) {
            this._add(object);
            this._notifyChanged();
        }
    }

    /**
     * Remove a specific object from the selection.
     */
    removeFromSelection(object) {
        if (this.selected.has(object.state.objectId)) {
            this._remove(object);
            this._notifyChanged();
        }
    }

    /**
     * Clear the entire selection.
     */
    clear() {
        if (this.selected.size === 0) return;
        this._clearSilent();
        this._notifyChanged();
    }

    /**
     * Check if an object is currently selected.
     */
    isSelected(object) {
        return this.selected.has(object.state.objectId);
    }

    /**
     * Get the current selection as an array of live objects.
     */
    getSelection() {
        return Array.from(this.selected.values());
    }

    /**
     * Number of currently selected objects.
     */
    get size() {
        return this.selected.size;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    _add(object) {
        this.selected.set(object.state.objectId, object);
        this._onSelected(object);
    }

    _remove(object) {
        this.selected.delete(object.state.objectId);
        this._onDeselected(object);
    }

    _clearSilent() {
        for (const object of this.selected.values()) {
            this._onDeselected(object);
        }
        this.selected.clear();
    }

    _notifyChanged() {
        eventBus.emit('selection:changed', {
            selectionManagerId: this.state.objectId,
            selection: this.getSelection()
        });
    }

    /**
     * Visual feedback when an object is selected.
     * Override or extend as needed for different highlight styles.
     */
    _onSelected(object) {
        // TODO: apply selection highlight via renderer
    }

    /**
     * Visual feedback when an object is deselected.
     */
    _onDeselected(object) {
        // TODO: remove selection highlight via renderer
    }
}

objectRegistry.register("STAGESELECTIONMANAGER", StageSelectionManager);
