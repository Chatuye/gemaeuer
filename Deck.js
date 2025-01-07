class Deck extends StageObject {
	constructor(stage) {
		super(stage, "cardBack");

		this.stageCoordinate.updateBaseValues(200,10);

		this.div.addEventListener("click", this.onClick.bind(this));
	}

	onClick(e) {
		this.drawCard();
	}

	drawCard(hand) {
		let card = new Card(this.stage, this.stageCoordinate, this.stage.hand);
	}
}