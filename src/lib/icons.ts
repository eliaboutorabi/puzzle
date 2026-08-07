/**
 * Every icon the game uses, named for what it means here rather than for what
 * it draws. Swapping a glyph later is then a one-line change in this file
 * instead of a hunt through components.
 *
 * Imported by name so the bundler keeps only these out of the ~5,400 in the
 * free set.
 */

import {
	Add01Icon,
	AnchorIcon,
	ArrowLeft02Icon,
	ArrowRight02Icon,
	Backward02Icon,
	Cancel01Icon,
	Delete02Icon,
	EyeOffIcon,
	FireIcon,
	FlashIcon,
	FlashOffIcon,
	FrameIcon,
	HangerIcon,
	Idea01Icon,
	ImageAdd01Icon,
	Leaf01Icon,
	MountainIcon,
	MusicNote01Icon,
	Refresh01Icon,
	Rotate01Icon,
	SparklesIcon,
	Time01Icon
} from '@hugeicons/core-free-icons';

import type { WorldId } from '$lib/game/worlds';
import type { DifficultyId } from '$lib/game/worlds';

export const icons = {
	// Sound — one control, so one glyph. It strikes through when muted.
	music: MusicNote01Icon,

	// Navigation
	back: ArrowLeft02Icon,
	next: ArrowRight02Icon,
	attic: FrameIcon,
	close: Cancel01Icon,

	// Playing
	unwind: Backward02Icon,
	hint: Idea01Icon,
	restart: Refresh01Icon,

	// Pictures
	addPhoto: ImageAdd01Icon,
	add: Add01Icon,
	vary: SparklesIcon,
	hang: HangerIcon,
	remove: Delete02Icon,

	// Motion
	motionOn: FlashIcon,
	motionOff: FlashOffIcon
} as const;

/** Difficulty as a rising scale: something soft, something solid, something hot. */
export const difficultyIcons: Record<DifficultyId, typeof Leaf01Icon> = {
	gentle: Leaf01Icon,
	steady: MountainIcon,
	tangled: FireIcon
};

/** Each world's icon states its one rule before the flavour text does. */
export const worldIcons: Record<WorldId, typeof Leaf01Icon> = {
	beginnings: Backward02Icon,
	turning: Rotate01Icon,
	// Not the mountain: that already means the Steady difficulty.
	unmoved: AnchorIcon,
	hidden: EyeOffIcon,
	hiccups: Time01Icon
};
