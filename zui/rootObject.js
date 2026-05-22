import { StateObject } from '../core/StateObject.js';
import { LayoutPresets } from './config/LayoutPresets.js';
import { ViewPortState } from './ViewPort.js';
import { StageZIndexManagerState } from './StageZIndexManager.js';
import { GameStageState } from '../game/GameStage.js';
import { HandState } from '../game/Hand.js';
import { DeckState } from '../game/Deck.js';
import { svgLoader } from '../assets/SVGLoader.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { renderer } from '../rendering/Renderer.js';



export class RootObjectState extends StateObject {
    constructor() {
        super();

        this.objectType = "ROOTOBJECT";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

export class RootObject {
	constructor(state) {
        this.state = state;
        dataManager.registerObject(this);

        this.div = document.getElementById("content");
        this.boundingClientRect = this.div.getBoundingClientRect();

        if(this.state.viewPort == -1) {
            let viewPortState = new ViewPortState();

            viewPortState.parent.referenceId = this.state.objectId;
            this.viewPort = dataManager.createObject(viewPortState);
            this.state.viewPort = this.viewPort.state.objectId;
        } else {
            this.viewPort = dataManager.getObject(this.state.viewPort);
        }

        if(this.state.zManager == -1) {
            let stageZIndexManagerState = new StageZIndexManagerState()
            this.zManager = dataManager.createObject(stageZIndexManagerState);
            this.state.zManager = this.zManager.state.objectId;
        } else {
            this.zManager = dataManager.getObject(this.state.zManager);
        }
        this.pickedUpChild = null;
        this.children = new Array();
        for(let i = 0; i < this.state.children.length; i++) {
			this.children.push(dataManager.getObject(this.state.children[i]));
		}

        window.addEventListener("resize",this.update.bind(this));

        this.onNew = this.createGameStage.bind(this);
        document.getElementById("menu-new").addEventListener("click", this.onNew)
    }

    update() {
        this.boundingClientRect = this.div.getBoundingClientRect();
        // Renderer handles markAllDirty on resize — but we still need to notify
        // children for viewport recalculation (Hand, etc. listen to layout:changed)
        this.updateChildren();
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
        this.state.children.push(child.state.objectId);
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

    createGameStage() {
        let gameStageState = new GameStageState();
        gameStageState.parent.referenceId = this.state.objectId;
        Object.assign(gameStageState, LayoutPresets.SCREEN_RELATIVE);
        gameStageState.x = 0;
        gameStageState.y = 0;
        gameStageState.width = 1;
        gameStageState.height = 1;
        
        let gameStage = dataManager.createObject(gameStageState);
        this.registerChild(gameStage);
        
        let handState = new HandState();
        handState.stage.referenceId = gameStage.state.objectId;
        let cardDims = svgLoader.getDimensions("card");
        handState.cardWidth = cardDims.width;
        handState.cardHeight = cardDims.height;
        let hand = dataManager.createObject(handState);
        gameStage.registerHand(hand);

        let deckState = new DeckState();
        deckState.parent.referenceId = gameStage.state.objectId;
        Object.assign(deckState, LayoutPresets.SCREEN);
        deckState.x = 10;
        deckState.y = 10;
        deckState.svg01Key = "cardBack";
        deckState.layer = 2;
        gameStage.registerChild(dataManager.createObject(deckState));
    }
}

objectRegistry.register("ROOTOBJECT", RootObject);
