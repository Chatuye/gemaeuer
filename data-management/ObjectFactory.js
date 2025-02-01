class ObjectFactory {
    constructor() {
        this.numObjects = 0;
    }

    createObject(dataObject) {
        if(dataObject.objectId == -1) {
			dataObject.objectId = this.numObjects;
		}
        this.numObjects += 1;
        console.log("Creating Object: " + dataObject.objectId + " " +dataObject.objectType);

        switch(dataObject.objectType) {
			case "CARD":
				return new Card(dataObject);
			case "DECK":
				return new Deck(dataObject);
			case "GAMESTAGE":
				return new GameStage(dataObject);
			case "HAND":
				return new Hand(dataObject);
			case "STAGEZINDEXMANAGER":
				return new StageZIndexManager(dataObject);
			case "TILE":
				return new Tile(dataObject);
			case "VIEWPORT":
				return new ViewPort(dataObject);
			default:
				console.log("Error: Unknown object type: "+dataObject.objectType);
                return null;
		}
    }
}