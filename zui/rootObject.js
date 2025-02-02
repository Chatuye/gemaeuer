class RootObjectDO extends DataObject {
    constructor() {
        super();

        this.objectType = "ROOTOBJECT";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

class RootObject {
	constructor(dataObject) {
        this.dataObject = dataObject;
        dataManager.registerObject(this);

        this.div = document.getElementsByTagName('body')[0];
        this.boundingClientRect = this.div.getBoundingClientRect();

        if(this.dataObject.viewPort == -1) {
            let viewPortDO = new ViewPortDO();

            viewPortDO.parent.referenceId = this.dataObject.objectId;
            this.viewPort = dataManager.createObject(viewPortDO);
            this.dataObject.viewPort = this.viewPort.dataObject.objectId;
        } else {
            this.viewPort = dataManager.getObject(this.dataObject.viewPort);
        }

        if(this.dataObject.zManager == -1) {
            let stageZIndexManagerDO = new StageZIndexManagerDO()
            this.zManager = dataManager.createObject(stageZIndexManagerDO);
            this.dataObject.zManager = this.zManager.dataObject.objectId;
        } else {
            this.zManager = dataManager.getObject(this.dataObject.zManager);
        }
        
        this.pickedUpChild = null;
        this.children = new Array();
        for(let i = 0; i < this.dataObject.children.length; i++) {
			this.children.push(dataManager.getObject(this.dataObject.children[i]));
		}

        window.addEventListener("resize",this.update.bind(this));
    }

    update() {
        this.boundingClientRect = this.div.getBoundingClientRect();
        this.updateChildren();
        console.log("update ");
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
        this.dataObject.children.push(child.dataObject.objectId);
    }
    clearDiv() {
        for(let i = 0; i < this.children.length; i++) {
			this.div.removeChild(this.children[i].div);
		}
    }

    getScreenDimensions() {
        //console.log("gSD "+this.boundingClientRect);
        return this.boundingClientRect;
    }

    getUIScale() {
        let sX = this.boundingClientRect.width / UIDefinitions.baseWidth;
        let sY = this.boundingClientRect.height / UIDefinitions.baseHeight;
        return {scaleX: sX, scaleY: sY}
    } 
}