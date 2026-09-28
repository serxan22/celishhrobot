/**
 * Every piece of the website the film uses, described once.
 *
 * Sequences are real scroll/hover footage stepped at film time; stills are
 * high-DPR plates with the geometry of the elements the film lifts out of the
 * page; morphs are the same page re-laid-out at a sweep of viewport widths.
 * Lengths come from src/lib/timing.ts, so the footage always fits the cut.
 */
import { SCENES } from '../src/lib/timing';

export type Anchor = number | { selector: string; align?: 'top' | 'center' | 'bottom'; offset?: number };
export type EaseName = 'glide' | 'travel' | 'scenic' | 'entrance' | 'linear';
export type ScrollKey = { at: number; to: Anchor; ease?: EaseName };
export type Variant = { name: string; hide: string[] };
export type Measures = Record<string, string>;

type Common = {
  id: string;
  path: string;
  viewport?: { width: number; height: number };
  dpr?: number;
};

export type SequenceShot = Common & {
  kind: 'sequence';
  frames: number;
  /** Extra frames captured after the cut length, held at the last scroll position. */
  tail?: number;
  scroll: ScrollKey[];
  /** Mouse position keys (CSS px, viewport) — real :hover states. */
  mouse?: Array<{ at: number; selector: string; dx?: number; dy?: number }>;
  measureStart?: Measures;
  measureEnd?: Measures;
  endVariants?: Variant[];
  /** Mark everything already revealed before the first frame (no entrance motion). */
  revealAll?: boolean;
  /** Frames advanced at the opening scroll position before the first capture. */
  preroll?: number;
  quality?: number;
};

export type StillShot = Common & {
  kind: 'still';
  at: Anchor;
  /** CSS px of document to capture from `at`; defaults to one viewport. */
  height?: number;
  /** Hide the running head (for tall plates stitched from several viewports). */
  hideHeader?: boolean;
  measure?: Measures;
  variants?: Variant[];
  hover?: string;
};

export type MorphShot = Common & {
  kind: 'morph';
  frames: number;
  from: { width: number; height: number };
  to: { width: number; height: number };
  /** Keeps this element's top at the same place in the viewport as it reflows. */
  anchor: { selector: string; top: number };
  ease: EaseName;
};

export type Shot = SequenceShot | StillShot | MorphShot;

const HERO = 'main > div:first-child';

export const SHOTS: Shot[] = [
  /* ------------------------------------------------------------ threshold -- */
  {
    kind: 'still',
    id: 'hero',
    path: '/en',
    at: 0,
    dpr: 3,
    measure: {
      eyebrow: `${HERO} p.t-label`,
      'lines[]': `${HERO} h1 [data-reveal-kind="lift"]`,
      h1: `${HERO} h1`,
      lead: `${HERO} p.t-lead`,
      scrollLabel: `${HERO} span.t-label.opacity-70`,
      scrollLine: `${HERO} span[aria-hidden="true"].w-px`,
      arc: `${HERO} svg`,
      photo: `${HERO} img`,
    },
    variants: [
      { name: 'bare', hide: [`${HERO} p.t-label`, `${HERO} h1`, `${HERO} p.t-lead`, `${HERO} svg`, `${HERO} .justify-between`] },
    ],
  },
  {
    kind: 'sequence',
    id: 'home-threshold',
    path: '/en',
    frames: SCENES.threshold.marks.scrollFrames,
    tail: 60,
    scroll: [
      { at: 0, to: 0 },
      { at: SCENES.threshold.marks.scrollFrames - 4, to: { selector: '#society-heading', align: 'center', offset: 40 }, ease: 'travel' },
    ],
    measureEnd: {
      'lines[]': '#society-heading [data-reveal-kind="lift"]',
      heading: '#society-heading',
      mark: '#society .t-section-mark',
    },
    endVariants: [{ name: 'noheading', hide: ['#society-heading'] }],
  },

  /* --------------------------------------------------------------- events -- */
  {
    kind: 'sequence',
    id: 'home-events',
    path: '/en',
    frames: SCENES.events.marks.enterFrames,
    tail: 90,
    scroll: [
      { at: 0, to: { selector: '#events', align: 'top', offset: 60 } },
      { at: 38, to: { selector: '#events', align: 'top', offset: 60 } },
      { at: SCENES.events.marks.enterFrames - 2, to: { selector: '#events ol > li:nth-child(1)', align: 'center' }, ease: 'glide' },
    ],
    measureStart: { 'lines[]': '#events-heading [data-reveal-kind="lift"]', heading: '#events-heading' },
    measureEnd: {
      stage: '#events .sticky > div:first-child',
      counter: '#events .sticky span.t-label',
      label: '#events ol > li:nth-child(1) p.t-label',
      title: '#events ol > li:nth-child(1) h3',
      body: '#events ol > li:nth-child(1) p.t-body',
      plate: '#events ol > li:nth-child(1) p[data-plate]',
    },
    endVariants: [{ name: 'nostage', hide: ['#events .sticky > div:first-child > div'] }],
  },
  {
    kind: 'still',
    id: 'docket-04',
    path: '/en',
    at: { selector: '#events ol > li:nth-child(4)', align: 'center' },
    measure: {
      stage: '#events .sticky > div:first-child',
      counter: '#events .sticky span.t-label',
      label: '#events ol > li:nth-child(4) p.t-label',
      title: '#events ol > li:nth-child(4) h3',
    },
    variants: [{ name: 'nostage', hide: ['#events .sticky > div:first-child > div'] }],
  },

  /* ------------------------------------------------------------- seminars -- */
  {
    kind: 'sequence',
    id: 'home-seminars',
    path: '/en',
    frames: SCENES.seminars.marks.enterFrames,
    tail: 60,
    preroll: 150,
    scroll: [
      { at: 0, to: { selector: '#events ol > li:nth-child(4)', align: 'center' } },
      { at: SCENES.seminars.marks.enterFrames - 2, to: { selector: '#enquiry', align: 'top', offset: 40 }, ease: 'travel' },
    ],
    measureEnd: {
      heading: '#enquiry-heading',
      'lines[]': '#enquiry-heading [data-reveal-kind="lift"]',
      photo: '#enquiry img',
    },
  },
  {
    kind: 'still',
    id: 'seminar-programme',
    path: '/en',
    at: { selector: '#enquiry ol', align: 'center', offset: -40 },
    measure: {
      list: '#enquiry ol',
      label: '#enquiry p.t-label.text-\\[color\\:var\\(--accent\\)\\]',
      'dates[]': '#enquiry ol > li p.t-meta.tabular-nums',
      'titles[]': '#enquiry ol > li p.t-title',
      'speakers[]': '#enquiry ol > li p.t-meta.md\\:col-span-3',
    },
    variants: [{ name: 'norows', hide: ['#enquiry ol > li'] }],
  },

  /* ------------------------------------------------------------- law blog -- */
  {
    kind: 'sequence',
    id: 'home-blog',
    path: '/en',
    frames: SCENES.blog.marks.enterFrames,
    tail: 90,
    preroll: 150,
    scroll: [
      { at: 0, to: { selector: '#enquiry ol', align: 'center', offset: -40 } },
      { at: SCENES.blog.marks.enterFrames - 2, to: { selector: '#publication ol', align: 'top', offset: -118 }, ease: 'travel' },
    ],
    measureEnd: {
      'rows[]': '#publication ol > li',
      'titles[]': '#publication ol > li span.t-title',
      'numbers[]': '#publication ol > li span.t-section-mark',
      heading: '#publication-heading',
      all: '#publication a.t-label.link-underline',
    },
    endVariants: [
      { name: 'notitle', hide: ['#publication ol > li:nth-child(1) span.t-title'] },
      { name: 'norows', hide: ['#publication ol > li', '#publication a.t-label.link-underline'] },
    ],
  },
  {
    kind: 'still',
    id: 'blog-index',
    path: '/en/blog',
    at: 470,
    measure: {
      latest: 'main a.group.grid.gap-x-10',
      title: 'main a.group.grid.gap-x-10 h2',
      meta: 'main a.group.grid.gap-x-10 p.t-meta',
      plate: 'main a.group.grid.gap-x-10 img',
      latestLabel: 'main p.t-label.mb-8',
    },
    variants: [{ name: 'notitle', hide: ['main a.group.grid.gap-x-10 h2'] }],
  },
  {
    kind: 'sequence',
    id: 'blog-hover',
    path: '/en/blog',
    frames: 70,
    revealAll: true,
    scroll: [{ at: 0, to: 470 }],
    mouse: [
      { at: 0, selector: 'main p.t-label.mb-8', dx: -300, dy: -120 },
      { at: 8, selector: 'main a.group.grid.gap-x-10 h2', dx: 40, dy: 10 },
    ],
  },
  {
    kind: 'still',
    id: 'article-top',
    path: '/en/blog/article-264-duty-to-cooperate-and-self-incrimination',
    at: 0,
    measure: {
      back: 'main header a.t-label',
      category: 'main header p.t-label',
      h1: 'main header h1',
      summary: 'main header p.t-lead, main header p.t-body',
      'byline[]': 'main header p.t-meta',
    },
    variants: [{ name: 'noh1', hide: ['main header h1'] }, { name: 'bare', hide: ['main header > *'] }],
  },
  {
    kind: 'sequence',
    id: 'article-read',
    path: '/en/blog/article-264-duty-to-cooperate-and-self-incrimination',
    frames: SCENES.blog.marks.readFrames,
    tail: 30,
    scroll: [
      { at: 0, to: 0 },
      { at: 24, to: 0 },
      { at: 120, to: { selector: 'main figure', align: 'center', offset: 40 }, ease: 'travel' },
      { at: SCENES.blog.marks.readFrames, to: { selector: '.prose-legal', align: 'top', offset: 90 }, ease: 'glide' },
    ],
  },

  /* ------------------------------------------------------------- newsroom -- */
  {
    kind: 'still',
    id: 'news-index',
    path: '/en/news',
    at: 0,
    measure: {
      h1: 'main h1',
      eyebrow: 'main p.t-label',
    },
  },
  {
    kind: 'still',
    id: 'news-story',
    path: '/en/news/orientation-day-2026',
    at: 0,
    height: 1100,
    hideHeader: false,
    measure: {
      h1: 'main header h1',
      category: 'main header p.t-label',
      photo: 'main figure img',
    },
    variants: [{ name: 'nophoto', hide: ['main figure img'] }],
  },

  /* ----------------------------------------------------------------- team -- */
  {
    kind: 'still',
    id: 'team-board',
    path: '/en/team',
    at: 0,
    height: 1700,
    measure: {
      h1: 'main h1',
      numeral: 'main p.pointer-events-none',
      board: '#board-heading',
      'portraits[]': 'section:has(#board-heading) li img',
      'names[]': 'section:has(#board-heading) li p, section:has(#board-heading) li span.font-display',
    },
    variants: [{ name: 'noportraits', hide: ['section:has(#board-heading) li img'] }],
  },
  {
    kind: 'still',
    id: 'team-committees',
    path: '/en/team',
    at: { selector: '#committee-marketing', align: 'top', offset: -170 },
    height: 1100,
    hideHeader: true,
    measure: {
      'portraits[]': 'section:has(#committee-marketing) li img, section:has(#committee-events) li img, section:has(#committee-competitions) li img, section:has(#committee-blog) li img',
    },
    variants: [{ name: 'noportraits', hide: ['main li img'] }],
  },

  /* ---------------------------------------------------------------- about -- */
  {
    kind: 'still',
    id: 'about-chronicle',
    path: '/en/about',
    at: { selector: '#chronicle-heading', align: 'top', offset: -150 },
    height: 2100,
    measure: {
      heading: '#chronicle-heading',
      'years[]': 'section:has(#chronicle-heading) p.font-display',
      'titles[]': 'section:has(#chronicle-heading) h3.t-title',
    },
    variants: [{ name: 'noyears', hide: ['section:has(#chronicle-heading) p.font-display'] }],
  },

  /* --------------------------------------------------------------- mobile -- */
  {
    kind: 'morph',
    id: 'morph',
    path: '/en/about',
    frames: SCENES.mobile.marks.morphFrames,
    from: { width: 1600, height: 900 },
    to: { width: 390, height: 844 },
    anchor: { selector: '#chronicle-heading', top: 150 },
    ease: 'travel',
    dpr: 3,
  },
  {
    kind: 'sequence',
    id: 'mobile-scroll',
    path: '/en/about',
    viewport: { width: 390, height: 844 },
    dpr: 3,
    revealAll: true,
    frames: SCENES.mobile.marks.scrollFrames + 60,
    scroll: [
      { at: 0, to: { selector: '#chronicle-heading', align: 'top', offset: -150 } },
      { at: SCENES.mobile.marks.scrollFrames + 60, to: { selector: '#chronicle-heading', align: 'top', offset: 560 }, ease: 'glide' },
    ],
  },

  /* --------------------------------------------------------------- finale -- */
  {
    kind: 'still',
    id: 'join',
    path: '/en',
    at: { selector: 'section[data-chapter-index="§ 07"]', align: 'top', offset: 0 },
    measure: {
      heading: 'section[data-chapter-index="§ 07"] h2',
      'lines[]': 'section[data-chapter-index="§ 07"] h2 [data-reveal-kind="lift"]',
      mark: 'section[data-chapter-index="§ 07"] .t-section-mark',
    },
    variants: [{ name: 'noheading', hide: ['section[data-chapter-index="§ 07"] h2'] }],
  },
];
