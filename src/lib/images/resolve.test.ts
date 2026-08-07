import { describe, expect, it } from 'vitest';
import { LEVELS_PER_WORLD, WORLDS, levelOrdinal } from '$lib/game/worlds';
import { GALLERY } from './gallery';
import { pickForOrdinal } from './resolve';

// Taken from the real gallery rather than duplicated, so renaming a painting
// cannot leave this test quietly passing against ids that no longer exist.
const GALLERY_IDS = GALLERY.map((painting) => painting.id);

/** Every level in the game, in the order a player meets them. */
const everyLevel = WORLDS.flatMap((world) =>
	Array.from({ length: LEVELS_PER_WORLD }, (_, level) => ({
		key: `${world.id}:${level}`,
		ordinal: levelOrdinal(world.id, level)
	}))
);

describe('a different picture for each puzzle', () => {
	it('gives every level a distinct ordinal', () => {
		const ordinals = everyLevel.map((entry) => entry.ordinal);
		expect(new Set(ordinals).size).toBe(ordinals.length);
		expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
	});

	it('never shows the same picture on two puzzles in a row', () => {
		const picks = everyLevel.map((entry) => pickForOrdinal(GALLERY_IDS, entry.ordinal));
		for (let i = 1; i < picks.length; i++) {
			expect(picks[i]).not.toBe(picks[i - 1]);
		}
	});

	it('uses every available picture before reusing any', () => {
		const firstPass = everyLevel
			.slice(0, GALLERY_IDS.length)
			.map((entry) => pickForOrdinal(GALLERY_IDS, entry.ordinal));
		expect(new Set(firstPass).size).toBe(GALLERY_IDS.length);
	});

	it('is stable, so a level always looks the same', () => {
		const once = everyLevel.map((entry) => pickForOrdinal(GALLERY_IDS, entry.ordinal));
		const twice = everyLevel.map((entry) => pickForOrdinal(GALLERY_IDS, entry.ordinal));
		expect(once).toEqual(twice);
	});

	it('puts the player’s own photos first', () => {
		// pool() lists photos ahead of paintings, so the earliest puzzles use them.
		const withPhotos = ['photo-a', 'photo-b', ...GALLERY_IDS];
		expect(pickForOrdinal(withPhotos, 0)).toBe('photo-a');
		expect(pickForOrdinal(withPhotos, 1)).toBe('photo-b');
	});

	it('survives an empty pool rather than breaking the board', () => {
		expect(pickForOrdinal([], 3)).toBe(GALLERY[0].id);
	});

	it('handles more levels than pictures by cycling', () => {
		const picks = everyLevel.map((entry) => pickForOrdinal(GALLERY_IDS, entry.ordinal));
		expect(picks).toHaveLength(WORLDS.length * LEVELS_PER_WORLD);
		expect(picks[0]).toBe(picks[GALLERY_IDS.length]);
	});
});
