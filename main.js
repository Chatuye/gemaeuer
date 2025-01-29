var svgLoader = null;
var objectFactory = null;
var dataManager = null;
var mainBody = null;
var stage = null;



function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}


function onSVGsLoaded() {
	mainBody = document.getElementById("mainBody");

	objectFactory = new ObjectFactory();
	dataManager = new DataManager();

	//let viewPortDO = new ViewPortDO();
	let gameStageDO = new GameStageDO();
	gameStageDO.isMainStage = true;
	gameStageDO.positionBehaviour = "FIXED";
	gameStageDO.positionType = "ABSOLUTE";
	gameStageDO.x = 4;
	gameStageDO.y = 24;
	gameStageDO.dimensionsBehaviour = "FIXED";
	gameStageDO.dimensionsType = "RELATIVE";
	gameStageDO.width = 0.9;
	gameStageDO.height = 0.9;
	gameStageDO.uiScaling = false;
	gameStageDO.viewPortDO.uiScaling = false;
	stage = new GameStage(mainBody, gameStageDO);
	//stage = new GameStage(mainBody, "fixed", "absolute", 4, 24, "fixed", "relative", 0.9, 0.9, false, viewPortDO);
	stage.div.className = "Stage";
	
	stage.hand = new Hand(stage);

	let deckDO = new DeckDO();
	deckDO.x = 10;
	deckDO.y = 10;
	stage.registerChild(new Deck(stage, deckDO));
}

function onBodyResize() {
	stage.parent.viewPort.width = mainBody.getBoundingClientRect().width;
	stage.parent.viewPort.height = mainBody.getBoundingClientRect().height;
	
	stage.onParentChange();
}

function randomHexColorCode() {
	let n = (Math.random() * 0xfffff * 1000000).toString(16);
	return '#' + n.slice(0, 6);
};