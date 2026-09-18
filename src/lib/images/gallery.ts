/**
 * The built-in gallery is painted in code rather than shipped as files.
 *
 * That keeps the deploy tiny and sidesteps image licensing entirely. Every
 * picture is a cute animal, and each is its own scene rather than one drawing
 * recoloured.
 *
 * Two rules every scene follows, both driven by what a *puzzle* needs rather
 * than by what looks nice on its own:
 *
 *  1. **Detail everywhere.** A big animal centred on a flat background is the
 *     classic mistake here: every background tile looks the same, which is
 *     tedious rather than difficult. So the animal fills most of the frame and
 *     the space around it carries scattered motifs.
 *  2. **Colour that varies across the frame.** A tile should be placeable from
 *     its colour alone, so the ground shifts hue corner to corner.
 */

export interface Painting {
	readonly id: string;
	readonly title: string;
	readonly paint: (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void;
}

const TAU = Math.PI * 2;
const INK = '#3d3348';

/* ------------------------------------------------------------- helpers -- */

function wash(ctx: CanvasRenderingContext2D, size: number, stops: readonly string[]): void {
	const gradient = ctx.createLinearGradient(0, 0, size * 0.35, size);
	stops.forEach((colour, index) => gradient.addColorStop(index / (stops.length - 1), colour));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fill();
}

function oval(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	rotation: number,
	fill: string
): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
	ctx.fill();
}

/** A big shiny eye: dark oval, bright catchlight, small secondary glint. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	oval(ctx, x, y, r * 0.86, r, 0, INK);
	disc(ctx, x - r * 0.3, y - r * 0.38, r * 0.32, '#ffffff');
	disc(ctx, x + r * 0.26, y + r * 0.3, r * 0.15, 'rgba(255,255,255,0.75)');
}

function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string): void {
	const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
	glow.addColorStop(0, colour);
	glow.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fill();
}

/** The little "w" every cute muzzle needs. */
function smile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
	ctx.strokeStyle = INK;
	ctx.lineWidth = w * 0.16;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(x - w * 0.5, y, w * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x + w * 0.5, y, w * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
	ctx.stroke();
}

function nose(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.moveTo(x - w, y - w * 0.6);
	ctx.lineTo(x + w, y - w * 0.6);
	ctx.quadraticCurveTo(x, y + w * 0.95, x, y + w * 0.95);
	ctx.closePath();
	ctx.fill();
}

function pointyEar(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	lean: number,
	outer: string,
	inner: string
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(lean);
	ctx.fillStyle = outer;
	ctx.beginPath();
	ctx.moveTo(-r, r * 0.9);
	ctx.quadraticCurveTo(-r * 0.2, -r * 1.25, r, r * 0.9);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = inner;
	ctx.beginPath();
	ctx.moveTo(-r * 0.5, r * 0.75);
	ctx.quadraticCurveTo(-r * 0.1, -r * 0.5, r * 0.5, r * 0.75);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

function roundEar(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	outer: string,
	inner: string
): void {
	disc(ctx, x, y, r, outer);
	disc(ctx, x, y, r * 0.55, inner);
}

/**
 * Scatters a motif across the whole frame. This is what stops background tiles
 * being interchangeable, so the count matters more than the drawing.
 */
function scatter(
	ctx: CanvasRenderingContext2D,
	size: number,
	random: () => number,
	count: number,
	draw: (x: number, y: number, s: number, rotation: number) => void
): void {
	// Jittered grid rather than uniform random. Pure random leaves bare patches
	// by chance, and two bare background tiles are exactly the pair a player
	// cannot place. One motif per cell guarantees every region carries
	// something, while the jitter keeps it from looking like wallpaper.
	const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
	const step = size / columns;
	let placed = 0;

	for (let row = 0; row < columns && placed < count; row++) {
		for (let col = 0; col < columns && placed < count; col++) {
			const x = (col + 0.15 + random() * 0.7) * step;
			const y = (row + 0.15 + random() * 0.7) * step;
			const s = size * (0.012 + random() * 0.03);
			ctx.save();
			draw(x, y, s, random() * TAU);
			ctx.restore();
			placed++;
		}
	}
}

/* ------------------------------------------------------- motif drawers -- */

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * TAU;
		const radius = i % 2 === 0 ? s : s * 0.36;
		ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
	}
	ctx.closePath();
	ctx.fill();
}

function leaf(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: number,
	rotation: number,
	fill: string
): void {
	ctx.translate(x, y);
	ctx.rotate(rotation);
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.moveTo(-s, 0);
	ctx.quadraticCurveTo(0, -s * 0.8, s, 0);
	ctx.quadraticCurveTo(0, s * 0.8, -s, 0);
	ctx.fill();
}

function paw(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.ellipse(x, y + s * 0.35, s * 0.62, s * 0.5, 0, 0, TAU);
	ctx.fill();
	for (let i = 0; i < 4; i++) {
		const angle = Math.PI + (i + 0.5) * (Math.PI / 4);
		ctx.beginPath();
		ctx.ellipse(x + Math.cos(angle) * s * 0.65, y + Math.sin(angle) * s * 0.65, s * 0.2, s * 0.26, 0, 0, TAU);
		ctx.fill();
	}
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.strokeStyle = fill;
	ctx.lineWidth = s * 0.16;
	ctx.beginPath();
	ctx.arc(x, y, s, 0, TAU);
	ctx.stroke();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.moveTo(x, y + s * 0.7);
	ctx.bezierCurveTo(x - s * 1.4, y - s * 0.4, x - s * 0.35, y - s * 1.1, x, y - s * 0.3);
	ctx.bezierCurveTo(x + s * 0.35, y - s * 1.1, x + s * 1.4, y - s * 0.4, x, y + s * 0.7);
	ctx.fill();
}

function flake(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.strokeStyle = fill;
	ctx.lineWidth = s * 0.2;
	ctx.lineCap = 'round';
	for (let i = 0; i < 3; i++) {
		const angle = (i / 3) * Math.PI;
		ctx.beginPath();
		ctx.moveTo(x - Math.cos(angle) * s, y - Math.sin(angle) * s);
		ctx.lineTo(x + Math.cos(angle) * s, y + Math.sin(angle) * s);
		ctx.stroke();
	}
}

/**
 * A corner-to-corner light ramp, laid over the finished drawing.
 *
 * Large flat regions are what make a puzzle tedious: at 5x5 several tiles of
 * one animal's body come out indistinguishable. Soft-light keeps the hues but
 * makes brightness depend on position, so those tiles stop being clones.
 */
function depthWash(ctx: CanvasRenderingContext2D, size: number, random: () => number): void {
	ctx.save();
	ctx.globalCompositeOperation = 'soft-light';
	const ramp = ctx.createLinearGradient(0, 0, size, size);
	ramp.addColorStop(0, 'rgba(255,255,255,0.7)');
	ramp.addColorStop(0.45, 'rgba(255,255,255,0.05)');
	ramp.addColorStop(1, 'rgba(35,15,60,0.6)');
	ctx.fillStyle = ramp;
	ctx.fillRect(0, 0, size, size);

	// A second, crosswise ramp so the two diagonals differ too.
	const cross = ctx.createLinearGradient(size, 0, 0, size);
	cross.addColorStop(0, 'rgba(255,200,120,0.35)');
	cross.addColorStop(1, 'rgba(120,160,255,0.35)');
	ctx.fillStyle = cross;
	ctx.fillRect(0, 0, size, size);

	/*
	 * Dappled light. The corner ramps above separate distant tiles but leave
	 * neighbours inside one flat region — the middle of a panda's white belly —
	 * indistinguishable, and those are exactly the tiles a player cannot place.
	 *
	 * These blobs multiply rather than soft-light. Soft-light barely moves a
	 * white pixel, which is the case that needed help most; multiplying by a
	 * near-white tint shifts it a few percent, enough to tell two tiles apart
	 * while still reading as gentle light rather than as dirt.
	 */
	ctx.globalCompositeOperation = 'multiply';
	const tints = ['#fff0dd', '#e7ecfb', '#ffe6ee', '#e6f7ee'];
	for (let i = 0; i < 22; i++) {
		const x = random() * size;
		const y = random() * size;
		const r = size * (0.14 + random() * 0.2);
		const tint = tints[Math.floor(random() * tints.length)];
		const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
		blob.addColorStop(0, tint);
		blob.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = blob;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, TAU);
		ctx.fill();
	}
	ctx.restore();
}

/* -------------------------------------------------------------- scenes -- */

const cat: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#ffe2c9', '#ffc9b4', '#f9a58f']);
	scatter(ctx, size, random, 74, (x, y, s) => paw(ctx, x, y, s, 'rgba(255,255,255,0.45)'));
	scatter(ctx, size, random, 35, (x, y, s) => heart(ctx, x, y, s * 0.8, 'rgba(255,120,110,0.28)'));

	const cx = size * 0.5;
	const cy = size * 0.56;
	const r = size * 0.3;
	const fur = '#f2954a';
	const dark = '#d9752f';

	oval(ctx, cx, size * 1.02, r * 1.25, r * 0.95, 0, fur); // body peeking up
	pointyEar(ctx, cx - r * 0.72, cy - r * 0.78, r * 0.38, -0.25, fur, '#ffc2c8');
	pointyEar(ctx, cx + r * 0.72, cy - r * 0.78, r * 0.38, 0.25, fur, '#ffc2c8');
	oval(ctx, cx, cy, r, r * 0.92, 0, fur);

	// Tabby stripes give the head itself internal detail.
	ctx.fillStyle = dark;
	for (let i = -1; i <= 1; i++) {
		ctx.beginPath();
		ctx.ellipse(cx + i * r * 0.26, cy - r * 0.72, r * 0.06, r * 0.22, i * 0.25, 0, TAU);
		ctx.fill();
	}
	for (const side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			oval(ctx, cx + side * r * (0.72 + i * 0.03), cy - r * 0.1 + i * r * 0.22, r * 0.22, r * 0.045, side * 0.2, dark);
		}
	}

	eye(ctx, cx - r * 0.36, cy - r * 0.02, r * 0.17);
	eye(ctx, cx + r * 0.36, cy - r * 0.02, r * 0.17);
	blush(ctx, cx - r * 0.62, cy + r * 0.3, r * 0.22, 'rgba(255,130,140,0.55)');
	blush(ctx, cx + r * 0.62, cy + r * 0.3, r * 0.22, 'rgba(255,130,140,0.55)');
	oval(ctx, cx, cy + r * 0.38, r * 0.3, r * 0.2, 0, '#fff1e4');
	nose(ctx, cx, cy + r * 0.3, r * 0.08, '#e8697c');
	smile(ctx, cx, cy + r * 0.44, r * 0.16);
};

const panda: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#d8f1c8', '#a8dd9a', '#6fbf82']);
	// Bamboo canes: strong vertical structure, so no two tiles line up.
	for (let i = 0; i < 9; i++) {
		const x = (i / 9) * size + random() * size * 0.05;
		ctx.fillStyle = 'rgba(120,190,120,0.5)';
		ctx.fillRect(x, 0, size * 0.035, size);
		ctx.fillStyle = 'rgba(80,150,90,0.45)';
		for (let j = 0; j < 7; j++) ctx.fillRect(x, (j / 7) * size + size * 0.04, size * 0.035, size * 0.012);
	}
	scatter(ctx, size, random, 54, (x, y, s, rot) => leaf(ctx, x, y, s * 1.3, rot, 'rgba(60,140,80,0.5)'));

	const cx = size * 0.5;
	const cy = size * 0.55;
	const r = size * 0.3;

	oval(ctx, cx, size * 1.05, r * 1.3, r, 0, '#ffffff');
	roundEar(ctx, cx - r * 0.78, cy - r * 0.7, r * 0.27, INK, '#5b5064');
	roundEar(ctx, cx + r * 0.78, cy - r * 0.7, r * 0.27, INK, '#5b5064');
	oval(ctx, cx, cy, r, r * 0.94, 0, '#fdfdff');

	oval(ctx, cx - r * 0.38, cy - r * 0.06, r * 0.26, r * 0.3, -0.3, INK);
	oval(ctx, cx + r * 0.38, cy - r * 0.06, r * 0.26, r * 0.3, 0.3, INK);
	eye(ctx, cx - r * 0.36, cy - r * 0.04, r * 0.12);
	eye(ctx, cx + r * 0.36, cy - r * 0.04, r * 0.12);
	blush(ctx, cx - r * 0.66, cy + r * 0.34, r * 0.2, 'rgba(255,150,160,0.5)');
	blush(ctx, cx + r * 0.66, cy + r * 0.34, r * 0.2, 'rgba(255,150,160,0.5)');
	nose(ctx, cx, cy + r * 0.32, r * 0.1, INK);
	smile(ctx, cx, cy + r * 0.48, r * 0.17);
};

const fox: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#ffeccc', '#ffcf9b', '#e79a63']);
	scatter(ctx, size, random, 83, (x, y, s, rot) =>
		leaf(ctx, x, y, s * 1.4, rot, ['rgba(214,106,52,0.45)', 'rgba(240,170,70,0.45)', 'rgba(170,70,50,0.35)'][Math.floor(random() * 3)])
	);

	const cx = size * 0.5;
	const cy = size * 0.55;
	const r = size * 0.3;
	const fur = '#ef7f3c';

	oval(ctx, cx, size * 1.04, r * 1.2, r * 0.9, 0, fur);
	pointyEar(ctx, cx - r * 0.78, cy - r * 0.82, r * 0.42, -0.3, fur, '#3f3440');
	pointyEar(ctx, cx + r * 0.78, cy - r * 0.82, r * 0.42, 0.3, fur, '#3f3440');

	// Fox head: a wedge rather than a circle, so it does not read as the cat.
	ctx.fillStyle = fur;
	ctx.beginPath();
	ctx.moveTo(cx - r, cy - r * 0.4);
	ctx.quadraticCurveTo(cx - r * 1.05, cy + r * 0.5, cx, cy + r * 1.05);
	ctx.quadraticCurveTo(cx + r * 1.05, cy + r * 0.5, cx + r, cy - r * 0.4);
	ctx.quadraticCurveTo(cx, cy - r * 1.0, cx - r, cy - r * 0.4);
	ctx.fill();

	ctx.fillStyle = '#fff4e8';
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.5, cy + r * 0.05);
	ctx.quadraticCurveTo(cx - r * 0.55, cy + r * 0.6, cx, cy + r * 1.02);
	ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 0.6, cx + r * 0.5, cy + r * 0.05);
	ctx.quadraticCurveTo(cx, cy + r * 0.3, cx - r * 0.5, cy + r * 0.05);
	ctx.fill();

	eye(ctx, cx - r * 0.38, cy - r * 0.02, r * 0.15);
	eye(ctx, cx + r * 0.38, cy - r * 0.02, r * 0.15);
	blush(ctx, cx - r * 0.66, cy + r * 0.28, r * 0.2, 'rgba(255,120,110,0.5)');
	blush(ctx, cx + r * 0.66, cy + r * 0.28, r * 0.2, 'rgba(255,120,110,0.5)');
	nose(ctx, cx, cy + r * 0.62, r * 0.1, INK);
	smile(ctx, cx, cy + r * 0.76, r * 0.15);
};

const owl: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#2b2a63', '#453a80', '#6b4f9e']);
	scatter(ctx, size, random, 144, (x, y, s) => star(ctx, x, y, s * 0.6, 'rgba(255,240,190,0.75)'));
	scatter(ctx, size, random, 29, (x, y, s) => disc(ctx, x, y, s * 0.5, 'rgba(255,255,255,0.3)'));

	const cx = size * 0.5;
	const cy = size * 0.55;
	const r = size * 0.31;

	oval(ctx, cx, cy + r * 0.25, r * 0.98, r * 1.1, 0, '#a97bd4');
	oval(ctx, cx, cy + r * 0.55, r * 0.62, r * 0.7, 0, '#d8bdf0');

	// Tufts.
	pointyEar(ctx, cx - r * 0.6, cy - r * 0.82, r * 0.3, -0.35, '#a97bd4', '#c79ce6');
	pointyEar(ctx, cx + r * 0.6, cy - r * 0.82, r * 0.3, 0.35, '#a97bd4', '#c79ce6');

	// Wings, with scalloped feathers for close-up detail.
	for (const side of [-1, 1]) {
		oval(ctx, cx + side * r * 0.85, cy + r * 0.4, r * 0.26, r * 0.55, side * 0.25, '#8f63c2');
		ctx.fillStyle = 'rgba(255,255,255,0.28)';
		for (let i = 0; i < 4; i++) {
			ctx.beginPath();
			ctx.arc(cx + side * r * 0.85, cy + r * (0.05 + i * 0.22), r * 0.18, 0, Math.PI);
			ctx.fill();
		}
	}

	for (const side of [-1, 1]) {
		disc(ctx, cx + side * r * 0.36, cy - r * 0.08, r * 0.3, '#fff6e2');
		eye(ctx, cx + side * r * 0.36, cy - r * 0.08, r * 0.19);
	}
	ctx.fillStyle = '#f5b13f';
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.12, cy + r * 0.2);
	ctx.lineTo(cx + r * 0.12, cy + r * 0.2);
	ctx.lineTo(cx, cy + r * 0.52);
	ctx.closePath();
	ctx.fill();
	blush(ctx, cx - r * 0.72, cy + r * 0.12, r * 0.18, 'rgba(255,150,170,0.5)');
	blush(ctx, cx + r * 0.72, cy + r * 0.12, r * 0.18, 'rgba(255,150,170,0.5)');
};

const bunny: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#e8fbe6', '#c4f0d8', '#96dcc4']);
	scatter(ctx, size, random, 64, (x, y, s, rot) => leaf(ctx, x, y, s, rot, 'rgba(90,180,140,0.45)'));
	scatter(ctx, size, random, 42, (x, y, s) => heart(ctx, x, y, s * 0.7, 'rgba(255,160,180,0.45)'));
	scatter(ctx, size, random, 32, (x, y, s) => disc(ctx, x, y, s * 0.35, 'rgba(255,255,255,0.6)'));

	const cx = size * 0.5;
	const cy = size * 0.6;
	const r = size * 0.27;

	oval(ctx, cx, size * 1.06, r * 1.25, r, 0, '#fffdfd');
	for (const side of [-1, 1]) {
		oval(ctx, cx + side * r * 0.42, cy - r * 1.05, r * 0.19, r * 0.6, side * 0.16, '#fffdfd');
		oval(ctx, cx + side * r * 0.42, cy - r * 1.05, r * 0.1, r * 0.44, side * 0.16, '#ffc4d2');
	}
	oval(ctx, cx, cy, r, r * 0.94, 0, '#fffdfd');

	eye(ctx, cx - r * 0.36, cy - r * 0.04, r * 0.16);
	eye(ctx, cx + r * 0.36, cy - r * 0.04, r * 0.16);
	blush(ctx, cx - r * 0.64, cy + r * 0.3, r * 0.22, 'rgba(255,140,160,0.6)');
	blush(ctx, cx + r * 0.64, cy + r * 0.3, r * 0.22, 'rgba(255,140,160,0.6)');
	nose(ctx, cx, cy + r * 0.3, r * 0.09, '#f2849b');
	smile(ctx, cx, cy + r * 0.44, r * 0.15);
	// Whiskers.
	ctx.strokeStyle = 'rgba(70,60,80,0.45)';
	ctx.lineWidth = size * 0.004;
	for (const side of [-1, 1]) {
		for (let i = -1; i <= 1; i++) {
			ctx.beginPath();
			ctx.moveTo(cx + side * r * 0.2, cy + r * 0.36 + i * r * 0.06);
			ctx.lineTo(cx + side * r * 0.85, cy + r * 0.28 + i * r * 0.16);
			ctx.stroke();
		}
	}
};

const frog: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#d6f6ef', '#8fdcd0', '#4fb3a8']);
	// Lily pads.
	for (let i = 0; i < 12; i++) {
		const x = random() * size;
		const y = random() * size;
		const r = size * (0.05 + random() * 0.06);
		ctx.fillStyle = 'rgba(70,165,120,0.5)';
		ctx.beginPath();
		ctx.arc(x, y, r, 0.35, TAU);
		ctx.closePath();
		ctx.fill();
	}
	scatter(ctx, size, random, 64, (x, y, s) => bubble(ctx, x, y, s * 0.7, 'rgba(255,255,255,0.6)'));

	const cx = size * 0.5;
	const cy = size * 0.6;
	const r = size * 0.3;
	const skin = '#7ac74f';

	oval(ctx, cx, cy + r * 0.3, r * 1.05, r * 0.85, 0, skin);
	oval(ctx, cx, cy + r * 0.55, r * 0.62, r * 0.42, 0, '#d9f2a8');
	for (const side of [-1, 1]) {
		disc(ctx, cx + side * r * 0.56, cy - r * 0.55, r * 0.3, skin);
		disc(ctx, cx + side * r * 0.56, cy - r * 0.58, r * 0.22, '#ffffff');
		eye(ctx, cx + side * r * 0.56, cy - r * 0.58, r * 0.13);
	}
	// Spots, so the body is not one flat green field.
	ctx.fillStyle = 'rgba(60,140,60,0.5)';
	for (let i = 0; i < 9; i++) {
		const angle = random() * TAU;
		const d = random() * r * 0.8;
		ctx.beginPath();
		ctx.ellipse(cx + Math.cos(angle) * d, cy + r * 0.2 + Math.sin(angle) * d * 0.5, r * 0.1, r * 0.07, angle, 0, TAU);
		ctx.fill();
	}
	blush(ctx, cx - r * 0.7, cy + r * 0.2, r * 0.2, 'rgba(255,140,150,0.5)');
	blush(ctx, cx + r * 0.7, cy + r * 0.2, r * 0.2, 'rgba(255,140,150,0.5)');
	ctx.strokeStyle = INK;
	ctx.lineWidth = size * 0.009;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(cx, cy + r * 0.15, r * 0.42, 0.2 * Math.PI, 0.8 * Math.PI);
	ctx.stroke();
};

const penguin: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#e8f6ff', '#b9e0f7', '#79b6e6']);
	scatter(ctx, size, random, 96, (x, y, s) => flake(ctx, x, y, s * 0.8, 'rgba(255,255,255,0.85)'));
	scatter(ctx, size, random, 38, (x, y, s) => disc(ctx, x, y, s * 0.3, 'rgba(255,255,255,0.7)'));

	const cx = size * 0.5;
	const cy = size * 0.56;
	const r = size * 0.3;

	oval(ctx, cx, cy + r * 0.3, r * 0.92, r * 1.12, 0, '#2f3a52');
	oval(ctx, cx, cy + r * 0.42, r * 0.62, r * 0.88, 0, '#fdfdff');
	for (const side of [-1, 1]) {
		oval(ctx, cx + side * r * 0.92, cy + r * 0.35, r * 0.2, r * 0.6, side * 0.3, '#2f3a52');
		oval(ctx, cx + side * r * 0.35, cy + r * 1.35, r * 0.24, r * 0.12, 0, '#f5a93f');
	}
	eye(ctx, cx - r * 0.28, cy - r * 0.16, r * 0.15);
	eye(ctx, cx + r * 0.28, cy - r * 0.16, r * 0.15);
	ctx.fillStyle = '#f5a93f';
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.16, cy + r * 0.08);
	ctx.lineTo(cx + r * 0.16, cy + r * 0.08);
	ctx.lineTo(cx, cy + r * 0.32);
	ctx.closePath();
	ctx.fill();
	blush(ctx, cx - r * 0.55, cy + r * 0.06, r * 0.18, 'rgba(255,150,160,0.55)');
	blush(ctx, cx + r * 0.55, cy + r * 0.06, r * 0.18, 'rgba(255,150,160,0.55)');
};

const bear: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#fff2c9', '#ffd98a', '#f0ad57']);
	scatter(ctx, size, random, 48, (x, y, s) => {
		// Honeycomb cells.
		ctx.strokeStyle = 'rgba(214,150,50,0.5)';
		ctx.lineWidth = s * 0.18;
		ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			const angle = (i / 6) * TAU;
			ctx.lineTo(x + Math.cos(angle) * s, y + Math.sin(angle) * s);
		}
		ctx.closePath();
		ctx.stroke();
	});
	scatter(ctx, size, random, 32, (x, y, s) => heart(ctx, x, y, s * 0.6, 'rgba(230,130,80,0.35)'));

	const cx = size * 0.5;
	const cy = size * 0.56;
	const r = size * 0.3;
	const fur = '#b07a4e';

	oval(ctx, cx, size * 1.05, r * 1.3, r, 0, fur);
	roundEar(ctx, cx - r * 0.76, cy - r * 0.72, r * 0.26, fur, '#e0a878');
	roundEar(ctx, cx + r * 0.76, cy - r * 0.72, r * 0.26, fur, '#e0a878');
	oval(ctx, cx, cy, r, r * 0.95, 0, fur);
	oval(ctx, cx, cy + r * 0.4, r * 0.46, r * 0.32, 0, '#f0d3b0');

	eye(ctx, cx - r * 0.36, cy - r * 0.06, r * 0.15);
	eye(ctx, cx + r * 0.36, cy - r * 0.06, r * 0.15);
	blush(ctx, cx - r * 0.66, cy + r * 0.26, r * 0.22, 'rgba(230,120,110,0.5)');
	blush(ctx, cx + r * 0.66, cy + r * 0.26, r * 0.22, 'rgba(230,120,110,0.5)');
	nose(ctx, cx, cy + r * 0.3, r * 0.11, INK);
	smile(ctx, cx, cy + r * 0.46, r * 0.16);
};

const axolotl: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#ffe9f4', '#ffc7e2', '#e79ccb']);
	scatter(ctx, size, random, 86, (x, y, s) => bubble(ctx, x, y, s * 0.8, 'rgba(255,255,255,0.7)'));
	scatter(ctx, size, random, 35, (x, y, s) => star(ctx, x, y, s * 0.5, 'rgba(255,255,255,0.5)'));

	const cx = size * 0.5;
	const cy = size * 0.56;
	const r = size * 0.29;
	const skin = '#ffb3d9';

	// Frilly gills: six branches, the signature detail. They have to reach well
	// past the head or the head oval swallows them and this is just a pink blob.
	for (const side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			const angle = side * (0.62 + i * 0.42);
			const reach = r * (1.5 - i * 0.12);
			const gx = cx + Math.sin(angle) * reach;
			const gy = cy - Math.cos(angle) * reach * 0.82;
			ctx.strokeStyle = '#ff7fb8';
			ctx.lineWidth = r * 0.09;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(cx + Math.sin(angle) * r * 0.8, cy - Math.cos(angle) * r * 0.6);
			ctx.lineTo(gx, gy);
			ctx.stroke();
			disc(ctx, gx, gy, r * 0.2, '#ff9ecb');
			disc(ctx, gx + Math.sin(angle) * r * 0.16, gy - r * 0.14, r * 0.13, '#ffbcdd');
		}
	}

	oval(ctx, cx, size * 1.05, r * 1.2, r * 0.9, 0, skin);
	oval(ctx, cx, cy, r, r * 0.86, 0, skin);
	eye(ctx, cx - r * 0.42, cy - r * 0.02, r * 0.13);
	eye(ctx, cx + r * 0.42, cy - r * 0.02, r * 0.13);
	blush(ctx, cx - r * 0.62, cy + r * 0.3, r * 0.22, 'rgba(255,110,160,0.55)');
	blush(ctx, cx + r * 0.62, cy + r * 0.3, r * 0.22, 'rgba(255,110,160,0.55)');
	smile(ctx, cx, cy + r * 0.34, r * 0.18);
};

const chick: Painting['paint'] = (ctx, size, random) => {
	wash(ctx, size, ['#f2fbff', '#cdeaff', '#9ec9f0']);
	scatter(ctx, size, random, 74, (x, y, s, rot) => leaf(ctx, x, y, s * 0.9, rot, 'rgba(255,214,110,0.6)'));
	scatter(ctx, size, random, 45, (x, y, s) => disc(ctx, x, y, s * 0.3, 'rgba(255,255,255,0.75)'));
	scatter(ctx, size, random, 26, (x, y, s) => heart(ctx, x, y, s * 0.6, 'rgba(255,170,90,0.4)'));

	const cx = size * 0.5;
	const cy = size * 0.55;
	const r = size * 0.29;
	const down = '#ffd447';

	oval(ctx, cx, cy + r * 0.55, r * 1.0, r * 0.9, 0, down);
	oval(ctx, cx, cy, r * 0.88, r * 0.82, 0, down);
	// A wisp of head-down and a wing, so the yellow is not one flat mass.
	ctx.strokeStyle = '#f5b91f';
	ctx.lineWidth = r * 0.075;
	ctx.lineCap = 'round';
	for (const [lean, height] of [[-0.55, 0.3], [0, 0.4], [0.55, 0.3]] as const) {
		ctx.beginPath();
		ctx.moveTo(cx, cy - r * 0.76);
		ctx.quadraticCurveTo(
			cx + lean * r * 0.34,
			cy - r * (0.76 + height * 0.6),
			cx + lean * r * 0.52,
			cy - r * (0.76 + height)
		);
		ctx.stroke();
	}
	oval(ctx, cx - r * 0.72, cy + r * 0.55, r * 0.3, r * 0.42, -0.3, '#f5b91f');

	eye(ctx, cx - r * 0.3, cy - r * 0.06, r * 0.14);
	eye(ctx, cx + r * 0.3, cy - r * 0.06, r * 0.14);
	ctx.fillStyle = '#f08a2e';
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.15, cy + r * 0.2);
	ctx.lineTo(cx + r * 0.15, cy + r * 0.2);
	ctx.lineTo(cx, cy + r * 0.44);
	ctx.closePath();
	ctx.fill();
	blush(ctx, cx - r * 0.56, cy + r * 0.18, r * 0.19, 'rgba(255,140,150,0.55)');
	blush(ctx, cx + r * 0.56, cy + r * 0.18, r * 0.19, 'rgba(255,140,150,0.55)');
};

export const GALLERY: readonly Painting[] = [
	{ id: 'cat', title: 'Tabby Cat', paint: cat },
	{ id: 'panda', title: 'Panda', paint: panda },
	{ id: 'fox', title: 'Little Fox', paint: fox },
	{ id: 'owl', title: 'Night Owl', paint: owl },
	{ id: 'bunny', title: 'Bunny', paint: bunny },
	{ id: 'frog', title: 'Pond Frog', paint: frog },
	{ id: 'penguin', title: 'Penguin', paint: penguin },
	{ id: 'bear', title: 'Honey Bear', paint: bear },
	{ id: 'axolotl', title: 'Axolotl', paint: axolotl },
	{ id: 'chick', title: 'Little Chick', paint: chick }
];

export function paintingById(id: string): Painting {
	return GALLERY.find((painting) => painting.id === id) ?? GALLERY[0];
}

/** Paint one gallery entry at `size` square and hand back a data URL. */
export function renderPainting(painting: Painting, size = 900): string {
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// Seeded from the id, so a picture looks the same every time it is drawn.
	const random = seeded(hashString(painting.id));
	painting.paint(ctx, size, random);

	depthWash(ctx, size, random);
	applyCanvasGrain(ctx, size, size, 6);
	return canvas.toDataURL('image/webp', 0.9);
}

/**
 * A light paper grain. Applied to gallery pictures and to uploaded photos
 * alike — it is most of what makes a phone snapshot sit next to the drawn art.
 */
export function applyCanvasGrain(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	strength = 12
): void {
	const image = ctx.getImageData(0, 0, width, height);
	const { data } = image;
	for (let i = 0; i < data.length; i += 4) {
		const noise = (Math.random() - 0.5) * strength;
		data[i] += noise;
		data[i + 1] += noise;
		data[i + 2] += noise;
	}
	ctx.putImageData(image, 0, 0);
}

function hashString(input: string): number {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function seeded(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
