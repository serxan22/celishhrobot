import { useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { Unmask } from '../components/media';
import { ease, progress } from '../lib/easing';
import { content } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';
import { HeroPlate, HeroType } from './Hero';

const K = SCENES.identity.marks;
const LINE_Y = 540;

/**
 * § Identity. Ink, almost silence. A hairline draws; the Society's name rises
 * from behind it and the line of its founding descends from behind it. Then the
 * line opens — its two edges travel apart like the unmasking of a photograph on
 * the site — and the real homepage is behind it, its motto lifting into place.
 */
export function Identity() {
  const frame = useCurrentFrame();
  const eyebrow: string = content.home.hero.eyebrow;

  // The hairline: drawn out from the centre, then run to the frame's edges.
  const drawn = progress(frame, K.lineIn, K.lineIn + 70, ease.scenic);
  const extended = progress(frame, K.open - 34, K.open + 4, ease.entrance);
  const half = 300 * drawn + (960 - 300) * extended;
  const lineGone = frame >= K.open + 2;

  // The name lifts from behind the line; the founding line drops from it.
  const nameIn = progress(frame, K.nameIn, K.nameIn + 66, ease.entrance);
  const labelIn = progress(frame, K.labelIn, K.labelIn + 60, ease.entrance);
  const out = progress(frame, K.open - 26, K.open + 6, ease.exit);

  return (
    <Fill style={{ background: color.ink }}>
      <Unmask start={K.open} duration={K.openEnd - K.open} direction="openV" settle={0.08} edgeWidth={1.25}>
        <HeroPlate />
      </Unmask>

      {!lineGone && half > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 960 - half,
            width: half * 2,
            top: LINE_Y - 0.625,
            height: 1.25,
            background: color.wine,
          }}
        />
      ) : null}

      {/* above the line: the wordmark, as the running head sets it */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: LINE_Y - 74, height: 58, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 10,
            textAlign: 'center',
            fontFamily: font.sans,
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: '0.34em',
            textIndent: '0.34em',
            textTransform: 'uppercase',
            color: color.paper,
            transform: `translateY(${(1 - nameIn) * 58 - out * 18}px)`,
            opacity: Math.min(1, nameIn * 1.4) * (1 - out),
          }}
        >
          ADA&nbsp;Law&nbsp;Society
        </div>
      </div>

      {/* below the line: where and since when */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: LINE_Y + 1, height: 44, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 20,
            textAlign: 'center',
            ...type.label,
            fontSize: 14,
            letterSpacing: '0.3em',
            textIndent: '0.3em',
            color: color.slatePale,
            transform: `translateY(${(labelIn - 1) * 40 + out * 14}px)`,
            opacity: labelIn * (1 - out),
          }}
        >
          {eyebrow}
        </div>
      </div>

      <HeroType motto={K.mottoIn} eyebrow={K.eyebrowIn} lead={K.leadIn} scroll={K.leadIn + 22} />
    </Fill>
  );
}
