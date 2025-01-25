class GameStage extends Stage {
	constructor(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH) {
        super(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH);

        this.hand = null;
        
        this.uiScale = this.getUIScale();
        let uiScale = Math.min(this.uiScale.scaleX, this.uiScale.scaleY);
        this.viewPort.width = 1/uiScale;
        this.viewPort.height = 1/uiScale;
        this.viewPort.calculateScale();

        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    adjustViewPort() {
        let oldUIScale = Math.min(this.uiScale.scaleX, this.uiScale.scaleY);
        this.uiScale = this.getUIScale();
        let uiScale = Math.min(this.uiScale.scaleX, this.uiScale.scaleY);
        this.viewPort.width *= oldUIScale/uiScale;
        this.viewPort.height *= oldUIScale/uiScale;
        this.viewPort.calculateScale();
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
        this.registerChild(new GameStage(this, "absolute", x, y, "absolute", 400*q, 400, "absolute", 800*q, 800));
    }

    onParentChange() {
        this.adjustViewPort()
        if(this.hand) this.hand.onParentChange();

        super.onParentChange();        
    }

}