/**
 * Worlds and difficulty are two separate axes, on purpose.
 *
 * Difficulty scales the *size* of the problem (grid, shuffle depth, hints).
 * A world introduces one new rule about how time behaves on the board, and it
 * teaches that rule by making it the only interesting thing in the world.
 * Nothing is explained in words beyond a single line of flavour.
 */

export type WorldId = 'beginnings' | 'unmoved' | 'hidden' | 'hiccups';

export interface World {
	readonly id: WorldId;
	readonly title: string;
	readonly flavour: string;
	/** Immovable tiles that rewind cannot touch. */
	readonly anchors: number;
	/** The image stays hidden until the board is solved. */
	readonly mystery: boolean;
	/** The board occasionally unwinds a step on its own. */
	readonly hiccups: boolean;
	/** Hue used for this world's light. */
	readonly hue: number;
}

export const WORLDS: readonly World[] = [
	{
		id: 'beginnings',
		title: 'Beginnings',
		flavour: 'Nothing here is lost. Hold to unwind.',
		anchors: 0,
		mystery: false,
		hiccups: false,
		hue: 38
	},
	{
		id: 'unmoved',
		title: 'The Unmoved',
		flavour: 'Some things time refuses to touch.',
		anchors: 1,
		mystery: false,
		hiccups: false,
		hue: 128
	},
	{
		id: 'hidden',
		title: 'Hidden Hours',
		flavour: 'You will know what it was when it is over.',
		anchors: 1,
		mystery: true,
		hiccups: false,
		hue: 268
	},
	{
		id: 'hiccups',
		title: 'Hiccups',
		flavour: 'Time here is not quite well.',
		anchors: 2,
		mystery: false,
		hiccups: true,
		hue: 8
	}
];

export function worldById(id: string): World {
	return WORLDS.find((world) => world.id === id) ?? WORLDS[0];
}

export type DifficultyId = 'gentle' | 'steady' | 'tangled';

export interface Difficulty {
	readonly id: DifficultyId;
	readonly title: string;
	readonly note: string;
	readonly size: number;
	/** Legal moves used to scramble the board. */
	readonly steps: number;
	/** -1 means unlimited. */
	readonly hints: number;
	/** Whether the finished image sits faintly beneath the tiles. */
	readonly ghost: boolean;
}

export const DIFFICULTIES: readonly Difficulty[] = [
	{
		id: 'gentle',
		title: 'Gentle',
		note: '3 x 3 · the picture waits underneath',
		size: 3,
		steps: 40,
		hints: -1,
		ghost: true
	},
	{
		id: 'steady',
		title: 'Steady',
		note: '4 x 4 · three glances allowed',
		size: 4,
		steps: 120,
		hints: 3,
		ghost: false
	},
	{
		id: 'tangled',
		title: 'Tangled',
		note: '5 x 5 · no help at all',
		size: 5,
		steps: 260,
		hints: 0,
		ghost: false
	}
];

export function difficultyById(id: string): Difficulty {
	return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[0];
}

/** Levels per world. Each solved level earns one piece of the world's painting. */
export const LEVELS_PER_WORLD = 3;

export function levelKey(world: WorldId, level: number): string {
	return `${world}:${level}`;
}
