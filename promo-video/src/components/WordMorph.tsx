import type { CSSProperties } from 'react';
import type { Measured, Word } from '../lib/manifest';
import { clamp01, lerp } from '../lib/easing';
import { site } from '../lib/tokens';
import { speedBlur } from './MotionBlur';

/**
 * One headline in several of the site's real layouts — a row on the homepage,
 * the Blog's lead story, an article's masthead — each measured word by word.
 * A layout is those word boxes placed in the frame; a morph moves every word
 * from its box in one layout to its box in the next, interpolating size,
 * weight (the faces are variable), tracking and colour, so the headline
 * recomposes rather than cross-fades. Words set off line by line of the
 * destination, like a compositor setting a new forme.
 */
export type WordLayout = {
  words: Word[];
  fontFamily: string;
  fontSize: number; // CSS px on the site
  fontWeight: number;
  letterSpacingEm: number;
  color: [number, number, number];
  /** Design px per site CSS px, and the design-px position of site (0, 0). */
  scale: number;
  origin: [number, number];
};

export type RGB = [number, number, number];

const parseColor = (c: string): RGB => {
  const m = c.match(/(\d+(?:\.\d+)?)/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
};

export function layoutOf(
  m: Measured,
  opts: { scale?: number; origin?: [number, number]; scrollY?: number; color?: string } = {},
): WordLayout {
  const fontSize = parseFloat(m.style.fontSize);
  const ls = m.style.letterSpacing === 'normal' ? 0 : parseFloat(m.style.letterSpacing) / fontSize;
  const scale = opts.scale ?? site.toDesign;
  return {
    words: m.words,
    fontFamily: m.style.fontFamily,
    fontSize,
    fontWeight: Number(m.style.fontWeight) || 400,
    letterSpacingEm: ls,
    color: parseColor(opts.color ?? m.style.color),
    scale,
    origin: [opts.origin?.[0] ?? 0, (opts.origin?.[1] ?? 0) - (opts.scrollY ?? 0) * scale],
  };
}

/** A layout moved and scaled as a whole (e.g. the masthead set larger, centred). */
export function transformLayout(l: WordLayout, opts: { scale: number; anchor: [number, number]; at: [number, number] }): WordLayout {
  const k = opts.scale;
  return {
    ...l,
    scale: l.scale * k,
    origin: [opts.at[0] + (l.origin[0] - opts.anchor[0]) * k, opts.at[1] + (l.origin[1] - opts.anchor[1]) * k],
  };
}

/** Bounding box of a layout in design px. */
export function layoutBox(l: WordLayout) {
  const xs = l.words.map((w) => l.origin[0] + w.x * l.scale);
  const ys = l.words.map((w) => l.origin[1] + w.y * l.scale);
  const x2 = l.words.map((w) => l.origin[0] + (w.x + w.width) * l.scale);
  const y2 = l.words.map((w) => l.origin[1] + (w.y + w.height) * l.scale);
  return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...x2), y2: Math.max(...y2) };
}

/** Index of the visual line each word sits on. */
function lineIndex(words: Word[]): number[] {
  const out: number[] = [];
  let line = 0;
  words.forEach((w, i) => {
    if (i > 0 && Math.abs(w.y - words[i - 1].y) > w.height * 0.5) line += 1;
    out.push(line);
  });
  return out;
}

export function WordMorph({
  from,
  to,
  t,
  stagger = 0.45,
  dip = 0.3,
  colorAt,
  reverse = false,
  tPrev,
  style,
  opacity = 1,
}: {
  from: WordLayout;
  to: WordLayout;
  /** 0..1, already eased. */
  t: number;
  /** Portion of the move over which the words' departures are spread. */
  stagger?: number;
  /** How far a word's opacity dips while it is in flight. */
  dip?: number;
  /** Optional colour by current position — e.g. to follow a surface wiping behind. */
  colorAt?: (x: number, y: number, h: number, mixed: RGB) => RGB;
  /** Set the last line first — when words travel down past lines already set. */
  reverse?: boolean;
  /** The eased progress one frame earlier: gives each word its speed, for blur. */
  tPrev?: number;
  style?: CSSProperties;
  opacity?: number;
}) {
  const n = Math.min(from.words.length, to.words.length);
  const lines = lineIndex(to.words);
  const nLines = lines[lines.length - 1] + 1;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = from.words[i];
        const b = to.words[i];
        // Lines of the destination set off in order; words within a line a
        // hair apart.
        const inLine = lines.filter((l) => l === lines[i]);
        const pos = lines.slice(0, i).filter((l) => l === lines[i]).length;
        const order = reverse ? nLines - 1 - lines[i] : lines[i];
        const d =
          (nLines > 1 ? (order / (nLines - 1)) * stagger * 0.78 : 0) +
          (inLine.length > 1 ? (pos / (inLine.length - 1)) * stagger * 0.22 : 0);
        const at = (tt: number) => {
          const uu = clamp01((tt - d) / (1 - stagger));
          return uu * uu * (3 - 2 * uu);
        };
        const s = at(t);
        const x = lerp(from.origin[0] + a.x * from.scale, to.origin[0] + b.x * to.scale, s);
        const y = lerp(from.origin[1] + a.y * from.scale, to.origin[1] + b.y * to.scale, s);
        const sp = tPrev === undefined ? 0 : at(tPrev);
        const travel = Math.hypot(
          (to.origin[0] + b.x * to.scale) - (from.origin[0] + a.x * from.scale),
          (to.origin[1] + b.y * to.scale) - (from.origin[1] + a.y * from.scale),
        );
        const speed = Math.abs(s - sp) * travel;
        const size = lerp(from.fontSize * from.scale, to.fontSize * to.scale, s);
        const h = lerp(a.height * from.scale, b.height * to.scale, s);
        const mixed = from.color.map((v, k) => Math.round(lerp(v, to.color[k], s))) as RGB;
        const c = colorAt ? colorAt(x, y, h, mixed) : mixed;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              whiteSpace: 'pre',
              fontFamily: to.fontFamily,
              fontSize: size,
              lineHeight: `${h}px`,
              fontWeight: Math.round(lerp(from.fontWeight, to.fontWeight, s)),
              letterSpacing: `${lerp(from.letterSpacingEm, to.letterSpacingEm, s)}em`,
              color: `rgb(${c.map(Math.round).join(',')})`,
              opacity: 1 - dip * Math.sin(Math.PI * s),
              filter: speedBlur(speed, 0.09, 2.4),
              ...style,
            }}
          >
            {b.text}
          </span>
        );
      })}
    </div>
  );
}

/** Colour that flips as a surface's edge travels down past each word. */
export function edgeColor(edgeY: number, above: RGB, below: RGB, soft = 70) {
  return (_x: number, y: number, h: number): RGB => {
    const k = clamp01((edgeY - (y + h / 2)) / soft + 0.5);
    return above.map((v, i) => lerp(below[i], v, k)) as RGB;
  };
}
