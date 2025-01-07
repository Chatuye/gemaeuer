var mainBody = null;
var cards = new Array();
var stage = null;
var spots = null;

var UIresizing = false;

var draggedCard = null;
var draggedObject = null;

var tob = null;

function onBodyLoad() {
	//myCardString = "";
	mainBody = document.getElementById("mainBody");

	stage = new CardStage(mainBody);

	tob = new TangibleObject(stage, "genericTOB");
}

function onBodyResize() {
	UIresizing = true;
	
	stage.onResize();
	
	UIresizing = false;
}

function logVar(s, v) {
	console.log(s+": "+v);
}