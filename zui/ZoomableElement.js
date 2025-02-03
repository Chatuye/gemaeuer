class ZoomableElementDO extends DataObject {
    constructor() {
        super();

        this.objectType = "ZOOMABLEELEMENT";
        
        this.parent = { referenceId: -1 };
        
        this.positionBehaviour = "ZOOM";
        this.positionType = "ABSOLUTE";
        this.x = 0;
        this.y = 0;
        this.dimensionsBehaviour = "ZOOM";
        this.dimensionsType = "ABSOLUTE";
        this.width = 0;
        this.height = 0;
        this.uiScaling = true;
        this.zIndex = 0;
    }
}

class ZoomableElement {
	constructor(dataObject) {
        this.dataObject = dataObject;
        dataManager.registerObject(this);


        this.parent = dataManager.getObject(this.dataObject.parent.referenceId);

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = randomHexColorCode();
        this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parent.div, { attributes: false, childList: true, characterData: false });	
		this.parent.div.appendChild(this.div);
        
        
        this.div.addEventListener("mousedown", this.onMouseDown.bind(this), { passive: false });
        this.div.addEventListener("dblclick", this.onDoubleClick.bind(this), { passive: false });   
		
        
        this.cursorX = 0;
		this.cursorY = 0;
        this.picking = null;
        this.pickedUp = false;
        this.pickedUpChild = null;


        this.parent.zManager.set(this);
    }



	onParentMutation(mutations) {
		mutations.forEach(this.onParentMutationHelper.bind(this))
	}
	onParentMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.div)) {
			this.onDivObserved();
		}
	}
	onDivObserved() {
        this.parentObserver.disconnect();
		this.repositionDiv();
        this.resizeDiv();
	}

    onDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    onMouseDown(e) {
        e.stopPropagation();

		this.cursorX = e.clientX;
		this.cursorY = e.clientY;

        if(this.dataObject.positionType == "ABSOLUTE")
            this.picking = window.setTimeout(this.pickUp.bind(this), 200);

		this.addedMouseMove = this.onMouseMove.bind(this);
		this.addedMouseUp = this.onMouseUp.bind(this);
		document.addEventListener("mouseup", this.addedMouseUp);
		document.addEventListener("mousemove", this.addedMouseMove);
	}
	onMouseMove(e) {
        if(this.picking) {
            clearTimeout(this.picking);
            this.pickedUp = false;
            this.picking = null;
        }

        let dX = e.clientX - this.cursorX;
        let dY = e.clientY - this.cursorY;
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
   
        if(this.pickedUp) {
            if(this.dataObject.positionBehaviour == "ZOOM") {
                dX /= this.parent.getViewPort().getScaleX();
                dY /= this.parent.getViewPort().getScaleY();
            }
            this.moveTo((this.dataObject.x + dX), (this.dataObject.y + dY));
        }
	}
	onMouseUp(e) {
        if(this.picking) {
            clearTimeout(this.picking);
            this.picking = null;
        }
        if(this.pickedUp) this.drop(e.clientX, e.clientY);

        this.clearMouseEvents();
	}
    clearMouseEvents() {
		if(this.addedMouseMove) {
			document.removeEventListener("mousemove", this.addedMouseMove);
			document.removeEventListener("mouseup", this.addedMouseUp);
			this.addedMouseMove = null;
			this.addedMouseUp = null;
		}
	}


    moveTo(x, y) {
        this.dataObject.x = x;
        this.dataObject.y = y;
        this.repositionDiv();
    }
    pickUp() {
        this.parent.pickedUpChild = this;
        this.picking = null;
        this.pickedUp = true;
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 4px rgba(0, 0, 0, 1.0)) drop-shadow(0px 0px 24px rgba(255, 255, 255, 0.33)");
   
        if(this.parent.zManager) {
            //this.div.style.zIndex += 3*this.parent.zManager.getMaxLayerSize();
            //this.parent.zManager.remove(this.getZLayer(), this);
            this.parent.zManager.remove(this);
            this.dataObject.zIndex = 3;
            this.parent.zManager.set(this);
        }
    }
    drop() {
        this.pickedUp = false;
		this.setDefaultStyle();
        
        if(this.parent.zManager) {
            this.parent.zManager.remove(this);
            this.dataObject.zIndex = 0;
            this.parent.zManager.set(this);
        }

    }
    setDefaultStyle() {
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px rgba(0, 0, 0, 1.0))");
    }



    onParentChange() {
        this.repositionDiv();
        this.resizeDiv();
    }

    

    repositionDiv() {
        let sP = this.getScreenPosition();
        let x = sP.x;
        let y = sP.y;

        this.div.style.left = x + "px";
        this.div.style.top = y + "px";
    }
    resizeDiv() {
        let sD = this.getScreenDimensions();        
        let w = sD.width;
        let h = sD.height;

        this.div.style.width = w + "px";
        this.div.style.height = h + "px";
    }


    getScreenDimensions() {
        let width = 0;
        let height = 0;

        if(this.dataObject.dimensionsType == "RELATIVE") {
            width = this.dataObject.width * this.parent.getScreenDimensions().width;
            height = this.dataObject.height * this.parent.getScreenDimensions().height;
        } else if(this.dataObject.dimensionsType == "ABSOLUTE") {
            width = this.dataObject.width;
            height = this.dataObject.height;
            if(this.dataObject.dimensionsBehaviour == "ZOOM") {
                width *= this.parent.getViewPort().getScaleX();
                height *= this.parent.getViewPort().getScaleY();
            }
            if(this.dataObject.uiScaling) {
                let uiScale = this.getMainStage().getUIScale(true);
                width *= uiScale.scaleX;
                height *= uiScale.scaleY;
            }
        }
        
        return {width: width, height: height};
    }
    getScreenPosition() {
        let x = this.dataObject.x;
        let y = this.dataObject.y;

        if(this.dataObject.positionType == "RELATIVE") {
            let pSD = this.parent.getScreenDimensions();
            x *= pSD.width;
            y *= pSD.height;
        } else if(this.dataObject.positionType == "ABSOLUTE") {
            if(this.dataObject.positionBehaviour == "ZOOM") {
                x -= this.parent.getViewPort().getX();
                x *= this.parent.getViewPort().getScaleX();
                y -= this.parent.getViewPort().getY();
                y *= this.parent.getViewPort().getScaleY();
            }
        }

        return {x: x, y: y}
    }
/*    getZLayer() {
        let layer = Math.floor(this.dataObject.zIndex/this.parent.zManager.getMaxLayerSize());

        return layer;
    }*/
    setZIndex(index) {
        this.dataObject.zIndex = index;
        this.div.style.zIndex = index;
    }    
    getZIndex() {
        return this.dataObject.zIndex;
    }
    getMainStage() {
        if(this.parent instanceof RootObject)
            return this;
        else
            return this.parent.getMainStage();
    }


    convertScreenPosToDivPos(x, y) {
        let cursorXOnDiv = Math.round(x - this.div.getBoundingClientRect().left);
		let cursorYOnDiv = Math.round(y - this.div.getBoundingClientRect().top);
        return { x: cursorXOnDiv, y: cursorYOnDiv};
    }
}