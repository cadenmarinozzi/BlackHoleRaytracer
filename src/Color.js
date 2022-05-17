class Color {
	constructor() {
		this.h = 0;
		this.s = 0;
		this.v = 0;

		this.r = 0;
		this.g = 0;
		this.b = 0;
	}

	toRGB() {
		let f = (n, k = (n + this.h / 60) % 6) =>
			this.v - this.v * this.s * Math.max(Math.min(k, 4 - k, 1), 0);

		return [Math.floor(f(5)), Math.floor(f(3)), Math.floor(f(1))]; // Floating point overflow if this isn't floored
	}

	toColor() {
		return `rgb(${this.toRGB().join()})`;
	}
}

module.exports = Color;
