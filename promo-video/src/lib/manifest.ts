/**
 * Typed access to public/captures/manifest.json, written by `npm run capture`.
 * Everything the film shows of the website — footage, plates, geometry, text
 * and photographs — is resolved through here.
 */
import raw from '../../public/captures/manifest.json';
import hdRaw from '../../public/photos/hd.json';
import smRaw from '../../public/photos/sm.json';
import { staticFile } from 'remotion';

export type Rect = { x: number; y: number; width: number; height: number };
export type Word = Rect & { text: string };
export type Measured = {
  rect: Rect;
  text: string;
  lines: Rect[];
  lineTexts: string[];
  words: Word[];
  style: Record<string, string>;
};
export type PhotoRef = { master: string; alt: string; caption: string; width: number; height: number };

type SequenceRecord = {
  kind: 'sequence';
  path: string;
  viewport: { width: number; height: number };
  dpr: number;
  frames: number;
  tail: number;
  scroll: number[];
  start?: Record<string, Measured | Measured[]>;
  end?: Record<string, Measured | Measured[]>;
  variants?: string[];
};
type StillRecord = {
  kind: 'still';
  path: string;
  viewport: { width: number; height: number };
  dpr: number;
  scrollY: number;
  height: number;
  variants: string[];
  measure: Record<string, Measured | Measured[]>;
};
type MorphRecord = {
  kind: 'morph';
  path: string;
  dpr: number;
  frames: number;
  sizes: { width: number; height: number; scrollY: number }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const manifest = raw as any as {
  site: string;
  capturedAt: string;
  fps: number;
  shots: Record<string, SequenceRecord | StillRecord | MorphRecord>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  photos: Record<string, { file: string; width: number; height: number; source: string }>;
};

export function seq(id: string): SequenceRecord {
  const s = manifest.shots[id];
  if (!s || s.kind !== 'sequence') throw new Error(`No captured sequence "${id}" — run npm run capture`);
  return s;
}

export function still(id: string): StillRecord {
  const s = manifest.shots[id];
  if (!s || s.kind !== 'still') throw new Error(`No captured still "${id}" — run npm run capture`);
  return s;
}

export function morph(id: string): MorphRecord {
  const s = manifest.shots[id];
  if (!s || s.kind !== 'morph') throw new Error(`No captured morph "${id}" — run npm run capture`);
  return s;
}

export const frameSrc = (id: string, f: number) => staticFile(`captures/${id}/${String(f).padStart(4, '0')}.jpg`);
export const plateSrc = (id: string, variant = 'plate') => staticFile(`captures/${id}/${variant}.png`);

const hd = hdRaw as Record<string, { file: string; width: number; height: number }>;

/**
 * The best local file for a photograph the site serves at `master`: the
 * carefully resampled full-frame version when `npm run enhance` made one,
 * otherwise the captured file (the site's master, or its larger original).
 */
const sm = smRaw as Record<string, { file: string; width: number; height: number }>;

export type PhotoSize = 'sm' | 'full';

export function photo(master: string, size: PhotoSize = 'full'): { src: string; width: number; height: number } {
  if (size === 'sm' && sm[master]) return { src: staticFile(sm[master].file), width: sm[master].width, height: sm[master].height };
  const h = hd[master];
  if (h) return { src: staticFile(h.file), width: h.width, height: h.height };
  const p = manifest.photos[master];
  if (!p) throw new Error(`Photograph not captured: ${master}`);
  return { src: staticFile(p.file), width: p.width, height: p.height };
}

export function one(m: Measured | Measured[] | undefined): Measured {
  if (!m || Array.isArray(m)) throw new Error('Expected a single measurement');
  return m;
}

export function many(m: Measured | Measured[] | undefined): Measured[] {
  if (!m) return [];
  return Array.isArray(m) ? m : [m];
}

export const content = manifest.content;
