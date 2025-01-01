class Coordinate {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	getDistanceTo(target) {		
		let a = Math.abs(target.x - this.x);
		let b = Math.abs(target.y - this.y);

		return Math.round(Math.sqrt(a*a + b*b));
	}
}