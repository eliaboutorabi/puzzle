/**
 * The board model.
 *
 * A board is a flat array of cells. Each cell holds a tile id, or `null` for the
 * single empty cell. A tile's id *is* its home index, so a board is solved when
 * every cell holds its own index.
 *
 * Two invariants matter and both are protected by construction rather than by
 * checking after the fact:
 *
 *  1. Solvability. A random permutation of an n-puzzle is unsolvable half the
 *     time, so we never shuffle by permuting. We start from solved and walk the
 *     empty cell around with legal moves, which cannot leave the solvable half.
 *
 *  2. Reachability with anchors. Anchored ("unmoved") tiles are immovable — time
 *     does not touch them. They sit at their home index forever, and the empty
 *     cell routes around them. Because the shuffle uses the same movement rules
 *     the player does, every shuffled board is reachable back to solved.
 */

export type Cell = number | null;

export interface Board {
	readonly size: number;
	/** cells[position] = tile id, or null for the empty cell. */
	readonly cells: readonly Cell[];
	/** Tile ids that never move. Always parked at their home index. */
	readonly anchors: ReadonlySet<number>;
}

/** One step of history: the empty cell travelled `from` -> `to`. */
export interface Move {
	readonly from: number;
	readonly to: number;
	/** The tile that slid into the empty cell (i.e. the tile that was at `to`). */
	readonly tile: number;
}

export function emptyIndex(board: Board): number {
	return board.cells.indexOf(null);
}

export function rowOf(board: Board, index: number): number {
	return Math.floor(index / board.size);
}

export function colOf(board: Board, index: number): number {
	return index % board.size;
}

/** Orthogonal neighbours of `index`, clamped to the grid. */
export function neighbours(board: Board, index: number): number[] {
	const { size } = board;
	const row = Math.floor(index / size);
	const col = index % size;
	const out: number[] = [];
	if (row > 0) out.push(index - size);
	if (row < size - 1) out.push(index + size);
	if (col > 0) out.push(index - 1);
	if (col < size - 1) out.push(index + 1);
	return out;
}

/** A tile can move if it sits beside the empty cell and time still touches it. */
export function canMove(board: Board, index: number): boolean {
	const tile = board.cells[index];
	if (tile === null || tile === undefined) return false;
	if (board.anchors.has(tile)) return false;
	return neighbours(board, index).includes(emptyIndex(board));
}

/** Every position holding a tile that could slide right now. */
export function legalMoves(board: Board): number[] {
	return neighbours(board, emptyIndex(board)).filter((i) => canMove(board, i));
}

export function isSolved(board: Board): boolean {
	return board.cells.every((cell, index) => cell === null || cell === index);
}

/** How many tiles are already home — drives the "warmth" of the board glow. */
export function homeCount(board: Board): number {
	return board.cells.reduce<number>(
		(total, cell, index) => (cell !== null && cell === index ? total + 1 : total),
		0
	);
}

export function solved(size: number, anchors: Iterable<number> = []): Board {
	const cells: Cell[] = Array.from({ length: size * size }, (_, i) => i);
	cells[cells.length - 1] = null;
	return { size, cells, anchors: new Set(anchors) };
}

/** Apply a move, returning the new board and the history entry that undoes it. */
export function move(board: Board, index: number): { board: Board; move: Move } | null {
	if (!canMove(board, index)) return null;
	const empty = emptyIndex(board);
	const tile = board.cells[index]!;
	const cells = board.cells.slice();
	cells[empty] = tile;
	cells[index] = null;
	return {
		board: { ...board, cells },
		move: { from: empty, to: index, tile }
	};
}

/** Reverse a move. The empty cell walks back, dragging the tile with it. */
export function unmove(board: Board, entry: Move): Board {
	const cells = board.cells.slice();
	cells[entry.to] = entry.tile;
	cells[entry.from] = null;
	return { ...board, cells };
}

/**
 * Pick tiles to anchor. Anchors are kept away from the last row and column so
 * the empty cell always has room to circulate; a board that pins the empty cell
 * into a pocket is technically solvable and miserable to play.
 */
export function pickAnchors(size: number, count: number, random: () => number): number[] {
	if (count <= 0) return [];
	const candidates: number[] = [];
	for (let row = 0; row < size - 1; row++) {
		for (let col = 0; col < size - 1; col++) {
			candidates.push(row * size + col);
		}
	}
	// Fisher-Yates over the candidates, then take the first `count`.
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
	}
	return candidates.slice(0, Math.min(count, candidates.length));
}

/**
 * Shuffle by walking the empty cell, never by permuting. `steps` is the
 * difficulty dial: more steps means a longer road home.
 *
 * The walk avoids immediately undoing itself, otherwise it wanders in place and
 * a "hard" board arrives half-solved.
 */
export function shuffle(size: number, steps: number, anchors: number[], random: () => number): Board {
	let board = solved(size, anchors);
	let previousEmpty = -1;

	for (let step = 0; step < steps; step++) {
		const options = legalMoves(board).filter((i) => i !== previousEmpty);
		const pool = options.length > 0 ? options : legalMoves(board);
		if (pool.length === 0) break;
		const choice = pool[Math.floor(random() * pool.length)];
		previousEmpty = emptyIndex(board);
		board = move(board, choice)!.board;
	}

	// A shuffle that happens to land on solved is a bad opening. Nudge it once.
	if (isSolved(board)) {
		const options = legalMoves(board);
		if (options.length > 0) board = move(board, options[0])!.board;
	}

	return board;
}

/**
 * Breadth-first search from the empty cell for the shortest legal route to
 * `target`, used by the hint system to show one tile that wants to move.
 * Returns the sequence of positions to click, or null if walled off by anchors.
 */
export function routeForEmpty(board: Board, target: number): number[] | null {
	const start = emptyIndex(board);
	if (start === target) return [];

	const previous = new Map<number, number>([[start, -1]]);
	const queue = [start];

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const next of neighbours(board, current)) {
			if (previous.has(next)) continue;
			const occupant = board.cells[next];
			if (occupant !== null && board.anchors.has(occupant)) continue;
			previous.set(next, current);
			if (next === target) {
				const path: number[] = [];
				for (let at = target; at !== start; at = previous.get(at)!) path.push(at);
				return path.reverse();
			}
			queue.push(next);
		}
	}
	return null;
}

/**
 * A hint: the position of a tile that is not home and can move right now.
 * Prefers tiles that would land home, so hints feel like progress rather than
 * like being told to shuffle.
 */
export function hint(board: Board): number | null {
	const moves = legalMoves(board);
	if (moves.length === 0) return null;
	const empty = emptyIndex(board);
	const landsHome = moves.find((i) => board.cells[i] === empty);
	if (landsHome !== undefined) return landsHome;
	const notHome = moves.find((i) => board.cells[i] !== i);
	return notHome ?? moves[0];
}

/** Deterministic PRNG (mulberry32) so a seeded puzzle is the same for everyone. */
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
