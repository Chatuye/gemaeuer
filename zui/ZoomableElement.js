/**
 * ZoomableElement — base class for all visual objects in the ZUI layer.
 *
 * ZUI objects are inherently visual: they own a DOM element and cannot exist
 * without one. Their coordinate math (positioning, hit testing, screen
 * dimensions) depends on rendered layout — bounding rects, viewport scale,
 * and parent geometry are all derived from the live DOM.
 *
 * The design contract:
 *   - ZoomableElementState (StateObject subclass) holds serialisable state.
 *   - ZoomableElement (this class) IS the rendered representation.
 *   - Construction creates the DOM element and registers with the Renderer.
 *   - There is no "headless" mode — if you have a ZoomableElement, it's on screen.
 */

import { StateObject } from '../core/StateObject.js';
import { LayoutPresets } from './config/LayoutPresets.js';
import { randomHexColorCode } from '../utils.js';
import { dataManager } from '../core/DataManager.js';
import { renderer } from '../rendering/Renderer.js';



export class ZoomableElementState extends StateObject {
    constructor() {
        super();

        this.objectType = "ZOOMABLEELEMENT";
        
        this.parent = { referenceId: -1 };
        
        Object.assign(this, LayoutPresets.WORLD);
        this.inset = null;  // { top, right, bottom, left } — null values mean "not constrained"
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.layer = 0;
        this.zIndex = 0;
    }
}

export class ZoomableElement {
	constructor(state) {
        this.state = state;
        dataManager.registerObject(this);


        this.parent = dataManager.getObject(this.state.parent.referenceId);

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
		// this.div.style.backgroundColor = randomHexColorCode();
		this.parent.div.appendChild(this.div);
        
		
        this.cursorX = 0;
		this.cursorY = 0;
        this.grabbing = null;
        this.isGrabbed = false;
        this.grabbedChild = null;


        // Register with the Renderer BEFORE zManager.set (which calls setZIndex → renderer.setState)
        renderer.register(this.state.objectId, {
            state: this.state,
            div: this.div,
            parentId: this.parent.state.objectId,
            viewportId: this.parent.viewPort?.state?.objectId ?? null
        });

        this.parent.zManager.set(this, this.state.layer);
    }



    onDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    onMouseDown(e) {
        e.stopPropagation();

		this.cursorX = e.clientX;
		this.cursorY = e.clientY;

        // Start drag capture immediately so mousemove/mouseup are forwarded during grabbing phase
        renderer.startDrag(this.state.objectId);

        if(this.state.positionType == "ABSOLUTE")
            this.grabbing = window.setTimeout(this.grabbed.bind(this), 200);
	}
	onMouseMove(e) {
        if(this.grabbing) {
            clearTimeout(this.grabbing);
            this.isGrabbed = false;
            this.grabbing = null;
        }

        let dX = e.clientX - this.cursorX;
        let dY = e.clientY - this.cursorY;
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
   
        if(this.isGrabbed) {
            if(this.state.positionBehaviour == "ZOOM") {
                dX /= this.parent.getViewPort().getScaleX();
                dY /= this.parent.getViewPort().getScaleY();
            }
            // Inset-driven dragging: update inset values directly
            if (this.state.inset) {
                const ins = this.state.inset;
                // Horizontal
                if (ins.left != null && ins.right != null) {
                    ins.left += dX;
                    ins.right -= dX;
                } else if (ins.left != null) {
                    ins.left += dX;
                } else if (ins.right != null) {
                    ins.right -= dX;
                }
                // Vertical
                if (ins.top != null && ins.bottom != null) {
                    ins.top += dY;
                    ins.bottom -= dY;
                } else if (ins.top != null) {
                    ins.top += dY;
                } else if (ins.bottom != null) {
                    ins.bottom -= dY;
                }
                renderer.markDirty(this.state.objectId);
            } else {
                this.moveTo((this.state.x + dX), (this.state.y + dY));
            }
        }
	}
	onMouseUp(e) {
        if(this.grabbing) {
            clearTimeout(this.grabbing);
            this.grabbing = null;
            let responsibleSelectionManger = this.getResponsibleSelectionManager();
            if (responsibleSelectionManger) {
                if(this.parent.state.objectType == "ROOTOBJECT")
                    responsibleSelectionManger.clear();
                    //responsibleSelectionManger.select(this);
                else
                    responsibleSelectionManger.select(this);
            }
        }
        if(this.isGrabbed) this.drop(e.clientX, e.clientY);

        renderer.endDrag();
	}

    getResponsibleSelectionManager() {
        let current = this.parent;
        while (current) {
            if (current.selectionManager) return current.selectionManager;
            current = current.parent;
        }
        return this.selectionManager ?? null;
    }

    moveTo(x, y) {
        renderer.setStateMulti(this.state.objectId, { x, y });
    }
    grabbed() {
        this.parent.grabbedChild = this;
        this.grabbing = null;
        this.isGrabbed = true;
		renderer.setState(this.state.objectId, 'filter', "drop-shadow(0px 0px 4px rgba(0, 0, 0, 1.0)) drop-shadow(0px 0px 24px rgba(255, 255, 255, 0.33))");

        // Capture cursor's relative position on the object (0–1) for cross-stage drop positioning
        let bounds = this.div.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
            this._grabRelX = (this.cursorX - bounds.left) / bounds.width;
            this._grabRelY = (this.cursorY - bounds.top) / bounds.height;
        }

        if(this.parent.zManager) {
            this.parent.zManager.remove(this);
            this.parent.zManager.set(this, 3);
        }
    }
    /**
     * Called when an object is dropped. Clears the grabbed state and resets
     * visual style.
     *
     * IMPORTANT: Must clear parent.grabbedChild so that Hand.positionCards()
     * correctly counts all cards in the fan. Without this, the fan layout
     * would miscalculate positions after a card is returned to the hand.
     */
    drop() {
        this.isGrabbed = false;
        this.parent.grabbedChild = null;
		this.setDefaultStyle();

        this._placeOnStage();
    }

    /**
     * Determines which stage the object was dropped onto, reparents if needed,
     * converts to WORLD layout, and positions the object in the target stage's
     * viewport coordinates.
     */
    _placeOnStage() {
        this.div.style.pointerEvents = "none";
        let targetStage = this.getStageAtCursor(this.cursorX, this.cursorY);
        this.div.style.pointerEvents = "";

        if (!targetStage) targetStage = this.parent;

        // Reparent if target differs from current parent
        if (targetStage !== this.parent) {
            // Use cursor position for cross-stage drops (viewport zoom differs)
            let cursorLocal = renderer.screenToLocal(this.cursorX, this.cursorY, targetStage.state.objectId);
            let cursorWorld = renderer.localToViewport(cursorLocal.x, cursorLocal.y, targetStage.state.objectId);

            this.reparentTo(targetStage);
            // reparentTo doesn't add to zManager
            if (this.parent.zManager) {
                this.parent.zManager.set(this, 0);
            }

            Object.assign(this.state, LayoutPresets.WORLD);
            renderer.updateLayoutPreset(this.state.objectId);

            // Offset by grab-relative position using intrinsic dimensions (WORLD units)
            let relX = this._grabRelX ?? 0.5;
            let relY = this._grabRelY ?? 0.5;
            renderer.setStateMulti(this.state.objectId, {
                x: cursorWorld.x - (this.state.width * relX),
                y: cursorWorld.y - (this.state.height * relY)
            });
        } else {
            // Same parent — convert cursor to world, offset by grab-relative position
            let cursorLocal = renderer.screenToLocal(this.cursorX, this.cursorY, targetStage.state.objectId);
            let cursorWorld = renderer.localToViewport(cursorLocal.x, cursorLocal.y, targetStage.state.objectId);

            if (this.parent.zManager) {
                this.parent.zManager.remove(this);
                this.parent.zManager.set(this, 0);
            }

            Object.assign(this.state, LayoutPresets.WORLD);
            renderer.updateLayoutPreset(this.state.objectId);

            let relX = this._grabRelX ?? 0.5;
            let relY = this._grabRelY ?? 0.5;
            renderer.setStateMulti(this.state.objectId, {
                x: cursorWorld.x - (this.state.width * relX),
                y: cursorWorld.y - (this.state.height * relY)
            });
        }

        this._grabRelX = null;
        this._grabRelY = null;
    }
    setDefaultStyle() {
		renderer.setState(this.state.objectId, 'filter', "drop-shadow(0px 0px 0px rgba(0, 0, 0, 1.0))");
    }



    onParentChange() {
        renderer.markDirty(this.state.objectId);
    }


    /**
     * Get screen dimensions for this object.
     *
     * IMPORTANT: Only uses cached Renderer bounds if the render node is NOT dirty.
     * After a layout preset change (updateLayoutPreset), the render node is dirty
     * and cached bounds are STALE (computed with the old preset). In that case,
     * falls through to synchronous computation using the current state fields.
     * This is critical for Card.grabbed() and Card.onDroppedOnStage() which
     * need fresh dimensions immediately after a preset swap.
     */
    getScreenDimensions() {
        let bounds = renderer.getComputedBounds(this.state.objectId);
        let node = renderer.renderNodes.get(this.state.objectId);
        // Only use cached bounds if render node is NOT dirty (bounds are fresh)
        if (bounds && !node?.dirty && (bounds.width !== 0 || bounds.height !== 0)) return { width: bounds.width, height: bounds.height };
        // Compute directly (render node is dirty or before first frame tick)
        let width = 0;
        let height = 0;
        if(this.state.dimensionsType == "RELATIVE") {
            width = this.state.width * this.parent.getScreenDimensions().width;
            height = this.state.height * this.parent.getScreenDimensions().height;
        } else if(this.state.dimensionsType == "ABSOLUTE") {
            width = this.state.width;
            height = this.state.height;
            if(this.state.dimensionsBehaviour == "ZOOM") {
                width *= this.parent.getViewPort().getScaleX();
                height *= this.parent.getViewPort().getScaleY();
            }
            if(this.state.scaleWithWindowSize) {
                let uiScale = this.getMainStage().getUIScale(true);
                width *= uiScale.scaleX;
                height *= uiScale.scaleY;
            }
        }
        return {width: width, height: height};
    }


    setZIndex(index) {
        renderer.setState(this.state.objectId, 'zIndex', index);
    }    
    getZIndex() {
        return this.state.zIndex;
    }
    getMainStage() {
        if(this.parent.state.objectType === "ROOTOBJECT")
            return this;
        else
            return this.parent.getMainStage();
    }


    convertScreenPosToDivPos(x, y) {
        let result = renderer.screenToLocal(x, y, this.state.objectId);
        if (result) return result;
        // Fallback
        let cursorXOnDiv = Math.round(x - this.div.getBoundingClientRect().left);
		let cursorYOnDiv = Math.round(y - this.div.getBoundingClientRect().top);
        return { x: cursorXOnDiv, y: cursorYOnDiv};
    }

    /**
     * Returns the Stage (or GameStage) at the given screen coordinates.
     * Finds the topmost object at (screenX, screenY) via elementFromPoint,
     * then walks up the parent chain to find the nearest ancestor with a viewPort
     * (i.e., a Stage). Returns null if no stage is found.
     *
     * NOTE: The caller is responsible for hiding the dragged object's div
     * (e.g., pointer-events: none) before calling, to avoid hitting itself.
     */
    getStageAtCursor(screenX, screenY) {
        let el = document.elementFromPoint(screenX, screenY);
        let objectEl = el?.closest('[data-object-id]');
        if (!objectEl) return null;

        let objectId = Number(objectEl.getAttribute('data-object-id'));
        let obj = dataManager.getObject(objectId);

        while (obj) {
            if (obj.viewPort) return obj;
            obj = obj.parent;
        }
        return null;
    }

    /**
     * Reparent this object to a new Stage.
     *
     * Transfers ownership from the current parent to newParent:
     *   1. Unregisters from old parent (children array, state array, zManager)
     *   2. Updates parent references (live + state)
     *   3. Registers on new parent (children array, state array, zManager)
     *   4. Updates the Renderer's render node (parentId, viewportId, DOM position)
     *   5. Marks dirty so bounds are recomputed next frame
     *
     * Does NOT update x/y coordinates — the caller is responsible for
     * converting position to the new parent's coordinate space.
     */
    reparentTo(newParent) {
        let oldParent = this.parent;
        if (oldParent === newParent) return;

        // 1. Remove from old parent
        oldParent.unregisterChild(this);

        // 2. Update live + state references
        this.parent = newParent;
        this.state.parent.referenceId = newParent.state.objectId;

        // 3. Register on new parent
        newParent.registerChild(this);

        // 4. Update Renderer's render node
        let node = renderer.renderNodes.get(this.state.objectId);
        let oldParentId = node.parentId;
        let oldViewportId = node.viewportId;

        let newParentId = newParent.state.objectId;
        let newViewportId = newParent.viewPort?.state?.objectId ?? null;

        // Update childrenOf index
        renderer.childrenOf.get(oldParentId)?.delete(this.state.objectId);
        if (!renderer.childrenOf.has(newParentId)) renderer.childrenOf.set(newParentId, new Set());
        renderer.childrenOf.get(newParentId).add(this.state.objectId);

        // Update viewportChildren index
        if (oldViewportId != null) {
            renderer.viewportChildren.get(oldViewportId)?.delete(this.state.objectId);
        }
        if (newViewportId != null) {
            if (!renderer.viewportChildren.has(newViewportId))
                renderer.viewportChildren.set(newViewportId, new Set());
            renderer.viewportChildren.get(newViewportId).add(this.state.objectId);
        }

        node.parentId = newParentId;
        node.viewportId = newViewportId;

        // 5. Move DOM element to new parent's div and mark dirty
        newParent.div.appendChild(this.div);
        renderer.markDirty(this.state.objectId);
    }

    /**
     * Destroy this object — clean up external listeners and references.
     * Override in subclasses to remove event subscriptions, DOM listeners, etc.
     * Always call super.destroy() at the end of the override.
     */
    destroy() {
        if (this.grabbing) {
            clearTimeout(this.grabbing);
            this.grabbing = null;
        }
        this.div.remove();
        renderer.unregister(this.state.objectId);
    }
}
