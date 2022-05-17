class Vector {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	// This method creates a new vector and are considered slow because of that
	div(other) {
		if (typeof other === Vector) {
			return new Vector(
				this.x / other.x,
				this.y / other.y,
				this.z / other.z
			);
		}

		return new Vector(this.x / other, this.y / other, this.z / other);
	}

	magnitude() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	normalize() {
		const magnitude = this.magnitude();

		this.x /= magnitude;
		this.y /= magnitude;
		this.z /= magnitude;
	}
}

module.exports = Vector;
