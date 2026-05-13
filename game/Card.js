import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { FlippableObjectSO, FlippableObject } from '../zui/FlippableObject.js';
import { dataManager } from '../data-management/DataManager.js';



export class CardSO extends FlippableObjectSO {
    constructor() {
        super();
        
        this.objectType = "CARD";
        this.hand = -1;
    }
}

export class Card extends FlippableObject {
    constructor(stateObject) {
        super(stateObject);

        this.hand = dataManager.getObject(this.stateObject.hand);

        this.setDefaultStyle();
    }

    setHand(hand) {
        this.hand = hand;
        if(hand) {
            this.stateObject.hand = this.hand.stateObject.objectId;
        } else {
            this.stateObject.hand = -1;
        }
    }

    setDefaultStyle() {
        this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 1px rgba(0, 0, 0, 1.0))");
    }

    pickUp() {
        super.pickUp();

        if(this.hand) this.hand.removeCard(this);
		
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

        if(this.parent.hand.mode=="RAISED") {
            this.parent.hand.addCard(this);          
        } else {
            let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
            let relX = cursorOnDiv.x/this.getScreenDimensions().width;
            let relY = cursorOnDiv.y/this.getScreenDimensions().height;
            
            Object.assign(this.stateObject, LayoutPresets.WORLD);

            let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX-(this.getScreenDimensions().width*relX), this.cursorY-(this.getScreenDimensions().height*relY));
            let cursorOnParentVP = this.parent.convertDivPosToViewPortPos(cursorOnParent.x, cursorOnParent.y);
            this.stateObject.x = cursorOnParentVP.x;
            this.stateObject.y = cursorOnParentVP.y;    

            this.resizeDiv();
            this.repositionDiv();
        }
    }
}
