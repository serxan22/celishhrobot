/**
 * The sound-design cue sheet, derived from the film's clock (timing.ts) so the
 * sound always lands on the picture. `npm run cues` writes audio/cues.json for
 * the score synthesiser; a composer replacing the score can work from the
 * same sheet.
 */
import { FPS, SCENES, START, TOTAL } from './timing';

export type CueKind =
  | 'line' // the opening hairline: a thin, high glide
  | 'pluck' // a felt-piano note
  | 'swell' // a rising breath of air and tone
  | 'impact' // a soft, deep impact with a tail
  | 'shimmer' // high partials, very quiet
  | 'whoosh' // air past the camera
  | 'shutter' // a photograph cut: a dry tick and a small thump
  | 'tick' // an archive tick
  | 'click' // the pointer's click
  | 'paper' // a page turning over: a short, bright swish
  | 'accent' // a tonal accent on a word
  | 'hit' // a montage beat
  | 'boom' // the end card
  | 'ping'; // a small bright bell

export type Cue = { t: number; kind: CueKind; gain?: number; note?: number; dur?: number; pan?: number };

const at = (scene: keyof typeof SCENES, local: number) => (START[scene] + local) / FPS;

export function cues(): Cue[] {
  const out: Cue[] = [];
  const I = SCENES.identity.marks;
  out.push({ t: at('identity', I.lineIn), kind: 'line', dur: 1.3, gain: 0.5 });
  out.push({ t: at('identity', I.nameIn + 8), kind: 'pluck', note: 69, gain: 0.32 }); // A4
  out.push({ t: at('identity', I.labelIn + 6), kind: 'pluck', note: 74, gain: 0.22 }); // D5
  out.push({ t: at('identity', I.open - 30), kind: 'swell', dur: (I.openEnd - I.open + 30) / FPS, gain: 0.55 });
  out.push({ t: at('identity', I.open + 40), kind: 'impact', gain: 0.55 });

  const T = SCENES.threshold.marks;
  out.push({ t: at('threshold', T.arcIn + 4), kind: 'shimmer', dur: 1.6, gain: 0.35 });
  out.push({ t: at('threshold', T.scrollStart + 10), kind: 'whoosh', dur: 1.6, gain: 0.3, pan: 0 });
  const breakout = T.scrollStart + T.scrollFrames + 50;
  out.push({ t: at('threshold', breakout + 4), kind: 'paper', gain: 0.35 });
  out.push({ t: at('threshold', breakout + 60), kind: 'accent', note: 50, gain: 0.5 }); // D3 under "argument."

  const E = SCENES.events.marks;
  out.push({ t: at('events', 2), kind: 'whoosh', dur: 0.7, gain: 0.25, pan: 0.2 });
  out.push({ t: at('events', E.expand - 18), kind: 'swell', dur: (E.expandEnd - E.expand + 18) / FPS, gain: 0.45 });
  out.push({ t: at('events', E.expandEnd - 2), kind: 'impact', gain: 0.62 });
  for (let k = 1; k <= 5; k++) out.push({ t: at('events', E.firstCut + (k - 1) * E.photoStep), kind: 'shutter', gain: 0.5, pan: k % 2 ? -0.2 : 0.2 });
  out.push({ t: at('events', E.pullBack), kind: 'whoosh', dur: 0.9, gain: 0.32, pan: -0.1 });
  out.push({ t: at('events', E.pullBackEnd - 2), kind: 'tick', gain: 0.4 });

  const S = SCENES.seminars.marks;
  out.push({ t: at('seminars', S.headOut), kind: 'paper', gain: 0.25 });
  S.roll.forEach((f, i) => out.push({ t: at('seminars', f - 6), kind: 'tick', gain: 0.55, pan: i % 2 ? 0.25 : -0.25 }));
  out.push({ t: at('seminars', S.lock), kind: 'pluck', note: 62, gain: 0.3 }); // D4 as the photograph develops
  out.push({ t: at('seminars', S.resolve - 8), kind: 'paper', gain: 0.3 });

  const B = SCENES.blog.marks;
  out.push({ t: at('blog', B.separate), kind: 'paper', gain: 0.35 });
  out.push({ t: at('blog', B.enlarge), kind: 'swell', dur: (B.enlargeEnd - B.enlarge) / FPS, gain: 0.5 });
  out.push({ t: at('blog', B.enlargeEnd - 4), kind: 'accent', note: 57, gain: 0.45 }); // A3
  out.push({ t: at('blog', B.land - 8), kind: 'paper', gain: 0.4 });
  out.push({ t: at('blog', B.landEnd - 6), kind: 'impact', gain: 0.35 });
  out.push({ t: at('blog', B.hover), kind: 'tick', gain: 0.18 });
  out.push({ t: at('blog', B.click), kind: 'click', gain: 0.55 });
  out.push({ t: at('blog', B.morph), kind: 'paper', gain: 0.45 });
  out.push({ t: at('blog', B.morphEnd - 4), kind: 'pluck', note: 65, gain: 0.3 }); // F4
  out.push({ t: at('blog', B.readStart + 30), kind: 'shimmer', dur: 2.0, gain: 0.2 });

  const N = SCENES.newsroom.marks;
  out.push({ t: at('newsroom', N.masthead), kind: 'paper', gain: 0.4 });
  for (let f = N.timeline + 10; f < N.timelineEnd; f += 9) out.push({ t: at('newsroom', f), kind: 'tick', gain: 0.16, pan: ((f / 9) % 2) * 0.4 - 0.2 });
  out.push({ t: at('newsroom', N.select - 6), kind: 'swell', dur: (N.expandEnd - N.select + 6) / FPS, gain: 0.4 });
  out.push({ t: at('newsroom', N.expandEnd - 2), kind: 'impact', gain: 0.5 });
  out.push({ t: at('newsroom', N.settle), kind: 'whoosh', dur: 0.8, gain: 0.25 });

  const M = SCENES.team.marks;
  out.push({ t: at('team', 0), kind: 'paper', gain: 0.35 });
  out.push({ t: at('team', M.detach), kind: 'swell', dur: (M.detachEnd - M.detach) / FPS, gain: 0.4 });
  out.push({ t: at('team', M.detachEnd - 6), kind: 'pluck', note: 69, gain: 0.28 });
  out.push({ t: at('team', M.wall), kind: 'shimmer', dur: 1.4, gain: 0.3 });
  out.push({ t: at('team', M.wallEnd), kind: 'pluck', note: 74, gain: 0.26 });
  out.push({ t: at('team', M.settle), kind: 'whoosh', dur: 0.9, gain: 0.3 });

  const R = SCENES.record.marks;
  // The chronicle, one low note a year, climbing.
  const notes = [50, 53, 57, 60, 62, 65];
  notes.forEach((n, i) => out.push({ t: at('record', 10 + i * R.yearStep - 6), kind: 'pluck', note: n, gain: 0.36 }));
  out.push({ t: at('record', R.resolve), kind: 'whoosh', dur: 1.0, gain: 0.3 });

  const Mo = SCENES.mobile.marks;
  out.push({ t: at('mobile', 4), kind: 'shimmer', dur: Mo.morphFrames / FPS, gain: 0.28 });
  out.push({ t: at('mobile', Mo.exit - 6), kind: 'whoosh', dur: 0.8, gain: 0.4, pan: 0 });

  const F = SCENES.finale.marks;
  for (let k = 0; k < F.montage; k++) out.push({ t: at('finale', k * F.montageStep), kind: 'hit', gain: 0.55 + k * 0.05 });
  out.push({ t: at('finale', F.invite - 6), kind: 'accent', note: 57, gain: 0.4 });
  out.push({ t: at('finale', F.card - 4), kind: 'boom', gain: 0.9 });
  out.push({ t: at('finale', F.url), kind: 'ping', gain: 0.3 });
  return out.sort((a, b) => a.t - b.t);
}

/** Section boundaries (seconds) for the score's arrangement. */
export function sections() {
  const sec = (k: keyof typeof SCENES) => ({ start: START[k] / FPS, end: (START[k] + SCENES[k].duration) / FPS });
  return {
    total: TOTAL / FPS,
    identity: sec('identity'),
    threshold: sec('threshold'),
    events: sec('events'),
    seminars: sec('seminars'),
    blog: sec('blog'),
    newsroom: sec('newsroom'),
    team: sec('team'),
    record: sec('record'),
    mobile: sec('mobile'),
    finale: sec('finale'),
    // musical anchors
    eventsFirstCut: (START.events + SCENES.events.marks.firstCut) / FPS,
    beat: SCENES.events.marks.photoStep / FPS,
    blogSeparate: (START.blog + SCENES.blog.marks.separate) / FPS,
    blogLandEnd: (START.blog + SCENES.blog.marks.landEnd) / FPS,
    finaleCard: (START.finale + SCENES.finale.marks.card) / FPS,
    identityOpen: (START.identity + SCENES.identity.marks.open) / FPS,
  };
}
