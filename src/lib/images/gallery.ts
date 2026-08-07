/**
 * The built-in gallery is painted in code rather than shipped as files.
 *
 * That keeps the deploy tiny and sidesteps image licensing entirely. Each
 * painting is its own scene rather than one composition recoloured, because a
 * gallery of six recolours reads as one picture in six moods.
 *
 * Two rules every scene here follows, both driven by what a puzzle needs:
 *
 *  1. **Detail everywhere.** A large flat region makes several tiles look
 *     identical, which is tedious rather than difficult. Skies get stars,
 *     motes or clouds; ground gets texture.
 *  2. **Colour that varies across the frame.** A tile should be placeable from
 *     its colour alone, so hue shifts corner to corner.
 */

export interface Painting {
	readonly id: string;
	readonly title: string;
	readonly paint: (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void;
}

/* ------------------------------------------------------------- helpers -- */

function sky(
	ctx: CanvasRenderingContext2D,
	size: number,
	stops: readonly string[],
	height = size
): void {
	const gradient = ctx.createLinearGradient(0, 0, 0, height);
	stops.forEach((colour, index) => gradient.addColorStop(index / (stops.length - 1), colour));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);
}

/** A soft disc of light, used for suns, moons and lamps. */
function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	core: string,
	spread = 6
): void {
	const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius * spread);
	bloom.addColorStop(0, core);
	bloom.addColorStop(0.1, withAlpha(core, 0.5));
	bloom.addColorStop(1, withAlpha(core, 0));
	ctx.fillStyle = bloom;
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = core;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
}

/** A wavy horizon, filled to the bottom of the frame. */
function ridge(
	ctx: CanvasRenderingContext2D,
	size: number,
	colour: string,
	baseline: number,
	amplitude: number,
	wavelength: number,
	phase: number
): number[] {
	const heights: number[] = [];
	ctx.fillStyle = colour;
	ctx.beginPath();
	ctx.moveTo(0, size);
	for (let x = 0; x <= size; x += 3) {
		const t = (x / size) * Math.PI * 2 * wavelength + phase;
		const y = baseline + Math.sin(t) * amplitude + Math.sin(t * 2.7) * amplitude * 0.3;
		heights[x] = y;
		ctx.lineTo(x, y);
	}
	ctx.lineTo(size, size);
	ctx.closePath();
	ctx.fill();
	return heights;
}

function stars(
	ctx: CanvasRenderingContext2D,
	size: number,
	random: () => number,
	count: number,
	limit: number
): void {
	for (let i = 0; i < count; i++) {
		const x = random() * size;
		const y = random() * size * limit;
		const r = size * (0.0012 + random() * 0.0035);
		ctx.globalAlpha = 0.25 + random() * 0.7;
		ctx.fillStyle = random() < 0.25 ? '#ffe9a8' : '#ffffff';
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function withAlpha(colour: string, alpha: number): string {
	const value = colour.replace('#', '');
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

/* ------------------------------------------------------------- scenes --- */

const sunsetHills: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#ffd76b', '#ff9f57', '#ff6b8a', '#c14fa0']);
	glow(ctx, size * (0.3 + random() * 0.4), size * 0.34, size * 0.075, '#fff6c8', 7);

	const hues = [330, 315, 288, 262, 238];
	hues.forEach((hue, index) => {
		const depth = index / (hues.length - 1);
		const heights = ridge(
			ctx,
			size,
			hsl(hue, 62 - depth * 18, 62 - depth * 42),
			size * (0.46 + depth * 0.44),
			size * (0.1 - depth * 0.05),
			1.1 + random() * 1.8,
			random() * Math.PI * 2
		);

		// Trees on the two nearest ridges, so the foreground is never flat.
		if (index >= hues.length - 3) {
			ctx.fillStyle = hsl(hue - 8, 55, Math.max(10, 52 - depth * 42));
			for (let tree = 0; tree < 10 + Math.floor(random() * 8); tree++) {
				const x = Math.round(random() * (size - 1));
				const y = heights[x - (x % 3)] ?? size * 0.7;
				const h = size * (0.03 + random() * 0.06);
				const w = h * (0.22 + random() * 0.16);
				ctx.beginPath();
				ctx.moveTo(x, y - h);
				ctx.lineTo(x + w, y + 2);
				ctx.lineTo(x - w, y + 2);
				ctx.closePath();
				ctx.fill();
			}
		}
	});
};

const aurora: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#0b1033', '#152257', '#1d3b74', '#27607e']);
	stars(ctx, size, random, 220, 0.8);

	// Ribbons of light, each a vertical gradient so they fade as they fall.
	const ribbons = [
		{ hue: 150, y: 0.24 },
		{ hue: 176, y: 0.32 },
		{ hue: 280, y: 0.2 },
		{ hue: 108, y: 0.4 }
	];
	ctx.globalCompositeOperation = 'lighter';
	for (const { hue, y } of ribbons) {
		const phase = random() * Math.PI * 2;
		const amp = size * (0.05 + random() * 0.06);
		for (let pass = 0; pass < 5; pass++) {
			const fade = ctx.createLinearGradient(0, size * y - amp, 0, size * (y + 0.34));
			fade.addColorStop(0, hsl(hue, 90, 62, 0.34));
			fade.addColorStop(1, hsl(hue + 20, 90, 55, 0));
			ctx.strokeStyle = fade;
			ctx.lineWidth = size * (0.05 - pass * 0.007);
			ctx.beginPath();
			for (let x = 0; x <= size; x += 4) {
				const t = (x / size) * Math.PI * 2 * 1.3 + phase + pass * 0.14;
				const yy = size * y + Math.sin(t) * amp + Math.sin(t * 2.2) * amp * 0.4;
				if (x === 0) ctx.moveTo(x, yy);
				else ctx.lineTo(x, yy);
			}
			ctx.stroke();
		}
	}
	ctx.globalCompositeOperation = 'source-over';

	// Snow peaks catching the aurora, then their reflection.
	ctx.fillStyle = '#0d1730';
	ctx.beginPath();
	ctx.moveTo(0, size);
	ctx.lineTo(0, size * 0.72);
	for (let peak = 0; peak <= 6; peak++) {
		const x = (peak / 6) * size;
		const y = size * (0.62 + (peak % 2 === 0 ? 0.1 : -0.04) + random() * 0.05);
		ctx.lineTo(x, y);
	}
	ctx.lineTo(size, size);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = hsl(190, 60, 26);
	ctx.fillRect(0, size * 0.84, size, size * 0.16);
	ctx.globalAlpha = 0.35;
	for (let band = 0; band < 22; band++) {
		ctx.fillStyle = hsl(150 + random() * 130, 80, 55);
		const y = size * 0.84 + random() * size * 0.16;
		ctx.fillRect(random() * size * 0.7, y, size * (0.1 + random() * 0.3), size * 0.006);
	}
	ctx.globalAlpha = 1;
};

const balloonSky: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#63c8f5', '#9adcf7', '#cfeffb', '#ffe6c4']);

	// Clouds, so the sky is never an empty pane.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
	for (let cloud = 0; cloud < 9; cloud++) {
		const cx = random() * size;
		const cy = size * (0.1 + random() * 0.75);
		const scale = size * (0.05 + random() * 0.06);
		for (let puff = 0; puff < 5; puff++) {
			ctx.beginPath();
			ctx.arc(
				cx + (puff - 2) * scale * 0.5,
				cy + Math.sin(puff) * scale * 0.14,
				scale * (0.45 + random() * 0.3),
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}

	const hues = [0, 32, 52, 120, 190, 262, 310, 16, 88, 220, 340, 44];
	for (let i = 0; i < hues.length; i++) {
		const x = size * (0.08 + random() * 0.84);
		const y = size * (0.1 + random() * 0.72);
		const r = size * (0.045 + random() * 0.055);
		const hue = hues[i];

		// Envelope: three coloured gores so each balloon reads as striped.
		for (let gore = 0; gore < 3; gore++) {
			ctx.fillStyle = hsl(hue + gore * 14, 82, 58 + gore * 6);
			ctx.beginPath();
			ctx.moveTo(x, y + r * 1.5);
			ctx.arc(x, y, r, Math.PI * (0.5 + gore / 3), Math.PI * (0.5 + (gore + 1) / 3), false);
			ctx.closePath();
			ctx.fill();
		}
		ctx.fillStyle = hsl(hue, 70, 40);
		ctx.fillRect(x - r * 0.16, y + r * 1.42, r * 0.32, r * 0.26);
	}
};

const flowerField: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#7fd0ff', '#b6e7ff', '#e8f7d8']);
	glow(ctx, size * 0.78, size * 0.16, size * 0.05, '#fffbe0', 5);

	// Rolling green, light at the back and deep at the front.
	for (let band = 0; band < 4; band++) {
		const depth = band / 3;
		ridge(
			ctx,
			size,
			hsl(95 - depth * 20, 52 + depth * 14, 62 - depth * 26),
			size * (0.42 + depth * 0.2),
			size * 0.045,
			1 + random(),
			random() * Math.PI * 2
		);
	}

	// Flowers: bigger and denser toward the front, which reads as depth.
	const hues = [0, 46, 300, 274, 20, 330, 58];
	for (let i = 0; i < 340; i++) {
		const y = size * (0.44 + random() * 0.56);
		const depth = (y / size - 0.44) / 0.56;
		const x = random() * size;
		const r = size * (0.004 + depth * 0.012);
		const hue = hues[Math.floor(random() * hues.length)];

		ctx.fillStyle = hsl(hue, 88, 62 + random() * 16);
		for (let petal = 0; petal < 5; petal++) {
			const angle = (petal / 5) * Math.PI * 2;
			ctx.beginPath();
			ctx.arc(x + Math.cos(angle) * r, y + Math.sin(angle) * r, r * 0.78, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = hsl(48, 95, 66);
		ctx.beginPath();
		ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
		ctx.fill();
	}
};

const oceanSunrise: Painting['paint'] = (ctx, size, random) => {
	const horizon = size * 0.46;
	sky(ctx, size, ['#3b1d63', '#a83a76', '#ff7a5c', '#ffd08a'], horizon);

	const sunX = size * 0.5;
	glow(ctx, sunX, horizon - size * 0.03, size * 0.085, '#fff3c4', 6);

	// Sea.
	const water = ctx.createLinearGradient(0, horizon, 0, size);
	water.addColorStop(0, '#ff9a6a');
	water.addColorStop(0.25, '#c8567f');
	water.addColorStop(0.6, '#5b2d78');
	water.addColorStop(1, '#241448');
	ctx.fillStyle = water;
	ctx.fillRect(0, horizon, size, size - horizon);

	// The sun's path on the water: bright near the horizon, scattering outward.
	for (let i = 0; i < 150; i++) {
		const t = random();
		const y = horizon + t * (size - horizon);
		const spread = size * (0.03 + t * 0.42);
		const x = sunX + (random() - 0.5) * spread * 2;
		const w = size * (0.02 + random() * 0.11) * (1 - t * 0.4);
		ctx.globalAlpha = (1 - t) * 0.55 + 0.08;
		ctx.fillStyle = t < 0.4 ? '#ffe9a8' : '#ffb27a';
		ctx.fillRect(x - w / 2, y, w, size * 0.005);
	}

	// Swell lines across the whole sea, so no tile is a flat wash.
	ctx.globalAlpha = 0.2;
	ctx.fillStyle = '#ffd2b0';
	for (let i = 0; i < 70; i++) {
		const y = horizon + random() * (size - horizon);
		ctx.fillRect(random() * size, y, size * (0.04 + random() * 0.16), size * 0.0035);
	}
	ctx.globalAlpha = 1;

	// Clouds catching the light. Ellipses, not bars: a filled rectangle up here
	// reads as a glitch rather than as weather.
	ctx.globalAlpha = 0.45;
	for (let i = 0; i < 10; i++) {
		ctx.fillStyle = hsl(300 + random() * 50, 75, 68);
		const cx = random() * size;
		const cy = random() * horizon * 0.85;
		const w = size * (0.06 + random() * 0.16);
		for (let puff = 0; puff < 3; puff++) {
			ctx.beginPath();
			ctx.ellipse(
				cx + (puff - 1) * w * 0.5,
				cy + Math.sin(puff) * size * 0.006,
				w * (0.5 + random() * 0.3),
				size * (0.008 + random() * 0.012),
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}
	ctx.globalAlpha = 1;
};

const rainbowArcs: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#fff6e8', '#ffe6d0', '#ffd8e2']);

	// Concentric bands from the lower-left corner: every tile lands on a
	// different set of colours, which makes this the friendliest to solve.
	const cx = size * 0.08;
	const cy = size * 0.96;
	const bands = 13;
	for (let i = bands; i >= 0; i--) {
		const hue = (i / bands) * 320;
		ctx.strokeStyle = hsl(hue, 85, 62);
		ctx.lineWidth = size * 0.055;
		ctx.beginPath();
		ctx.arc(cx, cy, size * 0.12 + i * size * 0.078, 0, Math.PI * 2);
		ctx.stroke();
	}

	// Dots scattered over the arcs to break up the bands.
	for (let i = 0; i < 220; i++) {
		const x = random() * size;
		const y = random() * size;
		ctx.globalAlpha = 0.13 + random() * 0.3;
		ctx.fillStyle = random() < 0.5 ? '#ffffff' : '#3a2140';
		ctx.beginPath();
		ctx.arc(x, y, size * (0.003 + random() * 0.009), 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
};

const nightCity: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#160f3d', '#33206b', '#7a3480', '#e0736c']);
	stars(ctx, size, random, 160, 0.55);
	glow(ctx, size * 0.2, size * 0.18, size * 0.05, '#fff4d6', 5);

	// Skyline, back row hazier than the front.
	for (let row = 0; row < 2; row++) {
		let x = -size * 0.05;
		const base = size * (row === 0 ? 0.78 : 0.98);
		while (x < size) {
			const w = size * (0.06 + random() * 0.1);
			const h = size * (0.14 + random() * (row === 0 ? 0.24 : 0.4));
			const top = base - h;
			ctx.fillStyle = row === 0 ? hsl(268, 40, 22) : hsl(258, 45, 12);
			ctx.fillRect(x, top, w, base - top);

			// Lit windows: the colour variety is what makes tiles distinguishable.
			const cols = Math.max(2, Math.floor(w / (size * 0.022)));
			const rows = Math.max(3, Math.floor(h / (size * 0.03)));
			for (let c = 0; c < cols; c++) {
				for (let r = 0; r < rows; r++) {
					if (random() < 0.42) continue;
					ctx.fillStyle = hsl(
						[46, 32, 190, 58, 12][Math.floor(random() * 5)],
						95,
						60 + random() * 18,
						row === 0 ? 0.55 : 0.95
					);
					ctx.fillRect(
						x + size * 0.008 + c * (w / cols),
						top + size * 0.012 + r * (h / rows),
						w / cols - size * 0.008,
						h / rows - size * 0.012
					);
				}
			}
			x += w + size * 0.012;
		}
	}
};

const desertDunes: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#ffd9e8', '#ffb27f', '#ff8f6b', '#f2c14e']);
	glow(ctx, size * 0.68, size * 0.24, size * 0.07, '#fff8d8', 6);

	const hues = [36, 24, 12, 350, 330, 312];
	hues.forEach((hue, index) => {
		const depth = index / (hues.length - 1);
		ctx.fillStyle = hsl(hue, 68 - depth * 12, 72 - depth * 44);
		ctx.beginPath();
		ctx.moveTo(0, size);
		const baseline = size * (0.4 + depth * 0.5);
		const lift = size * (0.06 + random() * 0.05);
		ctx.lineTo(0, baseline);
		// Two bezier humps per band gives the smooth swept edge of a dune.
		ctx.bezierCurveTo(
			size * 0.3,
			baseline - lift,
			size * 0.45,
			baseline + lift,
			size * 0.62,
			baseline
		);
		ctx.bezierCurveTo(size * 0.8, baseline - lift, size * 0.9, baseline + lift * 0.5, size, baseline - lift * 0.3);
		ctx.lineTo(size, size);
		ctx.closePath();
		ctx.fill();

		// Wind ripples.
		ctx.globalAlpha = 0.16;
		ctx.strokeStyle = hsl(hue, 60, 92);
		ctx.lineWidth = size * 0.0035;
		for (let i = 0; i < 14; i++) {
			const y = baseline + random() * size * 0.1;
			ctx.beginPath();
			ctx.moveTo(random() * size, y);
			ctx.lineTo(random() * size * 0.4 + size * 0.2, y + size * 0.006);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	});

	// Smooth gradient dunes alone leave several tiles nearly identical, so the
	// foreground gets landmarks: cacti, and pebbles catching the low sun.
	for (let i = 0; i < 5; i++) {
		const x = size * (0.08 + random() * 0.84);
		const y = size * (0.72 + random() * 0.2);
		const h = size * (0.07 + random() * 0.07);
		const w = h * 0.22;
		ctx.fillStyle = hsl(150, 32, 26);
		ctx.beginPath();
		ctx.roundRect(x - w / 2, y - h, w, h, w / 2);
		ctx.fill();
		// One arm each side, at different heights, so they are not clones.
		for (const side of [-1, 1]) {
			const armY = y - h * (0.45 + random() * 0.25);
			const armW = h * 0.3;
			ctx.beginPath();
			ctx.roundRect(x + side * armW - w / 2, armY, armW + w / 2, w * 0.8, w / 2);
			ctx.fill();
			ctx.beginPath();
			ctx.roundRect(x + side * armW - w / 2, armY - h * 0.22, w * 0.8, h * 0.28, w / 2);
			ctx.fill();
		}
	}

	for (let i = 0; i < 90; i++) {
		const y = size * (0.55 + random() * 0.45);
		ctx.fillStyle = hsl(20 + random() * 26, 45, random() < 0.5 ? 34 : 82, 0.5);
		ctx.beginPath();
		ctx.ellipse(random() * size, y, size * 0.005, size * 0.003, 0, 0, Math.PI * 2);
		ctx.fill();
	}
};

const citrusGrove: Painting['paint'] = (ctx, size, random) => {
	sky(ctx, size, ['#0f5f4a', '#14795a', '#1c9366']);

	// A canopy of fruit and leaves filling the whole frame — no empty ground,
	// no empty sky, which makes every tile carry something.
	for (let layer = 0; layer < 3; layer++) {
		const count = 40 + layer * 30;
		for (let i = 0; i < count; i++) {
			const x = random() * size;
			const y = random() * size;
			const r = size * (0.02 + random() * 0.05) * (1 - layer * 0.2);
			const leaf = random() < 0.55;

			if (leaf) {
				ctx.fillStyle = hsl(96 + random() * 40, 60 + random() * 25, 30 + random() * 30);
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(random() * Math.PI);
				ctx.beginPath();
				ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			} else {
				const hue = [32, 46, 12, 58][Math.floor(random() * 4)];
				ctx.fillStyle = hsl(hue, 92, 58);
				ctx.beginPath();
				ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
				ctx.fill();
				// A highlight turns a flat circle into fruit.
				ctx.fillStyle = hsl(hue + 8, 95, 76, 0.8);
				ctx.beginPath();
				ctx.arc(x - r * 0.22, y - r * 0.24, r * 0.26, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
};

export const GALLERY: readonly Painting[] = [
	{ id: 'sunset-hills', title: 'Sunset Hills', paint: sunsetHills },
	{ id: 'aurora', title: 'Aurora', paint: aurora },
	{ id: 'balloon-sky', title: 'Balloon Sky', paint: balloonSky },
	{ id: 'flower-field', title: 'Flower Field', paint: flowerField },
	{ id: 'ocean-sunrise', title: 'Ocean Sunrise', paint: oceanSunrise },
	{ id: 'rainbow-arcs', title: 'Rainbow Arcs', paint: rainbowArcs },
	{ id: 'night-city', title: 'Night City', paint: nightCity },
	{ id: 'desert-dunes', title: 'Desert Dunes', paint: desertDunes },
	{ id: 'citrus-grove', title: 'Citrus Grove', paint: citrusGrove }
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

	// Seeded from the id, so a painting looks the same every time it is drawn.
	painting.paint(ctx, size, seeded(hashString(painting.id)));

	applyCanvasGrain(ctx, size, size, 7);
	return canvas.toDataURL('image/webp', 0.9);
}

/**
 * A light paper grain. Applied to gallery paintings and to uploaded photos
 * alike — it is most of what makes a phone snapshot sit next to the painted art.
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
