import { StateObject } from '../dataManagement/StateObject.js';
import { UIDefinitions } from './config/UIDefinitions.js';
import { LayoutPresets } from './config/LayoutPresets.js';
import { ViewPortSO } from './ViewPort.js';
import { StageZIndexManagerSO } from './StageZIndexManager.js';
import { GameStageSO } from '../game/GameStage.js';
import { HandSO } from '../game/Hand.js';
import { DeckSO } from '../game/Deck.js';
import { svgLoader } from '../assets/SVGLoader.js';
import { dataManager } from '../dataManagement/DataManager.js';
import { objectRegistry } from '../dataManagement/ObjectRegistry.js';



export class RootObjectSO extends StateObject {
    constructor() {
        super();

        this.objectType = "ROOTOBJECT";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

export class RootObject {
	constructor(stateObject) {
        this.stateObject = stateObject;
        dataManager.registerObject(this);

        //this.div = document.getElementsByTagName('body')[0];
        this.div = document.getElementById("content");
        this.boundingClientRect = this.div.getBoundingClientRect();

        if(this.stateObject.viewPort == -1) {
            let viewPortSO = new ViewPortSO();

            viewPortSO.parent.referenceId = this.stateObject.objectId;
            this.viewPort = dataManager.createObject(viewPortSO);
            this.stateObject.viewPort = this.viewPort.stateObject.objectId;
        } else {
            this.viewPort = dataManager.getObject(this.stateObject.viewPort);
        }

        if(this.stateObject.zManager == -1) {
            let stageZIndexManagerSO = new StageZIndexManagerSO()
            this.zManager = dataManager.createObject(stageZIndexManagerSO);
            this.stateObject.zManager = this.zManager.stateObject.objectId;
        } else {
            this.zManager = dataManager.getObject(this.stateObject.zManager);
        }
        this.pickedUpChild = null;
        this.children = new Array();
        for(let i = 0; i < this.stateObject.children.length; i++) {
			this.children.push(dataManager.getObject(this.stateObject.children[i]));
		}

        window.addEventListener("resize",this.update.bind(this));

        this.onNew = this.createGameStage.bind(this);
        document.getElementById("menu-new").addEventListener("click", this.onNew)
    }

    update() {
        this.boundingClientRect = this.div.getBoundingClientRect();
        this.updateChildren();
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
        this.stateObject.children.push(child.stateObject.objectId);
    }
    clearAll() {
        document.getElementById("menu-new").removeEventListener("click", this.onNew);
        for(let i = 0; i < this.children.length; i++) {
			this.div.removeChild(this.children[i].div);
		}
    }

    getScreenDimensions() {
        let clientRect = this.boundingClientRect;
        return clientRect;
    }

    getUIScale() {
        let sX = this.boundingClientRect.width / UIDefinitions.baseWidth;
        let sY = this.boundingClientRect.height / UIDefinitions.baseHeight;
        return {scaleX: sX, scaleY: sY}
    }

    createGameStage() {
        let gameStageSO = new GameStageSO();
        gameStageSO.parent.referenceId = this.stateObject.objectId;
        Object.assign(gameStageSO, LayoutPresets.SCREEN_RELATIVE);
        gameStageSO.x = 0;
        gameStageSO.y = 0;
        gameStageSO.width = 1;
        gameStageSO.height = 1;
        
        let gameStage = dataManager.createObject(gameStageSO);
        this.registerChild(gameStage);
        
        let handSO = new HandSO();
        handSO.stage.referenceId = gameStage.stateObject.objectId;
        let cardDims = svgLoader.getDimensions("card");
        handSO.cardWidth = cardDims.width;
        handSO.cardHeight = cardDims.height;
        let hand = dataManager.createObject(handSO);
        gameStage.registerHand(hand);

        let deckSO = new DeckSO();
        deckSO.parent.referenceId = gameStage.stateObject.objectId;
        Object.assign(deckSO, LayoutPresets.SCREEN);
        deckSO.x = 10;
        deckSO.y = 10;
        deckSO.svg01Key = "cardBack";
        deckSO.zIndex = 2;
        gameStage.registerChild(dataManager.createObject(deckSO));
    }
}

objectRegistry.register("ROOTOBJECT", RootObject);
