var cardDimensions = {svg: "card", width: 0, height: 0, uiScaling: true, behaviour:"FIXED", type:"ABSOLUTE"}

class CardDO extends FlippableObjectDO {
    constructor() {
        super();
        
        this.objectType = "CARD";
    }
}

class Card extends FlippableObject {
    constructor(dataObject) {
        super(dataObject);

        this.hand = null;

        this.setDefaultStyle();
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
        this.dataObject.positionBehaviour = "FIXED";
        this.dataObject.positionType = "ABSOLUTE";
        this.dataObject.dimensionsBehaviour = cardDimensions.behaviour;
        this.dataObject.dimensionsType = cardDimensions.type;

        this.dataObject.x = cursorOnParent.x - (this.getScreenDimensions().width * relX);
        this.dataObject.y = cursorOnParent.y - (this.getScreenDimensions().height * relY);

        this.resizeDiv();
        this.repositionDiv();
    }
    drop() {
        this.parent.zManager.remove(this.getZLayer(), this);
        this.parent.zManager.set(0, this);
        super.drop();

        if(this.parent.hand.mode=="RAISED") {
            this.parent.hand.addCard(this);          
        } else {
            let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
            let relX = cursorOnDiv.x/this.getScreenDimensions().width;
            let relY = cursorOnDiv.y/this.getScreenDimensions().height;
            
            this.dataObject.positionBehaviour = "ZOOM";
            this.dataObject.positionType = "ABSOLUTE";
            this.dataObject.dimensionsBehaviour = "ZOOM";
            this.dataObject.dimensionsType = "ABSOLUTE";

            let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX-(this.getScreenDimensions().width*relX), this.cursorY-(this.getScreenDimensions().height*relY));
            let cursorOnParentVP = this.parent.convertDivPosToViewPortPos(cursorOnParent.x, cursorOnParent.y);
            this.dataObject.x = cursorOnParentVP.x;
            this.dataObject.y = cursorOnParentVP.y;    

            this.resizeDiv();
            this.repositionDiv();
        }
    }
}