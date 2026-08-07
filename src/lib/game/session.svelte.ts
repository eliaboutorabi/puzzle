import * as sfx from '$lib/audio/sfx';
import {
	act,
	actionAt,
	canSwap,
	swap,
	turn,
	emptyIndex,
	hint as findHint,
	homeCount,
	isSolved,
	pickAnchors,
	seededRandom,
	shuffle,
	undo,
	type Board,
	type Move
} from './board';
import type { Difficulty, World } from './worlds';

/** How fast a held rewind unwinds, in milliseconds per step. */
const REWIND_INTERVAL = 90;
/** A hiccup fires somewhere in this window, in milliseconds. */
const HICCUP_MIN = 9000;
const HICCUP_MAX = 17000;

export type Phase = 'ready' | 'playing' | 'solved';

export class Session {
	readonly world: World;
	readonly difficulty: Difficulty;

	board = $state<Board>(null as unknown as Board);
	phase = $state<Phase>('ready');
	history = $state<Move[]>([]);
	elapsed = $state(0);
	hintsLeft = $state(0);
	hintAt = $state<number | null>(null);
	rewinding = $state(false);
	/** Set briefly when an anchored tile refuses to move, to drive a shake. */
	refusedAt = $state<number | null>(null);
	/** Set briefly when time hiccups, to drive a screen ripple. */
	hiccupping = $state(false);
	/** The piece currently picked up on a scattered board, if any. */
	selected = $state<number | null>(null);
	/** Mystery worlds keep the picture hidden until the board is solved. */
	revealed = $state(false);
	isRecord = $state(false);

	#startedAt = 0;
	#tick: ReturnType<typeof setInterval> | null = null;
	#rewindTimer: ReturnType<typeof setInterval> | null = null;
	#hiccupTimer: ReturnType<typeof setTimeout> | null = null;
	#refuseTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(world: World, difficulty: Difficulty, seed = Date.now()) {
		this.world = world;
		this.difficulty = difficulty;
		this.hintsLeft = difficulty.hints;
		this.revealed = !world.mystery;

		const random = seededRandom(seed);
		const anchors = pickAnchors(difficulty.size, world.anchors, random);
		this.board = shuffle({
			size: difficulty.size,
			mode: world.mode,
			steps: difficulty.steps,
			anchors,
			turnRatio: world.turnRatio,
			shape: world.shape,
			random
		});
	}

	/** Moves and history are the same thing: rewinding genuinely costs nothing. */
	get moves(): number {
		return this.history.length;
	}

	get progress(): number {
		const cells = this.board.size * this.board.size;
		const hasGap = this.board.mode === 'slide' || this.board.mode === 'both';
		const total = hasGap ? cells - 1 : cells;
		return total === 0 ? 1 : homeCount(this.board) / total;
	}

	/** What a click on this cell would do, for cursors and hover affordances. */
	actionAt(index: number): 'slide' | 'turn' | 'swap' | null {
		return actionAt(this.board, index);
	}

	get canRewind(): boolean {
		return this.history.length > 0 && this.phase !== 'solved';
	}

	get emptyIndex(): number {
		return emptyIndex(this.board);
	}

	/* ------------------------------------------------------------ playing -- */

	select(index: number): void {
		if (this.phase === 'solved' || this.rewinding) return;
		if (this.board.mode === 'scatter') return this.#scatterSelect(index);

		const result = act(this.board, index);
		if (!result) {
			this.#refuse(index);
			return;
		}

		if (this.phase === 'ready') this.#begin();

		const before = this.board;
		this.board = result.board;
		this.history = [...this.history, result.move];
		this.hintAt = null;

		// A piece that just came fully to rest — right square, right way up —
		// earns the bell. Everything else gets the quieter sound.
		// `act` never yields a swap; scattered boards took the branch above.
		const move = result.move;
		const settledNow =
			move.kind === 'turn'
				? this.board.rotations[move.tile] % 4 === 0 && this.board.cells[move.tile] === move.tile
				: move.kind === 'slide'
					? move.tile === move.from && this.board.rotations[move.tile] % 4 === 0
					: false;

		if (settledNow) sfx.playHome();
		else if (move.kind === 'turn') sfx.playTurn(before.rotations[move.tile]);
		else sfx.playSlide(this.progress);

		if (isSolved(this.board)) this.#finish();
	}

	/**
	 * On a scattered board one click does three different things, decided by
	 * what is already picked up:
	 *
	 *   nothing held      -> pick this piece up
	 *   this piece held   -> turn it a quarter
	 *   another piece held-> the two trade places
	 *
	 * Turning by clicking the held piece again means a single tap never does
	 * something irreversible-feeling, and the held piece is always visible.
	 */
	#scatterSelect(index: number): void {
		if (!canSwap(this.board, index)) {
			this.#refuse(index);
			return;
		}

		if (this.selected === null) {
			this.selected = index;
			sfx.playUi();
			return;
		}

		const result = this.selected === index ? turn(this.board, index) : swap(this.board, this.selected, index);
		if (!result) {
			this.#refuse(index);
			return;
		}

		if (this.phase === 'ready') this.#begin();
		const before = this.board;
		this.board = result.board;
		this.history = [...this.history, result.move];
		this.hintAt = null;

		// Keep hold of the piece after turning it, so it can be turned again;
		// let go after a trade, since the pair is now placed.
		this.selected = result.move.kind === 'turn' ? index : null;

		const move = result.move;
		if (move.kind === 'turn') {
			const settled =
				this.board.rotations[move.tile] % 4 === 0 && this.board.cells[move.tile] === move.tile;
			if (settled) sfx.playHome();
			else sfx.playTurn(before.rotations[move.tile]);
		} else if (move.kind === 'swap') {
			const landed = this.board.cells[move.a] === move.a || this.board.cells[move.b] === move.b;
			if (landed) sfx.playHome();
			else sfx.playSlide(this.progress);
		}

		if (isSolved(this.board)) this.#finish();
	}

	/** Put down whatever is held, without changing the board. */
	deselect(): void {
		this.selected = null;
	}

	#refuse(index: number): void {
		const tile = this.board.cells[index];
		if (tile !== null && this.board.anchors.has(tile)) sfx.playAnchor();
		else sfx.playRefuse();

		this.refusedAt = index;
		if (this.#refuseTimer) clearTimeout(this.#refuseTimer);
		this.#refuseTimer = setTimeout(() => (this.refusedAt = null), 400);
	}

	/* ------------------------------------------------------------ rewind --- */

	startRewind(): void {
		if (!this.canRewind || this.rewinding) return;
		this.rewinding = true;
		sfx.setRewinding(true);
		this.#step();
		this.#rewindTimer = setInterval(() => this.#step(), REWIND_INTERVAL);
	}

	stopRewind(): void {
		if (!this.rewinding) return;
		this.rewinding = false;
		sfx.setRewinding(false);
		if (this.#rewindTimer) {
			clearInterval(this.#rewindTimer);
			this.#rewindTimer = null;
		}
	}

	#step(): void {
		const last = this.history.at(-1);
		if (!last) {
			this.stopRewind();
			return;
		}
		this.board = undo(this.board, last);
		this.history = this.history.slice(0, -1);
		this.selected = null;
		sfx.playUnwind();
	}

	/** One step back, for the button and for hiccups. */
	unwindOnce(): void {
		if (!this.canRewind) return;
		if (this.phase === 'ready') this.#begin();
		this.#step();
	}

	/* -------------------------------------------------------------- hints -- */

	useHint(): void {
		if (this.hintsLeft === 0 || this.phase === 'solved') return;
		const target = findHint(this.board);
		if (target === null) return;
		this.hintAt = target;
		if (this.hintsLeft > 0) this.hintsLeft -= 1;
		sfx.playUi();
		setTimeout(() => {
			if (this.hintAt === target) this.hintAt = null;
		}, 2200);
	}

	/* ------------------------------------------------------------ machine -- */

	#begin(): void {
		this.phase = 'playing';
		this.#startedAt = Date.now();
		this.#tick = setInterval(() => {
			this.elapsed = Date.now() - this.#startedAt;
		}, 100);
		if (this.world.hiccups) this.#scheduleHiccup();
	}

	#scheduleHiccup(): void {
		const delay = HICCUP_MIN + Math.random() * (HICCUP_MAX - HICCUP_MIN);
		this.#hiccupTimer = setTimeout(() => {
			if (this.phase !== 'playing') return;
			if (this.history.length > 0 && !this.rewinding) {
				this.hiccupping = true;
				this.#step();
				setTimeout(() => (this.hiccupping = false), 700);
			}
			this.#scheduleHiccup();
		}, delay);
	}

	#finish(): void {
		this.phase = 'solved';
		this.revealed = true;
		this.stopRewind();
		if (this.#tick) {
			clearInterval(this.#tick);
			this.#tick = null;
		}
		if (this.#hiccupTimer) clearTimeout(this.#hiccupTimer);
		this.elapsed = this.#startedAt === 0 ? 0 : Date.now() - this.#startedAt;
		sfx.playSolve();
	}

	/** Always call this when the board unmounts; timers outlive components. */
	destroy(): void {
		this.stopRewind();
		if (this.#tick) clearInterval(this.#tick);
		if (this.#hiccupTimer) clearTimeout(this.#hiccupTimer);
		if (this.#refuseTimer) clearTimeout(this.#refuseTimer);
	}
}

export function formatTime(ms: number): string {
	const total = Math.floor(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
