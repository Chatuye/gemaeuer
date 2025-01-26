var svgLoader = null;
var mainBody = null;
var stage = null;


function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}


function onSVGsLoaded() {
	mainBody = document.getElementById("mainBody");

	stage = new GameStage(mainBody, "fixed", "absolute", 10, 10, "fixed", "relative", 0.9, 0.9, false, "relative", 1.0, 1.0, true);
	stage.div.className = "Stage";
	
	stage.hand = new Hand(stage);
	stage.registerChild(new Deck(stage, 0, 0));
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