# Unwind

A slow sliding-tile puzzle where nothing is ever lost. Hold to run time backward
— but some tiles time refuses to touch.

Inspired by *Braid*: the rewind, the one-new-rule-per-world structure, and the
attic full of easels where the pieces you earn assemble into paintings.

## Playing

- **Click a tile** beside the empty square, or use the **arrow keys**
- **Hold `R`** (or the button) to unwind — every move reverses, and the music
  plays backward while it does
- **`H`** for a hint, where the difficulty allows one

Green-glowing tiles are *unmoved*: they sit at home and never slide. The empty
square has to route around them.

## Worlds

Each world adds exactly one rule and explains none of it.

| World | Rule |
| --- | --- |
| Beginnings | Plain sliding. Rewind is free. |
| The Unmoved | Some tiles cannot be moved at all. |
| Hidden Hours | The picture stays hidden until you finish it. |
| Hiccups | Time occasionally unwinds a step by itself. |

Difficulty is a separate axis — Gentle (3×3, picture faintly underneath),
Steady (4×4, three hints), Tangled (5×5, nothing).

## Your photos

Upload a photo and it becomes the puzzle, then the painting on the attic easel.

**Nothing is uploaded anywhere.** There is no server. The file is read with
`FileReader`, cropped and graded on a `<canvas>`, and kept in IndexedDB on your
device. Clearing site data removes it.

## How it is built

- **SvelteKit** with `adapter-static` — fully prerendered, no server at runtime
- **No image assets.** The gallery paintings are drawn procedurally on a canvas,
  which keeps the deploy tiny and means every stock picture already matches the
  art direction
- **No audio assets.** Music and effects are synthesised with the Web Audio API.
  The theme is rendered once into an `AudioBuffer`, and rewinding plays a
  sample-reversed copy of it
- **No runtime dependencies** beyond Svelte itself

### Board invariants

Two things are guaranteed by construction rather than checked afterwards, both
in [`src/lib/game/board.ts`](src/lib/game/board.ts):

1. **Solvability.** A random permutation of an n-puzzle is unsolvable half the
   time, so the shuffle never permutes — it walks the empty square using the
   same legal moves the player has.
2. **Reachability with anchors.** Immovable tiles stay at their home index and
   the shuffle routes around them, so every board can be walked back to solved.

Both are covered in [`board.test.ts`](src/lib/game/board.test.ts).

## Running it

```bash
npm install
npm run dev
```

```bash
npm test
```

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.

The workflow passes `BASE_PATH=/<repo-name>` to the build, because project sites
are served from a subpath. If you rename the repository it keeps working; if you
move to a user site (`<user>.github.io`), drop that env var so the base is empty.
