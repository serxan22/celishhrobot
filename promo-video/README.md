# In Session — the ADA Law Society website, as a film

A 63-second, 60 fps launch film for the ADA Law Society website
(https://www.adalawsociety.com/en), built in [Remotion](https://www.remotion.dev)
from frame-accurate captures of the site itself.

It is not a screen recording. The website is the raw material: its real pages
are stepped frame by frame, and its headlines, photographs and portraits are
lifted out of the page, recomposed, and returned to it. Every word, date,
name, role and photograph in the film is read off the site at capture time —
nothing is typed by hand — and every colour, face, curve and device is the
site's own (`adalawsociety-v2/src/app/globals.css`).

## The film

| # | Scene | What happens |
|---|-------|--------------|
| 1 | **Identity** | Ink, almost silence. A burgundy hairline draws; the Society's name rises from behind it, its founding line descends from it. The line opens like the site's photo unmask and the real homepage is behind it; the motto lifts into its exact place. |
| 2 | **Threshold** | The seal's crescent is drawn across the hero at architectural scale. The real page scrolls into § 01 — *Law is learned in lecture halls, understood in argument.* — and "argument." leaves the page. |
| 3 | **§ 02 Argument** | The real docket. The Caspian International Law Moot Court photograph is held up, leaves its frame, and the record is turned photograph by photograph — matched on shape (a row of figures, the ADA lectern) — before it settles back into the docket, four events down. |
| 4 | **§ 03 Ideas** | The seminar programme as an archive: dates travel past a reading line; the seminar's photograph only develops when the dial stops on the seminar it shows; the entry drops back into its row of the real programme. |
| 5 | **§ 04 Writing** | A headline leaves the homepage list, is set large with its byline, lands as the lead story of the real Law Blog, is found by a pointer and clicked; the same words recompose into the article's masthead, and the article is read. |
| 6 | **§ 05 The record** | The newsroom as an institutional record: a pinned date ticks while the real headlines pass it, photographs at their own depths; the latest story opens and settles into its own page. |
| 7 | **§ 06 People** | The Board lifts off the real Team page into a composition in depth; the whole 2026/2027 term — thirty members, a board and four committees — assembles as a masthead; every portrait returns to its place. |
| 8 | **Permanence** | The About page's chronicle, 2019 → 2026, each year with a photograph the Society published from it; the camera draws back to the whole record on the page. |
| 9 | **Everywhere** | The page's edges close in: every frame is the page genuinely re-laid-out at that width, until it is the phone layout, which scrolls, then rises away. |
| 10 | **Finale** | The four chapters in quick succession; § 07's invitation in English, Azerbaijani and Russian; the crescent returns, cradling the seal; ADA LAW SOCIETY · YOUR GATEWAY TO THE LEGAL WORLD · ADALAWSOCIETY.COM. |

### Motion language

A small family of behaviours, all extensions of the site's own motion
vocabulary, repeated so they become recognisable:

- **Editorial reveal** — hairline draw + type lifting from behind an invisible
  rule (`Rule`, `Lift`, `SiteLines`, `ChapterMark`).
- **Unmask** — photographs arrive by uncovering, never by sliding, led by a
  travelling burgundy hairline (`Unmask`); also the page-change transition.
- **Breakout / match cut** — an element leaves its measured place on the page
  and becomes the frame (`Photo` + measured rects, `WordMorph`, `MeasuredBlock`).
- **Camera travel** — real, frame-stepped scrolling (`Footage`), plates
  travelled with `SiteView` + `Camera`.
- **Vertical archive** — dates and headlines on one axis past a reading line
  (Seminars, Newsroom, Record).
- **Viewport morph** — the real responsive reflow, frame by frame (Mobile).

Timing uses only the site's three curves (entrance, exit, scenic) plus a
travel curve for camera moves (`src/lib/easing.ts`). Motion blur is applied
selectively, in proportion to each element's exact velocity (`MotionBlur`).

## Pipeline

```bash
npm install

# 1. Capture the site (production by default; the site must be reachable)
npm run capture -- --site=https://www.adalawsociety.com
#    optional: --originals=<dir of source photographs> to use larger originals
#    of the same pictures (matched by perceptual hash) where they exist
npm run enhance            # full-frame photographs resampled to 4K, small tier

# 2. Verify the capture against the live site — gate every render on it
npm run verify -- --site=https://www.adalawsociety.com

# 3. Sound: cue sheet from the film's clock, then the score and sound design
npm run cues && npm run score      # needs python3 with numpy + scipy

# 4. Render
npm run studio                     # preview in Remotion Studio
npm run render:preview             # 1920 x 1080, 60 fps
npm run render:master              # 3840 x 2160, 60 fps (--scale=2)
```

`npm run render:stills -- --frames=0,300,600 --sheet=review` renders review
stills and a contact sheet.

### Capture (`capture/`)

- `engine.ts` — steps a real page on film time: Playwright's fake clock drives
  the site's JavaScript (its rAF scroll loop, settle logic, counters), and every
  CSS transition/animation is paused and seeked through the Web Animations API,
  so a 1.6 s unmask spans exactly 96 frames. Scroll is set per frame from a
  curve; every image in view is decoded before the shutter.
- `shots.ts` — every sequence, plate and morph the film uses, with the geometry
  (word by word) of the elements the film lifts out of the page and variants
  with those elements hidden, so live type can take their place.
- `extract.ts` — the content the film sets (headlines, dates, names, roles,
  captions, photographs and their focal points), read off the pages.
- `verify.ts` — re-reads all of it from a site and diffs it field by field,
  and compares every plate with a fresh screenshot. Writes
  `capture/verify-report.md`; exits non-zero on any difference.
- `local-site/storage-mock.mjs` — a local stand-in for Supabase Storage, so an
  unmodified checkout of the website can be run and captured offline.

Captures, photographs and renders are generated and git-ignored.

### Film (`src/`)

- `lib/timing.ts` — the single clock: scene lengths and every internal mark.
  Captured sequences take their lengths from it; the sound design takes its
  cue points from it.
- `lib/tokens.ts`, `lib/easing.ts`, `lib/fonts.ts` — the site's colours, type,
  curves and self-hosted variable faces.
- `components/` — the primitives above, plus `Cursor` (a pointer that moves in
  gentle arcs, slows before its target, presses without a ring), `Grain`,
  `CaptionBlock`, `Soundtrack`.
- `scenes/` — one file per scene.

Compositions are laid out in a 1920 × 1080 design space and rendered at
`--scale=2` for the 3840 × 2160 master: type, rules and vectors rasterise at
full density; captures are taken at 2.4 device px per CSS px, so a full-frame
page is 1:1 in the master.

### Sound (`audio/`)

`score.py` synthesises an original score (a low drone; slow chords in D minor
warming to F and B-flat for the people and resolving to an open D; a soft felt
pulse only where the picture cuts on the beat) and a separate sound-design stem
(hairline, unmasks, impacts, the photograph cuts, archive ticks, the pointer's
click, the end card) from `audio/cues.json`.

**Replacing the music:** put a licensed track at `public/audio/score.wav`
(63 s or longer). The sound design stays on `public/audio/sfx.wav`, locked to
the picture; balance the two in `src/components/Soundtrack.tsx`. The Events
photographs cut on a 100 BPM grid (one beat = 0.6 s), which a replacement
track can be edited to.

### Toward 9:16

Every site shot can be captured at any viewport (`viewport` on a shot, e.g.
390 × 844 for the phone layout), and scene positions derive from
`src/lib/layout.ts`. A vertical cut is a second composition that reads the
portrait layout and the phone-width shots — not a crop of the landscape film.

## Provenance of this cut

This cut was captured from a local build of the website's current source
(`adalawsociety-v2`, `main` at `b6ea06d`, 28 Sep 2026) seeded with the Society's
archive, because the cloud environment it was made in could not reach
`www.adalawsociety.com`. Before publishing, capture from production and run
`npm run verify` (see above); if production differs, the film follows
production automatically on the next capture.
