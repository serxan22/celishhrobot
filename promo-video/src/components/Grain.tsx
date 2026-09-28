import { Img, staticFile, useCurrentFrame } from 'remotion';
import { hash } from '../lib/easing';

/**
 * The paper tooth the site puts on its light surfaces, carried across the
 * whole film as a very fine, moving grain — at the edge of perception, so
 * flat fields read as material rather than as fills.
 */
export function Grain({ opacity = 0.055, tile = 256 }: { opacity?: number; tile?: number }) {
  const frame = useCurrentFrame();
  // A new tile and offset every other frame: grain at 30 fps reads as film.
  const step = Math.floor(frame / 2);
  const i = Math.floor(hash(step, 7) * 8);
  const src = staticFile(`grain/grain-${i}.png`);
  const ox = Math.floor(hash(step, 11) * tile);
  const oy = Math.floor(hash(step, 13) * tile);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      {/* Holds the frame until this tile is decoded; the fill below repeats it. */}
      <Img src={src} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: `${tile}px ${tile}px`,
          backgroundPosition: `${ox}px ${oy}px`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
