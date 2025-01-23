class Hand {
    constructor(stage) {
        console.log("Hand");
        this.stage = stage;

        let d = this.calculateCoordinates();
        this.x = d.x;
        this.y = d.y;

        //console.log(this.x+" "+this.y);
        
        this.cards = new Array();
        this.mode = "lowered";



    }

    onStageResize() {

	}

    calculateCoordinates() {
		let d = this.stage.getScreenDimensions();
        let x = d.width / 2;
        let y = d.height;
        return {x: x, y: y}
    }

	positionCards() {
		if(this.cards.length > 0) {
			let l = this.cards.length;
			
            //if(this.stage.draggedCard)
			//	if(this.stage.draggedCard.hand==this) l--;
			
            let middle = 0;
			if ((l % 2) == 1)
				middle = Math.floor(l / 2); 
			else
				middle = l / 2 - 0.5;

			for(var i=0; i<this.cards.length; i++)
				//if(this.stage.draggedCard != this.cards[i])
					this.positionCard(this.cards[i], i, middle);
		}	
	}
	positionCard(card, pos, middle) {
		let fromCenter = pos - middle;

		//card.div.style.zIndex = this.stage.maxUsedZIndex+pos+1;

		//Rotate card
		card.div.style.transform = "none";
		let angle = fromCenter * 0.05;
		card.div.style.transformOrigin = "50% 100%";
		card.div.style.transform = "rotate(" + angle + "rad)";

		//Position card
        let cD = card.getScreenDimensions();
		let anchorX = Math.round(cD.width / 2);
		let anchorY = cD.height;
		let newX = (this.x - anchorX) + (fromCenter * Math.floor(cD.width / 1.9));
		let newY = (this.y - anchorY) + Math.abs(0.8 * fromCenter * (Math.sin(angle) * (cD.width / 2)));

		switch (this.mode) {
			case "lowered":
				//newY += Math.round(card.dimensions.stageHeight*this.relCardOffsetLowered);
				break;
			case "raised":
				//newY -= Math.round(card.dimensions.stageHeight*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.cards.length)));
				break;
			default:
				console.log("Unknown hand mode.");
		}


		card.moveTo(newX, newY);
	}

	addCard(card) {
		//this.calculateInteractionY(card.dimensions.stageHeight);
		//card.hand = this;
		this.cards.push(card);

		
		this.positionCards();
	}
}