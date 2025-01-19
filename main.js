var mainBody = null;
var stage = null;
var mainViewPort = null;

function onBodyLoad() {
	mainBody = document.getElementById("mainBody");

	mainViewPort = new ViewPort(null, "relative", 2.0, 2.0);
	stage = new Stage(mainBody, "relative", 0.05, 0.05, "relative", 0.9, 0.9, "relative", 1.0, 1.0);
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