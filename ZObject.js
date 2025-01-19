class ZObject {
	constructor(parentHTML, parentViewPort, x, y, w, h) {
        this.parentHTML = parentHTML;
        this.parentViewPort = parentViewPort;

        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;

        this.keepAspectRatio = true;

        this.div = document.createElement('div');
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = "#00FF00";
        this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parentHTML, { attributes: false, childList: true, characterData: false });	
		this.parentHTML.appendChild(this.div);	
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
		this.setCoordinates();
        this.setDimensions();
	}

    setCoordinates() {
        let scaleX = 1.0;
        let scaleY = 1.0;
        if(this.keepAspectRatio) {
            scaleX = Math.min(this.parentViewPort.scaleX, this.parentViewPort.scaleY);
            scaleY = scaleX;
        } else {
            scaleX = this.parentViewPort.scaleX;
            scaleY = this.parentViewPort.scaleY;
        }

        let x = (scaleX*(this.x - this.parentViewPort.x));
        let y = (scaleY*(this.y - this.parentViewPort.y));
        this.div.style.left = x + "px";
        this.div.style.top = y + "px";
    }

    setDimensions() {
        let width = (this.parentViewPort.scaleX*this.width);
        let height = (this.parentViewPort.scaleY*this.height);
        this.div.style.width = width + "px";
        this.div.style.height = height + "px";
    }

    onParentResize() {
		this.setCoordinates();
        this.setDimensions();
    }
}