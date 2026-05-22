import { svgLoader } from './assets/SVGLoader.js';
import { dataManager } from './core/DataManager.js';
import './core/registry.js';
import { LayoutPresets } from './zui/config/LayoutPresets.js';
import { RootObjectState } from './zui/rootObject.js';
import { renderer } from './rendering/Renderer.js';
import { GameStageState } from './game/GameStage.js';
import { HandState } from './game/Hand.js';
import { DeckState } from './game/Deck.js';



function onBodyLoad() {
	svgLoader.loadAll(onSVGsLoaded);
}

function onSVGsLoaded() {
	let rootObjectState = new RootObjectState();
	dataManager.rootObject = dataManager.createObject(rootObjectState);

	renderer.start(document.getElementById('content'));
}

function createGameStage(rootObject) {
	let gameStageState = new GameStageState();
	gameStageState.parent.referenceId = rootObject.state.objectId;
	Object.assign(gameStageState, LayoutPresets.SCREEN_RELATIVE);
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
	deckState.zIndex = 2;
	gameStage.registerChild(dataManager.createObject(deckState));
}

document.getElementById("menu-new").addEventListener("click", () => {
	createGameStage(dataManager.rootObject);
});

document.getElementById("menu-save").addEventListener("click", () => {
	dataManager.save();
});

const fileInput = document.getElementById("file-input");
document.getElementById("menu-load").addEventListener("click", () => {
	fileInput.click();
});
fileInput.addEventListener("change", () => {
	const file = fileInput.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.addEventListener("load", (event) => {
		dataManager.restoreData(JSON.parse(event.target.result));
		fileInput.value = null;
	});
	reader.readAsText(file);
});

window.addEventListener('DOMContentLoaded', onBodyLoad);
