/**
 * The built-in gallery is painted in code rather than shipped as files.
 *
 * That keeps the deploy tiny, sidesteps image licensing entirely, and — most
 * usefully — guarantees every stock picture already sits inside the art
 * direction, so an uploaded snapshot is the only thing that ever needs
 * reconciling with the palette.
 */

export interface Painting {
	readonly id: string;
	readonly title: string;
	/** Sky gradient, top to bottom. */
	readonly sky: readonly string[];
	/** Back-to-front hill colours. */
	readonly hills: readonly string[];
	readonly sun: string;
	readonly sunHeight: number;
	readonly haze: string;
}

export const GALLERY: readonly Painting[] = [
	{
		id: 'long-afternoon',
		title: 'The Long Afternoon',
		sky: ['#f6d9a0', '#f0b775', '#d98b62'],
		hills: ['#b9805e', '#8f6350', '#5f4740', '#3b2f30'],
		sun: '#fff2cf',
		sunHeight: 0.42,
		haze: 'rgba(255, 214, 150, 0.30)'
	},
	{
		id: 'green-hour',
		title: 'The Green Hour',
		sky: ['#dfeec4', '#b6d79b', '#7fae7a'],
		hills: ['#79a374', '#557f5f', '#37584a', '#22362f'],
		sun: '#fbffe4',
		sunHeight: 0.35,
		haze: 'rgba(214, 240, 190, 0.26)'
	},
	{
		id: 'quiet-water',
		title: 'Quiet Water',
		sky: ['#cfe2f2', '#9dbfdd', '#6f93bd'],
		hills: ['#7d9cc0', '#5b7599', '#3d5170', '#26324a'],
		sun: '#f2f8ff',
		sunHeight: 0.5,
		haze: 'rgba(196, 222, 245, 0.28)'
	},
	{
		id: 'last-light',
		title: 'Last Light',
		sky: ['#f3c3ba', '#d193a8', '#8f6a97'],
		hills: ['#8b6b93', '#66507b', '#42355c', '#26203a'],
		sun: '#ffe6dd',
		sunHeight: 0.3,
		haze: 'rgba(245, 200, 205, 0.30)'
	},
	{
		id: 'the-orchard',
		title: 'The Orchard',
		sky: ['#fbe7c2', '#f2cf9b', '#dba97e'],
		hills: ['#c39a66', '#9a7a52', '#6d5a41', '#3f382c'],
		sun: '#fff8e0',
		sunHeight: 0.46,
		haze: 'rgba(250, 226, 180, 0.24)'
	},
	{
		id: 'before-the-rain',
		title: 'Before the Rain',
		sky: ['#dcd9d0', '#b3b3ae', '#82868a'],
		hills: ['#8e9187', '#6a7069', '#484f4d', '#2b302f'],
		sun: '#f0eee6',
		sunHeight: 0.55,
		haze: 'rgba(220, 218, 210, 0.30)'
	}
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
	const random = seeded(hashString(painting.id));

	// Sky.
	const sky = ctx.createLinearGradient(0, 0, 0, size);
	painting.sky.forEach((colour, index) =>
		sky.addColorStop(index / (painting.sky.length - 1), colour)
	);
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, size, size);

	// Sun, with a soft bloom around it.
	const sunX = size * (0.28 + random() * 0.44);
	const sunY = size * painting.sunHeight;
	const sunR = size * 0.055;
	const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 7);
	bloom.addColorStop(0, painting.sun);
	bloom.addColorStop(0.12, hexWithAlpha(painting.sun, 0.55));
	bloom.addColorStop(1, hexWithAlpha(painting.sun, 0));
	ctx.fillStyle = bloom;
	ctx.fillRect(0, 0, size, size);

	ctx.fillStyle = painting.sun;
	ctx.beginPath();
	ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
	ctx.fill();

	// Hills, back to front, each a little darker and a little lower.
	painting.hills.forEach((colour, index) => {
		const depth = index / (painting.hills.length - 1);
		const baseline = size * (0.5 + depth * 0.42);
		const amplitude = size * (0.09 - depth * 0.045);
		const wavelength = 1.1 + random() * 1.9;
		const phase = random() * Math.PI * 2;

		ctx.fillStyle = colour;
		ctx.beginPath();
		ctx.moveTo(0, size);
		for (let x = 0; x <= size; x += 4) {
			const t = (x / size) * Math.PI * 2 * wavelength + phase;
			const y = baseline + Math.sin(t) * amplitude + Math.sin(t * 2.7) * amplitude * 0.3;
			ctx.lineTo(x, y);
		}
		ctx.lineTo(size, size);
		ctx.closePath();
		ctx.fill();

		// Trees along the two nearest ridges — silhouettes, no detail needed.
		if (index >= painting.hills.length - 2) {
			const next = painting.hills[Math.min(index + 1, painting.hills.length - 1)];
			ctx.fillStyle = next;
			const count = 6 + Math.floor(random() * 7);
			for (let tree = 0; tree < count; tree++) {
				const x = random() * size;
				const t = (x / size) * Math.PI * 2 * wavelength + phase;
				const y = baseline + Math.sin(t) * amplitude + Math.sin(t * 2.7) * amplitude * 0.3;
				const height = size * (0.03 + random() * 0.055);
				const width = height * (0.24 + random() * 0.16);
				ctx.beginPath();
				ctx.moveTo(x, y - height);
				ctx.lineTo(x + width, y + 2);
				ctx.lineTo(x - width, y + 2);
				ctx.closePath();
				ctx.fill();
			}
		}
	});

	// Warm haze over everything, then dust motes catching the light.
	ctx.fillStyle = painting.haze;
	ctx.fillRect(0, 0, size, size);

	ctx.fillStyle = hexWithAlpha(painting.sun, 0.5);
	for (let mote = 0; mote < 90; mote++) {
		const x = random() * size;
		const y = random() * size * 0.8;
		const r = size * (0.0012 + random() * 0.004);
		ctx.globalAlpha = 0.15 + random() * 0.45;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	applyCanvasGrain(ctx, size, size, 9);
	return canvas.toDataURL('image/webp', 0.9);
}

/**
 * A light paper grain. Applied to gallery paintings and to uploaded photos
 * alike — it is most of what makes a phone snapshot sit convincingly next to
 * the painted art.
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

function hexWithAlpha(hex: string, alpha: number): string {
	const value = hex.replace('#', '');
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
