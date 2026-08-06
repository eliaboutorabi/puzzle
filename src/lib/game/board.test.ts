import { describe, expect, it } from 'vitest';
import {
	act,
	actionAt,
	canSlide,
	canTurn,
	emptyIndex,
	hint,
	homeCount,
	isSolved,
	isUpright,
	legalMoves,
	pickAnchors,
	routeForEmpty,
	seededRandom,
	shuffle,
	slide,
	solved,
	turn,
	undo,
	type Move
} from './board';

const rng = () => seededRandom(12345);

describe('solved boards', () => {
	it('starts solved with the empty cell last', () => {
		const board = solved(4);
		expect(isSolved(board)).toBe(true);
		expect(emptyIndex(board)).toBe(15);
		expect(homeCount(board)).toBe(15);
	});

	it('keeps every piece when nothing slides', () => {
		const board = solved(3, 'turn');
		expect(emptyIndex(board)).toBe(-1);
		expect(board.cells.filter((c) => c === null)).toHaveLength(0);
		expect(homeCount(board)).toBe(9);
	});
});

describe('sliding', () => {
	it('slides a tile into the empty cell and back again', () => {
		const board = solved(3);
		const result = slide(board, 7)!;
		expect(result).not.toBeNull();
		expect(isSolved(result.board)).toBe(false);
		expect(emptyIndex(result.board)).toBe(7);

		const back = undo(result.board, result.move);
		expect(back.cells).toEqual(board.cells);
		expect(isSolved(back)).toBe(true);
	});

	it('refuses tiles that are not beside the empty cell', () => {
		const board = solved(3);
		expect(canSlide(board, 0)).toBe(false);
		expect(slide(board, 0)).toBeNull();
	});

	it('never slides on a turn-only board', () => {
		const board = solved(3, 'turn');
		expect(legalMoves(board)).toEqual([]);
		expect(canSlide(board, 0)).toBe(false);
	});
});

describe('turning', () => {
	it('turns a quarter at a time and wraps after four', () => {
		let board = solved(3, 'turn');
		for (let i = 1; i <= 3; i++) {
			board = turn(board, 0)!.board;
			expect(board.rotations[0]).toBe(i);
			expect(isSolved(board)).toBe(false);
		}
		board = turn(board, 0)!.board;
		expect(board.rotations[0]).toBe(0);
		expect(isSolved(board)).toBe(true);
	});

	it('a board in place but askew is not solved', () => {
		const board = turn(solved(3, 'turn'), 4)!.board;
		expect(board.cells.every((c, i) => c === null || c === i)).toBe(true);
		expect(isUpright(board)).toBe(false);
		expect(isSolved(board)).toBe(false);
	});

	it('undoes a turn exactly', () => {
		const start = solved(3, 'turn');
		const result = turn(start, 5)!;
		expect(undo(result.board, result.move).rotations).toEqual(start.rotations);
	});

	it('never turns on a slide-only board', () => {
		const board = solved(3, 'slide');
		expect(canTurn(board, 0)).toBe(false);
		expect(turn(board, 0)).toBeNull();
	});

	it('always scrambles at least one piece out of true', () => {
		for (let seed = 1; seed < 30; seed++) {
			const board = shuffle({
				size: 3,
				mode: 'turn',
				steps: 0,
				anchors: [],
				turnRatio: 0.5,
				random: seededRandom(seed)
			});
			expect(isUpright(board)).toBe(false);
			expect(isSolved(board)).toBe(false);
		}
	});

	it('never scrambles a piece to zero turns, which would already be correct', () => {
		const board = shuffle({
			size: 4,
			mode: 'turn',
			steps: 0,
			anchors: [],
			turnRatio: 1,
			random: rng()
		});
		const turned = board.rotations.filter((r) => r !== 0);
		expect(turned.length).toBeGreaterThan(0);
		expect(turned.every((r) => r >= 1 && r <= 3)).toBe(true);
	});
});

describe('what a click does', () => {
	it('prefers sliding when a piece can both slide and turn', () => {
		const board = shuffle({
			size: 3,
			mode: 'both',
			steps: 30,
			anchors: [],
			turnRatio: 0.6,
			random: rng()
		});
		for (const position of legalMoves(board)) {
			expect(actionAt(board, position)).toBe('slide');
		}
	});

	it('turns pieces that are nowhere near the empty cell', () => {
		const board = shuffle({
			size: 4,
			mode: 'both',
			steps: 60,
			anchors: [],
			turnRatio: 0.6,
			random: rng()
		});
		const slidable = new Set(legalMoves(board));
		const empty = emptyIndex(board);
		const other = board.cells.findIndex(
			(cell, index) => cell !== null && index !== empty && !slidable.has(index)
		);
		expect(actionAt(board, other)).toBe('turn');
	});

	it('does nothing at all on the empty cell', () => {
		const board = solved(3, 'both');
		expect(actionAt(board, emptyIndex(board))).toBeNull();
		expect(act(board, emptyIndex(board))).toBeNull();
	});
});

describe('anchors', () => {
	it('keeps anchored tiles home, upright and immovable', () => {
		const anchors = pickAnchors(4, 2, rng());
		const board = shuffle({
			size: 4,
			mode: 'both',
			steps: 200,
			anchors,
			turnRatio: 1,
			random: rng()
		});

		for (const anchor of anchors) {
			expect(board.cells[anchor]).toBe(anchor);
			expect(board.rotations[anchor]).toBe(0);
			expect(canSlide(board, anchor)).toBe(false);
			expect(canTurn(board, anchor)).toBe(false);
			expect(actionAt(board, anchor)).toBeNull();
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
		const board = shuffle({ size: 4, mode: 'slide', steps: 120, anchors, random: rng() });
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
	it('produces a board that is not solved', () => {
		for (let seed = 1; seed < 40; seed++) {
			const board = shuffle({
				size: 4,
				mode: 'slide',
				steps: 150,
				anchors: [],
				random: seededRandom(seed)
			});
			expect(isSolved(board)).toBe(false);
		}
	});

	// The property that matters: every disturbance is reversible, so no shuffle
	// can strand a board in a state the player cannot walk back from.
	it('is reversible: replaying every move backward returns to solved', () => {
		const random = seededRandom(99);
		let board = solved(4, 'both');
		const history: Move[] = [];

		for (let i = 0; i < 250; i++) {
			const doTurn = random() < 0.4;
			const options = doTurn
				? board.cells.map((_, index) => index).filter((index) => canTurn(board, index))
				: legalMoves(board);
			if (options.length === 0) continue;
			const choice = options[Math.floor(random() * options.length)];
			const result = doTurn ? turn(board, choice)! : slide(board, choice)!;
			board = result.board;
			history.push(result.move);
		}
		expect(isSolved(board)).toBe(false);

		while (history.length > 0) board = undo(board, history.pop()!);
		expect(isSolved(board)).toBe(true);
	});

	it('is deterministic for a given seed', () => {
		const make = () =>
			shuffle({ size: 5, mode: 'both', steps: 200, anchors: [], turnRatio: 0.5, random: seededRandom(7) });
		const a = make();
		const b = make();
		expect(a.cells).toEqual(b.cells);
		expect(a.rotations).toEqual(b.rotations);
	});

	it('never loses or duplicates a tile', () => {
		const board = shuffle({
			size: 5,
			mode: 'both',
			steps: 400,
			anchors: pickAnchors(5, 3, rng()),
			turnRatio: 0.5,
			random: rng()
		});
		const tiles = board.cells.filter((cell) => cell !== null).sort((x, y) => x! - y!);
		expect(tiles).toEqual(Array.from({ length: 24 }, (_, i) => i));
		expect(board.cells.filter((cell) => cell === null)).toHaveLength(1);
		expect(board.rotations).toHaveLength(25);
	});
});

describe('hints', () => {
	it('suggests a tile that can actually be acted on', () => {
		const board = shuffle({ size: 4, mode: 'slide', steps: 120, anchors: [], random: rng() });
		const suggestion = hint(board)!;
		expect(suggestion).not.toBeNull();
		expect(actionAt(board, suggestion)).not.toBeNull();
	});

	it('points at a crooked piece first, since turning it is instant progress', () => {
		const board = shuffle({
			size: 4,
			mode: 'both',
			steps: 100,
			anchors: [],
			turnRatio: 0.5,
			random: rng()
		});
		const suggestion = hint(board)!;
		expect(board.rotations[board.cells[suggestion]!] % 4).not.toBe(0);
		expect(actionAt(board, suggestion)).toBe('turn');
	});
});
