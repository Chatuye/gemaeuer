/**
 * Renderer — centralized render loop and DOM update manager.
 *
 * Singleton instance exported as `renderer`. Owns the render loop, tracks
 * dirty objects, computes screen bounds, and applies DOM updates each frame.
 *
 * The Renderer does NOT use EventBus — dirty tracking is entirely internal.
 */

import { dataManager } from '../core/DataManager.js';

// --- Module-level helpers (pure functions, not class methods) ---

/** Set of viewportIds that have already triggered a missing-viewport warning. */
const _warnedViewportIds = new Set();

/**
 * Get the bounding rect of the root rendering surface as a fallback
 * when a parent entry is not found in the entries map.
 */
function getRootBounds() {
    const el = document.getElementById('content');
    if (!el) return { x: 0, y: 0, width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/**
 * Compute a uniform UI scale factor based on the root content element size
 * relative to the reference resolution of 1920×1080.
 * @returns {number} scale factor (min of width/1920, height/1080)
 */
function getUIScale() {
    const root = document.getElementById('content').getBoundingClientRect();
    const sx = root.width / 1920;
    const sy = root.height / 1080;
    return Math.min(sx, sy);
}

/**
 * Compute screen-pixel bounds for a registered entry based on its layout preset,
 * parent bounds, and viewport state.
 *
 * @param {object} entry — the renderer entry for the object
 * @param {Map} entries — the full entries map (for parent lookup)
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function computeBounds(entry, entries) {
    const s = entry.state;
    const lp = entry.layoutPreset;
    const parentBounds = entries.get(entry.parentId)?.bounds
        ?? getRootBounds();

    // Resolve viewport state (if applicable)
    let vp = null;
    if (entry.viewportId != null) {
        const vpObj = dataManager.getObject(entry.viewportId);
        if (vpObj) {
            vp = vpObj.state;
        } else {
            if (!_warnedViewportIds.has(entry.viewportId)) {
                console.warn(`[Renderer] computeBounds: viewport ${entry.viewportId} not found — treating as identity`);
                _warnedViewportIds.add(entry.viewportId);
            }
            vp = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        }
    }

    let x, y, width, height;

    // --- Position ---
    if (lp.positionType === 'RELATIVE') {
        x = s.x * parentBounds.width;
        y = s.y * parentBounds.height;
    } else if (lp.positionBehaviour === 'ZOOM') {
        x = (s.x - vp.x) * vp.scaleX;
        y = (s.y - vp.y) * vp.scaleY;
    } else {
        // FIXED + ABSOLUTE
        x = s.x;
        y = s.y;
    }

    // --- Dimensions ---
    if (lp.dimensionsType === 'RELATIVE') {
        width = s.width * parentBounds.width;
        height = s.height * parentBounds.height;
    } else if (lp.dimensionsBehaviour === 'ZOOM') {
        width = s.width * vp.scaleX;
        height = s.height * vp.scaleY;
    } else {
        // FIXED + ABSOLUTE
        width = s.width;
        height = s.height;
        if (lp.scaleWithWindowSize) {
            const uiScale = getUIScale();
            width *= uiScale;
            height *= uiScale;
        }
    }

    return { x, y, width, height };
}

/**
 * Returns true if any of x/y/width/height differ between two bounds objects.
 * @param {{ x: number, y: number, width: number, height: number }} a
 * @param {{ x: number, y: number, width: number, height: number }} b
 * @returns {boolean}
 */
function boundsChanged(a, b) {
    return a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height;
}

/**
 * Apply DOM style updates for a dirty entry.
 *
 * Position and dimensions are ALWAYS written because bounds can change for
 * reasons not tracked in changedFields (viewport pan, window resize, parent
 * moved). Only the computed result (boundsChanged) reliably detects this,
 * and since tick() already recomputes bounds unconditionally for dirty entries,
 * we simply always write them.
 *
 * zIndex, rotation, and filter are conditional because they only change when
 * explicitly set via setState — external factors currently don't affect them.
 * If the architecture evolves to support inherited transforms (e.g., nested 
 * rotated containers), these would need to become unconditional too.
 *
 * @param {object} entry — the renderer entry for the object
 */
function applyDOM(entry) {
    const div = entry.div;
    const b = entry.bounds;
    const s = entry.state;

    // Always write — bounds depend on viewport/parent/resize, not just own state
    div.style.left = b.x + 'px';
    div.style.top = b.y + 'px';
    div.style.width = b.width + 'px';
    div.style.height = b.height + 'px';

    // Conditional — these currently only change via explicit setState calls.
    if (entry.changedFields.has('zIndex')) {
        div.style.zIndex = s.zIndex;
    }
    if (entry.changedFields.has('rotation')) {
        div.style.transformOrigin = s.transformOrigin || '50% 50%';
        div.style.transform = s.rotation ? `rotate(${s.rotation}rad)` : 'none';
    }
    if (entry.changedFields.has('filter')) {
        div.style.setProperty('-webkit-filter', s.filter || 'none');
    }
}

class Renderer {
    constructor() {
        this.entries = new Map();   // objectId → entry
        this.rootEl = null;
        this.running = false;
        this.frameId = null;
        this.dragTarget = null;     // objectId of object being dragged, or null
    }

    /**
     * Register an object with the Renderer for managed DOM updates.
     * @param {number} objectId — unique identifier for the object
     * @param {object} options
     * @param {object} options.state — reference to the object's StateObject
     * @param {HTMLElement} options.div — the DOM element the Renderer manages
     * @param {number|null} options.parentId — objectId of parent (for layout computation)
     * @param {number|null} options.viewportId — objectId of the governing viewport
     */
    register(objectId, { state, div, parentId, viewportId }) {
        const entry = {
            objectId,
            state,
            div,
            dirty: false,
            changedFields: new Set(),
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            layoutPreset: {
                positionBehaviour: state.positionBehaviour,
                positionType: state.positionType,
                dimensionsBehaviour: state.dimensionsBehaviour,
                dimensionsType: state.dimensionsType,
                scaleWithWindowSize: state.scaleWithWindowSize
            },
            parentId: parentId ?? null,
            viewportId: viewportId ?? null
        };

        div.setAttribute('data-object-id', objectId);
        this.entries.set(objectId, entry);
    }

    /**
     * Unregister an object — removes its entry and cleans up the data attribute.
     * No-op if the objectId is not registered.
     * @param {number} objectId — identifier of the object to remove
     */
    unregister(objectId) {
        const entry = this.entries.get(objectId);
        if (!entry) return;

        entry.div.removeAttribute('data-object-id');
        this.entries.delete(objectId);
    }

    /**
     * Update the layout preset for a registered object. Call this after changing
     * an object's positioning fields (e.g., Object.assign(state, LayoutPresets.SCREEN))
     * so the Renderer uses the correct computation path on the next frame.
     * Marks the object dirty since its bounds likely changed.
     * No-op if the objectId is not registered.
     * @param {number} objectId — identifier of the object
     */
    updateLayoutPreset(objectId) {
        const entry = this.entries.get(objectId);
        if (!entry) return;

        entry.layoutPreset = {
            positionBehaviour: entry.state.positionBehaviour,
            positionType: entry.state.positionType,
            dimensionsBehaviour: entry.state.dimensionsBehaviour,
            dimensionsType: entry.state.dimensionsType,
            scaleWithWindowSize: entry.state.scaleWithWindowSize
        };
        entry.dirty = true;
    }

    /**
     * Set a single state field for a registered object.
     * Skips if the value is unchanged. Silently ignores unregistered objectIds.
     * @param {number} objectId — identifier of the object
     * @param {string} field — state field name to update
     * @param {*} value — new value for the field
     */
    setState(objectId, field, value) {
        const entry = this.entries.get(objectId);
        if (!entry) return;

        if (entry.state[field] === value) return;

        entry.state[field] = value;
        entry.dirty = true;
        entry.changedFields.add(field);
    }

    /**
     * Main render loop. Iterates entries in registration order (parent-first),
     * computes bounds for dirty entries, propagates dirty to children if bounds
     * changed, applies DOM updates, and clears dirty state.
     */
    tick() {
        for (const [id, entry] of this.entries) {
            if (!entry.dirty) continue;

            const oldBounds = { ...entry.bounds };
            entry.bounds = computeBounds(entry, this.entries);

            // If bounds changed, mark children dirty so they recompute next
            if (boundsChanged(oldBounds, entry.bounds)) {
                for (const [, child] of this.entries) {
                    if (child.parentId === id) child.dirty = true;
                }
            }

            applyDOM(entry);
            entry.dirty = false;
            entry.changedFields.clear();
        }

        if (this.running) this.frameId = requestAnimationFrame(() => this.tick());
    }

    /**
     * Start the render loop.
     * @param {HTMLElement} rootEl — the root rendering surface element
     */
    start(rootEl) {
        this.rootEl = rootEl;
        this.running = true;
        this._onResize = () => this.markAllDirty();
        window.addEventListener('resize', this._onResize);

        // Bind and attach centralized mouse event listeners
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._boundDblClick = this._onDblClick.bind(this);
        this._boundWheel = this._onWheel.bind(this);

        this.rootEl.addEventListener('mousedown', this._boundMouseDown);
        this.rootEl.addEventListener('mousemove', this._boundMouseMove);
        this.rootEl.addEventListener('mouseup', this._boundMouseUp);
        this.rootEl.addEventListener('dblclick', this._boundDblClick);
        this.rootEl.addEventListener('wheel', this._boundWheel, { passive: false });

        this.frameId = requestAnimationFrame(() => this.tick());
    }

    /**
     * Stop the render loop and cancel any pending animation frame.
     */
    stop() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
        window.removeEventListener('resize', this._onResize);

        // Remove centralized mouse event listeners
        if (this.rootEl) {
            this.rootEl.removeEventListener('mousedown', this._boundMouseDown);
            this.rootEl.removeEventListener('mousemove', this._boundMouseMove);
            this.rootEl.removeEventListener('mouseup', this._boundMouseUp);
            this.rootEl.removeEventListener('dblclick', this._boundDblClick);
            this.rootEl.removeEventListener('wheel', this._boundWheel);
        }
    }

    /**
     * Mark only ZOOM-dependent objects under a specific viewport as dirty.
     * Called when a viewport's state changes (pan/zoom).
     * @param {number} viewportId — objectId of the viewport that changed
     */
    notifyViewportChanged(viewportId) {
        for (const [, entry] of this.entries) {
            if (entry.viewportId !== viewportId) continue;
            if (entry.layoutPreset.positionBehaviour === 'ZOOM' ||
                entry.layoutPreset.dimensionsBehaviour === 'ZOOM') {
                entry.dirty = true;
            }
        }
    }

    /**
     * Mark all registered entries as dirty. Used on window resize since
     * resize affects all layout modes.
     */
    markAllDirty() {
        for (const [, entry] of this.entries) {
            entry.dirty = true;
        }
    }

    /**
     * Query an object's current computed bounds by objectId.
     * @param {number} objectId — identifier of the object
     * @returns {{ x: number, y: number, width: number, height: number } | null}
     */
    getComputedBounds(objectId) {
        const entry = this.entries.get(objectId);
        if (!entry) return null;
        return { ...entry.bounds };
    }

    /**
     * Convert screen (client) coordinates to local coordinates relative to
     * an object's computed bounds. Accounts for the root element's page offset
     * (e.g., menu bar above the content div) so that client coordinates from
     * MouseEvents are correctly mapped to container-relative bounds.
     * @param {number} clientX — screen X coordinate (e.g. from MouseEvent)
     * @param {number} clientY — screen Y coordinate (e.g. from MouseEvent)
     * @param {number} objectId — identifier of the target object
     * @returns {{ x: number, y: number } | null} local coordinates, or null if objectId unknown
     */
    screenToLocal(clientX, clientY, objectId) {
        const bounds = this.entries.get(objectId)?.bounds;
        if (!bounds) return null;
        const rootRect = this.rootEl.getBoundingClientRect();
        return {
            x: clientX - rootRect.left - bounds.x,
            y: clientY - rootRect.top - bounds.y
        };
    }

    /**
     * Convert local coordinates within a stage object to viewport (world)
     * coordinates using the stage's associated viewport.
     * @param {number} localX — X position relative to the stage's bounds
     * @param {number} localY — Y position relative to the stage's bounds
     * @param {number} stageObjectId — identifier of the stage object
     * @returns {{ x: number, y: number } | null} viewport coordinates, or null if unknown
     */
    localToViewport(localX, localY, stageObjectId) {
        const entry = this.entries.get(stageObjectId);
        if (!entry) return null;
        const vp = dataManager.getObject(entry.viewportId);
        if (!vp) return null;
        const b = entry.bounds;
        const relX = localX / b.width;
        const relY = localY / b.height;
        const dims = vp.getDimensions();
        return {
            x: vp.getX() + dims.width * relX,
            y: vp.getY() + dims.height * relY
        };
    }

    // --- Input Handling ---

    /**
     * Internal mousedown handler. Hit-tests the event target and forwards
     * to the owning game object's onMouseDown method.
     * @param {MouseEvent} e
     */
    _onMouseDown(e) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const objectId = target?.closest('[data-object-id]')
            ?.getAttribute('data-object-id');
        if (objectId == null) return;

        const obj = dataManager.getObject(Number(objectId));
        if (obj?.onMouseDown) obj.onMouseDown(e);
    }

    /**
     * Internal mousemove handler. If a drag is active, forwards to the drag
     * target. Otherwise performs hit-test forwarding for hover effects.
     * @param {MouseEvent} e
     */
    _onMouseMove(e) {
        if (this.dragTarget != null) {
            const obj = dataManager.getObject(this.dragTarget);
            if (obj?.onMouseMove) obj.onMouseMove(e);
            return;
        }
    }

    /**
     * Internal mouseup handler. If a drag is active, forwards to the drag
     * target and ends the drag. Otherwise performs hit-test forwarding.
     * @param {MouseEvent} e
     */
    _onMouseUp(e) {
        if (this.dragTarget != null) {
            const obj = dataManager.getObject(this.dragTarget);
            if (obj?.onMouseUp) obj.onMouseUp(e);
            this.endDrag();
            return;
        }
    }

    /**
     * Internal dblclick handler. Hit-tests and forwards to the owning
     * game object's onDoubleClick method.
     * @param {MouseEvent} e
     */
    _onDblClick(e) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const objectId = target?.closest('[data-object-id]')
            ?.getAttribute('data-object-id');
        if (objectId == null) return;

        const obj = dataManager.getObject(Number(objectId));
        if (obj?.onDoubleClick) obj.onDoubleClick(e);
    }

    /**
     * Internal wheel handler. Hit-tests and forwards to the owning
     * game object's onWheel method.
     * @param {WheelEvent} e
     */
    _onWheel(e) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const objectId = target?.closest('[data-object-id]')
            ?.getAttribute('data-object-id');
        if (objectId == null) return;

        const obj = dataManager.getObject(Number(objectId));
        if (obj?.onWheel) obj.onWheel(e);
    }

    // --- Drag Capture ---

    /**
     * Begin a drag operation. While active, mousemove and mouseup events
     * are routed to the drag target regardless of cursor position.
     * @param {number} objectId — identifier of the object being dragged
     */
    startDrag(objectId) {
        this.dragTarget = objectId;
    }

    /**
     * End the current drag operation, releasing event capture.
     */
    endDrag() {
        this.dragTarget = null;
    }
}

export const renderer = new Renderer();

// Export pure functions for testing
export { computeBounds, getUIScale, boundsChanged, applyDOM };
