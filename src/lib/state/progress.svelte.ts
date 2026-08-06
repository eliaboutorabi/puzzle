import { browser } from '$app/environment';
import { LEVELS_PER_WORLD, WORLDS, levelKey, type WorldId } from '$lib/game/worlds';

const KEY = 'unwind:progress';

export interface Record {
	/** Best move count. */
	moves: number;
	/** Best time in milliseconds. */
	time: number;
}

interface Shape {
	/** levelKey -> best record. Presence in this map means the level is solved. */
	solved: { [key: string]: Record };
	/** Painting chosen for each world's easel in the attic. */
	easel: { [world: string]: string };
}

function load(): Shape {
	const empty: Shape = { solved: {}, easel: {} };
	if (!browser) return empty;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return empty;
		const parsed = JSON.parse(raw);
		return { solved: parsed.solved ?? {}, easel: parsed.easel ?? {} };
	} catch {
		return empty;
	}
}

class Progress {
	#state = $state(load());

	recordFor(world: WorldId, level: number): Record | undefined {
		return this.#state.solved[levelKey(world, level)];
	}

	isSolved(world: WorldId, level: number): boolean {
		return this.recordFor(world, level) !== undefined;
	}

	/** Pieces earned in a world = levels solved there. */
	piecesIn(world: WorldId): number {
		let count = 0;
		for (let level = 0; level < LEVELS_PER_WORLD; level++) {
			if (this.isSolved(world, level)) count++;
		}
		return count;
	}

	get totalPieces(): number {
		return WORLDS.reduce((total, world) => total + this.piecesIn(world.id), 0);
	}

	get totalLevels(): number {
		return WORLDS.length * LEVELS_PER_WORLD;
	}

	/** A world opens once the one before it has given up a single piece. */
	isWorldOpen(world: WorldId): boolean {
		const index = WORLDS.findIndex((entry) => entry.id === world);
		if (index <= 0) return true;
		return this.piecesIn(WORLDS[index - 1].id) > 0;
	}

	/** Returns true when this run beat the stored record (or set the first one). */
	complete(world: WorldId, level: number, moves: number, time: number): boolean {
		const key = levelKey(world, level);
		const previous = this.#state.solved[key];
		if (previous && previous.moves <= moves) return false;
		this.#state.solved[key] = { moves, time };
		this.#save();
		return true;
	}

	easelFor(world: WorldId): string | undefined {
		return this.#state.easel[world];
	}

	setEasel(world: WorldId, imageId: string) {
		this.#state.easel[world] = imageId;
		this.#save();
	}

	reset() {
		this.#state.solved = {};
		this.#state.easel = {};
		this.#save();
	}

	#save() {
		if (!browser) return;
		try {
			localStorage.setItem(KEY, JSON.stringify(this.#state));
		} catch {
			// Nothing to do; progress simply won't persist.
		}
	}
}

export const progress = new Progress();
