class GameStageDO extends StageDO {
    constructor() {
        super();

        this.objectType = "GAMESTAGE";

        this.hand = -1;
    }
}

class GameStage extends Stage {
	constructor(dataObject) {
        super(dataObject);

        this.hand = dataManager.getObject(this.dataObject.hand);

        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    registerHand(hand) {
        this.hand = hand;
        this.dataObject.hand = hand.dataObject.objectId;
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
        tileDO.parent.referenceId = this.dataObject.objectId;
        tileDO.x = x;
        tileDO.y = y;
        tileDO.facing = "BACK";

        tileDO.positionBehaviour = "ZOOM";
        tileDO.positionType = "ABSOLUTE";
        tileDO.dimensionsBehaviour = "ZOOM";
        tileDO.dimensionsType = "ABSOLUTE";
        tileDO.uiScaling = true;
        tileDO.svg01Key = "tile-front";
        tileDO.svg02Key = "tile-back";
        tileDO.zIndex = 0;
        tileDO.uiScaling = false;
        tileDO.value = Math.floor((Math.random()*9))+1;

        let tile = dataManager.createObject(tileDO);
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
        gameStageDO.parent.referenceId = this.dataObject.objectId;
        gameStageDO.positionBehaviour = "ZOOM";
        gameStageDO.positionType = "ABSOLUTE";
        gameStageDO.x = x;
        gameStageDO.y = y;
        gameStageDO.dimensionsBehaviour = "ZOOM";
        gameStageDO.dimensionsType = "ABSOLUTE";
        gameStageDO.width = 400;
        gameStageDO.height = 400;
        gameStageDO.uiScaling = false;

        let gameStage = dataManager.createObject(gameStageDO);
        gameStage.viewPort.dataObject.type = "ABSOLUTE";
        gameStage.viewPort.dataObject.width = 400;
        gameStage.viewPort.dataObject.height = 400;
        gameStage.viewPort.dataObject.uiScaling = false;
        gameStage.viewPort.calculateScale();

        this.registerChild(gameStage);
    }

    onParentChange() {
        if(this.hand) this.hand.onParentChange();

        super.onParentChange();        
    }

}