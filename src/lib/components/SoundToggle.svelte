<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import * as sfx from '$lib/audio/sfx';
	import { icons } from '$lib/icons';
	import { settings } from '$lib/state/settings.svelte';

	/**
	 * One control, in the corner of every screen. It silences everything —
	 * music and effects together — because a single button that only half
	 * worked would be worse than either of the two it replaced.
	 */
	function toggleSound() {
		settings.toggleMuted();
		if (!settings.muted) sfx.playUi();
	}
</script>

<div class="corner">
	<button
		class="icon"
		class:off={settings.muted}
		onclick={toggleSound}
		aria-pressed={settings.muted}
		title={settings.muted ? 'Turn sound on' : 'Turn sound off'}
		aria-label={settings.muted ? 'Turn sound on' : 'Turn sound off'}
	>
		<!-- The set has no struck-through music note, so the strike is drawn here
		     rather than settling for a merely dimmed icon. -->
		<span class="glyph" class:struck={settings.muted}>
			<HugeiconsIcon icon={icons.music} size={21} strokeWidth={1.8} color="currentColor" />
		</span>
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

	/* Off reads as dimmed, not merely as a different icon. */
	.icon.off {
		opacity: 0.42;
		color: var(--ink);
	}

	.glyph {
		position: relative;
		display: grid;
		place-items: center;
	}

	.glyph.struck::after {
		content: '';
		position: absolute;
		left: -2px;
		right: -2px;
		top: 50%;
		height: 1.8px;
		border-radius: 2px;
		background: currentColor;
		rotate: -45deg;
	}

	@media (max-width: 520px) {
		.icon {
			width: 36px;
			height: 36px;
		}
	}
</style>
