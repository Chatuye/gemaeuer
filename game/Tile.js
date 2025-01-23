class Tile extends FlippableElement {
	constructor(parent, x, y, facing) {
        super(parent, "zoom", "absolute", x, y, "zoom", "absolute", 200, 200, "tile-front", "tile-back", facing);

        this.svgFront.getElementById("text").firstChild.innerHTML = Math.floor((Math.random()*9))+1;
    }



}