import type { CSSProperties } from 'react';
import { visualLines } from './SiteText';
import type { Measured } from '../lib/manifest';
import { lerp } from '../lib/easing';
import { site } from '../lib/tokens';

/**
 * Text measured on the site, set with exactly the site's line breaks, placed
 * anywhere in design px at any scale. Because the lines are the site's own, a
 * block can travel between a composed position in the film and its true place
 * on the page by position and scale alone — the words never re-wrap.
 */
export function MeasuredBlock({
  m,
  x,
  y,
  scale,
  style,
  opacity = 1,
}: {
  m: Measured;
  /** Design px of the block's first-line top-left. */
  x: number;
  y: number;
  /** Design px per site CSS px (1.2 = as on the page, full frame). */
  scale: number;
  style?: CSSProperties;
  opacity?: number;
}) {
  const lines = visualLines(m);
  if (!lines.length || opacity <= 0) return null;
  const ox = Math.min(...lines.map((l) => l.x));
  const oy = lines[0].y;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transformOrigin: '0 0', transform: `scale(${scale})`, opacity }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: l.x - ox, top: l.y - oy, whiteSpace: 'pre', lineHeight: `${l.height}px`, ...l.style, ...style }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

/** Where a measured block sits on the page, in design px (full-frame SiteView). */
export function pagePlacement(m: Measured, scrollY = 0) {
  const lines = visualLines(m);
  const ox = Math.min(...lines.map((l) => l.x));
  return { x: ox * site.toDesign, y: (lines[0].y - scrollY) * site.toDesign, scale: site.toDesign };
}

export function lerpPlacement(a: { x: number; y: number; scale: number }, b: { x: number; y: number; scale: number }, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), scale: lerp(a.scale, b.scale, t) };
}
