class RootObjectDO extends DataObject {
    constructor() {
        super();

        this.objectType = "ROOTOBJECT";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

class RootObject {
	constructor(dataObject) {
        this.dataObject = dataObject;
        dataManager.registerObject(this);

        this.div = document.getElementsByTagName('body')[0];
        this.boundingClientRect = this.div.getBoundingClientRect();

        if(this.dataObject.viewPort == -1) {
            let viewPortDO = new ViewPortDO();

            viewPortDO.parent.referenceId = this.dataObject.objectId;
            this.viewPort = dataManager.createObject(viewPortDO);
            this.dataObject.viewPort = this.viewPort.dataObject.objectId;
        } else {
            this.viewPort = dataManager.getObject(this.dataObject.viewPort);
        }

        if(this.dataObject.zManager == -1) {
            let stageZIndexManagerDO = new StageZIndexManagerDO()
            this.zManager = dataManager.createObject(stageZIndexManagerDO);
            this.dataObject.zManager = this.zManager.dataObject.objectId;
        } else {
            this.zManager = dataManager.getObject(this.dataObject.zManager);
        }
        this.pickedUpChild = null;
        this.children = new Array();
        for(let i = 0; i < this.dataObject.children.length; i++) {
			this.children.push(dataManager.getObject(this.dataObject.children[i]));
		}

        window.addEventListener("resize",this.update.bind(this));

        this.onNew = this.createGameStage.bind(this);
        document.getElementById("new").addEventListener("click", this.onNew)
    }

    update() {
        this.boundingClientRect = this.div.getBoundingClientRect();
        this.updateChildren();
        console.log("update ");
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
        this.dataObject.children.push(child.dataObject.objectId);
    }
    clearAll() {
        document.getElementById("new").removeEventListener("click", this.onNew);
        for(let i = 0; i < this.children.length; i++) {
			this.div.removeChild(this.children[i].div);
		}
    }

    getScreenDimensions() {
        return this.boundingClientRect;
    }

    getUIScale() {
        let sX = this.boundingClientRect.width / UIDefinitions.baseWidth;
        let sY = this.boundingClientRect.height / UIDefinitions.baseHeight;
        return {scaleX: sX, scaleY: sY}
    }

    createGameStage() {
        let gameStageDO = new GameStageDO();
        gameStageDO.parent.referenceId = rootObject.dataObject.objectId;
        gameStageDO.positionBehaviour = "FIXED";
        gameStageDO.positionType = "ABSOLUTE";
        gameStageDO.x = 4;
        gameStageDO.y = 24;
        gameStageDO.dimensionsBehaviour = "FIXED";
        gameStageDO.dimensionsType = "RELATIVE";
        gameStageDO.width = 0.9;
        gameStageDO.height = 0.9;
        gameStageDO.uiScaling = false;
        
        let gameStage = dataManager.createObject(gameStageDO);
        this.registerChild(gameStage);
        
        let handDO = new HandDO();
        handDO.stage.referenceId = gameStage.dataObject.objectId;
        let hand = dataManager.createObject(handDO);
        gameStage.registerHand(hand);

        let deckDO = new DeckDO();
        deckDO.parent.referenceId = gameStage.dataObject.objectId;
        deckDO.x = 10;
        deckDO.y = 10;
        deckDO.positionBehaviour = "FIXED";
        deckDO.positionType = "ABSOLUTE";
        deckDO.dimensionsBehaviour = "FIXED";
        deckDO.dimensionsType = "ABSOLUTE";
        deckDO.uiScaling = true;
        deckDO.svg01Key = "cardBack";
        deckDO.zIndex = 2;
        gameStage.registerChild(dataManager.createObject(deckDO));
    }
}