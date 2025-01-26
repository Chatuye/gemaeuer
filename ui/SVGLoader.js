class SVGLoader {
    constructor() {
        this.svgs = new Array();
    }

    loadAll(callback) {
        for(let key in svgData) {
            this.load(key);
        }
        callback();
    }

    load(key) {
        let mySVGParent = document.createElement("div");
		mySVGParent.innerHTML = svgData[key];
		this.svgs[key] = mySVGParent.firstElementChild;

        if(key == cardDimensions.svg) {
            cardDimensions.width = this.svgs[key].getAttribute("width");
            cardDimensions.height = this.svgs[key].getAttribute("height");
        }
    }

    clone(key) {
        return this.svgs[key].cloneNode(true);
    }
}