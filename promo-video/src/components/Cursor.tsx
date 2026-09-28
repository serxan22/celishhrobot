import { Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { hash, progress } from '../lib/easing';

/**
 * A pointer that moves like a hand, not a tween: each move is a gentle arc,
 * fast off the mark and slowing well before its target, with a hair of
 * overshoot corrected on arrival. It appears only where interaction matters,
 * and a click is a small press — no rings, no highlights.
 */
export type CursorKey = { at: number; x: number; y: number };

const approach = Easing.bezier(0.28, 0.02, 0.08, 1);

function pointAt(keys: CursorKey[], frame: number) {
  if (frame <= keys[0].at) return { x: keys[0].x, y: keys[0].y, moving: false };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.at) {
      const t = progress(frame, a.at, b.at, approach);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      // Arc: control point offset perpendicular to the move, side chosen by hash.
      const side = hash(i, a.at) > 0.5 ? 1 : -1;
      const bow = Math.min(len * 0.12, 60) * side;
      const cx = a.x + dx * 0.5 - (dy / len) * bow;
      const cy = a.y + dy * 0.5 + (dx / len) * bow;
      const u = 1 - t;
      let x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
      let y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
      // A small overshoot that settles back in the last fifth of the move.
      const o = Math.sin(Math.min(1, Math.max(0, (t - 0.8) / 0.2)) * Math.PI) * Math.min(len * 0.012, 5);
      x += (dx / len) * o;
      y += (dy / len) * o;
      return { x, y, moving: t < 1 };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last.x, y: last.y, moving: false };
}

export function Cursor({
  keys,
  clicks = [],
  appear,
  vanish,
  size = 30,
}: {
  keys: CursorKey[];
  clicks?: number[];
  appear: number;
  vanish?: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const inP = progress(frame, appear, appear + 14);
  const outP = vanish === undefined ? 0 : progress(frame, vanish, vanish + 14);
  const opacity = inP * (1 - outP);
  if (opacity <= 0) return null;
  const { x, y } = pointAt(keys, frame);
  let press = 1;
  for (const c of clicks) {
    if (frame >= c && frame < c + 14) {
      const t = (frame - c) / 14;
      press = 1 - 0.14 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
    }
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size * 1.5,
        opacity,
        transform: `scale(${press})`,
        transformOrigin: '3px 2px',
        filter: 'drop-shadow(0 2px 3px rgba(8, 19, 27, 0.35))',
        pointerEvents: 'none',
      }}
    >
      <Img src={staticFile('brand/cursor.svg')} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
