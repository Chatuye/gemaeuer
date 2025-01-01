class Stage {
	constructor() {
		this.div = document.createElement("div");
		this.div.className = "Stage";

		this.clientRect = null;
		this.aspectRatio = 1.7777777778;
		this.aspectRatioTolerance = 0.25;

		this.observers = new Array();

		let playerSide = document.createElement("div");
		playerSide.className = "PlayerSide";
		this.div.appendChild(playerSide);

		let opponentSide = document.createElement("div");
		opponentSide.className = "OpponentSide";
		this.div.appendChild(opponentSide);

		let spotLight = document.createElement("div");
		spotLight.className = "SpotLight";
		this.div.appendChild(spotLight);

		this.div.addEventListener("contextmenu", this.onContextMenu.bind(this));
	}

	onObserve() {
		this.updateDimensions();
	}

	updateDimensions() {

	}

	updateObserverDimensions() {
		this.observers.forEach((observer) => observer.callBack());
	}

	appendAndObserve(element, callBack) {
		this.observers.push(new StageObserver(this, element, callBack));
	}

	onContextMenu(e) {
		e = e || window.event;
		e.preventDefault();
	}
}