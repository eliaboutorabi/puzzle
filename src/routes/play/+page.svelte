<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import * as sfx from '$lib/audio/sfx';
	import Board from '$lib/components/Board.svelte';
	import { icons } from '$lib/icons';
	import { formatTime, Session } from '$lib/game/session.svelte';
	import { LEVELS_PER_WORLD, difficultyById, levelOrdinal, worldById } from '$lib/game/worlds';
	import { imageForOrdinal, randomGalleryId, resolveImage } from '$lib/images/resolve';
	import { progress } from '$lib/state/progress.svelte';
	import { settings } from '$lib/state/settings.svelte';

	const world = $derived(worldById(page.url.searchParams.get('world') ?? 'beginnings'));
	const level = $derived(Number(page.url.searchParams.get('level') ?? 0) || 0);
	const difficulty = $derived(difficultyById(settings.difficulty));

	let session = $state<Session | null>(null);
	let imageUrl = $state('');
	let recorded = $state(false);
	let holding = $state(false);
	/** Held back after a solve so the finished picture gets a moment to itself. */
	let showDone = $state(false);

	/**
	 * Rebuild whenever the level or difficulty changes. The seed is derived from
	 * those same inputs, so a given level is always the same puzzle — which is
	 * what makes a best-move record mean anything.
	 */
	$effect(() => {
		const currentWorld = world;
		const currentLevel = level;
		const currentDifficulty = difficulty;

		// No read of `session` here: writing state an effect also reads would loop.
		const seed = hash(`${currentWorld.id}:${currentLevel}:${currentDifficulty.id}`);
		const scaled = {
			...currentDifficulty,
			steps: Math.round(currentDifficulty.steps * (1 + currentLevel * 0.4))
		};
		const next = new Session(currentWorld, scaled, seed);
		session = next;
		recorded = false;
		showDone = false;

		return () => next.destroy();
	});

	/**
	 * Each puzzle gets its own picture, walked from the pool by the level's
	 * ordinal — unless the player has pinned one. Mystery worlds ignore both and
	 * pull something unseen, since the whole point is not knowing.
	 */
	$effect(() => {
		if (world.mystery) {
			resolveImage(randomGalleryId(settings.imageId)).then((url) => (imageUrl = url));
		} else if (settings.varyPictures) {
			imageForOrdinal(levelOrdinal(world.id, level)).then((url) => (imageUrl = url));
		} else {
			resolveImage(settings.imageId).then((url) => (imageUrl = url));
		}
	});

	$effect(() => {
		if (session?.phase === 'solved' && !recorded) {
			recorded = true;
			const beat = progress.complete(world.id, level, session.moves, session.elapsed);
			session.isRecord = beat;
			setTimeout(() => sfx.playPiece(), 900);
			setTimeout(() => (showDone = true), 1500);
		}
	});

	const best = $derived(progress.recordFor(world.id, level));
	const nextLevel = $derived(level + 1 < LEVELS_PER_WORLD ? level + 1 : null);

	function hash(input: string): number {
		let value = 2166136261;
		for (let i = 0; i < input.length; i++) {
			value ^= input.charCodeAt(i);
			value = Math.imul(value, 16777619);
		}
		return value >>> 0;
	}

	/** Arrow keys move the tile on that side of the empty square into it. */
	function nudge(direction: 'up' | 'down' | 'left' | 'right') {
		if (!session) return;
		const { size } = session.board;
		const empty = session.emptyIndex;
		// Turn-only boards have no gap to move things into.
		if (empty < 0) return;
		const row = Math.floor(empty / size);
		const col = empty % size;

		const target =
			direction === 'up' && row < size - 1
				? empty + size
				: direction === 'down' && row > 0
					? empty - size
					: direction === 'left' && col < size - 1
						? empty + 1
						: direction === 'right' && col > 0
							? empty - 1
							: null;

		if (target !== null) session.select(target);
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!session) return;
		const key = event.key.toLowerCase();

		if ((key === 'r' || key === ' ') && !event.repeat) {
			event.preventDefault();
			holding = true;
			session.startRewind();
			return;
		}

		const directions: Record<string, 'up' | 'down' | 'left' | 'right'> = {
			arrowup: 'up',
			arrowdown: 'down',
			arrowleft: 'left',
			arrowright: 'right',
			w: 'up',
			s: 'down',
			a: 'left',
			d: 'right'
		};

		if (directions[key]) {
			event.preventDefault();
			nudge(directions[key]);
		} else if (key === 'h') {
			session.useHint();
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		const key = event.key.toLowerCase();
		if (key === 'r' || key === ' ') {
			holding = false;
			session?.stopRewind();
		}
	}

	function startHold() {
		holding = true;
		session?.startRewind();
	}

	function endHold() {
		if (!holding) return;
		holding = false;
		session?.stopRewind();
	}

	function restart() {
		if (!session) return;
		const seed = hash(`${world.id}:${level}:${difficulty.id}`);
		session.destroy();
		const scaled = { ...difficulty, steps: Math.round(difficulty.steps * (1 + level * 0.4)) };
		session = new Session(world, scaled, seed);
		recorded = false;
		sfx.playUi();
	}
</script>

<svelte:head><title>{world.title} · {level + 1} — Unwind</title></svelte:head>
<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={endHold} />

<div class="shell play" style="--hue: {world.hue}">
	<header class="bar">
		<a class="back with-icon" href="{base}/">
			<HugeiconsIcon icon={icons.back} size={17} strokeWidth={1.8} color="currentColor" />
			Worlds
		</a>
		<div class="title">
			<h1>{world.title}</h1>
			<p class="flavour">{world.flavour}</p>
		</div>
		<div class="counts tabular">
			<span><strong>{session?.moves ?? 0}</strong> moves</span>
			<span><strong>{formatTime(session?.elapsed ?? 0)}</strong></span>
		</div>
	</header>

	{#if session}
		<div class="stage">
			<Board {session} {imageUrl} />

			<!-- A quiet gauge of how much of the picture has found its way home. -->
			<div class="warmth" style="--fill: {session.progress}">
				<span></span>
			</div>
		</div>

		<div class="controls row">
			<button
				class="rewind"
				class:active={session.rewinding}
				onpointerdown={startHold}
				onpointerup={endHold}
				onpointerleave={endHold}
				oncontextmenu={(event) => event.preventDefault()}
				disabled={!session.canRewind}
			>
				<HugeiconsIcon icon={icons.unwind} size={19} strokeWidth={1.9} color="currentColor" />
				Hold to unwind
			</button>

			<button
				class="ghost with-icon"
				onclick={() => session?.useHint()}
				disabled={session.hintsLeft === 0 || session.phase === 'solved'}
			>
				<HugeiconsIcon icon={icons.hint} size={18} strokeWidth={1.8} color="currentColor" />
				Hint {session.hintsLeft < 0 ? '' : `(${session.hintsLeft})`}
			</button>

			<button class="ghost with-icon" onclick={restart}>
				<HugeiconsIcon icon={icons.restart} size={17} strokeWidth={1.8} color="currentColor" />
				Start over
			</button>

			<span class="muted keys">
				{#if world.mode === 'turn'}
					click a piece to turn it
				{:else}
					arrows to slide · click a crooked piece to turn it
				{/if}
				· hold <kbd>R</kbd> to unwind · <kbd>H</kbd> for a hint
			</span>
		</div>

		{#if showDone}
			<div class="done" role="status">
				<div class="card">
					<p class="kicker">a piece is yours</p>
					<h2>{session.isRecord ? 'Your best yet.' : 'Finished.'}</h2>
					<p class="tabular">
						{session.moves} moves · {formatTime(session.elapsed)}
						{#if best && !session.isRecord}
							<span class="muted">· best {best.moves}</span>
						{/if}
					</p>
					<div class="row" style="justify-content: center; margin-top: 0.9rem">
						{#if nextLevel !== null}
							<a class="cta with-icon" href="{base}/play?world={world.id}&level={nextLevel}">
								Next
								<HugeiconsIcon icon={icons.next} size={18} strokeWidth={1.9} color="currentColor" />
							</a>
						{/if}
						<a class="cta ghost-link with-icon" href="{base}/attic">
							<HugeiconsIcon icon={icons.attic} size={17} strokeWidth={1.8} color="currentColor" />
							The attic
						</a>
						<button class="ghost with-icon" onclick={restart}>
							<HugeiconsIcon icon={icons.restart} size={17} strokeWidth={1.8} color="currentColor" />
							Again
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<div class="difficulty-note muted">
		Playing on <strong>{difficulty.title}</strong> — change it on the worlds screen.
	</div>
</div>

<style>
	.play {
		display: flex;
		flex-direction: column;
		gap: clamp(0.6rem, 2vh, 1.1rem);
		min-height: 100dvh;
		padding-block: clamp(0.8rem, 2vh, 1.6rem);
	}

	.bar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1rem;
	}

	.back {
		text-decoration: none;
		opacity: 0.8;
		font-size: 0.95rem;
	}

	.title {
		text-align: center;
	}

	.title h1 {
		font-size: clamp(1.3rem, 4vw, 2rem);
	}

	.title .flavour {
		font-size: 0.9rem;
	}

	.counts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.9rem;
		opacity: 0.85;
		line-height: 1.3;
	}

	.stage {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		align-items: center;
	}

	.warmth {
		width: min(58vh, 92vw, 560px);
		height: 4px;
		border-radius: 999px;
		background: hsl(var(--hue) 20% 30% / 0.6);
		overflow: hidden;
	}

	.warmth span {
		display: block;
		height: 100%;
		width: calc(var(--fill) * 100%);
		background: linear-gradient(90deg, hsl(var(--hue) 70% 50%), hsl(var(--hue) 90% 72%));
		box-shadow: 0 0 14px hsl(var(--hue) 90% 60% / 0.8);
		transition: width 0.5s var(--ease-out);
	}

	.controls {
		justify-content: center;
		padding-bottom: 1.4rem;
	}

	.rewind {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		touch-action: none;
		user-select: none;
	}

	.rewind.active {
		background: linear-gradient(hsl(210 40% 44%), hsl(214 44% 30%));
		border-color: hsl(206 70% 74% / 0.7);
		box-shadow: 0 0 34px -6px hsl(208 80% 60% / 0.8);
	}

	/* The rewind glyph runs backward while time does. */
	.rewind.active :global(svg) {
		animation: unwinding 0.7s linear infinite;
	}

	@keyframes unwinding {
		from { translate: 2px 0; }
		to { translate: -2px 0; }
	}

	kbd {
		font-family: inherit;
		border: 1px solid currentColor;
		border-radius: 5px;
		padding: 0 5px;
		font-size: 0.8em;
		opacity: 0.9;
	}

	.keys {
		font-size: 0.85rem;
	}

	@media (max-width: 700px) {
		.keys {
			display: none;
		}
	}

	/* Sits low and stays mostly out of the way: the picture you just finished is
	   the reward, so it must not be buried behind the congratulations. */
	.done {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: end center;
		padding-bottom: clamp(1rem, 5vh, 3rem);
		pointer-events: none;
		background: linear-gradient(transparent 35%, rgba(12, 8, 10, 0.82) 88%);
		animation: settle 0.9s var(--ease-out);
	}

	.done .card {
		pointer-events: auto;
	}

	@keyframes settle {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.card {
		text-align: center;
		padding: clamp(1.6rem, 5vw, 2.6rem);
		border-radius: var(--radius-lg);
		border: 1px solid hsl(var(--hue) 50% 66% / 0.35);
		background: linear-gradient(hsl(var(--hue) 18% 18%), hsl(var(--hue) 16% 12%));
		box-shadow: var(--shadow-lift);
		animation: lift 0.7s var(--ease-spring);
	}

	@keyframes lift {
		from { transform: translateY(18px) scale(0.96); opacity: 0; }
		to { transform: translateY(0) scale(1); opacity: 1; }
	}

	.kicker {
		text-transform: lowercase;
		letter-spacing: 0.16em;
		font-size: 0.78rem;
		opacity: 0.6;
	}

	.card h2 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin-block: 0.2em 0.3em;
	}

	.cta {
		display: inline-block;
		text-decoration: none;
		padding: 0.65em 1.4em;
		border-radius: var(--radius);
		font-weight: 700;
		color: #2a1c14;
		background: linear-gradient(hsl(var(--hue) 62% 60%), hsl(var(--hue) 55% 46%));
		box-shadow: var(--shadow-soft);
		transition: transform 0.24s var(--ease-spring);
	}

	.cta:hover {
		transform: translateY(-2px);
	}

	.cta.ghost-link {
		background: hsl(var(--hue) 20% 28% / 0.7);
		color: var(--ink);
		font-weight: 400;
	}

	.difficulty-note {
		text-align: center;
		font-size: 0.85rem;
		padding-bottom: 1rem;
	}
</style>
