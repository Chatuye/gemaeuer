class TangibleObject extends StageObject {
	constructor(stage, imgSrc) {
		super(stage, imgSrc);

		this.dd_cursorX = 0;
		this.dd_cursorY = 0;

		this.div.addEventListener("mousedown", this.onMouseDown.bind(this));
	}

	onLoad() {
		super.onLoad();
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 1px #484848)");
	}

	onMouseMove(e) {
		e.preventDefault();

		let dd_posX = this.dd_cursorX - e.clientX;
		let dd_posY = this.dd_cursorY - e.clientY;
		this.dd_cursorX = e.clientX;
		this.dd_cursorY = e.clientY;

		this.coordinate.updateStageValues((this.coordinate.stageX - dd_posX), (this.coordinate.stageY - dd_posY));
	}

	onMouseUp(e) {
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 1px #484848)");
		this.div.style.zIndex = this.zIndex;
		this.stage.moveObjectToTopZIndex(this);

		document.onmouseup = null;
		document.onmousemove = null;	
	}

	onMouseDown(e) {
		e.preventDefault();
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 2px #484848)");

		this.div.style.zIndex = this.stage.getTopZIndex();

		this.dd_cursorX = e.clientX;
		this.dd_cursorY = e.clientY;
		this.onMouseMove(e);
		
		document.onmouseup = this.onMouseUp.bind(this);
		document.onmousemove = this.onMouseMove.bind(this);
	}
}