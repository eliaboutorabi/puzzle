import { describe, expect, it } from 'vitest';
import { buildEdges, piecePath, OVERHANG, type PieceEdges } from './jigsaw';
import { seededRandom } from './board';

const rng = () => seededRandom(4242);

describe('piece outlines', () => {
	// The invariant the whole jigsaw rests on: a tab on one piece is the exact
	// blank on the piece beside it, or the two would never mate.
	it('gives every shared edge a tab on one side and a blank on the other', () => {
		for (const size of [3, 4, 5]) {
			const edges = buildEdges(size, rng());
			for (let row = 0; row < size; row++) {
				for (let col = 0; col < size; col++) {
					const here = edges[row * size + col];
					if (col < size - 1) {
						const right = edges[row * size + col + 1];
						expect(here.right).not.toBe(0);
						expect(right.left).toBe(-here.right);
					}
					if (row < size - 1) {
						const below = edges[(row + 1) * size + col];
						expect(here.bottom).not.toBe(0);
						expect(below.top).toBe(-here.bottom);
					}
				}
			}
		}
	});

	it('leaves the outside of the board flat', () => {
		const size = 4;
		const edges = buildEdges(size, rng());
		for (let i = 0; i < size; i++) {
			expect(edges[i].top).toBe(0); // top row
			expect(edges[(size - 1) * size + i].bottom).toBe(0); // bottom row
			expect(edges[i * size].left).toBe(0); // left column
			expect(edges[i * size + size - 1].right).toBe(0); // right column
		}
	});

	it('draws a closed path for every piece', () => {
		for (const piece of buildEdges(4, rng())) {
			const d = piecePath(piece);
			expect(d.startsWith('M ')).toBe(true);
			expect(d.endsWith(' Z')).toBe(true);
			expect(d).not.toContain('NaN');
		}
	});

	/**
	 * Tabs are drawn into a box larger than the cell. If a knob reached past
	 * that box it would be clipped off, so the amplitude must stay inside it.
	 */
	it('keeps every tab inside the box it is drawn into', () => {
		const edges = buildEdges(5, rng());
		for (const piece of edges) {
			const numbers = piecePath(piece)
				.match(/-?\d+\.?\d*/g)!
				.map(Number);
			for (const value of numbers) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(1);
			}
		}
	});

	it('is deterministic for a given seed', () => {
		const a = buildEdges(4, seededRandom(7));
		const b = buildEdges(4, seededRandom(7));
		expect(a).toEqual(b);
	});

	it('a flat-edged piece is a plain rectangle', () => {
		const flat: PieceEdges = { top: 0, right: 0, bottom: 0, left: 0 };
		// Four line segments and no curves.
		expect(piecePath(flat)).not.toContain('C');
		expect(piecePath(flat).match(/L/g)).toHaveLength(4);
	});

	it('reserves room for the tabs', () => {
		expect(OVERHANG).toBeGreaterThan(0);
		expect(OVERHANG).toBeLessThan(0.5);
	});
});
