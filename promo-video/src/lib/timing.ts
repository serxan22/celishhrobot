/**
 * The film's clock — the single source of truth for every duration.
 *
 * Scenes are laid end to end; each scene's internal marks are frames relative
 * to the scene's start. Captured sequences (capture/shots.ts) take their
 * lengths from here, so the site footage is always exactly as long as the cut
 * that plays it, and the sound design reads its cue points from here too.
 */
export const FPS = 60;

const s = (seconds: number) => Math.round(seconds * FPS);

export const SCENES = {
  /** Ink, a hairline, the name — then the line opens onto the real hero. */
  identity: {
    duration: s(5.0),
    marks: {
      lineIn: 18,
      nameIn: 42,
      labelIn: 70,
      open: s(2.35),
      openEnd: s(4.0),
      mottoIn: s(3.12),
      eyebrowIn: s(3.55),
      leadIn: s(3.75),
    },
  },
  /** The held threshold, the crescent, the scroll into § 01 and the breakout. */
  threshold: {
    duration: s(6.2),
    marks: {
      arcIn: 0,
      scrollStart: s(1.6),
      /** Captured: home, hero → § 01 statement. */
      scrollFrames: s(2.5),
      breakout: s(4.1),
    },
  },
  /** § 02 — argument. The docket, one photograph taken full frame, the record. */
  events: {
    duration: s(8.6),
    marks: {
      /** Captured: home, § 02 heading → docket entry 01 active. */
      enterFrames: 110,
      push: 150,
      expand: 172,
      expandEnd: 224,
      firstCut: 270,
      photoStep: 36,
      pullBack: 438,
      pullBackEnd: 492,
    },
  },
  /** § 03 — ideas. The seminar archive. */
  seminars: {
    duration: s(5.3),
    marks: {
      /** Captured: home, docket end → § 03 heading. */
      enterFrames: s(1.5),
      clear: 118,
      headOut: 118,
      split: 132,
      splitEnd: 186,
      roll: [182, 208, 236],
      lock: 236,
      dialOut: 264,
      resolve: 272,
    },
  },
  /** § 04 — writing. Title breakout → Blog index → hover, click → article. */
  blog: {
    duration: s(10.4),
    marks: {
      /** Captured: home, § 03 → § 04 list. */
      enterFrames: s(1.4),
      separate: 110,
      enlarge: 118,
      enlargeEnd: 204,
      land: 222,
      landEnd: 284,
      cursorIn: 288,
      hover: 336,
      click: 372,
      morph: 382,
      morphEnd: 452,
      /** Captured: article masthead → plate → prose. */
      readStart: 456,
      readFrames: s(3.4),
    },
  },
  /** § 05 — the record. Dates hold while the headlines pass. */
  newsroom: {
    duration: s(6.0),
    marks: {
      masthead: 0,
      timeline: 52,
      timelineEnd: 226,
      select: 232,
      expandEnd: 272,
      settle: 300,
      settleEnd: 346,
    },
  },
  /** § 06 — people. The Board, then the whole term. */
  team: {
    duration: s(6.6),
    marks: {
      scroll: 24,
      scrollEnd: 118,
      detach: 120,
      detachEnd: 176,
      wall: 214,
      wallEnd: 272,
      settle: 300,
      settleEnd: 356,
    },
  },
  /** Permanence: 2019 → 2026, resolving into the chronicle. */
  record: {
    duration: s(4.2),
    marks: {
      yearStep: s(0.48),
      resolve: s(3.1),
    },
  },
  /** Everywhere: the same page, recomposed for a phone. */
  mobile: {
    duration: s(4.0),
    marks: {
      /** Captured: the width sweep, one real layout per frame. */
      morphFrames: s(1.9),
      /** Captured: mobile scroll. */
      scrollStart: s(1.9),
      scrollFrames: s(1.4),
      exit: s(3.3),
    },
  },
  /** The last beat: the montage, the invitation, the name. */
  finale: {
    duration: s(6.7),
    marks: {
      montageStep: s(0.34),
      montage: 4,
      invite: s(1.4),
      card: s(3.15),
      url: s(4.0),
      fade: s(6.25),
    },
  },
} as const;

export type SceneKey = keyof typeof SCENES;

export const ORDER: SceneKey[] = [
  'identity',
  'threshold',
  'events',
  'seminars',
  'blog',
  'newsroom',
  'team',
  'record',
  'mobile',
  'finale',
];

export const START: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  let at = 0;
  for (const key of ORDER) {
    out[key] = at;
    at += SCENES[key].duration;
  }
  return out;
})();

export const TOTAL = ORDER.reduce((sum, key) => sum + SCENES[key].duration, 0);
