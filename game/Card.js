import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { FlippableObjectSO, FlippableObject } from '../zui/FlippableObject.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';



export class CardSO extends FlippableObjectSO {
    constructor() {
        super();
        
        this.objectType = "CARD";
    }
}

export class Card extends FlippableObject {
    constructor(stateObject) {
        super(stateObject);

        this.setDefaultStyle();

        this.onDroppedOnStage = ({ card }) => {
            if (card !== this) return;

            let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
            let relX = cursorOnDiv.x / this.getScreenDimensions().width;
            let relY = cursorOnDiv.y / this.getScreenDimensions().height;

            Object.assign(this.stateObject, LayoutPresets.WORLD);

            let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX - (this.getScreenDimensions().width * relX), this.cursorY - (this.getScreenDimensions().height * relY));
            let cursorOnParentVP = this.parent.convertDivPosToViewPortPos(cursorOnParent.x, cursorOnParent.y);
            this.stateObject.x = cursorOnParentVP.x;
            this.stateObject.y = cursorOnParentVP.y;

            this.resizeDiv();
            this.repositionDiv();
        };
        eventBus.on('card:droppedOnStage', this.onDroppedOnStage);
    }

    setDefaultStyle() {
        this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 1px rgba(0, 0, 0, 1.0))");
    }

    grabbed() {
        super.grabbed();

        eventBus.emit('card:grabbed', { card: this });
		
        let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
        let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX, this.cursorY);
        let relX = cursorOnDiv.x/this.getScreenDimensions().width;
        let relY = cursorOnDiv.y/this.getScreenDimensions().height;
        
        this.div.style.transform = "none";
        Object.assign(this.stateObject, LayoutPresets.SCREEN);

        this.stateObject.x = cursorOnParent.x - (this.getScreenDimensions().width * relX);
        this.stateObject.y = cursorOnParent.y - (this.getScreenDimensions().height * relY);

        this.resizeDiv();
        this.repositionDiv();
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
