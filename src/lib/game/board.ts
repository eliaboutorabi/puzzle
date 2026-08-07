/**
 * The board model.
 *
 * A board is a flat array of cells. Each cell holds a tile id, or `null` for the
 * empty cell. A tile's id *is* its home index. Every tile also carries a
 * rotation in quarter turns (0-3), so a board is solved when every tile sits on
 * its own index *and* stands upright.
 *
 * Two ways to disturb a board, and a mode decides which are in play:
 *
 *  - **sliding**: the empty cell walks, dragging tiles with it.
 *  - **turning**: a tile is knocked a quarter turn out of true, and clicking it
 *    turns it back.
 *  - **scattering**: pieces trade places. A scattered board has no empty cell,
 *    so nothing can slide — you pick a piece and swap it with another, and you
 *    have to find both the right way up and the right square.
 *
 * Three invariants are protected by construction rather than checked afterwards:
 *
 *  1. Solvability. A random permutation of an n-puzzle is unsolvable half the
 *     time, so we never shuffle by permuting. We start from solved and walk the
 *     empty cell around with legal moves, which cannot leave the solvable half.
 *
 *  2. Reachability with anchors. Anchored ("unmoved") tiles are immovable — time
 *     does not touch them. They sit at their home index forever, upright, and
 *     the empty cell routes around them.
 *
 *  3. Turnability. Rotation is its own little group: four clicks always returns
 *     a tile to where it started, so no rotation can ever strand a board.
 */

import { buildEdges, type PieceEdges } from './jigsaw';

export type Cell = number | null;

/** Which disturbances are in play on a board. */
export type Mode = 'slide' | 'turn' | 'both' | 'scatter';

/** Whether pieces are plain cells or cut with interlocking tabs. */
export type Shape = 'square' | 'jigsaw';

export interface Board {
	readonly size: number;
	/** cells[position] = tile id, or null for the empty cell. */
	readonly cells: readonly Cell[];
	/** rotations[tileId] = quarter turns clockwise, 0-3. */
	readonly rotations: readonly number[];
	/** Tile ids that never move and never turn. Always home, always upright. */
	readonly anchors: ReadonlySet<number>;
	readonly mode: Mode;
	readonly shape: Shape;
	/** Piece outlines, indexed by home position. Empty when shape is 'square'. */
	readonly edges: readonly PieceEdges[];
}

/** One step of history. Rewind replays these backward. */
export type Move =
	| { readonly kind: 'slide'; readonly from: number; readonly to: number; readonly tile: number }
	| { readonly kind: 'turn'; readonly tile: number }
	| { readonly kind: 'swap'; readonly a: number; readonly b: number };

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

export function canSlide(board: Board, index: number): boolean {
	if (board.mode === 'turn' || board.mode === 'scatter') return false;
	const tile = board.cells[index];
	if (tile === null || tile === undefined) return false;
	if (board.anchors.has(tile)) return false;
	return neighbours(board, index).includes(emptyIndex(board));
}

export function canTurn(board: Board, index: number): boolean {
	if (board.mode === 'slide') return false;
	const tile = board.cells[index];
	if (tile === null || tile === undefined) return false;
	return !board.anchors.has(tile);
}

/** Scattered boards have no empty cell, so pieces trade places instead. */
export function canSwap(board: Board, index: number): boolean {
	if (board.mode !== 'scatter') return false;
	const tile = board.cells[index];
	if (tile === null || tile === undefined) return false;
	return !board.anchors.has(tile);
}

/**
 * What a click on this cell does.
 *
 * A piece that is visibly facing the wrong way wants straightening, and that
 * reads as the obvious intent of a click — so turning wins over sliding for a
 * crooked piece even when it sits beside the empty cell. Otherwise a piece
 * beside the gap slides into it, and anything else turns.
 *
 * The alternative (sliding always wins) meant a crooked piece next to the gap
 * could not be straightened at all until it was moved away, which is exactly
 * the kind of hidden rule this game should not have.
 */
export function actionAt(board: Board, index: number): 'slide' | 'turn' | 'swap' | null {
	const tile = board.cells[index];
	if (tile === null || tile === undefined) return null;

	// On a scattered board a click means "pick this up"; whether it then turns
	// or trades places depends on what is already picked up, which the session
	// tracks rather than the board.
	if (board.mode === 'scatter') return canSwap(board, index) ? 'swap' : null;

	const askew = board.rotations[tile] % 4 !== 0;
	if (askew && canTurn(board, index)) return 'turn';
	if (canSlide(board, index)) return 'slide';
	if (canTurn(board, index)) return 'turn';
	return null;
}

/** Every position holding a tile that could slide right now. */
export function legalMoves(board: Board): number[] {
	const empty = emptyIndex(board);
	if (empty < 0) return [];
	return neighbours(board, empty).filter((i) => canSlide(board, i));
}

export function isUpright(board: Board): boolean {
	return board.rotations.every((turns) => turns % 4 === 0);
}

export function inPlace(board: Board): boolean {
	return board.cells.every((cell, index) => cell === null || cell === index);
}

export function isSolved(board: Board): boolean {
	return inPlace(board) && isUpright(board);
}

/** How many tiles are fully settled — right square, right way up. */
export function homeCount(board: Board): number {
	return board.cells.reduce<number>((total, cell, index) => {
		if (cell === null) return total;
		const settled = cell === index && board.rotations[cell] % 4 === 0;
		return settled ? total + 1 : total;
	}, 0);
}

/** Is this specific tile fully settled? */
export function isSettled(board: Board, position: number): boolean {
	const tile = board.cells[position];
	if (tile === null || tile === undefined) return false;
	return tile === position && board.rotations[tile] % 4 === 0;
}

export function solved(
	size: number,
	mode: Mode = 'slide',
	anchors: Iterable<number> = [],
	shape: Shape = 'square',
	edges: readonly PieceEdges[] = []
): Board {
	const count = size * size;
	const cells: Cell[] = Array.from({ length: count }, (_, i) => i);
	// Only sliding needs a gap; turn and scatter boards keep every piece.
	if (mode !== 'turn' && mode !== 'scatter') cells[count - 1] = null;
	return {
		size,
		cells,
		rotations: new Array(count).fill(0),
		anchors: new Set(anchors),
		mode,
		shape,
		edges
	};
}

/** Apply a slide, returning the new board and the history entry that undoes it. */
export function slide(board: Board, index: number): { board: Board; move: Move } | null {
	if (!canSlide(board, index)) return null;
	const empty = emptyIndex(board);
	const tile = board.cells[index]!;
	const cells = board.cells.slice();
	cells[empty] = tile;
	cells[index] = null;
	return {
		board: { ...board, cells },
		move: { kind: 'slide', from: empty, to: index, tile }
	};
}

/** Turn a tile a quarter turn clockwise. */
export function turn(board: Board, index: number): { board: Board; move: Move } | null {
	if (!canTurn(board, index)) return null;
	const tile = board.cells[index]!;
	const rotations = board.rotations.slice();
	rotations[tile] = (rotations[tile] + 1) % 4;
	return {
		board: { ...board, rotations },
		move: { kind: 'turn', tile }
	};
}

/** Trade two pieces' positions. Their rotations travel with them. */
export function swap(board: Board, a: number, b: number): { board: Board; move: Move } | null {
	if (a === b) return null;
	if (!canSwap(board, a) || !canSwap(board, b)) return null;
	const cells = board.cells.slice();
	[cells[a], cells[b]] = [cells[b], cells[a]];
	return { board: { ...board, cells }, move: { kind: 'swap', a, b } };
}

/** Do whatever this cell affords. */
export function act(board: Board, index: number): { board: Board; move: Move } | null {
	const action = actionAt(board, index);
	if (action === 'slide') return slide(board, index);
	if (action === 'turn') return turn(board, index);
	return null;
}

/** Reverse a move. A turn is undone by three more turns — the group closes. */
export function undo(board: Board, entry: Move): Board {
	if (entry.kind === 'swap') {
		// A swap is its own inverse.
		const cells = board.cells.slice();
		[cells[entry.a], cells[entry.b]] = [cells[entry.b], cells[entry.a]];
		return { ...board, cells };
	}
	if (entry.kind === 'slide') {
		const cells = board.cells.slice();
		cells[entry.to] = entry.tile;
		cells[entry.from] = null;
		return { ...board, cells };
	}
	const rotations = board.rotations.slice();
	rotations[entry.tile] = (rotations[entry.tile] + 3) % 4;
	return { ...board, rotations };
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
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
	}
	return candidates.slice(0, Math.min(count, candidates.length));
}

export interface ShuffleOptions {
	size: number;
	mode: Mode;
	/** Legal slides used to scramble positions. */
	steps: number;
	anchors: number[];
	/** Fraction of eligible tiles knocked out of true, 0-1. */
	turnRatio?: number;
	shape?: Shape;
	random: () => number;
}

/**
 * Shuffle by walking the empty cell, never by permuting, then knock a share of
 * the tiles out of true. `steps` and `turnRatio` are the difficulty dials.
 *
 * Scattered boards are the exception, and safely so: they permute outright.
 * Swaps have no parity constraint — any two pieces may trade — so every
 * permutation is reachable back to solved, which is not true of sliding.
 */
export function shuffle({
	size,
	mode,
	steps,
	anchors,
	turnRatio = 0,
	shape = 'square',
	random
}: ShuffleOptions): Board {
	const edges = shape === 'jigsaw' ? buildEdges(size, random) : [];
	let board = solved(size, mode, anchors, shape, edges);

	if (mode === 'scatter') {
		// Fisher-Yates over the positions no anchor is sitting on.
		const free = board.cells
			.map((_, index) => index)
			.filter((index) => !board.anchors.has(index));
		const cells = board.cells.slice();
		for (let i = free.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[cells[free[i]], cells[free[j]]] = [cells[free[j]], cells[free[i]]];
		}
		board = { ...board, cells };
	} else if (mode !== 'turn') {
		let previousEmpty = -1;
		for (let step = 0; step < steps; step++) {
			// Avoid immediately undoing the last step, or the walk wanders in place
			// and a "hard" board arrives half-solved.
			const options = legalMoves(board).filter((i) => i !== previousEmpty);
			const pool = options.length > 0 ? options : legalMoves(board);
			if (pool.length === 0) break;
			const choice = pool[Math.floor(random() * pool.length)];
			previousEmpty = emptyIndex(board);
			board = slide(board, choice)!.board;
		}
	}

	if (mode !== 'slide' && turnRatio > 0) {
		const rotations = board.rotations.slice();
		const eligible = board.cells.filter(
			(cell): cell is number => cell !== null && !board.anchors.has(cell)
		);
		let turned = 0;
		for (const tile of eligible) {
			if (random() < turnRatio) {
				// 1-3 quarter turns: never 0, or the tile would already be right.
				rotations[tile] = 1 + Math.floor(random() * 3);
				turned++;
			}
		}
		// A turn world with nothing turned is not a puzzle. Knock one askew.
		if (turned === 0 && eligible.length > 0) {
			const tile = eligible[Math.floor(random() * eligible.length)];
			rotations[tile] = 1 + Math.floor(random() * 3);
		}
		board = { ...board, rotations };
	}

	if (isSolved(board)) {
		const options = legalMoves(board);
		if (options.length > 0) board = slide(board, options[0])!.board;
		else if (board.cells[0] !== null) board = turn(board, 0)!.board;
	}

	return board;
}

/**
 * Breadth-first search from the empty cell for the shortest legal route to
 * `target`. Returns the sequence of positions, or null if walled off by anchors.
 */
export function routeForEmpty(board: Board, target: number): number[] | null {
	const start = emptyIndex(board);
	if (start < 0) return null;
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
 * A hint: the position of a tile that is not settled and can be acted on now.
 * Prefers a tile that is merely facing the wrong way, since turning it upright
 * is immediate progress, then one that would slide home.
 */
export function hint(board: Board): number | null {
	const positions = board.cells.map((_, index) => index);

	const askew = positions.find(
		(index) => canTurn(board, index) && board.rotations[board.cells[index]!] % 4 !== 0
	);
	if (askew !== undefined) return askew;

	// Scattered boards cannot slide, so the only other useful nudge is a piece
	// sitting on the wrong square.
	if (board.mode === 'scatter') {
		const misplaced = positions.find(
			(index) => canSwap(board, index) && board.cells[index] !== index
		);
		return misplaced ?? null;
	}

	const empty = emptyIndex(board);
	const moves = legalMoves(board);
	const landsHome = moves.find((i) => board.cells[i] === empty);
	if (landsHome !== undefined) return landsHome;

	const notHome = moves.find((i) => board.cells[i] !== i);
	if (notHome !== undefined) return notHome;

	return moves[0] ?? null;
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
