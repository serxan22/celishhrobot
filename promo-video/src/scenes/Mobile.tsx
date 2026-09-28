import { Img, useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { Footage } from '../components/media';
import { DirectionalBlur } from '../components/MotionBlur';
import { ease, progress } from '../lib/easing';
import { frameSrc, morph } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color } from '../lib/tokens';
import { MontageShot } from './Finale';

const K = SCENES.mobile.marks;
const S = 1.2; // design px per CSS px, as everywhere in the film

/**
 * Everywhere. The page's own edges close in: each frame is the About page
 * genuinely re-laid-out at that width — the running head folds into MENU, the
 * chronicle's columns stack — until it is the phone layout, which then
 * scrolls, and rises away to leave the last composition behind it.
 */
export function Mobile() {
  const frame = useCurrentFrame();
  const m = morph('morph');
  const inMorph = frame < K.morphFrames;
  const i = Math.min(m.frames - 1, frame);
  const size = inMorph ? m.sizes[i] : { width: 390, height: 844 };
  const w = size.width * S;
  const h = size.height * S;
  const exit = progress(frame, K.exit, SCENES.mobile.duration, ease.exit);
  const exitSpeed = (exit - progress(frame - 1, K.exit, SCENES.mobile.duration, ease.exit)) * 1250;
  const push = 1 + 0.05 * progress(frame, K.scrollStart, K.exit, ease.scenic);
  const x = (1920 - w) / 2;
  const y = (1080 - h) / 2 - exit * 1250;
  const edge = progress(frame, 6, 30, ease.scenic);

  return (
    <Fill style={{ background: color.ink }}>
      {/* What waits behind the phone: the first beat of the finale. */}
      {frame >= K.exit - 2 ? (
        <Fill style={{ opacity: progress(frame, K.exit - 2, K.exit + 12, ease.linear) }}>
          {/* on the finale's own clock, so the cut between scenes is invisible */}
          <MontageShot index={0} local={frame - SCENES.mobile.duration} />
        </Fill>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          overflow: 'hidden',
          transformOrigin: '50% 50%',
          transform: `scale(${push})`,
          boxShadow: `0 0 0 1px rgba(195, 213, 222, ${0.32 * edge}), 0 50px 140px rgba(0,0,0,${0.5 * edge})`,
        }}
      >
        <DirectionalBlur id="phone" vy={exitSpeed} strength={0.3} max={14}>
          {inMorph ? (
            <Img src={frameSrc('morph', i)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} />
          ) : (
            <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 844, transform: `scale(${S})`, transformOrigin: '0 0' }}>
              <Footage id="mobile-scroll" frame={frame - K.scrollStart} />
            </div>
          )}
        </DirectionalBlur>
      </div>
    </Fill>
  );
}
