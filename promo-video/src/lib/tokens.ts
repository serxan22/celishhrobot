/**
 * The film's visual system — lifted from the website's own tokens
 * (adalawsociety-v2/src/app/globals.css) so the film extends the site
 * rather than restyling it. Colours, faces, type scales and the three motion
 * curves are the site's; nothing here is invented for the film.
 */

export const color = {
  // ink: the dark field, a blue-black rather than a neutral one
  ink: '#08131b',
  inkRaised: '#0e2130',
  inkLine: '#1d323f',
  // slate: the seal's blue
  slateDeep: '#1b3d51',
  slate: '#376278',
  slateSoft: '#6a93a7',
  slatePale: '#c3d5de',
  // burgundy: the seal's crescent — used sparingly and only to mark
  wineDeep: '#6f2739',
  wine: '#ab4b60',
  wineSoft: '#cb8d9b',
  winePale: '#d69dab',
  // paper: warm archival neutrals
  parchment: '#f1ece2',
  parchmentDeep: '#e3dccd',
  paper: '#fbf9f5',
  sand: '#cfc6b4',
  stone: '#8b8271',
  // text on surfaces
  fgPaper: '#16212a',
  fgInk: '#eef2f4',
  mutedInk: '#93a7b2',
  mutedPaper: '#5d6b74',
  ruleInk: 'rgba(195, 213, 222, 0.18)',
  ruleInkStrong: 'rgba(195, 213, 222, 0.45)',
  rulePaper: 'rgba(22, 33, 42, 0.16)',
} as const;

export const font = {
  display: "'Cormorant Garamond', Georgia, serif",
  serif: "'Literata', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Type styles, as the site sets them. Sizes are in design px (1080p frame). */
export const type = {
  display: {
    fontFamily: font.display,
    fontWeight: 500,
    lineHeight: 0.94,
    letterSpacing: '-0.02em',
  },
  heading: {
    fontFamily: font.display,
    fontWeight: 600,
    lineHeight: 1.08,
    letterSpacing: '-0.01em',
  },
  title: {
    fontFamily: font.display,
    fontWeight: 600,
    lineHeight: 1.14,
  },
  /** Marginalia, section numbers, metadata — the law-report register. */
  label: {
    fontFamily: font.sans,
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.3,
    fontVariantNumeric: 'tabular-nums',
  },
  meta: {
    fontFamily: font.sans,
    fontWeight: 400,
    letterSpacing: '0.02em',
    lineHeight: 1.5,
    fontVariantNumeric: 'tabular-nums',
  },
  lead: {
    fontFamily: font.serif,
    fontWeight: 300,
    lineHeight: 1.6,
  },
} as const;

/**
 * The site's three curves: one for entrances, one for exits, one long one for
 * scenery. The film uses them — and only them — for its own motion, so a
 * transition in the film moves the way a reveal on the site moves.
 */
export const curve = {
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.7, 0, 0.84, 0],
  scenic: [0.33, 0.1, 0.2, 1],
  /** The running head's route rule. */
  route: [0.12, 0.8, 0.25, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * The website viewport the film captures and re-composes: 1600 x 900 CSS px,
 * shown full-frame at 1920 x 1080 design px, i.e. 1.2 design px per CSS px.
 * Captured at 2.4 device px per CSS px, so a full-frame shot of the site is
 * exactly 1:1 in the 3840 x 2160 master.
 */
export const site = {
  width: 1600,
  height: 900,
  toDesign: 1920 / 1600,
  mobile: { width: 390, height: 844 },
} as const;

export const film = {
  fps: 60,
  width: 1920,
  height: 1080,
} as const;
