var svgLoader = null;
var dataManager = null;
var rootObject = null;



function onBodyLoad() {
	svgLoader = new SVGLoader();
	svgLoader.loadAll(onSVGsLoaded);
}


function onSVGsLoaded() {
	dataManager = new DataManager();
	let rootObjectSO = new RootObjectSO();
	rootObject = dataManager.createObject(rootObjectSO);

//	rootObject.createGameStage();
//	rootObject.createGameStage();
}

function randomHexColorCode() {
	let n = (Math.random() * 0xfffff * 1000000).toString(16);
	return '#' + n.slice(0, 6);
};
