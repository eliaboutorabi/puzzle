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
			{@const isHome = entry.tile === entry.position}
			{@const isAnchor = session.board.anchors.has(entry.tile)}
			<button
				class="tile"
				class:home={isHome}
				class:anchor={isAnchor}
				class:hinted={session.hintAt === entry.position}
				class:refused={session.refusedAt === entry.position}
				class:hidden
				style="
					transform: {place(entry.position)};
					background-image: {hidden ? 'none' : `url(${imageUrl})`};
					background-size: {size * 100}% {size * 100}%;
					background-position: {offset(entry.tile)};
					--delay: {(entry.tile % 7) * 40}ms;
				"
				onclick={() => session.select(entry.position)}
				disabled={session.phase === 'solved'}
				aria-label={isAnchor
					? `Tile ${entry.tile + 1}, held still by time`
					: `Tile ${entry.tile + 1}${isHome ? ', home' : ''}`}
			>
				{#if hidden}
					<span class="numeral">{entry.tile + 1}</span>
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
		background:
			linear-gradient(hsl(var(--hue) 18% 22% / 0.9), hsl(var(--hue) 16% 13% / 0.95));
		box-shadow:
			var(--shadow-lift),
			inset 0 1px 0 hsl(var(--hue) 40% 70% / 0.16);
		border: 1px solid hsl(var(--hue) 30% 60% / 0.22);
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
		background-color: var(--dusk-300);
		background-repeat: no-repeat;
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.4),
			0 6px 14px -8px rgba(0, 0, 0, 0.9);
		/* The two properties that make this feel alive. */
		transition:
			transform 0.26s var(--ease-spring),
			box-shadow 0.35s var(--ease-out),
			filter 0.35s var(--ease-out);
		will-change: transform;
		outline-offset: -3px;
	}

	.tile:hover:not(:disabled) {
		filter: brightness(1.09);
		z-index: 4;
	}

	.tile:active:not(:disabled) {
		transition-duration: 0.08s;
		filter: brightness(1.14);
	}

	/* A tile that has found its own square glows faintly warm. */
	.tile.home {
		box-shadow:
			inset 0 0 0 1px hsl(var(--hue) 70% 70% / 0.5),
			0 0 18px -2px hsl(var(--hue) 80% 60% / 0.32);
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

	.tile.hidden {
		background: linear-gradient(
			145deg,
			hsl(var(--hue) 26% 30%),
			hsl(calc(var(--hue) + 30) 22% 18%)
		);
		display: grid;
		place-items: center;
	}

	.numeral {
		font-size: clamp(0.9rem, 3vw, 1.5rem);
		opacity: 0.4;
		font-variant-numeric: tabular-nums;
	}

	.unwind-veil {
		position: absolute;
		inset: 0;
		z-index: 5;
		border-radius: var(--radius-lg);
		pointer-events: none;
		background: repeating-linear-gradient(
			0deg,
			rgba(190, 220, 255, 0.05) 0px,
			rgba(190, 220, 255, 0.05) 2px,
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
	.frame.still .tile.hinted {
		animation: none;
		transition-duration: 0.09s;
	}

	.frame.still.hiccup {
		animation: none;
	}
</style>
