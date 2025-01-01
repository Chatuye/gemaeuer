class CardStage extends Stage {
	constructor() {
		super();

		this.hand = null;

        this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
	}

	onObserve() {
		this.clientRect = this.div.getBoundingClientRect();
		this.hand = new Hand();
		this.updateDimensions();
	}

	updateDimensions() {
		this.clientRect.width = Math.round(0.9*mainBody.getBoundingClientRect().width);
		this.clientRect.height = Math.round(0.9*mainBody.getBoundingClientRect().height);
		this.div.style.width = this.clientRect.width+"px";
		this.div.style.height = this.clientRect.height+"px";
		if(this.clientRect.width/this.clientRect.height < (this.aspectRatio*(1-this.aspectRatioTolerance))) {
			this.div.style.height = Math.round(this.clientRect.width/(this.aspectRatio*(1-this.aspectRatioTolerance)))+"px";
		} else if(this.clientRect.width/this.clientRect.height > (this.aspectRatio*(1+this.aspectRatioTolerance))) {
			this.div.style.width = Math.round(this.clientRect.height*(this.aspectRatio*(1+this.aspectRatioTolerance)))+"px";
		}

		this.clientRect = this.div.getBoundingClientRect();
		this.div.style.top = Math.round((mainBody.getBoundingClientRect().height-this.clientRect.height)/2)+"px";
		this.div.style.left = Math.round((mainBody.getBoundingClientRect().width-this.clientRect.width)/2)+"px";


		card.height = Math.round(this.clientRect.height*card.maxHeightRelToStage);
		card.width = Math.round(card.height * card.sourceWidth/card.sourceHeight);

		if(this.clientRect.width * card.maxWidthRelToStage < card.width) {
			card.width = this.clientRect.width * card.maxWidthRelToStage;
			card.height = card.width * (card.sourceHeight/card.sourceWidth);
		}
		this.updateObserverDimensions();
	}

	updateObserverDimensions() {
		this.hand.updateDimensions();	

		this.observers.forEach((observer) => observer.element.updateDimensions());

		this.hand.organizeCards();
	}

	onMouseMove(e) {
		//var x = e.clientX - this.div.offsetLeft;
		var y = e.clientY - this.div.offsetTop;
		if(this.hand!=null) {
			if (y > this.hand.interactionHeightRaise) {
				this.hand.raise();

				if (draggedCard != null)
					draggedCard.toggleMode("card");
			} else if (y < this.hand.interactionHeightLower) {
				this.hand.lower();

				if (draggedCard != null)
					draggedCard.toggleMode("unit");
			}
		}
	}
}