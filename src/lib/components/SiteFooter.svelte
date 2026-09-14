<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { icons } from '$lib/icons';

	const REPO = 'https://github.com/eliaboutorabi/puzzle';
</script>

<footer class="credit">
	<p>
		Made by <strong>Eli Aboutorabi</strong>
	</p>
	<a
		class="source"
		href={REPO}
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Source code on GitHub"
		title="Source code on GitHub"
	>
		<HugeiconsIcon icon={icons.github} size={19} strokeWidth={1.8} color="currentColor" />
	</a>
</footer>

<style>
	.credit {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		/* Clears the floating sound control in the bottom-right corner. */
		padding: 1.4rem clamp(4.5rem, 12vw, 7rem) max(1.4rem, env(safe-area-inset-bottom));
		font-size: 0.86rem;
		color: var(--ink-soft);
	}

	.credit p {
		margin: 0;
	}

	.credit strong {
		font-weight: 700;
		color: var(--ink);
	}

	.source {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: var(--ink-soft);
		border: 1px solid transparent;
		transition:
			color 0.22s var(--ease-out),
			background 0.22s var(--ease-out),
			border-color 0.22s var(--ease-out),
			transform 0.22s var(--ease-spring);
	}

	.source:hover {
		color: var(--accent-deep);
		background: var(--accent-wash);
		border-color: var(--edge);
		transform: translateY(-2px);
	}
</style>
