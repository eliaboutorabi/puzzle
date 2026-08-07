# Unwind

A slow sliding-tile puzzle where nothing is ever lost. Hold to run time backward
— but some tiles time refuses to touch.

Inspired by *Braid*: the rewind, the one-new-rule-per-world structure, and the
attic full of easels where the pieces you earn assemble into paintings.

## Playing

Pieces get out of true in two different ways, and a click does whatever the
piece under it needs:

- **Turning.** A piece facing the wrong way spins a quarter turn clockwise per
  click. Four clicks bring it back where it started. Some boards have no empty
  square at all — every piece is present, just pointing the wrong way, and the
  whole puzzle is finding the right side for each one.
- **Sliding.** An upright piece beside the empty square slides into it. The
  **arrow keys** do this too.
- **Hold `R`** (or the button) to unwind — every move reverses, turns included,
  and the music plays backward while it does.
- **`H`** for a hint, where the difficulty allows one.

A crooked piece always wants straightening first, even when it could slide
instead — otherwise a piece sitting next to the gap could never be turned.

Green-glowing pieces are *unmoved*: time refuses to touch them. They never
slide and never turn, and everything else has to work around them.

## Worlds

Each world adds exactly one rule and explains none of it.

| World | Rule |
| --- | --- |
| Beginnings | Plain sliding. Rewind is free. |
| The Turning | Nothing slides. Every piece is here, facing the wrong way. |
| The Unmoved | Some pieces cannot be moved at all. |
| Hidden Hours | Slide and turn together — and the picture stays hidden until you finish. |
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
- **No image assets.** The nine gallery pictures are drawn procedurally on a
  canvas, which keeps the deploy tiny and sidesteps licensing entirely. Each is
  its own scene rather than one composition recoloured — hills, aurora,
  balloons, a flower field, an ocean sunrise, rainbow arcs, a night city, dunes,
  a citrus grove. Two rules they all follow come from what a *puzzle* needs:
  detail everywhere (a flat region makes several tiles identical, which is
  tedious rather than hard) and colour that shifts across the frame, so a tile
  can be placed from its colour alone
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
2. **Reachability with anchors.** Immovable pieces stay at their home index and
   the shuffle routes around them, so every board can be walked back to solved.
3. **Turnability.** Rotation is its own small group: four clicks always return a
   piece to where it started, so no amount of turning can strand a board.

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
