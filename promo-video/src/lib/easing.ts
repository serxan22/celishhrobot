import { Easing, interpolate, type EasingFunction } from 'remotion';
import { curve } from './tokens';

/** The site's curves as Remotion easing functions. */
export const ease = {
  entrance: Easing.bezier(...curve.entrance),
  exit: Easing.bezier(...curve.exit),
  scenic: Easing.bezier(...curve.scenic),
  route: Easing.bezier(...curve.route),
  /** A symmetric move with weight at both ends, for camera travel. */
  travel: Easing.bezier(0.65, 0, 0.35, 1),
  /** Settles like a scroll released with inertia: quick start, long glide. */
  glide: Easing.bezier(0.22, 0.61, 0.18, 1),
  linear: (t: number) => t,
} satisfies Record<string, EasingFunction>;

/** Progress 0..1 between two frames with an easing, clamped. */
export function progress(frame: number, start: number, end: number, easing: EasingFunction = ease.scenic): number {
  if (end <= start) return frame >= end ? 1 : 0;
  return interpolate(frame, [start, end], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Linear map with clamping, the workhorse for derived values. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Keyframed value: [[frame, value, easingIntoThisKey?], ...]. Holds before the
 * first and after the last key.
 */
export function keys(frame: number, frames: Array<[number, number, EasingFunction?]>): number {
  if (frame <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [f1, v1, e] = frames[i];
    const [f0, v0] = frames[i - 1];
    if (frame <= f1) {
      const t = progress(frame, f0, f1, e ?? ease.scenic);
      return lerp(v0, v1, t);
    }
  }
  return frames[frames.length - 1][1];
}

/**
 * A critically damped spring sampled at a frame, for settles with a touch of
 * weight (mass) but no wobble. Returns 0..1.
 */
export function settle(frame: number, start: number, durationFrames: number): number {
  if (frame <= start) return 0;
  const t = (frame - start) / durationFrames;
  if (t >= 1) return 1;
  // ~critically damped: 1 - (1 + wt) e^{-wt}, normalised to reach ~1 at t=1
  const w = 7;
  const v = 1 - (1 + w * t) * Math.exp(-w * t);
  const vEnd = 1 - (1 + w) * Math.exp(-w);
  return v / vEnd;
}

/** Deterministic pseudo-random in [0, 1) from integer seeds. */
export function hash(...seeds: number[]): number {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s * 1000003) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) % 100000) / 100000;
}
