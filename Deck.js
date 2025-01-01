class Deck {
	constructor() {
		this.div = null;

		var cardSVG = document.createElement("img");
		cardSVG.className = "Deck";
		cardSVG.src = "images/deck.svg";

		this.div = document.createElement("div");
		this.div.className = "Deck";

		this.div.style.left = "1em";
		this.div.style.top = "1em";

		this.div.addEventListener("click", this.onClick.bind(this));

		this.div.appendChild(cardSVG);
	}

	onClick(e) {
		cards[cards.length] = new Card(stage);
		let card = cards[cards.length-1];
		card.div.style.left = this.div.style.left;
		card.div.style.top = this.div.style.top;

		stage.appendAndObserve(card, card.createdFromDeck.bind(card));
		let audio = new Audio("sounds/card06.wav");
		audio.play();
	}

	onObserve() {
		this.updateDimensions();
	}

	updateDimensions() {
		this.div.style.height = card.height + "px";
		this.div.style.width = card.width + "px";
	}
}