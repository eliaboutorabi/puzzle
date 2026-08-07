# Unwind

A slow sliding-tile puzzle where nothing is ever lost. Hold to run time backward
— but some tiles time refuses to touch.

Inspired by *Braid*: the rewind, the one-new-rule-per-world structure, and the
attic full of easels where the pieces you earn assemble into paintings.

## Playing

Pieces get out of true in two different ways, and a click does whatever the
piece under it needs:

- **Turning.** A piece facing the wrong way spins a quarter turn clockwise per
  click. Four clicks bring it back where it started.
- **Scattering.** Some boards have no empty square at all, so nothing can
  slide. Click a piece to pick it up, click another to trade places, or click
  the held piece again to turn it. `Esc` — or a tap on the frame — puts it back
  down. Here a piece is in the wrong place *and* facing the wrong way, and you
  have to find both.
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
| The Turning | Nothing slides. Wrong way up and in the wrong place — find both. |
| The Unmoved | Some pieces cannot be moved at all. |
| Odd Pieces | Interlocking cut pieces, scattered and turned. The hardest world. |
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

Four things are guaranteed by construction rather than checked afterwards, all
in [`src/lib/game/board.ts`](src/lib/game/board.ts):

1. **Solvability.** A random permutation of an n-puzzle is unsolvable half the
   time, so the shuffle never permutes — it walks the empty square using the
   same legal moves the player has.
2. **Reachability with anchors.** Immovable pieces stay at their home index and
   the shuffle routes around them, so every board can be walked back to solved.
3. **Turnability.** Rotation is its own small group: four clicks always return a
   piece to where it started, so no amount of turning can strand a board.
4. **Free permutation when scattering.** Sliding has a parity constraint, which
   is why its shuffle walks the gap. Swapping has none — any two pieces may
   trade — so a scattered board permutes outright and is still always solvable.

All are covered in [`board.test.ts`](src/lib/game/board.test.ts), and the cut-piece
invariants in [`jigsaw.test.ts`](src/lib/game/jigsaw.test.ts).

### Cut pieces

`src/lib/game/jigsaw.ts` builds the piece outlines. Edges are shared: where one
piece takes a tab, its neighbour takes the matching blank, so the two mate
exactly once both are placed and upright. A piece's shape belongs to its *home*
position rather than travelling with it — the silhouette is the clue to where it
belongs, and a rotated piece visibly stops interlocking.

Outlines are SVG `clipPath`s in `objectBoundingBox` units, applied to a face
drawn 1.5x the size of its cell so tabs have room to reach outside it.

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
