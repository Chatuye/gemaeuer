class ObjectFactory {
    constructor() {
        this.numObjects = 0;
    }

    create(dataObject) {
        dataObject.objectId = this.numObjects;
        this.numObjects += 1;

        switch(dataObject.objectType) {
			case "VIEWPORT":
				return new ViewPort(dataObject);
			default:
				console.log("Error: Unknown object type: "+dataObject.objectType);
                return null;
		}
    }
}