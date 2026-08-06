import { describe, expect, it } from 'vitest';
import {
	canMove,
	emptyIndex,
	hint,
	homeCount,
	isSolved,
	legalMoves,
	move,
	pickAnchors,
	routeForEmpty,
	seededRandom,
	shuffle,
	solved,
	unmove
} from './board';

const rng = () => seededRandom(12345);

describe('solved boards', () => {
	it('starts solved with the empty cell last', () => {
		const board = solved(4);
		expect(isSolved(board)).toBe(true);
		expect(emptyIndex(board)).toBe(15);
		expect(homeCount(board)).toBe(15);
	});
});

describe('moving', () => {
	it('slides a tile into the empty cell and back again', () => {
		const board = solved(3);
		const result = move(board, 7)!;
		expect(result).not.toBeNull();
		expect(isSolved(result.board)).toBe(false);
		expect(emptyIndex(result.board)).toBe(7);

		const back = unmove(result.board, result.move);
		expect(back.cells).toEqual(board.cells);
		expect(isSolved(back)).toBe(true);
	});

	it('refuses tiles that are not beside the empty cell', () => {
		const board = solved(3);
		expect(canMove(board, 0)).toBe(false);
		expect(move(board, 0)).toBeNull();
	});

	it('never offers more than four legal moves', () => {
		const board = shuffle(4, 80, [], rng());
		expect(legalMoves(board).length).toBeGreaterThan(0);
		expect(legalMoves(board).length).toBeLessThanOrEqual(4);
	});
});

describe('anchors', () => {
	it('keeps anchored tiles at home and immovable', () => {
		const anchors = pickAnchors(4, 2, rng());
		const board = shuffle(4, 200, anchors, rng());

		for (const anchor of anchors) {
			expect(board.cells[anchor]).toBe(anchor);
			expect(canMove(board, anchor)).toBe(false);
		}
	});

	it('places anchors away from the last row and column', () => {
		const anchors = pickAnchors(5, 4, rng());
		for (const anchor of anchors) {
			expect(anchor % 5).toBeLessThan(4);
			expect(Math.floor(anchor / 5)).toBeLessThan(4);
		}
	});

	it('routes the empty cell around anchors, never through them', () => {
		const anchors = pickAnchors(4, 2, rng());
		const board = shuffle(4, 120, anchors, rng());
		const route = routeForEmpty(board, 0);
		if (route) {
			for (const step of route) {
				const occupant = board.cells[step];
				if (occupant !== null) expect(board.anchors.has(occupant)).toBe(false);
			}
		}
	});
});

describe('shuffling', () => {
	// The property that matters: every shuffle is reachable back to solved,
	// because it was produced by legal moves in the first place.
	it('produces a board that is not solved', () => {
		for (let seed = 1; seed < 40; seed++) {
			const board = shuffle(4, 150, [], seededRandom(seed));
			expect(isSolved(board)).toBe(false);
		}
	});

	it('is reversible: replaying every move backward returns to solved', () => {
		const random = seededRandom(99);
		let board = solved(4);
		const history = [];
		for (let i = 0; i < 200; i++) {
			const options = legalMoves(board);
			const choice = options[Math.floor(random() * options.length)];
			const result = move(board, choice)!;
			board = result.board;
			history.push(result.move);
		}
		expect(isSolved(board)).toBe(false);

		while (history.length > 0) board = unmove(board, history.pop()!);
		expect(isSolved(board)).toBe(true);
	});

	it('is deterministic for a given seed', () => {
		const a = shuffle(5, 200, [], seededRandom(7));
		const b = shuffle(5, 200, [], seededRandom(7));
		expect(a.cells).toEqual(b.cells);
	});

	it('never loses or duplicates a tile', () => {
		const board = shuffle(5, 400, pickAnchors(5, 3, rng()), rng());
		const tiles = board.cells.filter((cell) => cell !== null).sort((x, y) => x! - y!);
		expect(tiles).toEqual(Array.from({ length: 24 }, (_, i) => i));
		expect(board.cells.filter((cell) => cell === null)).toHaveLength(1);
	});
});

describe('hints', () => {
	it('suggests a tile that can actually move', () => {
		const board = shuffle(4, 120, [], rng());
		const suggestion = hint(board)!;
		expect(suggestion).not.toBeNull();
		expect(canMove(board, suggestion)).toBe(true);
	});
});
