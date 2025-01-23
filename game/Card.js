class Card extends FlippableElement {
	constructor(parent, x, y, facing) {
        super(parent, "fixed", "absolute", x, y, "fixed", "relative", 0.2, 0.2, "card", "cardBack", facing);
    
		this.setDefaultStyle();
    }

    setDefaultStyle() {
		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 1px rgba(0, 0, 0, 1.0))");
    }
}