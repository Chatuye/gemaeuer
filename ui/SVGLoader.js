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
    }

    clone(key) {
        return this.svgs[key].cloneNode(true);
    }
}