<script lang="ts">
	import type { Session } from '$lib/game/session.svelte';
	import { settings } from '$lib/state/settings.svelte';

	let {
		session,
		imageUrl
	}: {
		session: Session;
		imageUrl: string;
	} = $props();

	const size = $derived(session.board.size);

	/**
	 * Keyed by tile id, positioned by transform. Svelte then keeps each tile's
	 * DOM node across moves and the CSS transition does the sliding for free —
	 * no FLIP bookkeeping, and it stays smooth during a fast rewind.
	 */
	const placements = $derived(
		session.board.cells
			.map((tile, position) => ({ tile, position }))
			.filter((entry): entry is { tile: number; position: number } => entry.tile !== null)
	);

	const hidden = $derived(session.world.mystery && !session.revealed);

	function offset(index: number): string {
		const col = index % size;
		const row = Math.floor(index / size);
		return `${(col / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`;
	}

	function place(index: number): string {
		const col = index % size;
		const row = Math.floor(index / size);
		return `translate(${col * 100}%, ${row * 100}%)`;
	}

	/**
	 * The rotation lives on an inner element rather than on the tile itself, so
	 * the tile's transform stays purely positional and the two animate
	 * independently — a piece can slide and spin at once without them fighting.
	 */
	function spin(tile: number): string {
		return `rotate(${session.board.rotations[tile] * 90}deg)`;
	}
</script>

<div
	class="frame"
	class:rewinding={session.rewinding}
	class:hiccup={session.hiccupping}
	class:solved={session.phase === 'solved'}
	class:still={settings.reducedMotion}
	style="--size: {size}"
>
	<!-- The finished picture, faint, beneath the tiles. Gentle mode only. -->
	{#if session.difficulty.ghost && !hidden}
		<div class="ghost" style="background-image: url({imageUrl})"></div>
	{/if}

	<div class="tiles">
		{#each placements as entry (entry.tile)}
			{@const turns = session.board.rotations[entry.tile] % 4}
			{@const settled = entry.tile === entry.position && turns === 0}
			{@const askew = turns !== 0}
			{@const isAnchor = session.board.anchors.has(entry.tile)}
			{@const action = session.actionAt(entry.position)}
			<button
				class="tile"
				class:home={settled}
				class:askew
				class:turnable={action === 'turn'}
				class:anchor={isAnchor}
				class:hinted={session.hintAt === entry.position}
				class:refused={session.refusedAt === entry.position}
				class:hidden
				style="transform: {place(entry.position)}; --delay: {(entry.tile % 7) * 40}ms;"
				onclick={() => session.select(entry.position)}
				disabled={session.phase === 'solved'}
				aria-label={isAnchor
					? `Piece ${entry.tile + 1}, held still by time`
					: `Piece ${entry.tile + 1}${settled ? ', settled' : ''}${
							askew ? `, turned ${turns * 90} degrees — click to turn it` : ''
						}`}
			>
				<!-- The face carries the picture and the rotation; the button carries
				     the position. Keeping them apart lets both animate at once. -->
				<span
					class="face"
					style="
						transform: {spin(entry.tile)};
						background-image: {hidden ? 'none' : `url(${imageUrl})`};
						background-size: {size * 100}% {size * 100}%;
						background-position: {offset(entry.tile)};
					"
				>
					{#if hidden}
						<!-- Already inside the rotated face, so it turns with the piece
						     and its angle is the only clue to the piece's orientation. -->
						<span class="numeral">{entry.tile + 1}</span>
					{/if}
				</span>

				{#if action === 'turn'}
					<span class="turn-mark" aria-hidden="true">⟳</span>
				{/if}
				{#if isAnchor}
					<span class="anchor-mark" aria-hidden="true"></span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- On solve the whole picture settles into place over the grid. -->
	<div
		class="reveal"
		class:showing={session.phase === 'solved'}
		style="background-image: url({imageUrl})"
	></div>

	{#if session.rewinding}
		<div class="unwind-veil" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.frame {
		position: relative;
		/* Sized so the board and its controls both fit without scrolling. */
		width: min(58vh, 92vw, 560px);
		aspect-ratio: 1;
		margin-inline: auto;
		border-radius: var(--radius-lg);
		padding: 10px;
		background: linear-gradient(#ffffff, var(--surface-sink));
		box-shadow:
			var(--shadow-lift),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		border: 1px solid var(--edge);
		transition: filter 0.4s var(--ease-out), transform 0.5s var(--ease-spring);
	}

	.frame.solved {
		transform: scale(1.012);
	}

	/* Rewind drains the colour and pulls everything slightly out of focus. */
	.frame.rewinding {
		filter: saturate(0.45) brightness(0.92) hue-rotate(-12deg);
	}

	.frame.hiccup {
		animation: hiccup 0.7s var(--ease-out);
	}

	@keyframes hiccup {
		0% { transform: scale(1) skewX(0deg); }
		18% { transform: scale(1.02) skewX(1.4deg); filter: blur(1.5px); }
		42% { transform: scale(0.99) skewX(-1deg); }
		100% { transform: scale(1) skewX(0deg); }
	}

	.ghost,
	.reveal {
		position: absolute;
		inset: 10px;
		border-radius: calc(var(--radius-lg) - 8px);
		background-size: cover;
		pointer-events: none;
	}

	.ghost {
		opacity: 0.17;
		filter: blur(1px);
	}

	.reveal {
		opacity: 0;
		transition: opacity 1.1s var(--ease-out);
		z-index: 3;
	}

	.reveal.showing {
		opacity: 1;
	}

	.tiles {
		position: absolute;
		inset: 10px;
		z-index: 2;
	}

	.tile {
		position: absolute;
		top: 0;
		left: 0;
		width: calc(100% / var(--size));
		height: calc(100% / var(--size));
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 7px;
		background: none;
		overflow: hidden;
		box-shadow:
			inset 0 0 0 1px rgba(70, 45, 120, 0.22),
			0 5px 12px -7px rgba(70, 45, 120, 0.6);
		/* The two properties that make this feel alive. */
		transition:
			transform 0.26s var(--ease-spring),
			box-shadow 0.35s var(--ease-out),
			filter 0.35s var(--ease-out);
		will-change: transform;
		outline-offset: -3px;
	}

	/* The picture, and the thing that spins. Slightly oversized so the corners
	   never cut in as it turns through 45 degrees. */
	.face {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 7px;
		background-color: var(--surface-sink);
		background-repeat: no-repeat;
		transition: transform 0.42s var(--ease-spring);
		will-change: transform;
	}

	.tile:hover:not(:disabled) {
		filter: brightness(1.09);
		z-index: 4;
	}

	.tile:active:not(:disabled) {
		transition-duration: 0.08s;
		filter: brightness(1.14);
	}

	/* A piece that is facing the wrong way asks to be turned. */
	.tile.askew {
		box-shadow:
			inset 0 0 0 2px hsl(var(--hue) 80% 66% / 0.55),
			0 6px 18px -8px rgba(0, 0, 0, 0.9);
	}

	.tile.turnable {
		cursor: pointer;
	}

	.turn-mark {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		font-size: clamp(1rem, 3.4vw, 1.8rem);
		/* Sits on the picture, which can be any colour, so it stays white with a
		   dark halo rather than taking a theme colour. */
		color: #ffffff;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.85), 0 0 2px rgba(0, 0, 0, 0.6);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.25s var(--ease-out), rotate 0.35s var(--ease-out);
		z-index: 2;
	}

	.tile.turnable:hover .turn-mark {
		opacity: 0.92;
		rotate: 90deg;
	}

	/* On touch there is no hover, so askew pieces advertise themselves. */
	@media (hover: none) {
		.tile.askew .turn-mark {
			opacity: 0.5;
		}
	}

	/* A tile that has found its own square glows faintly. */
	.tile.home {
		box-shadow:
			inset 0 0 0 2px hsl(var(--hue) 60% 58% / 0.65),
			0 0 16px -2px hsl(var(--hue) 65% 55% / 0.45);
	}

	/* Time does not touch these. Braid's green. */
	.tile.anchor {
		cursor: not-allowed;
		box-shadow:
			inset 0 0 0 2px var(--glow),
			0 0 26px -4px color-mix(in srgb, var(--glow) 70%, transparent);
		animation: breathe 3.4s ease-in-out infinite;
	}

	@keyframes breathe {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.12); }
	}

	.anchor-mark {
		position: absolute;
		inset: 0;
		border-radius: 7px;
		background: radial-gradient(
			circle at 50% 50%,
			color-mix(in srgb, var(--glow) 26%, transparent),
			transparent 62%
		);
		pointer-events: none;
	}

	.tile.hinted {
		animation: nudge 1.1s var(--ease-out) infinite;
		z-index: 5;
	}

	@keyframes nudge {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.35); }
	}

	.tile.refused {
		animation: refuse 0.4s var(--ease-out);
	}

	/* Shakes via `translate`, which composes with the inline `transform` that
	   holds the tile's grid position instead of fighting it. */
	@keyframes refuse {
		0%, 100% { translate: 0 0; }
		20% { translate: -5px 0; }
		45% { translate: 4px 0; }
		70% { translate: -2px 0; }
	}

	.tile.hidden .face {
		background: linear-gradient(
			145deg,
			hsl(var(--hue) 55% 90%),
			hsl(calc(var(--hue) + 30) 45% 80%)
		);
	}

	.numeral {
		font-size: clamp(0.9rem, 3vw, 1.5rem);
		color: hsl(var(--hue) 45% 38%);
		opacity: 0.75;
		font-variant-numeric: tabular-nums;
	}

	.unwind-veil {
		position: absolute;
		inset: 0;
		z-index: 5;
		border-radius: var(--radius-lg);
		pointer-events: none;
		/* Dark scanlines: on a light board, pale ones are invisible. */
		background: repeating-linear-gradient(
			0deg,
			rgba(70, 45, 120, 0.07) 0px,
			rgba(70, 45, 120, 0.07) 2px,
			transparent 2px,
			transparent 5px
		);
		animation: scan 0.5s linear infinite;
	}

	@keyframes scan {
		from { background-position-y: 0; }
		to { background-position-y: 5px; }
	}

	/* Reduced motion: keep the information, drop the movement. */
	.frame.still .tile,
	.frame.still .tile.anchor,
	.frame.still .tile.hinted,
	.frame.still .face {
		animation: none;
		transition-duration: 0.09s;
	}

	.frame.still.hiccup {
		animation: none;
	}
</style>
