var cardDimensions = {svg: "card", svgWidth: 1, svgHeight: 1, behaviour: "fixed", type: "absolute", width: 100, height: 100}

class Card extends FlippableElement {
    constructor(parent, x, y, facing) {
        super(parent, "fixed", "absolute", x, y, cardDimensions.behaviour, cardDimensions.type, cardDimensions.width, cardDimensions.height, "card", "cardBack", facing, "keepAspectRatio");

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
        this.dimensionsBehaviour = "fixed";
        this.dimensionsType = cardDimensions.type;
        this.contentBehaviour = "keepAspectRatio";


        //console.log("Width: "+this.width)
        this.setScreenDimensionsToParentScale();
        //console.log("Width: "+this.width)
        this.resizeDiv();
        this.x = cursorOnParent.x - (this.getScreenDimensions().width * relX);
        this.y = cursorOnParent.y - (this.getScreenDimensions().height * relY);
        this.repositionDiv();
    }
    drop() {
        super.drop();

        if(this.parent.hand.mode=="raised") {
            this.positioningBehaviour = "fixed";
            this.positionType = "absolute";
            this.dimensionsBehaviour = "fixed";
            this.dimensionsType = cardDimensions.type;
            this.contentBehaviour = "keepAspectRatio";

            this.parent.hand.addCard(this);
//            this.setScreenDimensionsToParentScale();
            this.resizeDiv();            
        } else {
            let cursorOnDiv = this.convertScreenPosToDivPos(this.cursorX, this.cursorY);
            let relX = cursorOnDiv.x/this.getScreenDimensions().width;
            let relY = cursorOnDiv.y/this.getScreenDimensions().height;
            
            this.positioningBehaviour = "zoom";
            this.positionType = "absolute";
            this.dimensionsBehaviour = "zoom";
            this.dimensionsType = "absolute";
            this.contentBehaviour = "fixed";
            //this.width = this.contentWidth;
            //this.height = this.contentHeight;

            let cursorOnParent = this.parent.convertScreenPosToDivPos(this.cursorX-(this.getScreenDimensions().width*relX), this.cursorY-(this.getScreenDimensions().height*relY));
            let cursorOnParentVP = this.parent.convertDivPosToViewPortPos(cursorOnParent.x, cursorOnParent.y);
            this.x = cursorOnParentVP.x;
            this.y = cursorOnParentVP.y;    

            this.resizeDiv();
            this.repositionDiv();
        }
    }
}