var svgLoader = null;
var dataManager = null;
var rootObject = null;



function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}


function onSVGsLoaded() {
	dataManager = new DataManager();
	let rootObjectDO = new RootObjectDO();
	rootObject = dataManager.createObject(rootObjectDO);

//	rootObject.createGameStage();
//	rootObject.createGameStage();
}

function randomHexColorCode() {
	let n = (Math.random() * 0xfffff * 1000000).toString(16);
	return '#' + n.slice(0, 6);
};