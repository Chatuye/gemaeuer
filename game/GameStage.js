import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { StageSO, Stage } from '../zui/Stage.js';
import { TileSO } from './Tile.js';
import { dataManager } from '../data-management/DataManager.js';



export class GameStageSO extends StageSO {
    constructor() {
        super();

        this.objectType = "GAMESTAGE";

        this.hand = -1;
    }
}

export class GameStage extends Stage {
	constructor(stateObject) {
        super(stateObject);

        this.hand = dataManager.getObject(this.stateObject.hand);

        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    registerHand(hand) {
        this.hand = hand;
        this.stateObject.hand = hand.stateObject.objectId;
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

        let tileSO = new TileSO();
        Object.assign(tileSO, LayoutPresets.WORLD);
        tileSO.parent.referenceId = this.stateObject.objectId;
        tileSO.x = x;
        tileSO.y = y;
        tileSO.facing = "BACK";
        tileSO.svg01Key = "tileFront";
        tileSO.svg02Key = "tileBack";
        tileSO.zIndex = 0;
        tileSO.value = Math.floor((Math.random()*9))+1;

        let tile = dataManager.createObject(tileSO);
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
        
        let gameStageSO = new GameStageSO();
        Object.assign(gameStageSO, LayoutPresets.WORLD);
        gameStageSO.parent.referenceId = this.stateObject.objectId;
        gameStageSO.x = x;
        gameStageSO.y = y;
        gameStageSO.width = 400;
        gameStageSO.height = 400;

        let gameStage = dataManager.createObject(gameStageSO);
        gameStage.viewPort.stateObject.type = "ABSOLUTE";
        gameStage.viewPort.stateObject.width = 400;
        gameStage.viewPort.stateObject.height = 400;
        gameStage.viewPort.stateObject.scaleWithWindowSize = false;
        gameStage.viewPort.calculateScale();

        this.registerChild(gameStage);
    }

    onParentChange() {
        if(this.hand) this.hand.onParentChange();

        super.onParentChange();        
    }

}
