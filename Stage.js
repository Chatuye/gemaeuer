class Stage {
	constructor(p) {
		this.stageParent = p;
		this.div = document.createElement("div");
		this.div.className = "Stage";

		this.stageParentObserver = new MutationObserver(this.onMutation.bind(this));
		this.stageParentObserver.observe(this.stageParent, { attributes: false, childList: true, characterData: false });	
		this.stageParent.appendChild(this.div);	

		this.clientRect = null;
		this.aspectRatio = 1.7777777778;
		this.aspectRatioTolerance = 0.5;
		this.baseWidth = 1920;
		this.baseHeight = 1080;
		this.scale = 1.0;
		this.scaleX = 1.0;
		this.scaleY = 1.0;

		this.cursorX = 0;
		this.cursorY = 0;

		this.childDivs = new Array();
		this.maxUsedZIndex = -1;

		this.div.addEventListener("contextmenu", this.onContextMenu.bind(this));
		this.div.addEventListener("mousemove", this.onMouseMove.bind(this));
	}

	onMutation(mutations) {
		mutations.forEach(this.onMutationHelper.bind(this))
	}

	onMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.div)) {
			this.onDivObserved();
			this.stageParentObserver.disconnect();
		}
	}

	onDivObserved() {
		this.onResize();
	}

	registerChildDiv(cD) {
		this.maxUsedZIndex++;
		cD.zIndex = this.maxUsedZIndex;
		this.childDivs.push(cD);
	}

	getTopZIndex() {
		return this.maxUsedZIndex+1;
	}

	onResize() {
		this.clientRect = this.div.getBoundingClientRect();
		this.clientRect.width = Math.round(0.9*mainBody.getBoundingClientRect().width);
		this.clientRect.height = Math.round(0.9*mainBody.getBoundingClientRect().height);
		this.div.style.width = this.clientRect.width+"px";
		this.div.style.height = this.clientRect.height+"px";
		if(this.clientRect.width/this.clientRect.height < (this.aspectRatio*(1-this.aspectRatioTolerance))) {
			this.div.style.height = Math.round(this.clientRect.width/(this.aspectRatio*(1-this.aspectRatioTolerance)))+"px";
		} else if(this.clientRect.width/this.clientRect.height > (this.aspectRatio*(1+this.aspectRatioTolerance))) {
			this.div.style.width = Math.round(this.clientRect.height*(this.aspectRatio*(1+this.aspectRatioTolerance)))+"px";
		}

		this.clientRect = this.div.getBoundingClientRect();
		this.div.style.top = Math.round((mainBody.getBoundingClientRect().height-this.clientRect.height)/2)+"px";
		this.div.style.left = Math.round((mainBody.getBoundingClientRect().width-this.clientRect.width)/2)+"px";

		this.calculateScale();
		this.updateChildDivs();
	}

	calculateScale() {
		this.scaleX = this.clientRect.width/this.baseWidth;
		this.scaleY = this.clientRect.height/this.baseHeight;

		this.scale = Math.min(this.scaleX, this.scaleY);
	}
	
	updateChildDivs() {
		this.childDivs.forEach((stageDiv) => stageDiv.onParentResize());
	}

	moveObjectToTopZIndex(sO) {
		this.childDivs.forEach(function(stageDiv) {
			if(stageDiv.zIndex > sO.zIndex) {
				stageDiv.zIndex -= 1;
				stageDiv.div.style.zIndex = stageDiv.zIndex;
			}
		});
		sO.zIndex = this.maxUsedZIndex;
		sO.div.style.zIndex = sO.zIndex;
	}

	onMouseMove(e) {
		this.cursorX = e.clientX - this.div.offsetLeft;
		this.cursorY = e.clientY - this.div.offsetTop;
	}

	onContextMenu(e) {
		e.preventDefault();
	}
}