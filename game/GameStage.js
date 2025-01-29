class GameStageDO extends StageDO {
    constructor() {
        super();
    }
}

class GameStage extends Stage {
	constructor(parent, dataObject) {
        super(parent, dataObject);

        this.hand = null;

        this.zManager.createLayer(); // 0: Objects on Stage
        this.zManager.createLayer(); // 1: Objects in Hand
        this.zManager.createLayer(); // 2: UI Elements
        this.zManager.createLayer(); // 3: Drag'n'drop

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

        let tileDO = new TileDO();
        tileDO.x = x;
        tileDO.y = y;
        tileDO.facing = "BACK";
        let tile = new Tile(this, tileDO);
        this.registerChild(tile);
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
        
        let gameStageDO = new GameStageDO();
        gameStageDO.positionBehaviour = "ZOOM";
        gameStageDO.positionType = "ABSOLUTE";
        gameStageDO.x = x;
        gameStageDO.y = y;
        gameStageDO.dimensionsBehaviour = "ZOOM";
        gameStageDO.dimensionsType = "ABSOLUTE";
        gameStageDO.width = 400;
        gameStageDO.height = 400;
        gameStageDO.uiScaling = false;
        gameStageDO.viewPortDO.type = "ABSOLUTE";
        gameStageDO.viewPortDO.width = 400;
        gameStageDO.viewPortDO.height = 400;
        gameStageDO.viewPortDO.uiScaling = false;
        let gameStage = new GameStage(this, gameStageDO);
//        let gameStage = new GameStage(this, "zoom", "absolute", x, y, "zoom", "absolute", 400*q, 400, false, viewPortDO, false);
        this.registerChild(gameStage);
    }

    onParentChange() {
        if(this.hand) this.hand.onParentChange();

        super.onParentChange();        
    }

}