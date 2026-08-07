<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import * as sfx from '$lib/audio/sfx';
	import { icons } from '$lib/icons';
	import { PhotoError, preparePhoto } from '$lib/images/process';
	import { allChoices, forget, type Choice } from '$lib/images/resolve';
	import { deletePhoto, savePhoto } from '$lib/images/store';
	import { settings } from '$lib/state/settings.svelte';

	let { onclose }: { onclose: () => void } = $props();

	let choices = $state<Choice[]>([]);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let input = $state<HTMLInputElement | null>(null);

	$effect(() => {
		void refresh();
	});

	async function refresh() {
		choices = await allChoices();
	}

	async function upload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		busy = true;
		error = null;
		try {
			const dataUrl = await preparePhoto(file);
			const photo = await savePhoto(file.name.replace(/\.[^.]+$/, '') || 'Untitled', dataUrl);
			await refresh();
			settings.setImage(photo.id);
			sfx.playPiece();
		} catch (cause) {
			error = cause instanceof PhotoError ? cause.message : 'That image could not be read.';
		} finally {
			busy = false;
			if (input) input.value = '';
		}
	}

	async function remove(choice: Choice) {
		await deletePhoto(choice.id);
		forget(choice.id);
		// Deleting the pinned photo leaves nothing pinned, so fall back to variety
		// rather than silently pinning some painting the player never chose.
		if (settings.imageId === choice.id) settings.varyEveryPuzzle();
		await refresh();
	}

	function choose(choice: Choice) {
		settings.setImage(choice.id);
		sfx.playUi();
	}
</script>

<div
	class="scrim"
	role="button"
	tabindex="-1"
	onclick={onclose}
	onkeydown={(event) => event.key === 'Escape' && onclose()}
></div>

<div class="sheet" role="dialog" aria-modal="true" aria-label="Choose a picture">
	<header class="row" style="justify-content: space-between">
		<div>
			<h2>The pictures</h2>
			<p class="muted">Your photos stay on this device. Nothing is uploaded anywhere.</p>
		</div>
		<button class="ghost with-icon" onclick={onclose}>
			<HugeiconsIcon icon={icons.close} size={17} strokeWidth={1.8} color="currentColor" />
			Close
		</button>
	</header>

	<div class="row">
		<button class="primary with-icon" onclick={() => input?.click()} disabled={busy}>
			<HugeiconsIcon icon={icons.addPhoto} size={18} strokeWidth={1.8} color="currentColor" />
			{busy ? 'Painting it…' : 'Add one of your photos'}
		</button>
		<input
			bind:this={input}
			type="file"
			accept="image/*"
			hidden
			onchange={upload}
		/>
		{#if error}<span class="error">{error}</span>{/if}
	</div>

	<!-- Choosing a picture pins it everywhere, so there has to be a way back. -->
	<button
		class="mode"
		class:on={settings.varyPictures}
		onclick={() => {
			settings.varyEveryPuzzle();
			sfx.playUi();
		}}
		aria-pressed={settings.varyPictures}
	>
		<span class="mode-head">
			<HugeiconsIcon
				icon={settings.varyPictures ? icons.vary : icons.hang}
				size={19}
				strokeWidth={1.8}
				color="currentColor"
			/>
			<strong>A different picture for every puzzle</strong>
		</span>
		<span class="muted">
			{settings.varyPictures
				? 'On — each puzzle draws its own, your photos first.'
				: 'Off — every puzzle uses the one picture you picked below.'}
		</span>
	</button>

	<div class="grid">
		{#each choices as choice (choice.id)}
			<div class="cell">
				<button
					class="pick"
					class:chosen={!settings.varyPictures && settings.imageId === choice.id}
					onclick={() => choose(choice)}
					aria-label="Use {choice.title} for every puzzle"
					aria-pressed={!settings.varyPictures && settings.imageId === choice.id}
				>
					<img src={choice.url} alt="" loading="lazy" />
					<span class="label">{choice.title}</span>
				</button>
				{#if choice.own}
					<button class="remove" onclick={() => remove(choice)} aria-label="Remove {choice.title}">
						<HugeiconsIcon icon={icons.remove} size={15} strokeWidth={1.9} color="currentColor" />
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(60, 40, 100, 0.28);
		backdrop-filter: blur(6px);
		border: none;
		animation: fade 0.3s var(--ease-out);
	}

	@keyframes fade {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.sheet {
		position: fixed;
		z-index: 41;
		inset: auto 0 0 0;
		max-height: 86vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: clamp(1.1rem, 4vw, 2rem);
		padding-bottom: max(2rem, env(safe-area-inset-bottom));
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		background: linear-gradient(#ffffff, var(--lilac-100));
		border-top: 1px solid var(--edge);
		box-shadow: 0 -24px 60px -24px rgba(88, 58, 148, 0.5);
		animation: rise 0.42s var(--ease-out);
	}

	@keyframes rise {
		from { transform: translateY(14%); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.9rem;
	}

	.cell {
		position: relative;
	}

	.pick {
		width: 100%;
		padding: 6px;
		display: block;
		border-radius: var(--radius);
		background: rgba(255, 255, 255, 0.9);
	}

	.pick img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 9px;
		display: block;
	}

	.pick.chosen {
		border-color: var(--accent);
		box-shadow:
			0 0 0 2px var(--accent),
			0 6px 22px -8px hsl(var(--hue) 60% 55% / 0.55);
	}

	.label {
		display: block;
		margin-top: 0.45rem;
		font-size: 0.85rem;
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.remove {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		padding: 0;
		border-radius: 50%;
		background: #ffffff;
		color: var(--ink);
	}

	.remove:hover {
		color: #b3261e;
	}

	.mode-head {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.error {
		color: #b3261e;
		font-size: 0.9rem;
	}

	.mode {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		text-align: left;
		width: 100%;
	}

	.mode.on {
		border-color: var(--edge-strong);
		background: linear-gradient(#ffffff, var(--accent-wash));
		box-shadow: 0 6px 20px -8px hsl(var(--hue) 60% 55% / 0.45);
	}
</style>
