class ZoomableElement {
	constructor(parent, positionType, x, y, dimensionsType, w, h) {
        this.parent = parent;
        if(parent instanceof HTMLElement) {
            this.parentHTML = parent;
            this.parentViewPort = mainViewPort;
            this.parent = null;
        } else {
            this.parentViewPort = parent.viewPort;
            this.parentHTML = parent.div;
        }

        this.positionType = positionType;
        this.x = x;
        this.y = y;
        this.dimensionsType = dimensionsType;
        this.width = w;
        this.height = h;

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = randomHexColorCode();
        this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parentHTML, { attributes: false, childList: true, characterData: false });	
		this.parentHTML.appendChild(this.div);

        
        
        this.div.addEventListener("mousedown", this.onMouseDown.bind(this), { passive: false });
    
		
        
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
            this.x += dX/this.parentViewPort.getScaleX();
            this.y += dY/this.parentViewPort.getScaleY();
            this.repositionDiv();
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



    pickUp() {
        this.picking = null;
        this.pickedUp = true;
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 4px #000000)");
    }
    drop() {
        this.pickedUp = false;
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
    }



    onParentChange() {
        this.repositionDiv();
        this.resizeDiv();
    }
    repositionDiv() {
        let x = 0;
        let y = 0;
        
        if(this.positionType == "absolute") {
            x = (this.x - this.parentViewPort.x) * this.parentViewPort.getScaleX();
            y = (this.y - this.parentViewPort.y) * this.parentViewPort.getScaleY();
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
            w = this.getScreenWidth();
            h = this.getScreenHeight();
        }
        
        this.div.style.width = w + "px";
        this.div.style.height = h + "px";
    }



    getScreenWidth() {
        let w = this.width * this.parentViewPort.getScaleX();
        if(this.dimensionsType == "relative")
            w = this.width * this.parentHTML.getBoundingClientRect().width;
        return w;
    }
    getScreenHeight() {
        let h = this.height * this.parentViewPort.getScaleY();
        if(this.dimensionsType == "relative")
            h = this.height * this.parentHTML.getBoundingClientRect().height;
        return h;
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
        let relX = x/this.getScreenWidth();
        let relY = y/this.getScreenHeight();

        let vX = this.viewPort.x + (this.viewPort.getWidth() * relX);
		let vY = this.viewPort.y + (this.viewPort.getHeight() * relY);
        return { x: vX, y: vY};
    }
}