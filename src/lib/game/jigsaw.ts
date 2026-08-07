/**
 * Jigsaw piece outlines.
 *
 * A piece's shape belongs to its *home* position, not to wherever it currently
 * sits — which is the whole point: the silhouette is the clue to where a piece
 * belongs, and a rotated piece visibly stops interlocking with its neighbours.
 *
 * Edges are shared. Where one piece has a tab, the piece next to it has the
 * matching blank, so the two always mate exactly once both are placed and
 * upright.
 */

/** +1 = tab bulging outward, -1 = blank cut inward, 0 = flat (grid border). */
export type Edge = -1 | 0 | 1;

export interface PieceEdges {
	readonly top: Edge;
	readonly right: Edge;
	readonly bottom: Edge;
	readonly left: Edge;
}

/**
 * How far a tab reaches beyond the cell, as a fraction of the cell. The piece
 * is drawn into a box this much larger on every side, so tabs have room.
 */
export const OVERHANG = 0.25;

/** The cell's share of that larger box: 1 / (1 + 2 * OVERHANG). */
const INSET = OVERHANG / (1 + 2 * OVERHANG);
const SPAN = 1 - 2 * INSET;

/** Knob height, as a fraction of the edge length. Kept under INSET / 1.05 so a
 *  tab can never overflow the box it is drawn into. */
const AMP = 0.22;

/**
 * One edge as four cubic segments, in edge-local space: `t` runs 0 to 1 along
 * the edge, `o` is the outward offset. A flat edge is a single straight run.
 */
function tabSegments(direction: Edge): number[][] {
	if (direction === 0) return [];
	const a = AMP * direction;
	return [
		[0.35, 0, 0.35, 0.1 * a, 0.38, 0.35 * a],
		[0.3, 0.6 * a, 0.32, 1.05 * a, 0.5, 1.05 * a],
		[0.68, 1.05 * a, 0.7, 0.6 * a, 0.62, 0.35 * a],
		[0.65, 0.1 * a, 0.65, 0, 1, 0]
	];
}

/**
 * Maps edge-local (t, o) to box coordinates for each side. Outward always
 * points away from the piece's centre, which is what makes a tab on one piece
 * read as a blank on its neighbour.
 */
const SIDES: Record<keyof PieceEdges, (t: number, o: number) => [number, number]> = {
	top: (t, o) => [INSET + t * SPAN, INSET - o * SPAN],
	right: (t, o) => [1 - INSET + o * SPAN, INSET + t * SPAN],
	bottom: (t, o) => [1 - INSET - t * SPAN, 1 - INSET + o * SPAN],
	left: (t, o) => [INSET - o * SPAN, 1 - INSET - t * SPAN]
};

const ORDER: (keyof PieceEdges)[] = ['top', 'right', 'bottom', 'left'];

/** An SVG path for one piece, in objectBoundingBox units (0-1). */
export function piecePath(edges: PieceEdges): string {
	const start = SIDES.top(0, 0);
	let d = `M ${round(start[0])} ${round(start[1])}`;

	for (const side of ORDER) {
		const map = SIDES[side];
		const segments = tabSegments(edges[side]);

		if (segments.length === 0) {
			const [x, y] = map(1, 0);
			d += ` L ${round(x)} ${round(y)}`;
			continue;
		}

		for (const [c1t, c1o, c2t, c2o, et, eo] of segments) {
			const [x1, y1] = map(c1t, c1o);
			const [x2, y2] = map(c2t, c2o);
			const [x, y] = map(et, eo);
			d += ` C ${round(x1)} ${round(y1)}, ${round(x2)} ${round(y2)}, ${round(x)} ${round(y)}`;
		}
	}

	return `${d} Z`;
}

function round(value: number): number {
	return Math.round(value * 10000) / 10000;
}

/**
 * Build the shared edge map for a whole board. Interior edges get a random
 * direction; one piece takes the tab and its neighbour the matching blank.
 * Grid borders stay flat.
 */
export function buildEdges(size: number, random: () => number): PieceEdges[] {
	const edges: { top: Edge; right: Edge; bottom: Edge; left: Edge }[] = Array.from(
		{ length: size * size },
		() => ({ top: 0, right: 0, bottom: 0, left: 0 })
	);

	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			const index = row * size + col;

			if (col < size - 1) {
				const direction: Edge = random() < 0.5 ? 1 : -1;
				edges[index].right = direction;
				edges[index + 1].left = -direction as Edge;
			}
			if (row < size - 1) {
				const direction: Edge = random() < 0.5 ? 1 : -1;
				edges[index].bottom = direction;
				edges[index + size].top = -direction as Edge;
			}
		}
	}

	return edges;
}
