const Color = require('./Color');
const Vector = require('./Vector');
const { createCanvas } = require('canvas');
const fs = require('fs');

const simulation = JSON.parse(fs.readFileSync('./simulation.json'));

const width = simulation.size[0];
const height = simulation.size[1];
const center = new Vector(width / 2, height / 2);

let canvas = createCanvas(width, height);
let ctx = canvas.getContext('2d');

let color = new Color();

let size = simulation.blackHoleSize;
let distanceScale = 2;
let radius = 0.1;
let brightnessScale = 0.4;
let dt = simulation.dt;
let layers = 8;

let camera = new Vector();
let direction = new Vector(
	simulation?.direction?.[0],
	simulation?.direction?.[1]
);

function lerp(v0, v1, t) {
	return (1 - t) * v0 + t * v1;
}

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
}

function drawPixel(x, y) {
	ctx.fillStyle = color.toColor();
	ctx.fillRect(
		x + center.x,
		y + center.y,
		simulation.pixelSize,
		simulation.pixelSize
	);
}

function clearScreen() {
	ctx.clearRect(0, 0, width, height);
}

let index = 0;
let lastPercent;
let frames = 0;
let timeTaken = 0;

function render() {
	let startTime = new Date();
	index++;

	let screenPosition = new Vector();

	for (
		screenPosition.y = -center.y;
		screenPosition.y < center.y;
		screenPosition.y += simulation.pixelSize
	) {
		for (
			screenPosition.x = -center.x;
			screenPosition.x < center.x;
			screenPosition.x += simulation.pixelSize
		) {
			rayTrace(screenPosition);
			drawPixel(screenPosition.x, screenPosition.y);
		}
	}

	const dataURI = canvas.toDataURL('image/png', 1.0);
	const data = Buffer.from(
		dataURI.replace('data:image/png;base64,', ''),
		'base64'
	);

	fs.writeFile(
		`${simulation.outputPath}/${index.toString().padStart(4, '0')}.png`,
		data,
		() => {}
	);

	const percentFinished = Math.floor((index / frames) * 100);

	if (percentFinished % 20 === 0 && percentFinished !== lastPercent) {
		console.log(`Finished writing ${percentFinished}%`);
		lastPercent = percentFinished;
	}

	timeTaken += new Date() - startTime;
}

function rayTrace(screenPosition) {
	let velocity = new Vector(0, 0, 1);
	let position = new Vector();

	const heightRadians = degToRad(direction.x - 30);
	const widthRadians = degToRad(direction.x - 120);
	const positionRatioX = screenPosition.x / size;
	const positionRatioY = screenPosition.y / size;

	// Calculate the direction of the ray based on the screen position
	velocity.x =
		positionRatioY * Math.cos(heightRadians) +
		positionRatioX * Math.cos(widthRadians);

	velocity.y =
		positionRatioY * Math.sin(heightRadians) +
		positionRatioX * Math.sin(widthRadians);

	// We don't care about the speed of the ray, just the direction, since it's light
	velocity.normalize();

	// The ray starts at the camera
	position.x = camera.x;
	position.y = camera.y;
	position.z = camera.z;

	// Background color
	color.v = 0;

	let iterations = 0;
	let sizeX, sizeY, sizeZ;
	let singularityDistance;

	if (simulation.engine === 'accurate') {
		while (
			position.z <= 10 &&
			iterations <= 3000 &&
			(Math.abs(position.y - position.z * degToRad(direction.y)) >=
				0.01 ||
				Math.abs(
					position.x * position.x +
						position.y * position.y +
						position.z * position.z -
						8
				) >= 60)
		) {
			iterations++;

			sizeX = position.x * position.x;
			sizeY = position.y * position.y;
			sizeZ = position.z * position.z;
			singularityDistance = (sizeX + sizeY + sizeZ) * distanceScale;

			dt = -0.005 / (sizeX + sizeY + sizeZ);

			velocity.x += position.x * dt;
			velocity.y += position.y * dt;
			velocity.z += position.z * dt;

			dt =
				100 *
				Math.sqrt(
					velocity.x * velocity.x +
						velocity.y * velocity.y +
						velocity.z * velocity.z
				);
			position.x += velocity.x / dt;
			position.y += velocity.y / dt;
			position.z += velocity.z / dt;
		}

		singularityDistance = (sizeX + sizeY + sizeZ) * distanceScale;

		if (singularityDistance >= 130) return;
	} else {
		let intersected;

		for (let i = 0; i < simulation.raysPerPixel; i++) {
			sizeX = position.x * position.x;
			sizeY = position.y * position.y;
			sizeZ = position.z * position.z;

			const singularityDistance = (sizeX + sizeY + sizeZ) * distanceScale;

			if (
				position.y > -radius &&
				position.y < radius &&
				singularityDistance < 130
			) {
				intersected = true;

				break;
			}

			velocity.x -= position.x / (singularityDistance * dt);
			velocity.y -= position.y / (singularityDistance * dt);
			velocity.z -= position.z / (singularityDistance * dt);

			// velocity.normalize();

			position.x += velocity.x / dt;
			position.y += velocity.y / dt;
			position.z += velocity.z / dt;
		}

		if (!intersected) return;
	}

	const distance = Math.sqrt(sizeX + sizeY + sizeZ);

	// Calculate brightness
	const brightness =
		((50 +
			(30 / 8) * (8 - ((8 - distance) * (8 - distance)) / 1.7) +
			brightnessScale *
				(30 +
					30 *
						(Math.sin(degToRad(distance * 180)) *
							Math.sin(degToRad(distance * 180))) +
					30 *
						(Math.sin(degToRad(distance * 120)) *
							(1.2 + Math.sin(degToRad(8)) / 2)))) *
			(8 - (distance * distance) / layers)) /
		3;

	color.h = -400 * distance;
	color.v = brightness;
}

if (!fs.existsSync(simulation.outputPath)) {
	fs.mkdirSync(simulation.outputPath);
}

console.log(
	`Rays needed: ${Math.floor(
		((width * height) / simulation.pixelSize) * simulation.raysPerPixel
	)}`
);

if (simulation.path) {
	simulation.path.forEach((path) => (frames += Math.floor(1 / path.speed)));
	console.log(`Frames needed: ${frames}`);

	simulation.path.forEach((path, i) => {
		for (let t = 0; t < 1; t += path.speed) {
			const start = path.start ?? simulation.path[i - 1].end;
			camera.x = lerp(start.position[0], path.end.position[0], t);
			camera.y = lerp(start.position[1], path.end.position[1], t);
			camera.z = lerp(start.position[2], path.end.position[2], t);

			direction.x = lerp(start.direction[0], path.end.direction[0], t);
			direction.y = lerp(start.direction[1], path.end.direction[1], t);

			clearScreen();
			render();
		}
	});

	console.log(
		`Finished writing ${index} images. Time per frame ${
			Math.floor((timeTaken / frames) * 100) / 100
		}ms`
	);
} else if (simulation.camera) {
	frames = 1;
	camera.x = simulation.camera[0];
	camera.y = simulation.camera[1];
	camera.z = simulation.camera[2];

	render();
	console.log(
		`Finished render. Time per frame ${
			Math.floor((timeTaken / frames) * 100) / 100
		}ms`
	);
} else {
	console.log('A camera or path must be specified!');
}
