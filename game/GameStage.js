import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { StageState, Stage } from '../zui/Stage.js';
import { TileState } from './Tile.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { renderer } from '../rendering/Renderer.js';



export class GameStageState extends StageState {
    constructor() {
        super();

        this.objectType = "GAMESTAGE";

        this.hand = -1;
    }
}

export class GameStage extends Stage {
	constructor(state) {
        super(state);

        this.hand = dataManager.getObject(this.state.hand);

        // contextmenu is not forwarded by Renderer — keep as direct listener
        this._boundContextMenu = this.onContextMenu.bind(this);
        this.div.addEventListener("contextmenu", this._boundContextMenu, { passive: false });
        // mousemove for hand zone detection needs bubbling from children
        this._boundDivMouseMove = this._onDivMouseMove.bind(this);
        this.div.addEventListener("mousemove", this._boundDivMouseMove);

        this.onCardDropped = ({ card }) => {
            // Only handle cards that belong to this stage — prevents cross-stage
            // interference when multiple GameStages exist (e.g., stage 1 emitting
            // card:droppedOnStage for a card that stage 2 should handle as droppedInHand)
            if (card.parent !== this) return;
            if (this.hand && this.hand.mode === "RAISED") {
                eventBus.emit('card:droppedInHand', { card });
            } else {
                eventBus.emit('card:droppedOnStage', { card });
            }
        };
        eventBus.on('card:dropped', this.onCardDropped);
    }

    registerHand(hand) {
        this.hand = hand;
        this.state.hand = hand.state.objectId;
    }

    onMouseMove(e) {
        super.onMouseMove(e);
    }

    _onDivMouseMove(e) {
        this._checkHandZone(e);
    }

    _checkHandZone(e) {
        if(this.hand) {
            let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
            if(cursorOnDiv.y >= this.hand.interactionY) {
                eventBus.emit('cursor:enteredHandZone', { stage: this });
            } else {
                eventBus.emit('cursor:leftHandZone', { stage: this });
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

        let tileState = new TileState();
        Object.assign(tileState, LayoutPresets.WORLD);
        tileState.parent.referenceId = this.state.objectId;
        tileState.x = x;
        tileState.y = y;
        tileState.facing = "BACK";
        tileState.svg01Key = "tileFront";
        tileState.svg02Key = "tileBack";
        tileState.zIndex = 0;
        tileState.value = Math.floor((Math.random()*9))+1;

        let tile = dataManager.createObject(tileState);
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
        
        let gameStageState = new GameStageState();
        Object.assign(gameStageState, LayoutPresets.WORLD);
        gameStageState.parent.referenceId = this.state.objectId;
        gameStageState.x = x;
        gameStageState.y = y;
        gameStageState.width = 400;
        gameStageState.height = 400;

        let gameStage = dataManager.createObject(gameStageState);
        gameStage.viewPort.state.type = "ABSOLUTE";
        gameStage.viewPort.state.width = 400;
        gameStage.viewPort.state.height = 400;
        gameStage.viewPort.state.scaleWithWindowSize = false;
        gameStage.viewPort.calculateScale();

        this.registerChild(gameStage);
    }

    onParentChange() {
        super.onParentChange();
        eventBus.emit('layout:changed', { stage: this });
    }

    destroy() {
        for (const child of this.children) {
            child.destroy();
        }
        if (this.hand) this.hand.destroy();

        eventBus.off('card:dropped', this.onCardDropped);
        this.div.removeEventListener("contextmenu", this._boundContextMenu);
        this.div.removeEventListener("mousemove", this._boundDivMouseMove);

        renderer.unregister(this.state.objectId);
    }

}

objectRegistry.register("GAMESTAGE", GameStage);
