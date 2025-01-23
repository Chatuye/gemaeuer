var mainBody = null;
var stage = null;
var mainViewPort = null;
var svgLoader = null;
var hand = null;

function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}

function onSVGsLoaded() {
	mainBody = document.getElementById("mainBody");

	mainViewPort = new ViewPort(null, "relative", 2.0, 2.0);
	//stage = new GameStage(mainBody, "relative", 0.05, 0.05, "relative", 0.9, 0.9, "relative", 1.0, 1.0);
	stage = new GameStage(mainBody, "absolute", 10, 10, "relative", 0.9, 0.9, "relative", 1.0, 1.0);
	stage.div.className = "Stage";

	hand = new Hand(stage);
	
	let deck = new Deck(stage, 0, 0);
	stage.registerChild(deck);
}

function onBodyResize() {
	mainViewPort.width = mainBody.getBoundingClientRect().width;
	mainViewPort.height = mainBody.getBoundingClientRect().height;
	
	stage.onParentChange();
}

function randomHexColorCode() {
	let n = (Math.random() * 0xfffff * 1000000).toString(16);
	return '#' + n.slice(0, 6);
};