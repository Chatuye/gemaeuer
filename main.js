var svgLoader = null;
var dataManager = null;
var mainBody = null;
var stage = null;
var rootObject = null;



function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}


function onSVGsLoaded() {
	mainBody = document.getElementById("mainBody");

	dataManager = new DataManager();
	let rootObjectDO = new RootObjectDO();
	rootObject = dataManager.createObject(rootObjectDO);

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
	stage = dataManager.createObject(gameStageDO);
	stage.div.className = "Stage";
	
	rootObject.registerChild(stage);

	let handDO = new HandDO();
	handDO.stage.referenceId = stage.dataObject.objectId;
	let hand = dataManager.createObject(handDO);
	stage.registerHand(hand);

	let deckDO = new DeckDO();
	deckDO.parent.referenceId = stage.dataObject.objectId;
	deckDO.x = 10;
	deckDO.y = 10;
	stage.registerChild(dataManager.createObject(deckDO));
}

function onBodyResize() {
	//stage.onParentChange();
}

function randomHexColorCode() {
	let n = (Math.random() * 0xfffff * 1000000).toString(16);
	return '#' + n.slice(0, 6);
};