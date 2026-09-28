import type { ReactNode } from 'react';

/**
 * Selective motion blur. Every position in the film is a function of the
 * frame, so a moving layer knows its exact velocity; this blurs it along the
 * direction of travel in proportion — and not at all when it is still. Kept
 * subtle: it should read as a shutter, not as an effect.
 */
export function DirectionalBlur({
  id,
  vx = 0,
  vy = 0,
  strength = 0.45,
  max = 9,
  children,
}: {
  /** Unique per use: the SVG filter's id. */
  id: string;
  /** Velocity in design px per frame. */
  vx?: number;
  vy?: number;
  strength?: number;
  max?: number;
  children: ReactNode;
}) {
  const sx = Math.min(max, Math.abs(vx) * strength);
  const sy = Math.min(max, Math.abs(vy) * strength);
  if (sx < 0.35 && sy < 0.35) return <>{children}</>;
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={id} x="-5%" y="-20%" width="110%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, filter: `url(#${id})` }}>{children}</div>
    </>
  );
}

/** An isotropic blur for small elements, from a speed in design px/frame. */
export function speedBlur(speed: number, strength = 0.12, max = 3.2): string | undefined {
  const b = Math.min(max, speed * strength);
  return b < 0.25 ? undefined : `blur(${b.toFixed(2)}px)`;
}
