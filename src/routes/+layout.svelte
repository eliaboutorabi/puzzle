<script lang="ts">
	import '$lib/styles/app.css';
	import * as sfx from '$lib/audio/sfx';
	import { settings } from '$lib/state/settings.svelte';

	let { children } = $props();

	/**
	 * Browsers refuse to start audio before a genuine user gesture, so the audio
	 * engine is built on the first interaction of any kind and never before.
	 */
	async function wakeAudio() {
		if (sfx.isAwake()) return;
		await sfx.wake();
		settings.applyToAudio();
	}
</script>

<svelte:window onpointerdown={wakeAudio} onkeydown={wakeAudio} />

{@render children()}
