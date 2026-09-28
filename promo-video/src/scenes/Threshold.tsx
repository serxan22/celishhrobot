import { useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { EndPlate, Footage, SiteView } from '../components/media';
import { visualLines } from '../components/SiteText';
import { ease, lerp, progress } from '../lib/easing';
import { many, seq } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color } from '../lib/tokens';
import { HeroCrescent, HeroPlate, HeroType } from './Hero';

const K = SCENES.threshold.marks;
export const THRESHOLD_BREAKOUT = K.scrollStart + K.scrollFrames + 50;
/** Where "argument." comes to rest (design px, centre) and how large. */
export const ARGUMENT = { x: 960, y: 520, scale: 3.1 };

/**
 * The threshold held: the crescent is drawn across it at architectural scale.
 * Then the page moves — the real homepage, stepped frame by frame, receding as
 * the reader scrolls into § 01 — and the one word the Society's statement ends
 * on leaves the page.
 */
export function Threshold() {
  const frame = useCurrentFrame();
  const footageFrame = frame - K.scrollStart;
  const handoff = progress(frame, K.scrollStart - 4, K.scrollStart + 6, ease.linear);
  const B = THRESHOLD_BREAKOUT;
  const broken = frame >= B;

  const s = seq('home-threshold');
  const lines = many(s.end?.lines);

  return (
    <Fill style={{ background: color.ink }}>
      {/* The live threshold, until the footage takes over. */}
      {handoff < 1 ? (
        <Fill>
          <HeroPlate />
          <HeroCrescent draw={progress(frame, K.arcIn, K.arcIn + 92, ease.scenic)} />
          <HeroType />
        </Fill>
      ) : null}

      {/* The real page, stepped. */}
      {handoff > 0 && !broken ? (
        <Fill style={{ opacity: handoff }}>
          <SiteView>
            <Footage id="home-threshold" frame={footageFrame} />
          </SiteView>
        </Fill>
      ) : null}

      {broken ? <Breakout frame={frame - B} lines={lines} /> : null}
    </Fill>
  );
}

/** § 01's statement: the page falls away and "argument." becomes the frame. */
function Breakout({ frame, lines }: { frame: number; lines: ReturnType<typeof many> }) {
  const dim = progress(frame, 2, 46, ease.scenic);
  const travel = progress(frame, 12, 74, ease.scenic);
  const vlines = visualLines(lines);
  const last = vlines[vlines.length - 1];
  const word = last.words[last.words.length - 1];
  const rest = last.words.slice(0, -1).map((w) => w.text).join(' ');
  const ink = [27, 39, 48];
  const paper = [251, 249, 245];
  const c = ink.map((v, i) => Math.round(lerp(v, paper[i], progress(frame, 10, 50, ease.scenic))));

  return (
    <Fill>
      <SiteView>
        <EndPlate id="home-threshold" variant="noheading" />
      </SiteView>
      <Fill style={{ background: color.ink, opacity: dim }} />
      <SiteView>
        {vlines.map((line, i) => {
          const e = progress(frame, i * 5, i * 5 + 34, ease.exit);
          const text = i === vlines.length - 1 ? rest : line.text;
          const pad = line.height * 0.12;
          return (
            <div
              key={i}
              style={{ position: 'absolute', left: line.x - pad, top: line.y - pad, width: line.width + pad * 4, height: line.height + pad * 2, overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: pad,
                  top: pad,
                  whiteSpace: 'pre',
                  lineHeight: `${line.height}px`,
                  ...line.style,
                  transform: `translateY(${-e * 1.1}em)`,
                  opacity: 1 - e * 0.4,
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
      </SiteView>
      {/* The word itself: anchored at its top-left on the page, at its centre
          in the frame, scaling about whichever anchor it has reached. */}
      <div
        style={{
          position: 'absolute',
          left: lerp(word.x * 1.2, ARGUMENT.x, travel),
          top: lerp(word.y * 1.2, ARGUMENT.y, travel),
          transformOrigin: `${lerp(0, 50, travel)}% ${lerp(0, 50, travel)}%`,
          transform: `translate(${-lerp(0, 50, travel)}%, ${-lerp(0, 50, travel)}%) scale(${lerp(1.2, 1.2 * ARGUMENT.scale, travel)})`,
          whiteSpace: 'pre',
          lineHeight: `${word.height}px`,
          ...last.style,
          color: `rgb(${c.join(',')})`,
        }}
      >
        {word.text}
      </div>
    </Fill>
  );
}

/** "argument." at rest in the frame; `exit` 0..1 lifts it out behind its rule. */
export function ArgumentWord({ exit = 0 }: { exit?: number }) {
  const lines = many(seq('home-threshold').end?.lines);
  const vlines = visualLines(lines);
  const last = vlines[vlines.length - 1];
  const word = last.words[last.words.length - 1];
  const s = 1.2 * ARGUMENT.scale;
  const w = word.width * s;
  const h = word.height * s;
  return (
    <div
      style={{
        position: 'absolute',
        left: ARGUMENT.x - w / 2 - 40,
        top: ARGUMENT.y - h / 2 - 20,
        width: w + 80,
        height: h + 40,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: w / 2 + 40,
          top: h / 2 + 20,
          transformOrigin: '50% 50%',
          transform: `translate(-50%, -50%) scale(${s}) translateY(${-exit * 1.15}em)`,
          whiteSpace: 'pre',
          lineHeight: `${word.height}px`,
          ...last.style,
          color: color.paper,
          opacity: 1 - exit * 0.3,
        }}
      >
        {word.text}
      </div>
    </div>
  );
}
