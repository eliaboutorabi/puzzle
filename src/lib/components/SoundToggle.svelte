<script lang="ts">
	import * as sfx from '$lib/audio/sfx';
	import { settings } from '$lib/state/settings.svelte';

	/**
	 * Lives in the corner of every screen. Two separate controls on purpose:
	 * plenty of people want the effects but not the music, and being forced to
	 * choose all-or-nothing is what makes someone mute a game permanently.
	 */
	function toggleAll() {
		settings.toggleMuted();
		if (!settings.muted) sfx.playUi();
	}

	function toggleMusic() {
		settings.toggleMusic();
		sfx.playUi();
	}
</script>

<div class="corner">
	<button
		class="icon"
		class:off={settings.muted}
		onclick={toggleAll}
		aria-pressed={settings.muted}
		title={settings.muted ? 'Turn sound on' : 'Turn all sound off'}
		aria-label={settings.muted ? 'Turn sound on' : 'Turn all sound off'}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
			{#if settings.muted}
				<path class="stroke" d="M16 9.5l5 5M21 9.5l-5 5" />
			{:else}
				<path class="stroke" d="M15.6 8.8a4.5 4.5 0 0 1 0 6.4M18.3 6.4a8 8 0 0 1 0 11.2" />
			{/if}
		</svg>
	</button>

	<button
		class="icon"
		class:off={!settings.music || settings.muted}
		onclick={toggleMusic}
		disabled={settings.muted}
		aria-pressed={!settings.music}
		title={settings.music ? 'Turn the music off' : 'Turn the music on'}
		aria-label={settings.music ? 'Turn the music off' : 'Turn the music on'}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path class="stroke" d="M9 17.5V5.5l10-2v12" />
			<circle cx="6.5" cy="17.5" r="2.6" />
			<circle cx="16.5" cy="15.5" r="2.6" />
			{#if !settings.music}
				<path class="stroke slash" d="M3.5 20.5L20.5 3.5" />
			{/if}
		</svg>
	</button>
</div>

<style>
	.corner {
		position: fixed;
		z-index: 50;
		right: max(0.9rem, env(safe-area-inset-right));
		bottom: max(0.9rem, env(safe-area-inset-bottom));
		display: flex;
		gap: 0.35rem;
		padding: 0.3rem;
		border-radius: 999px;
		background: hsl(var(--hue) 16% 12% / 0.72);
		border: 1px solid hsl(var(--hue) 40% 60% / 0.22);
		backdrop-filter: blur(10px);
		box-shadow: var(--shadow-soft);
	}

	.icon {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		padding: 0;
		border-radius: 50%;
		border: none;
		background: none;
		box-shadow: none;
		color: var(--warm-100);
		opacity: 0.9;
	}

	.icon:hover:not(:disabled) {
		transform: none;
		background: hsl(var(--hue) 30% 30% / 0.6);
		box-shadow: none;
	}

	.icon:active:not(:disabled) {
		transform: scale(0.92);
	}

	/* Off reads as dimmed and struck through, not merely as a different icon. */
	.icon.off {
		opacity: 0.42;
		color: var(--ink);
	}

	svg {
		width: 21px;
		height: 21px;
		fill: currentColor;
		overflow: visible;
	}

	.stroke {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.9;
		stroke-linecap: round;
	}

	.slash {
		stroke-width: 2.1;
	}

	@media (max-width: 520px) {
		.icon {
			width: 36px;
			height: 36px;
		}
	}
</style>
