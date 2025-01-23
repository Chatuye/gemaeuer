class GameStage extends Stage {
	constructor(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH) {
        super(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH);

        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("dblclick", this.onDoubleClick.bind(this), { passive: false });
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

    

}