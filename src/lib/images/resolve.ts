/**
 * One id space for both sources. Gallery ids are the painting slugs; uploaded
 * photos use ids beginning `photo-`. Everything downstream just asks for a URL.
 */

import { GALLERY, paintingById, renderPainting } from './gallery';
import { getPhoto, listPhotos } from './store';

const cache = new Map<string, string>();

export interface Choice {
	id: string;
	title: string;
	url: string;
	own: boolean;
}

export function isPhotoId(id: string): boolean {
	return id.startsWith('photo-');
}

export async function resolveImage(id: string): Promise<string> {
	const cached = cache.get(id);
	if (cached) return cached;

	if (isPhotoId(id)) {
		const photo = await getPhoto(id);
		// A deleted photo falls back to the gallery rather than a broken board.
		const url = photo?.dataUrl ?? (await resolveImage(GALLERY[0].id));
		cache.set(id, url);
		return url;
	}

	const url = renderPainting(paintingById(id));
	cache.set(id, url);
	return url;
}

export function forget(id: string): void {
	cache.delete(id);
}

/** Everything the picker can offer, newest photos first. */
export async function allChoices(): Promise<Choice[]> {
	const photos = await listPhotos();
	const own: Choice[] = photos.map((photo) => ({
		id: photo.id,
		title: photo.title,
		url: photo.dataUrl,
		own: true
	}));
	const painted: Choice[] = GALLERY.map((painting) => ({
		id: painting.id,
		title: painting.title,
		url: renderPainting(painting, 420),
		own: false
	}));
	return [...own, ...painted];
}

/** Used by mystery worlds to pick something the player has not chosen. */
export function randomGalleryId(exclude?: string): string {
	const options = GALLERY.filter((painting) => painting.id !== exclude);
	return options[Math.floor(Math.random() * options.length)].id;
}
