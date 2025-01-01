var debugDiv = null;
var mainBody = null;
var cards = new Array();
var stage = null;
var deck = null;
var spots = null;

var UIresizing = false;

var card = { sourceWidth: 235, sourceHeight: 330, maxHeightRelToStage: 0.25, maxWidthRelToStage: 0.2, width: 0, height: 0}

var draggedCard = null;

var documentObserver = null;

function onBodyLoad() {
	mainBody = document.getElementById("mainBody");
	
	debugDiv = document.createElement("div");
	debugDiv.className = "Debug";
	debugDiv.innerHTML = "Body loading...";
	
	mainBody.appendChild(debugDiv);
	debugDiv.innerHTML = "CardStage initializing...";
	stage = new CardStage(mainBody);
	debugDiv.innerHTML = "CardStage loaded...";
	deck = new Deck();
	spots = new Array();
	let numSpots = 6;

	for(let i=0; i< numSpots; i++) {
		spots[i] = new Spot(i);
	}

	documentObserver = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if(Array.from(mutation.addedNodes).includes(stage.div)) {
				stage.onObserve();
				
				stage.appendAndObserve(deck, deck.onObserve.bind(deck));
				for(let i=0; i<spots.length; i++)
					stage.appendAndObserve(spots[i], spots[i].onObserve.bind(spots[i]));
				
				documentObserver.disconnect();
			}
		});
	});
	
	documentObserver.observe(mainBody, { attributes: false, childList: true, characterData: false });

	mainBody.appendChild(stage.div);	
	debugDiv.innerHTML = "Body successfully loaded. my-first-branch";
}

function onBodyResize() {
	UIresizing = true;
	
	stage.updateDimensions();
	
	/*
	deck.updateDimensions();
	for(let i=0; i<spots.length; i++) {
		spots[i].updateDimensions();
	}
	for(let i=0; i<cards.length; i++) {
		cards[i].updateDimensions();
		if(cards[i].onSpot != null) {
			let t = cards[i].onSpot.div.style.left;
			cards[i].div.style.left = cards[i].onSpot.div.style.left;
			cards[i].div.style.top = cards[i].onSpot.div.style.top;
		}
	}
*/
	UIresizing = false;
}