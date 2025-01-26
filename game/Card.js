var cardDimensions = {svg: "card", width: 0, height: 0, uiScaling: true, behaviour:"fixed", type:"absolute"}

class Card extends FlippableObject {
    constructor(parent, x, y, facing) {
        super(parent, 0, "fixed", "absolute", x, y, cardDimensions.behaviour, cardDimensions.type, cardDimensions.uiScaling, "card", "cardBack", facing,);

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
        this.positioningBehaviour = "fixed";
        this.positionType = "absolute";
        this.dimensionsBehaviour = cardDimensions.behaviour;
        this.dimensionsType = cardDimensions.type;
        this.uiScaling = true;

        this.x = cursorOnParent.x - (this.getScreenDimensions().width * relX);
        this.y = cursorOnParent.y - (this.getScreenDimensions().height * relY);

        this.resizeDiv();
        this.repositionDiv();
    }
    drop() {
        super.drop();

        if(this.parent.hand.mode=="raised") {
            this.parent.hand.addCard(this);          
        } else {
            let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
            let relX = cursorOnDiv.x/this.getScreenDimensions().width;
            let relY = cursorOnDiv.y/this.getScreenDimensions().height;
            
            this.positioningBehaviour = "zoom";
            this.positionType = "absolute";
            this.dimensionsBehaviour = "zoom";
            this.dimensionsType = "absolute";
            this.uiScaling = false;

            let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX-(this.getScreenDimensions().width*relX), this.cursorY-(this.getScreenDimensions().height*relY));
            let cursorOnParentVP = this.parent.convertDivPosToViewPortPos(cursorOnParent.x, cursorOnParent.y);
            this.x = cursorOnParentVP.x;
            this.y = cursorOnParentVP.y;    

            this.resizeDiv();
            this.repositionDiv();
        }
    }
}