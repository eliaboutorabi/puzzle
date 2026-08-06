<script lang="ts">
	import { base } from '$app/paths';
	import PicturePicker from '$lib/components/PicturePicker.svelte';
	import { DIFFICULTIES, LEVELS_PER_WORLD, WORLDS } from '$lib/game/worlds';
	import { resolveImage } from '$lib/images/resolve';
	import { progress } from '$lib/state/progress.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import * as sfx from '$lib/audio/sfx';

	let picking = $state(false);
	let preview = $state('');

	$effect(() => {
		const id = settings.imageId;
		resolveImage(id).then((url) => (preview = url));
	});
</script>

<svelte:head><title>Unwind — a slow sliding puzzle</title></svelte:head>

<div class="shell stack" style="gap: 2.2rem">
	<header class="hero">
		<p class="kicker">A sliding puzzle where nothing is ever lost</p>
		<h1>Unwind</h1>
		<p class="flavour">
			Hold to run time backward. Some things will not come back with it.
		</p>
	</header>

	<section class="setup">
		<div class="stack" style="gap: 0.7rem">
			<h2>How hard?</h2>
			<div class="row">
				{#each DIFFICULTIES as difficulty (difficulty.id)}
					<button
						class="chip"
						class:on={settings.difficulty === difficulty.id}
						onclick={() => {
							settings.setDifficulty(difficulty.id);
							sfx.playUi();
						}}
						aria-pressed={settings.difficulty === difficulty.id}
					>
						<strong>{difficulty.title}</strong>
						<span class="muted">{difficulty.note}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="stack" style="gap: 0.7rem">
			<h2>Which picture?</h2>
			<button class="picture" onclick={() => (picking = true)}>
				{#if preview}
					<img src={preview} alt="" />
				{/if}
				<span>Choose or upload…</span>
			</button>
		</div>
	</section>

	<section class="stack" style="gap: 1rem">
		<div class="row" style="justify-content: space-between">
			<h2>Worlds</h2>
			<a class="attic-link" href="{base}/attic">
				The attic · {progress.totalPieces}/{progress.totalLevels} pieces
			</a>
		</div>

		<div class="worlds">
			{#each WORLDS as world (world.id)}
				{@const open = progress.isWorldOpen(world.id)}
				{@const pieces = progress.piecesIn(world.id)}
				<article class="world" class:locked={!open} style="--hue: {world.hue}">
					<h3>{world.title}</h3>
					<p class="flavour">{open ? world.flavour : 'Not yet.'}</p>

					<div class="pips" aria-label="{pieces} of {LEVELS_PER_WORLD} solved">
						{#each Array.from({ length: LEVELS_PER_WORLD }) as _, level}
							<span class="pip" class:filled={progress.isSolved(world.id, level)}></span>
						{/each}
					</div>

					{#if open}
						<div class="row levels">
							{#each Array.from({ length: LEVELS_PER_WORLD }) as _, level}
								<a
									class="level"
									class:done={progress.isSolved(world.id, level)}
									href="{base}/play?world={world.id}&level={level}"
								>
									{level + 1}
								</a>
							{/each}
						</div>
					{:else}
						<p class="muted">Earn a piece in {WORLDS[WORLDS.findIndex((w) => w.id === world.id) - 1].title} first.</p>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<footer class="row" style="justify-content: space-between; padding-block: 1rem">
		<div class="row">
			<button class="ghost" onclick={() => settings.toggleMuted()}>
				{settings.muted ? 'Sound off' : 'Sound on'}
			</button>
			<button class="ghost" onclick={() => settings.toggleMusic()}>
				{settings.music ? 'Music on' : 'Music off'}
			</button>
			<button class="ghost" onclick={() => settings.toggleReducedMotion()}>
				{settings.reducedMotion ? 'Still' : 'Moving'}
			</button>
		</div>
		<p class="muted">Photos never leave your device.</p>
	</footer>
</div>

{#if picking}
	<PicturePicker onclose={() => (picking = false)} />
{/if}

<style>
	.hero {
		padding-block: clamp(1.5rem, 8vh, 4rem) 0.5rem;
		text-align: center;
	}

	.kicker {
		text-transform: lowercase;
		letter-spacing: 0.14em;
		font-size: 0.82rem;
		opacity: 0.6;
	}

	h1 {
		background: linear-gradient(hsl(42 90% 84%), hsl(28 70% 58%));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-block: 0.2em 0.15em;
		filter: drop-shadow(0 8px 30px hsl(34 80% 50% / 0.35));
	}

	.setup {
		display: grid;
		gap: 1.6rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 760px) {
		.setup {
			grid-template-columns: 1.4fr 1fr;
			align-items: start;
		}
	}

	h2 {
		font-size: 1.05rem;
		text-transform: lowercase;
		letter-spacing: 0.1em;
		opacity: 0.62;
		font-weight: 400;
	}

	.chip {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		text-align: left;
	}

	.chip.on {
		border-color: var(--warm-200);
		background: linear-gradient(hsl(34 40% 32%), hsl(30 38% 22%));
		box-shadow: 0 0 30px -8px hsl(34 80% 60% / 0.55);
	}

	.picture {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		width: 100%;
		text-align: left;
		padding: 0.6rem;
	}

	.picture img {
		width: 66px;
		height: 66px;
		object-fit: cover;
		border-radius: 10px;
		flex: none;
	}

	.attic-link {
		text-decoration: none;
		border-bottom: 1px solid currentColor;
		padding-bottom: 2px;
		font-size: 0.92rem;
	}

	.worlds {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.world {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1.2rem;
		border-radius: var(--radius-lg);
		border: 1px solid hsl(var(--hue) 40% 60% / 0.24);
		background:
			radial-gradient(120% 90% at 50% 0%, hsl(var(--hue) 40% 30% / 0.6), transparent 70%),
			linear-gradient(hsl(var(--hue) 14% 17%), hsl(var(--hue) 12% 11%));
		box-shadow: var(--shadow-soft);
		transition: transform 0.35s var(--ease-spring), box-shadow 0.35s var(--ease-out);
	}

	.world:hover:not(.locked) {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lift);
	}

	.world.locked {
		opacity: 0.5;
		filter: saturate(0.35);
	}

	h3 {
		font-size: 1.4rem;
	}

	.pips {
		display: flex;
		gap: 6px;
	}

	.pip {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: hsl(var(--hue) 20% 40%);
		transition: background 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
	}

	.pip.filled {
		background: hsl(var(--hue) 80% 68%);
		box-shadow: 0 0 12px hsl(var(--hue) 80% 60% / 0.9);
	}

	.levels {
		margin-top: auto;
		padding-top: 0.4rem;
	}

	.level {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		text-decoration: none;
		border: 1px solid hsl(var(--hue) 40% 60% / 0.3);
		background: hsl(var(--hue) 20% 24% / 0.7);
		color: var(--ink);
		transition: transform 0.24s var(--ease-spring), background 0.24s var(--ease-out);
	}

	.level:hover {
		transform: translateY(-3px) scale(1.05);
		background: hsl(var(--hue) 40% 34%);
	}

	.level.done {
		background: linear-gradient(hsl(var(--hue) 60% 52%), hsl(var(--hue) 55% 38%));
		color: #2a1c14;
		font-weight: 700;
	}
</style>
