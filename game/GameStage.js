import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { StageState, Stage } from '../zui/Stage.js';
import { StageSelectionManagerState } from '../zui/StageSelectionManager.js';
import { TileState } from './Tile.js';
import { HandState } from './Hand.js';
import { DeckState } from './Deck.js';
import { PanelState } from '../zui/Panel.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { renderer, getUIScale } from '../rendering/Renderer.js';
import { svgLoader } from '../assets/SVGLoader.js';



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

        this.hand = dataManager.hydrateObject(this.state.hand);

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

        this._onSelectionEvent = this._onSelectionEvent.bind(this);
        eventBus.on('selection:changed', this._onSelectionEvent);

        // Tile spawner div for the settings panel
        this._tileSpawnerDiv = document.createElement("div");
        this._tileSpawnerDiv.textContent = "🧱 Tile";
        this._tileSpawnerDiv.style.padding = "6px 12px";
        this._tileSpawnerDiv.style.border = "1px solid rgba(255, 255, 255, 0.3)";
        this._tileSpawnerDiv.style.borderRadius = "6px";
        this._tileSpawnerDiv.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        this._tileSpawnerDiv.style.color = "rgba(255, 255, 255, 0.9)";
        this._tileSpawnerDiv.style.fontFamily = "Roboto, sans-serif";
        this._tileSpawnerDiv.style.fontSize = "14px";
        this._tileSpawnerDiv.style.cursor = "grab";
        this._tileSpawnerDiv.style.userSelect = "none";
        this._tileSpawnerDiv.addEventListener("mousedown", (e) => {
            e.stopPropagation();

            let tileDims = svgLoader.getDimensions("tileFront");
            let scale = getUIScale();
            let tileState = new TileState();
            Object.assign(tileState, LayoutPresets.SCREEN);
            tileState.parent.referenceId = this.state.objectId;
            tileState.x = e.clientX - (tileDims.width * scale / 2);
            tileState.y = e.clientY - (tileDims.height * scale / 2);
            tileState.facing = "BACK";
            tileState.svg01Key = "tileFront";
            tileState.svg02Key = "tileBack";
            tileState.value = Math.floor((Math.random() * 9)) + 1;

            let tile = dataManager.createObject(tileState);
            this.registerChild(tile);

            tile.cursorX = e.clientX;
            tile.cursorY = e.clientY;
            renderer.startDrag(tile.state.objectId);
            tile.grabbed();
        });
    }

    registerHand(hand) {
        this.hand = hand;
        this.state.hand = hand.state.objectId;
    }

    registerSettingsPanel(panel) {
        this.settingsPanel = panel;
        this.state.settingsPAnel = panel.state.objectId;
        this.registerChild(panel);
        this._renderPanel([]);
    }

    _onDivMouseMove(e) {
        this._checkHandZone(e);
        this._updatePanelInputs();
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

    _renderPanel(selection) {
        this.settingsPanel.removeAll();
        this._panelTarget = null;
        this._panelInputs = null;

        if (selection.length == 0) {
            this.settingsPanel.addDiv(this._tileSpawnerDiv);
            return;
        }
        let obj = selection[0];
        this._panelTarget = obj;

        this.settingsPanel.addText("Type: "+obj.state.objectType);
        this.settingsPanel.addInput("X", obj.state.x, (val) => {
            renderer.setState(obj.state.objectId, 'x', parseFloat(val));
        });
        let xInput = this.settingsPanel.contentDiv.lastChild.querySelector("input");
        this.settingsPanel.addInput("Y", obj.state.y, (val) => {
            renderer.setState(obj.state.objectId, 'y', parseFloat(val));
        });
        let yInput = this.settingsPanel.contentDiv.lastChild.querySelector("input");
        this.settingsPanel.addInput("Width", obj.state.width, (val) => {
            renderer.setState(obj.state.objectId, 'width', parseFloat(val));
            this._updateViewPortAfterResize(obj, 'width', parseFloat(val));
        });
        let wInput = this.settingsPanel.contentDiv.lastChild.querySelector("input");
        this.settingsPanel.addInput("Height", obj.state.height, (val) => {
            renderer.setState(obj.state.objectId, 'height', parseFloat(val));
            this._updateViewPortAfterResize(obj, 'height', parseFloat(val));
        });
        let hInput = this.settingsPanel.contentDiv.lastChild.querySelector("input");

        this._panelInputs = { x: xInput, y: yInput, width: wInput, height: hInput };

        if (obj.flip) {
            this.settingsPanel.addButton("Flip", () => obj.flip(800));
        }

        this.settingsPanel.addButton("Delete", () => {
            let selMgr = obj.getResponsibleSelectionManager();
            if (selMgr) selMgr.clear();
            if (obj.parent && obj.parent.unregisterChild) {
                obj.parent.unregisterChild(obj);
            }
            obj.destroy();
        });
    }

    onSelectionChanged(selection) {
        this._renderPanel(selection);
    }

    _updatePanelInputs() {
        if (!this._panelTarget || !this._panelTarget.isGrabbed || !this._panelInputs) return;
        let s = this._panelTarget.state;
        this._panelInputs.x.value = s.x;
        this._panelInputs.y.value = s.y;
        this._panelInputs.width.value = s.width;
        this._panelInputs.height.value = s.height;
    }

    _updateViewPortAfterResize(obj, dimension, value) {
        if (!obj.viewPort) return;
        if (obj.viewPort.state.type === "ABSOLUTE") {
            obj.viewPort.state[dimension] = value;
        }
        obj.viewPort.calculateScale();
        renderer.notifyViewportChanged(obj.viewPort.state.objectId);
        if (obj.notifyChildStages) obj.notifyChildStages();
    }

    _onSelectionEvent({ selectionManagerId, selection }) {
        if (selectionManagerId !== this.state.selectionManager) return;
        this.onSelectionChanged(selection);
    }

    destroy() {
        if (this.hand) this.hand.destroy();

        eventBus.off('card:dropped', this.onCardDropped);
        eventBus.off('selection:changed', this._onSelectionEvent);
        this.div.removeEventListener("contextmenu", this._boundContextMenu);
        this.div.removeEventListener("mousemove", this._boundDivMouseMove);

        super.destroy();
    }

}

objectRegistry.register("GAMESTAGE", GameStage);

export function createGameStage(rootObject) {
	let selectionManagerState = new StageSelectionManagerState();
	let selectionManager = dataManager.createObject(selectionManagerState);

	let gameStageState = new GameStageState();
	gameStageState.parent.referenceId = rootObject.state.objectId;
	Object.assign(gameStageState, LayoutPresets.SCREEN_RELATIVE);
	gameStageState.selectionManager = selectionManager.state.objectId;
	gameStageState.x = 0;
	gameStageState.y = 0;
	gameStageState.width = 1;
	gameStageState.height = 1;

	let gameStage = dataManager.createObject(gameStageState);
	rootObject.registerChild(gameStage);

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

	let panelState = new PanelState();
	panelState.parent.referenceId = gameStage.state.objectId;
	Object.assign(panelState, LayoutPresets.SCREEN);
	panelState.inset = { top: 20, right: 20, bottom: 20 };
	panelState.width = 300;
	panelState.layer = 2;
	gameStage.registerSettingsPanel(dataManager.createObject(panelState));
}
