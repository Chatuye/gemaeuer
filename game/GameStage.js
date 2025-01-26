class GameStage extends Stage {
	constructor(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, uiScaling, w, h, viewPortType, vW, vH, vpScaling) {
        super(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, uiScaling, w, h, viewPortType, vW, vH, vpScaling);

        this.hand = null;

        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    onMouseMove(e) {
        if(this.addedMouseMove)
            super.onMouseMove(e);

        if(this.hand) {
            let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
            if(cursorOnDiv.y >= this.hand.interactionY) {
                this.hand.raise();
            } else {
                this.hand.lower();
            }
        }
    }
    onDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();

        let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
        let cursorOnVP = this.convertDivPosToViewPortPos(cursorOnDiv.x, cursorOnDiv.y);

        let x = cursorOnVP.x;
        let y = cursorOnVP.y;
        this.registerChild(new Tile(this, x, y, "back"));
    }
    onContextMenu(e) {
        e.stopPropagation();
        e.preventDefault();
		
        let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
        let cursorOnVP = this.convertDivPosToViewPortPos(cursorOnDiv.x, cursorOnDiv.y);

        let x = cursorOnVP.x;
        let y = cursorOnVP.y;

        let vSD = this.viewPort.getScreenDimensions();
        let q = vSD.width/vSD.height;
        this.registerChild(new GameStage(this, "zoom", "absolute", x, y, "zoom", "absolute", 400*q, 400, false, "absolute", 800*q, 800, false));
    }

    onParentChange() {
        if(this.hand) this.hand.onParentChange();

        super.onParentChange();        
    }

}