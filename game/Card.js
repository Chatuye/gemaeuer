import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { FlippableObjectState, FlippableObject } from '../zui/FlippableObject.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { renderer } from '../rendering/Renderer.js';



export class CardState extends FlippableObjectState {
    constructor() {
        super();
        
        this.objectType = "CARD";
    }
}

export class Card extends FlippableObject {
    constructor(state) {
        super(state);

        this.setDefaultStyle();

        this.onDroppedOnStage = ({ card }) => {
            if (card !== this) return;

            // Capture cursor position relative to card BEFORE layout swap (SCREEN bounds)
            let cursorOnDiv = renderer.screenToLocal(this.cursorX, this.cursorY, this.state.objectId);
            let screenBounds = renderer.getComputedBounds(this.state.objectId);
            let relX = cursorOnDiv.x / screenBounds.width;
            let relY = cursorOnDiv.y / screenBounds.height;

            // Swap to WORLD layout
            Object.assign(this.state, LayoutPresets.WORLD);
            renderer.updateLayoutPreset(this.state.objectId);

            // Get new WORLD dimensions (render node is dirty, so getScreenDimensions computes fresh)
            let newDims = this.getScreenDimensions();

            // Compute card's top-left screen position using new WORLD dimensions
            // (matches old code which called getScreenDimensions() after the swap)
            let cardTopLeftScreenX = this.cursorX - (newDims.width * relX);
            let cardTopLeftScreenY = this.cursorY - (newDims.height * relY);

            let cursorOnParent = renderer.screenToLocal(cardTopLeftScreenX, cardTopLeftScreenY, this.parent.state.objectId);
            let cursorOnParentVP = renderer.localToViewport(cursorOnParent.x, cursorOnParent.y, this.parent.state.objectId);
            renderer.setStateMulti(this.state.objectId, { x: cursorOnParentVP.x, y: cursorOnParentVP.y });
        };
        eventBus.on('card:droppedOnStage', this.onDroppedOnStage);
    }

    setDefaultStyle() {
        renderer.setState(this.state.objectId, 'filter', "drop-shadow(0px 0px 1px rgba(0, 0, 0, 1.0))");
    }

    /**
     * Called when a card is grabbed from the world or hand.
     *
     * Swaps layout from current preset to SCREEN so the card follows the cursor
     * in screen space. Key detail: relX/relY are computed from OLD bounds (before
     * swap), but the new position uses NEW dimensions (after swap via
     * getScreenDimensions which computes fresh when render node is dirty). This ensures
     * the cursor stays at the same relative position on the card even when the
     * card changes size (e.g., WORLD with viewport zoom → SCREEN with uiScale).
     */
    grabbed() {
        super.grabbed();

        eventBus.emit('card:grabbed', { card: this });
		
        // Capture cursor position relative to card BEFORE layout swap
        let cursorOnDiv = renderer.screenToLocal(this.cursorX, this.cursorY, this.state.objectId);
        let oldBounds = renderer.getComputedBounds(this.state.objectId);
        let relX = cursorOnDiv.x / oldBounds.width;
        let relY = cursorOnDiv.y / oldBounds.height;
        
        // Swap to SCREEN layout
        renderer.setState(this.state.objectId, 'rotation', 0);
        Object.assign(this.state, LayoutPresets.SCREEN);
        renderer.updateLayoutPreset(this.state.objectId);

        // After layout swap, card dimensions change (SCREEN uses uiScale).
        // getComputedBounds still has old cached bounds (tick hasn't run yet).
        // Use getScreenDimensions() which computes synchronously with fallback.
        let newDims = this.getScreenDimensions();

        // Position card so cursor stays at same relative position
        let cursorOnParent = renderer.screenToLocal(this.cursorX, this.cursorY, this.parent.state.objectId);
        renderer.setStateMulti(this.state.objectId, {
            x: cursorOnParent.x - (newDims.width * relX),
            y: cursorOnParent.y - (newDims.height * relY)
        });
    }
    drop() {
        super.drop();
        eventBus.emit('card:dropped', { card: this });
    }

    destroy() {
        eventBus.off('card:droppedOnStage', this.onDroppedOnStage);
    }
}

objectRegistry.register("CARD", Card);
