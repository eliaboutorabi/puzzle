/**
 * Turning a phone snapshot into something that belongs in this game.
 *
 * Everything runs on-device: the file is read with FileReader, drawn to a
 * canvas, and stored locally. No upload, no server, nothing leaves the browser.
 */

import { applyCanvasGrain } from './gallery';

export const PHOTO_SIZE = 900;
const MAX_BYTES = 25 * 1024 * 1024;

export class PhotoError extends Error {}

/** Centre-crop to a square, warm it slightly, and grain it to match the paintings. */
export async function preparePhoto(file: File, size = PHOTO_SIZE): Promise<string> {
	if (!file.type.startsWith('image/')) {
		throw new PhotoError('That file is not an image.');
	}
	if (file.size > MAX_BYTES) {
		throw new PhotoError('That image is very large — try one under 25 MB.');
	}

	const bitmap = await loadBitmap(file);
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// Cover-fit: fill the square, crop the overhang, keep the centre.
	const scale = Math.max(size / bitmap.width, size / bitmap.height);
	const drawWidth = bitmap.width * scale;
	const drawHeight = bitmap.height * scale;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(
		bitmap,
		(size - drawWidth) / 2,
		(size - drawHeight) / 2,
		drawWidth,
		drawHeight
	);
	if ('close' in bitmap) bitmap.close();

	painterly(ctx, size);
	return canvas.toDataURL('image/webp', 0.88);
}

/**
 * The grade that makes a photo sit next to the painted gallery: a gentle warm
 * wash, slightly lifted blacks so nothing is harsh, a soft vignette, and the
 * same paper grain the paintings use.
 */
function painterly(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.save();

	ctx.globalCompositeOperation = 'soft-light';
	ctx.fillStyle = 'rgba(255, 196, 120, 0.34)';
	ctx.fillRect(0, 0, size, size);

	ctx.globalCompositeOperation = 'overlay';
	ctx.fillStyle = 'rgba(60, 44, 32, 0.10)';
	ctx.fillRect(0, 0, size, size);

	ctx.globalCompositeOperation = 'source-over';
	const vignette = ctx.createRadialGradient(
		size / 2,
		size / 2,
		size * 0.32,
		size / 2,
		size / 2,
		size * 0.75
	);
	vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
	vignette.addColorStop(1, 'rgba(46, 32, 24, 0.34)');
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, size, size);

	// Lift the blacks a touch so shadows read as dusk rather than as holes.
	ctx.globalCompositeOperation = 'lighten';
	ctx.fillStyle = 'rgba(38, 28, 30, 1)';
	ctx.fillRect(0, 0, size, size);

	ctx.restore();
	applyCanvasGrain(ctx, size, size, 11);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
	if ('createImageBitmap' in globalThis) {
		try {
			return await createImageBitmap(file);
		} catch {
			// Safari occasionally refuses certain encodings; fall through.
		}
	}
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new PhotoError('That image could not be opened.'));
		};
		image.src = url;
	});
}
