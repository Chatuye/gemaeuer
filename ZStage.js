class ZStage {
	constructor(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH) {
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

        this.div = document.createElement('div');
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = randomHexColorCode();
        this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parentHTML, { attributes: false, childList: true, characterData: false });	
		this.parentHTML.appendChild(this.div);

        // Ab hier nicht mehr Object

        this.zoomPerTick = 40;

        this.viewPort = new ZViewPort(this, viewPortType, vW, vH);

        
        this.children = new Array();
        this.div.addEventListener("wheel", this.onWheel.bind(this), { passive: false });

		this.cursorX = 0;
		this.cursorY = 0;
        this.div.addEventListener("mousedown", this.onMouseDown.bind(this), { passive: false });
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

        onZStage();
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



    onParentChange() {
        this.repositionDiv();
        this.resizeDiv();

        this.viewPort.calculateScale(this.updateChildren.bind(this));
    }



    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    
    registerChild(child) {
        this.children.push(child);
    }


    pan(dX, dY) {
		dX = dX/this.viewPort.getScaleX();
		dY = dY/this.viewPort.getScaleY();

		this.viewPort.x -= dX;
		this.viewPort.y -= dY;

		this.updateChildren();
	}



    zoom(z, x, y) {
		let cursorXOnDiv = Math.round(x - this.div.getBoundingClientRect().left);
		let cursorYOnDiv = Math.round(y - this.div.getBoundingClientRect().top);

        let relX = cursorXOnDiv/this.getScreenWidth();
        let relY = cursorYOnDiv/this.getScreenHeight();

		let zoomInc = Math.round((z/100)*this.zoomPerTick);
        let q = this.viewPort.getWidth()/this.viewPort.getHeight();

        let zoomIncX = zoomInc*q;
		let zoomIncY = zoomInc;

        this.viewPort.update(zoomIncX*relX, zoomIncY*relY, zoomIncX, zoomIncY, this.updateChildren.bind(this));
    }



    onWheel(e) {
        e.stopPropagation();
		
		this.zoom(e.deltaY, e.clientX, e.clientY)
    }

    onMouseDown(e) {
        e.stopPropagation();

		this.cursorX = e.clientX;
		this.cursorY = e.clientY;
		this.addedMouseMove = this.onMouseMove.bind(this);
		this.addedMouseUp = this.onMouseUp.bind(this);
		document.addEventListener("mouseup", this.addedMouseUp);
		document.addEventListener("mousemove", this.addedMouseMove);
	}

	onMouseMove(e) {
		let dX = e.clientX - this.cursorX;
		let dY = e.clientY - this.cursorY;
		this.cursorX = e.clientX;
		this.cursorY = e.clientY;

		this.pan(dX, dY);
	}

	onMouseUp(e) {
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






}