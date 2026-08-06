<script lang="ts">
	import { base } from '$app/paths';
	import * as sfx from '$lib/audio/sfx';
	import { LEVELS_PER_WORLD, WORLDS, levelOrdinal } from '$lib/game/worlds';
	import { pickForOrdinal, pool, resolveImage } from '$lib/images/resolve';
	import { progress } from '$lib/state/progress.svelte';
	import { settings } from '$lib/state/settings.svelte';

	/**
	 * Braid's collectibles are jigsaw pieces you assemble on easels in an attic,
	 * which is the whole reason this screen exists. Each world's painting arrives
	 * one band at a time as its levels fall.
	 */
	let urls = $state<Record<string, string>>({});

	// An easel shows whatever was hung on it, and otherwise the same picture as
	// that world's first puzzle — so the attic matches what you actually played.
	$effect(() => {
		const vary = settings.varyPictures;
		const pinned = settings.imageId;

		pool().then(async (ids) => {
			const resolved = await Promise.all(
				WORLDS.map(async (world) => {
					const hung = progress.easelFor(world.id);
					const id =
						hung ?? (vary ? pickForOrdinal(ids, levelOrdinal(world.id, 0)) : pinned);
					return [world.id, await resolveImage(id)] as const;
				})
			);
			urls = Object.fromEntries(resolved);
		});
	});

	const complete = $derived(progress.totalPieces === progress.totalLevels);

	function hangCurrent(worldId: (typeof WORLDS)[number]['id']) {
		progress.setEasel(worldId, settings.imageId);
		sfx.playPiece();
	}
</script>

<svelte:head><title>The attic — Unwind</title></svelte:head>

<div class="shell stack" style="gap: 1.8rem">
	<header class="row" style="justify-content: space-between">
		<a class="back" href="{base}/">← Worlds</a>
		<p class="muted tabular">{progress.totalPieces} of {progress.totalLevels} pieces</p>
	</header>

	<div class="intro">
		<h1>The attic</h1>
		<p class="flavour">
			{complete
				? 'Every piece is where it belongs. The light comes in sideways now.'
				: 'Pieces arrive as levels fall. The rest is still waiting.'}
		</p>
	</div>

	<div class="easels" class:complete>
		{#each WORLDS as world (world.id)}
			{@const pieces = progress.piecesIn(world.id)}
			<article class="easel" style="--hue: {world.hue}">
				<div class="canvas">
					{#each Array.from({ length: LEVELS_PER_WORLD }) as _, band}
						<div
							class="band"
							class:earned={band < pieces}
							style="
								background-image: url({urls[world.id] ?? ''});
								background-position: 50% {(band / (LEVELS_PER_WORLD - 1)) * 100}%;
								--delay: {band * 140}ms;
							"
						>
							{#if band >= pieces}
								<span class="waiting" aria-hidden="true"></span>
							{/if}
						</div>
					{/each}
				</div>

				<div class="caption">
					<strong>{world.title}</strong>
					<span class="muted">{pieces}/{LEVELS_PER_WORLD}</span>
				</div>

				<button class="ghost small" onclick={() => hangCurrent(world.id)}>
					Hang my picture here
				</button>
			</article>
		{/each}
	</div>

	<footer class="stack" style="gap: 0.6rem; padding-block: 1.5rem">
		<p class="muted">
			Each easel shows that world's own picture, unless you hang a different one.
		</p>
		<div class="row">
			<button
				class="ghost"
				onclick={() => {
					if (confirm('Forget every solved level and start the attic empty?')) progress.reset();
				}}
			>
				Empty the attic
			</button>
		</div>
	</footer>
</div>

<style>
	.back {
		text-decoration: none;
		opacity: 0.8;
	}

	.intro {
		text-align: center;
	}

	.intro h1 {
		font-size: clamp(2rem, 6vw, 3.2rem);
	}

	.easels {
		display: grid;
		gap: clamp(1.2rem, 4vw, 2rem);
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	}

	.easel {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		align-items: stretch;
	}

	/* A painted frame with a warm rim of light coming off the wall behind it. */
	.canvas {
		display: grid;
		grid-template-rows: repeat(3, 1fr);
		aspect-ratio: 1;
		padding: 10px;
		gap: 3px;
		border-radius: 10px;
		background: linear-gradient(hsl(32 26% 26%), hsl(28 24% 15%));
		border: 1px solid hsl(var(--hue) 40% 60% / 0.28);
		box-shadow:
			var(--shadow-lift),
			0 0 46px -14px hsl(var(--hue) 80% 55% / 0.5);
	}

	.band {
		/* Three bands stacked make one picture, so the image spans 300% of a band. */
		background-size: 100% 300%;
		border-radius: 3px;
		opacity: 0;
		filter: grayscale(1) brightness(0.35);
		transform: translateY(10px);
		transition:
			opacity 0.8s var(--ease-out) var(--delay),
			filter 1s var(--ease-out) var(--delay),
			transform 0.8s var(--ease-spring) var(--delay);
		position: relative;
		overflow: hidden;
	}

	.band.earned {
		opacity: 1;
		filter: none;
		transform: translateY(0);
	}

	/* Empty bands are not blank: they hold a faint suggestion of what's missing. */
	.waiting {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(
				-45deg,
				hsl(var(--hue) 20% 30% / 0.5) 0 8px,
				hsl(var(--hue) 16% 22% / 0.5) 8px 16px
			);
	}

	.band:not(.earned) {
		opacity: 1;
		background-image: none !important;
		filter: none;
		transform: none;
	}

	.caption {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.small {
		font-size: 0.85rem;
		padding: 0.45em 0.9em;
	}

	/* When the last piece lands, the whole room warms up. */
	.easels.complete .canvas {
		animation: glow 5s ease-in-out infinite alternate;
	}

	@keyframes glow {
		from { box-shadow: var(--shadow-lift), 0 0 46px -14px hsl(var(--hue) 80% 55% / 0.5); }
		to { box-shadow: var(--shadow-lift), 0 0 80px -10px hsl(var(--hue) 90% 62% / 0.85); }
	}
</style>
