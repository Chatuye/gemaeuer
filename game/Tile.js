class Tile extends FlippableObject {
	constructor(parent, x, y, facing) {
        super(parent, "zoom", "absolute", x, y, "zoom", "absolute", false, "tile-front", "tile-back", facing);

        this.svgFront.getElementById("text").firstChild.innerHTML = Math.floor((Math.random()*9))+1;
    }



}