class Card {
	constructor(stage) {
		this.div = null;
		this.transitionAction = "none";
		this.handPos = 0;
		this.onSpot = null;
		this.cardSVG = null;
		this.unitSVG = null;
		this.mode = "card";

		this.stage = stage;

		this.interactionSpot = null;

		this.dd_posX = 0;
		this.dd_posY = 0;
		this.dd_posCursorX = 0;
		this.dd_posCursorY = 0;

		this.cardSVG = document.createElement("img");
		this.cardSVG.className = "Card";
		this.cardSVG.src = "images/Card Terran Scout Ship.svg";

		this.div = document.createElement("div");
		this.div.style.visibility = "hidden";
		this.div.className = "Card";

		this.unitSVG = document.createElement("img");
		this.unitSVG.className = "Unit";
		this.unitSVG.src = "images/Unit Terran Scout Ship.svg";
		this.unitSVG.style.display = "none";

		this.div.style.top = "0px";
		this.div.style.left = "0px";
		this.div.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.div.addEventListener("mouseover", this.onMouseOver.bind(this));
		this.div.addEventListener("webkitTransitionEnd", this.onTransitionEnd.bind(this));

		this.div.appendChild(this.cardSVG);
		this.div.appendChild(this.unitSVG);
	}

	toggleMode(mode) {
		if (this.mode != mode) {
			if (mode == "card") {
				this.unitSVG.style.display = "none";
				this.cardSVG.style.display = "block";
				this.div.className = "Card";
				this.div.style.height = card.height + "px";
			} else if (mode == "unit") {
				this.cardSVG.style.display = "none";
				this.unitSVG.style.display = "block";
				this.div.className = "Unit";
				this.div.style.height = Math.round(card.height/2) + "px";
			}
			this.centerDiv();
			this.mode = mode;
		}
	}

	hideSpots() {
		for(let i=0; i<spots.length; i++) {
			spots[i].hide();
		}
	}

	showSpots() {
		for(let i=0; i<spots.length; i++) {
			spots[i].show();
		}
	}

	centerDiv() {
		let clientRect = this.div.getBoundingClientRect();
		//console.log(this.div.offsetTop);
		let stageOffset = this.getStageOffset();

		let x = this.dd_posCursorX - stageOffset.left - Math.floor(clientRect.width / 2);
		let y = this.dd_posCursorY - stageOffset.top - Math.floor(clientRect.height / 2);

		this.div.style.left = x + "px";
		this.div.style.top = y + "px";
	}

	createdFromDeck() {
		this.toggleMode("card");
		this.updateDimensions();

		this.handPos = -1;
		this.stage.hand.addCard(this);
	};

	updateDimensions() {
		switch (this.mode) {
			case "card":
				this.div.style.height = card.height + "px";
				this.div.style.width = card.width + "px";
				break;
			case "unit":
				this.div.style.height = Math.round(card.height/2) + "px";
				this.div.style.width = card.width + "px";
				break;
			default:
				console.log("Unknown card mode.");
		}
	}

	getStageOffset() {
		let offset = { left: 0, top: 0 };

		let parentElement = this.div.parentElement;

		while (parentElement != null) {
			offset.left += parentElement.offsetLeft;
			offset.top += parentElement.offsetTop;
			parentElement = parentElement.parentElement;
		}
		
		return offset;
	};

	moveTo(pos) {
		this.div.style.left = pos.x + "px";
		this.div.style.top = pos.y + "px";
	};

	moveToHand(handAnchor, pos, total) {
		this.div.style.visibility = "visible";

		let newPos = new Coordinate(0,0);

		//alert(this.div);
		let anchorX = Math.floor(this.div.clientWidth / 2);
		let anchorY = this.div.clientHeight;

		let middle = 0;
		if ((total % 2) == 1)
			middle = Math.floor(total / 2); else
			middle = total / 2 - 0.5;
		let fromCenter = pos - middle;

		this.div.style.transform = "none";
		let angle = fromCenter * 0.05;
		this.div.style.transformOrigin = "50% 100%";
		this.div.style.transform = "rotate(" + angle + "rad)";

		newPos.x = (handAnchor.x - anchorX) + (fromCenter * Math.floor(this.div.clientWidth / 1.9));
		newPos.y = (handAnchor.y - anchorY) + Math.abs(0.8 * fromCenter * (Math.sin(angle) * (this.div.clientWidth / 2)));

		let ttime = 0;
		if(!UIresizing) {
			let clientRect = this.div.getBoundingClientRect()
			let d = newPos.getDistanceTo(new Coordinate(clientRect.left, clientRect.top));
			let v = 2000;
			ttime = d/v;
			if(ttime < 0.15) ttime = 0.15;
		}

		this.div.style.transitionDuration = ttime+"s";
		this.moveTo(newPos);
	}

	onMouseMove(e) {
		e = e || window.event;
		e.preventDefault();

		this.dd_posX = this.dd_posCursorX - e.clientX;
		this.dd_posY = this.dd_posCursorY - e.clientY;
		this.dd_posCursorX = e.clientX;
		this.dd_posCursorY = e.clientY;

		this.div.style.top = (this.div.offsetTop - this.dd_posY) + "px";
		this.div.style.left = (this.div.offsetLeft - this.dd_posX) + "px";

		if(this.mode == "unit")
			this.checkSpots();
	}

	checkSpots() {
		let clientRect = this.div.getBoundingClientRect();
		let x = clientRect.left + Math.floor(clientRect.width / 2);
		let y = clientRect.top + Math.floor(clientRect.height / 2);

		let minDistance = -1;
		this.interactionSpot = null;
		for(let i=0; i<spots.length; i++) {
			if(spots[i].checkOverlap(this.div.getBoundingClientRect())) {
				let d = spots[i].getClientDistance(new Coordinate(x, y));
				if((minDistance == -1) || (d < minDistance)) {
					this.interactionSpot = spots[i];
					minDistance = d;
				}
			}
		}

		for(let i=0; i<spots.length; i++) {
			// false: um spots zurückzusetzen
			// true: um einen spot zu highlighten
			let t = spots[i] == this.interactionSpot;
			spots[i].highlight(t);
		}
	}

	placeUnit() {
		this.handPos = -1;
		this.onSpot = this.interactionSpot;
		this.onSpot.unit=this;
		this.div.style.left = this.interactionSpot.div.style.left;
//		this.div.style.right = this.interactionSpot.div.style.right;
		this.div.style.top = this.interactionSpot.div.style.top;
//		this.div.style.bottom = this.interactionSpot.div.style.bottom;
	}

	onMouseUp(e) {
		if((!this.stage.hand.raised)&&(this.interactionSpot!=null)) {
			this.placeUnit();
		} else if((this.stage.hand.raised)&&(this.interactionSpot!=null)) {
			this.toggleMode("unit");
			this.placeUnit();
		} else {
			this.toggleMode("card");
			this.stage.hand.addCard(this);
		}

		this.hideSpots();

		draggedCard = null;
		this.interactionSpot = null;

		document.onmouseup = null;
		document.onmousemove = null;	
	}

	onMouseDown(e) {
		e = e || window.event;
		e.preventDefault();

		draggedCard = this;
		if(this.onSpot)this.onSpot.unit = null;
		this.onSpot = null;

		this.div.style.transitionDuration = "0s";
		this.div.style.transform = "none";
		this.transitionAction = "drag";

		if(this.handPos != -1) {
			this.stage.hand.removeCard(this);
			this.showSpots();
		} else {
			this.showSpots();
			this.checkSpots();
		}
		
		this.dd_posCursorX = e.clientX;
		this.dd_posCursorY = e.clientY;
		stage.onMouseMove(e);
		this.onMouseMove(e);
		
		document.onmouseup = this.onMouseUp.bind(this);
		document.onmousemove = this.onMouseMove.bind(this);
	}

	onTransitionEnd(e) {
		let movementTransition = false;
		if((e.propertyName == "left") || (e.propertyName == "top"))
			movementTransition = true;


		if((this.transitionAction == "add") && (movementTransition)) {
			this.transitionAction = "none";
			this.div.style.transitionDuration = "0s";
			let audio = new Audio("sounds/card08.wav");
			audio.play();	
		}
	}

	onMouseOver(e) {
		if((draggedCard != this) && (this.handPos != -1) && (this.transitionAction!="add")) {
			let audio = new Audio("sounds/card07.wav");
			audio.play();
		}
	}

}