class ZoomableElement {
	constructor(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, w, h, contentBehaviour, cW, cH) {
        this.parent = parent;
        if(parent instanceof HTMLElement) {
            this.parent = {
                div: parent,
                viewPort: new ViewPort(parent, "relative", 1.0, 1.0),
                parent: null,
                pickedUpChild: null,
                getScreenDimensions: function() {
                    return parent.getBoundingClientRect();
                },
                getUIScale: function() {
                    let sX = parent.getBoundingClientRect().width / UIDefinitions.baseWidth;
                    let sY = parent.getBoundingClientRect().height / UIDefinitions.baseHeight;
                    return {scaleX: sX, scaleY: sY}
                }            
            }
        }

        this.positioningBehaviour = positioningBehaviour;
        this.positionType = positionType;
        this.x = x;
        this.y = y;
        this.dimensionsBehaviour = dimensionsBehaviour;
        this.dimensionsType = dimensionsType;
        this.width = w;
        this.height = h;
        this.contentBehaviour = contentBehaviour;
        this.contentWidth = cW;
        this.contentHeight = cH;
        this.contentAspectRatio = this.contentWidth/this.contentHeight;
        if(this.contentBehaviour == "keepAspectRatio")
           this.setScreenDimensionsToParentScale();

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

        if(this.positionType == "absolute")
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
            if(this.positioningBehaviour == "zoom") {
                dX /= this.parent.viewPort.getScaleX();
                dY /= this.parent.viewPort.getScaleY();
            }
            this.moveTo((this.x + dX), (this.y + dY));
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
        this.x = x;
        this.y = y;
        this.repositionDiv();
    }
    pickUp() {
        this.parent.pickedUpChild = this;
        this.picking = null;
        this.pickedUp = true;
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 4px rgba(0, 0, 0, 1.0)) drop-shadow(0px 0px 24px rgba(255, 255, 255, 0.33)");
    }
    drop() {
        this.pickedUp = false;
		this.setDefaultStyle();
    }
    setDefaultStyle() {
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px rgba(0, 0, 0, 1.0))");
    }

    setScreenDimensionsToParentScale() {
        let sD = this.getScreenDimensions();
        this.width = sD.width;
        this.height = sD.height;
    }

    onParentChange() {
        if(this.contentBehaviour == "keepAspectRatio")
            this.setScreenDimensionsToParentScale();
        this.repositionDiv();
        this.resizeDiv();
    }
    repositionDiv() {
        let x = 0;
        let y = 0;
        
        if(this.positionType == "absolute") {
            x = this.x;
            y = this.y;
            if(this.positioningBehaviour == "zoom") {
                x -= this.parent.viewPort.x;
                x *= this.parent.viewPort.getScaleX();
                y -= this.parent.viewPort.y;
                y *= this.parent.viewPort.getScaleY();
            }
        } else if(this.positionType == "relative") {
            x = this.getScreenX();
            y = this.getScreenY();
        }

        this.div.style.left = x + "px";
        this.div.style.top = y + "px";
    }
    resizeDiv() {
        let w = 0;
        let h = 0;
        
        if(this.dimensionsType == "absolute") {
            w = this.width;
            h = this.height;
            if(this.dimensionsBehaviour == "zoom") {
                w *= this.parent.viewPort.getScaleX();
                h *= this.parent.viewPort.getScaleY()
            }
        } else if(this.dimensionsType == "relative") {
            let d = this.getScreenDimensions();
            w = d.width;
            h = d.height;
        }
        this.div.style.width = w + "px";
        this.div.style.height = h + "px";
    }


/*
    getScreenDimensions() {
        let width = this.width * this.parent.viewPort.getScaleX();
        let height = this.height * this.parent.viewPort.getScaleY();
        if(this.dimensionsType == "relative") {
            width = this.width * this.parent.getScreenDimensions().width;
            height = this.height * this.parent.getScreenDimensions().height;
            if(this.contentBehaviour == "keepAspectRatio") {
                if(width > (height * this.contentAspectRatio)) {
                    width = height * this.contentAspectRatio;
                } else {
                    height = width / this.contentAspectRatio;
                }
            }
        }
        return {width: width, height: height};
    }*/
    getUIScale() {
        let sX = this.getScreenDimensions().width / UIDefinitions.baseWidth;
        let sY = this.getScreenDimensions().height / UIDefinitions.baseHeight;
        return {scaleX: sX, scaleY: sY}
    }
    getScreenDimensions() {
        let width = this.width * this.parent.viewPort.getScaleX();
        let height = this.height * this.parent.viewPort.getScaleY();
        if(this.contentBehaviour == "keepAspectRatio") {
            let parentUIScale = this.parent.getUIScale();
            parentUIScale = Math.min(parentUIScale.scaleX, parentUIScale.scaleY);
            width = this.contentWidth * parentUIScale;
            height = this.contentHeight * parentUIScale;
            if(this.dimensionsBehaviour == "zoom") {
                width *= this.parent.viewPort.getScaleX();
                height *= this.parent.viewPort.getScaleY();
            }
        }
        if(this.dimensionsType == "relative") {
            width = this.width * this.parent.getScreenDimensions().width;
            height = this.height * this.parent.getScreenDimensions().height;
        }
        return {width: width, height: height};
    }
    getScreenX() {
        let x = this.x;
        if(this.positionType == "relative")
            x *= this.parent.div.getBoundingClientRect().width;
        return x;
    }
    getScreenY() {
        let y = this.y;
        if(this.positionType == "relative")
            y *= this.parent.div.getBoundingClientRect().height;
        return y;
    }



    convertScreenPosToDivPos(x, y) {
        let cursorXOnDiv = Math.round(x - this.div.getBoundingClientRect().left);
		let cursorYOnDiv = Math.round(y - this.div.getBoundingClientRect().top);
        return { x: cursorXOnDiv, y: cursorYOnDiv};
    }
    convertDivPosToViewPortPos(x, y) {
        let d = this.getScreenDimensions();
        let relX = x/d.width;
        let relY = y/d.height;

        let vD = this.viewPort.getDimensions();
        let vX = this.viewPort.x + (vD.width * relX);
		let vY = this.viewPort.y + (vD.height * relY);
        return { x: vX, y: vY};
    }
}