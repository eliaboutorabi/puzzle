import { browser } from '$app/environment';
import * as sfx from '$lib/audio/sfx';
import type { DifficultyId } from '$lib/game/worlds';

const KEY = 'unwind:settings';

interface Shape {
	muted: boolean;
	music: boolean;
	difficulty: DifficultyId;
	reducedMotion: boolean;
	/** The pinned picture, used only when `varyPictures` is off. */
	imageId: string;
	/** Give every puzzle its own picture instead of repeating one. */
	varyPictures: boolean;
}

const DEFAULTS: Shape = {
	muted: false,
	music: true,
	difficulty: 'gentle',
	reducedMotion: false,
	imageId: 'sunset-hills',
	varyPictures: true
};

function load(): Shape {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
	} catch {
		return { ...DEFAULTS };
	}
}

class Settings {
	#state = $state<Shape>(load());

	get muted() {
		return this.#state.muted;
	}
	get music() {
		return this.#state.music;
	}
	get difficulty() {
		return this.#state.difficulty;
	}
	get reducedMotion() {
		return this.#state.reducedMotion;
	}
	get imageId() {
		return this.#state.imageId;
	}
	get varyPictures() {
		return this.#state.varyPictures;
	}

	toggleMuted() {
		this.#state.muted = !this.#state.muted;
		sfx.setMuted(this.#state.muted);
		this.#save();
	}

	toggleMusic() {
		this.#state.music = !this.#state.music;
		sfx.setMusicEnabled(this.#state.music);
		this.#save();
	}

	toggleReducedMotion() {
		this.#state.reducedMotion = !this.#state.reducedMotion;
		this.#save();
	}

	setDifficulty(difficulty: DifficultyId) {
		this.#state.difficulty = difficulty;
		this.#save();
	}

	/** Pinning a picture is what turns the per-puzzle variety off. */
	setImage(imageId: string) {
		this.#state.imageId = imageId;
		this.#state.varyPictures = false;
		this.#save();
	}

	varyEveryPuzzle() {
		this.#state.varyPictures = true;
		this.#save();
	}

	/** Push the stored preferences into the audio engine once it wakes up. */
	applyToAudio() {
		sfx.setMuted(this.#state.muted);
		sfx.setMusicEnabled(this.#state.music);
	}

	#save() {
		if (!browser) return;
		try {
			localStorage.setItem(KEY, JSON.stringify(this.#state));
		} catch {
			// Storage full or blocked — preferences just won't survive a reload.
		}
	}
}

export const settings = new Settings();
