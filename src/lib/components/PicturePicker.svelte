<script lang="ts">
	import * as sfx from '$lib/audio/sfx';
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
		if (settings.imageId === choice.id) settings.setImage('long-afternoon');
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
			<h2>The picture</h2>
			<p class="muted">Your photos stay on this device. Nothing is uploaded anywhere.</p>
		</div>
		<button class="ghost" onclick={onclose}>Close</button>
	</header>

	<div class="row">
		<button class="primary" onclick={() => input?.click()} disabled={busy}>
			{busy ? 'Painting it…' : 'Use one of your photos'}
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

	<div class="grid">
		{#each choices as choice (choice.id)}
			<div class="cell">
				<button
					class="pick"
					class:chosen={settings.imageId === choice.id}
					onclick={() => choose(choice)}
					aria-label="Use {choice.title}"
					aria-pressed={settings.imageId === choice.id}
				>
					<img src={choice.url} alt="" loading="lazy" />
					<span class="label">{choice.title}</span>
				</button>
				{#if choice.own}
					<button class="remove" onclick={() => remove(choice)} aria-label="Remove {choice.title}">
						×
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
		background: rgba(12, 8, 10, 0.72);
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
		background: linear-gradient(hsl(var(--hue) 16% 17%), hsl(var(--hue) 14% 11%));
		border-top: 1px solid hsl(var(--hue) 40% 60% / 0.3);
		box-shadow: 0 -30px 70px -20px rgba(0, 0, 0, 0.9);
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
		background: hsl(var(--hue) 14% 22% / 0.6);
	}

	.pick img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 9px;
		display: block;
	}

	.pick.chosen {
		border-color: var(--warm-200);
		box-shadow:
			0 0 0 2px var(--warm-200),
			0 0 30px -6px hsl(var(--hue) 80% 60% / 0.6);
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
		padding: 0;
		line-height: 1;
		font-size: 1.1rem;
		border-radius: 50%;
		background: var(--dusk-200);
	}

	.error {
		color: #f0a58f;
		font-size: 0.9rem;
	}
</style>
