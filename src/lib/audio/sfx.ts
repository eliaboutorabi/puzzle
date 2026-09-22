/**
 * All sound is synthesised at runtime. No audio files, nothing to license,
 * nothing to download, and the reverse-on-rewind trick becomes trivial because
 * we own the sample buffer.
 *
 * Browsers refuse to start audio before a user gesture, so nothing here builds
 * an AudioContext until `wake()` is called from a real click or keypress.
 */

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // pentatonic — hard to make sound wrong

let context: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;

let forwardBuffer: AudioBuffer | null = null;
let reverseBuffer: AudioBuffer | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let playingReversed = false;

let muted = false;
let musicEnabled = true;

export function isAwake(): boolean {
	return context !== null;
}

/** Call from a genuine user gesture before anything else here will make noise. */
export async function wake(): Promise<void> {
	if (context) {
		if (context.state === 'suspended') await context.resume();
		return;
	}

	context = new AudioContext();
	master = context.createGain();
	master.gain.value = muted ? 0 : 0.9;
	master.connect(context.destination);

	musicGain = context.createGain();
	musicGain.gain.value = 0;
	musicGain.connect(master);

	forwardBuffer = await renderTheme(context);
	reverseBuffer = reversed(context, forwardBuffer);

	if (musicEnabled) startMusic();
}

export function setMuted(next: boolean): void {
	muted = next;
	if (master && context) {
		master.gain.cancelScheduledValues(context.currentTime);
		master.gain.linearRampToValueAtTime(next ? 0 : 0.9, context.currentTime + 0.15);
	}
}

export function setMusicEnabled(next: boolean): void {
	musicEnabled = next;
	if (!context) return;
	if (next) startMusic();
	else stopMusic();
}

/* ------------------------------------------------------------------ music -- */

function startMusic(): void {
	if (!context || !musicGain || !forwardBuffer || musicSource) return;
	musicSource = context.createBufferSource();
	musicSource.buffer = forwardBuffer;
	musicSource.loop = true;
	musicSource.connect(musicGain);
	musicSource.start();
	musicGain.gain.cancelScheduledValues(context.currentTime);
	// The light theme carries about half the energy of the old one, so this is
	// raised to match: same perceived level, lighter timbre.
	musicGain.gain.linearRampToValueAtTime(0.45, context.currentTime + 2);
}

function stopMusic(): void {
	if (!context || !musicGain || !musicSource) return;
	const source = musicSource;
	musicSource = null;
	musicGain.gain.cancelScheduledValues(context.currentTime);
	musicGain.gain.linearRampToValueAtTime(0, context.currentTime + 0.4);
	source.stop(context.currentTime + 0.5);
}

/**
 * Swap the looping theme for its mirror image, picking up at the mirrored
 * offset so the melody appears to run backward from exactly where it was.
 * This is the single most Braid-like thing in the game.
 */
export function setRewinding(active: boolean): void {
	if (!context || !musicGain || !forwardBuffer || !reverseBuffer) return;
	if (active === playingReversed) return;
	if (!musicEnabled) {
		playingReversed = active;
		return;
	}

	const duration = forwardBuffer.duration;
	const elapsed = context.currentTime % duration;
	const offset = Math.max(0, duration - elapsed);

	if (musicSource) {
		musicSource.stop();
		musicSource.disconnect();
	}

	musicSource = context.createBufferSource();
	musicSource.buffer = active ? reverseBuffer : forwardBuffer;
	musicSource.loop = true;
	musicSource.playbackRate.value = active ? 1.35 : 1;
	musicSource.connect(musicGain);
	musicSource.start(0, offset);
	playingReversed = active;
}

function reversed(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
	const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		const source = buffer.getChannelData(channel);
		const target = out.getChannelData(channel);
		for (let i = 0, n = source.length; i < n; i++) target[i] = source[n - 1 - i];
	}
	return out;
}

/**
 * A light, airy loop. Rendered once offline so playback costs nothing and the
 * reversed copy is sample-accurate.
 *
 * Deliberately brighter than a dusk theme would be: the melody sits an octave
 * up, the filter is opened so the tone keeps its air rather than being muffled,
 * and the old sub-bass drone is replaced by a soft mid pad that supports the
 * tune without sitting on top of it.
 */
async function renderTheme(ctx: AudioContext): Promise<AudioBuffer> {
	const seconds = 24;
	const offline = new OfflineAudioContext(2, ctx.sampleRate * seconds, ctx.sampleRate);

	const bus = offline.createGain();
	bus.gain.value = 0.42;

	// Opened up. A low cutoff is what makes a synth sound heavy, and this theme
	// wants the opposite.
	const air = offline.createBiquadFilter();
	air.type = 'lowpass';
	air.frequency.value = 3600;
	air.Q.value = 0.3;
	bus.connect(air);
	air.connect(offline.destination);

	const root = 392; // G4 — an octave above the old theme
	const random = seeded(20260921);

	// Melody: quicker and higher, with occasional rests so it breathes rather
	// than marching.
	for (let beat = 0; beat * 0.5 < seconds; beat++) {
		const at = beat * 0.5;
		if (random() < 0.14) continue;
		const degree = SCALE[Math.floor(random() * SCALE.length)];
		const octave = random() < 0.28 ? 12 : 0;
		pluck(offline, bus, root * Math.pow(2, (degree + octave) / 12), at, 1.1, 0.11);
	}

	// Sparse twinkles well above the melody.
	for (let i = 0; i < 30; i++) {
		const at = random() * (seconds - 1);
		const degree = SCALE[Math.floor(random() * SCALE.length)];
		pluck(offline, bus, root * 2 * Math.pow(2, degree / 12), at, 0.6, 0.045);
	}

	// A soft pad where the drone used to be: present, never heavy, drifting
	// through a few gentle changes so the loop does not feel static.
	const changes = [0, 5, 7, 4];
	for (let bar = 0; bar * 4 < seconds; bar++) {
		const at = bar * 4;
		const base = (root / 2) * Math.pow(2, changes[bar % changes.length] / 12);
		pluck(offline, bus, base, at, 4.4, 0.06, 'triangle');
		pluck(offline, bus, base * Math.pow(2, 7 / 12), at + 0.15, 4.2, 0.038, 'triangle');
	}

	return offline.startRendering();
}

function pluck(
	ctx: BaseAudioContext,
	destination: AudioNode,
	frequency: number,
	at: number,
	duration: number,
	peak: number,
	type: OscillatorType = 'sine'
): void {
	const oscillator = ctx.createOscillator();
	oscillator.type = type;
	oscillator.frequency.value = frequency;

	// A touch of detune per note stops the loop sounding mechanical.
	oscillator.detune.value = (Math.sin(at * 12.9898) * 43758.5453) % 9;

	const envelope = ctx.createGain();
	envelope.gain.setValueAtTime(0, at);
	envelope.gain.linearRampToValueAtTime(peak, at + 0.04);
	envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

	oscillator.connect(envelope);
	envelope.connect(destination);
	oscillator.start(at);
	oscillator.stop(at + duration + 0.05);
}

function seeded(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* -------------------------------------------------------------- one-shots -- */

interface ToneOptions {
	frequency: number;
	duration?: number;
	peak?: number;
	type?: OscillatorType;
	glideTo?: number;
	delay?: number;
}

function tone({
	frequency,
	duration = 0.18,
	peak = 0.2,
	type = 'sine',
	glideTo,
	delay = 0
}: ToneOptions): void {
	if (!context || !master || muted) return;
	const at = context.currentTime + delay;

	const oscillator = context.createOscillator();
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, at);
	if (glideTo !== undefined) {
		oscillator.frequency.exponentialRampToValueAtTime(glideTo, at + duration);
	}

	const envelope = context.createGain();
	envelope.gain.setValueAtTime(0, at);
	envelope.gain.linearRampToValueAtTime(peak, at + 0.012);
	envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

	oscillator.connect(envelope);
	envelope.connect(master);
	oscillator.start(at);
	oscillator.stop(at + duration + 0.02);
}

const step = (semitones: number) => 392 * Math.pow(2, semitones / 12);

/** A tile slid. Pitch rises as the board fills, so progress is audible. */
export function playSlide(progress = 0): void {
	const degree = SCALE[Math.min(SCALE.length - 1, Math.floor(progress * SCALE.length))];
	tone({ frequency: step(degree), duration: 0.14, peak: 0.13, type: 'triangle' });
}

/**
 * A piece turned a quarter. `from` is the rotation it left behind, so the pitch
 * climbs as the tile comes round to upright — you can hear it getting close.
 */
export function playTurn(from: number): void {
	const remaining = (4 - (from % 4)) % 4; // 3, 2, 1 as it approaches true
	const degree = SCALE[Math.max(0, 4 - remaining)];
	tone({ frequency: step(degree), duration: 0.13, peak: 0.14, type: 'triangle' });
	tone({ frequency: step(degree) * 1.5, duration: 0.09, peak: 0.05, delay: 0.02 });
}

/** A tile landed on its home square — a small, clean bell. */
export function playHome(): void {
	tone({ frequency: step(12), duration: 0.5, peak: 0.16 });
	tone({ frequency: step(19), duration: 0.7, peak: 0.08, delay: 0.03 });
}

/** A tile that cannot move. Soft, not a buzzer — nothing here scolds you. */
export function playRefuse(): void {
	tone({ frequency: 150, glideTo: 120, duration: 0.16, peak: 0.1, type: 'sine' });
}

/** Held rewind: a low reversed-sounding swell. */
export function playUnwind(): void {
	tone({ frequency: 120, glideTo: 300, duration: 0.28, peak: 0.09, type: 'sawtooth' });
}

/** An anchored tile refused to be unwound. */
export function playAnchor(): void {
	tone({ frequency: step(4), duration: 0.42, peak: 0.12, type: 'triangle' });
}

export function playSolve(): void {
	[0, 4, 7, 12, 16, 19].forEach((semitones, index) => {
		tone({
			frequency: step(semitones),
			duration: 1.1,
			peak: 0.15,
			delay: index * 0.09
		});
	});
}

export function playPiece(): void {
	tone({ frequency: step(7), duration: 0.35, peak: 0.14 });
	tone({ frequency: step(14), duration: 0.55, peak: 0.1, delay: 0.08 });
}

export function playUi(): void {
	tone({ frequency: step(9), duration: 0.09, peak: 0.07, type: 'triangle' });
}
