class ZoomableElement {
	constructor(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, w, h, contentBehaviour, cW, cH) {
        this.parent = parent;
        if(parent instanceof HTMLElement) {
            this.parentHTML = parent;
            this.parentViewPort = mainViewPort;
            this.parent = null;
        } else {
            this.parentViewPort = parent.viewPort;
            this.parentHTML = parent.div;
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

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = randomHexColorCode();
        this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parentHTML, { attributes: false, childList: true, characterData: false });	
		this.parentHTML.appendChild(this.div);

        
        
        this.div.addEventListener("mousedown", this.onMouseDown.bind(this), { passive: false });
        this.div.addEventListener("dblclick", this.onDoubleClick.bind(this), { passive: false });
    
		
        
        this.cursorX = 0;
		this.cursorY = 0;
        this.picking = null;
        this.pickedUp = false;
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
    }
    onMouseDown(e) {
        e.stopPropagation();

        if(this.positionType == "absolute")
            this.picking = window.setTimeout(this.pickUp.bind(this), 200);

		this.cursorX = e.clientX;
		this.cursorY = e.clientY;
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
                dX /= this.parentViewPort.getScaleX();
                dY /= this.parentViewPort.getScaleY();
            }
            this.moveTo((this.x + dX), (this.y + dY));
        }
	}
	onMouseUp(e) {
        if(this.picking) {
            clearTimeout(this.picking);
            this.picking = null;
        }
        if(this.pickedUp) this.drop();

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



    onParentChange() {
        //if(this.positioningBehaviour == "zoom") 
            this.repositionDiv();
        //if(this.dimensionsBehaviour == "zoom") 
            this.resizeDiv();
    }
    repositionDiv() {
        let x = 0;
        let y = 0;
        
        if(this.positionType == "absolute") {
            x = this.x;
            y = this.y;
            if(this.positioningBehaviour == "zoom") {
                x -= this.parentViewPort.x;
                x *= this.parentViewPort.getScaleX();
                y -= this.parentViewPort.y;
                y *= this.parentViewPort.getScaleY();
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
            w = this.width * this.parentViewPort.getScaleX();
            h = this.height * this.parentViewPort.getScaleY();
        } else if(this.dimensionsType == "relative") {
            let d = this.getScreenDimensions();
            w = d.width;
            h = d.height;
        }
        
        this.div.style.width = w + "px";
        this.div.style.height = h + "px";
    }



    getScreenDimensions() {
        let w = this.width * this.parentViewPort.getScaleX();
        let h = this.height * this.parentViewPort.getScaleY();
        if(this.dimensionsType == "relative") {
            w = this.width * this.parentHTML.getBoundingClientRect().width;
            h = this.height * this.parentHTML.getBoundingClientRect().height;
            if(this.contentBehaviour == "keepAspectRatio") {
                if(w > (h * this.contentAspectRatio)) {
                    w = h * this.contentAspectRatio;
                } else {
                    h = w / this.contentAspectRatio;
                }
            }
        }
        return {width: w, height: h};
    }

    getScreenX() {
        let x = this.x;
        if(this.positionType == "relative")
            x *= this.parentHTML.getBoundingClientRect().width;
        return x;
    }
    getScreenY() {
        let y = this.y;
        if(this.positionType == "relative")
            y *= this.parentHTML.getBoundingClientRect().height;
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

        let vD = this.viewPort.getDimensions()
        let vX = this.viewPort.x + (vD.width * relX);
		let vY = this.viewPort.y + (vD.height * relY);
        return { x: vX, y: vY};
    }
}