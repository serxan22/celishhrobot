import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, progress } from '../lib/easing';
import { color, font, type } from '../lib/tokens';

/**
 * A caption block set the way the site sets an exhibit: a burgundy label, a
 * display title, and the numbered plate line ("Fig. 3 — …"). Each part swaps
 * with a lift when its text changes, so a sequence of photographs reads like
 * pages of the same record being turned.
 */
export type Caption = { label: string; title: string; plate?: string; figure?: number };

export function CaptionBlock({
  items,
  x,
  y,
  width = 760,
  titleSize = 58,
  onDark = true,
  exitAt,
}: {
  /** Captions with the frame each takes over at, in order. */
  items: Array<Caption & { at: number }>;
  x: number;
  y: number;
  width?: number;
  titleSize?: number;
  onDark?: boolean;
  exitAt?: number;
}) {
  const frame = useCurrentFrame();
  const current = [...items].reverse().find((i) => frame >= i.at) ?? items[0];
  const idx = items.indexOf(current);
  const prev = idx > 0 ? items[idx - 1] : undefined;
  const since = frame - current.at;
  const exit = exitAt === undefined ? 0 : progress(frame, exitAt, exitAt + 26, ease.exit);

  // A part lifts in when it differs from the previous caption; otherwise it holds.
  const part = (key: keyof Caption) => {
    const changed = !prev || prev[key] !== current[key];
    const p = changed ? progress(since, 0, 40, ease.entrance) : 1;
    return { p, changed };
  };
  const lab = part('label');
  const tit = part('title');
  const pla = part('plate');
  const labelTint = onDark ? color.wineSoft : color.wineDeep;
  const titleTint = onDark ? color.paper : color.fgPaper;
  const plateTint = onDark ? color.slatePale : color.mutedPaper;

  const clip: CSSProperties = { overflow: 'hidden', paddingBottom: '0.1em' };
  const lift = (p: number, dist = 0.9): CSSProperties => ({
    transform: `translateY(${(1 - p) * dist - exit * 1.1}em)`,
    opacity: Math.min(1, p * 1.5) * (1 - exit),
  });

  return (
    <div style={{ position: 'absolute', left: x, top: y, width }}>
      <div style={clip}>
        <div style={{ ...type.label, fontSize: 14, color: labelTint, ...lift(lab.p) }}>{current.label}</div>
      </div>
      <div style={{ ...clip, marginTop: 18 }}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: titleSize,
            lineHeight: 1.06,
            letterSpacing: '-0.01em',
            color: titleTint,
            textWrap: 'balance',
            ...lift(tit.p, 1.1),
          }}
        >
          {current.title}
        </div>
      </div>
      {current.plate ? (
        <div style={{ ...clip, marginTop: 22 }}>
          <div style={{ fontFamily: font.sans, fontSize: 14, lineHeight: 1.5, letterSpacing: '0.02em', color: plateTint, maxWidth: 560, ...lift(pla.p) }}>
            {current.figure !== undefined ? (
              <span style={{ ...type.label, fontSize: 12, letterSpacing: '0.16em', color: labelTint, marginRight: 14 }}>
                Fig.&nbsp;{current.figure}
              </span>
            ) : null}
            {current.plate}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The site's "deep" overlay idea, kept to the corner where the caption sits. */
export function Scrim({ opacity = 1, side = 'bottom-left' }: { opacity?: number; side?: 'bottom-left' | 'bottom' | 'left' }) {
  const bg =
    side === 'bottom'
      ? 'linear-gradient(to top, rgba(8,19,27,0.82) 0%, rgba(8,19,27,0.35) 32%, rgba(8,19,27,0) 58%)'
      : side === 'left'
        ? 'linear-gradient(to right, rgba(8,19,27,0.85) 0%, rgba(8,19,27,0.4) 38%, rgba(8,19,27,0) 64%)'
        : 'radial-gradient(120% 90% at 0% 100%, rgba(8,19,27,0.86) 0%, rgba(8,19,27,0.5) 34%, rgba(8,19,27,0) 62%)';
  return <div style={{ position: 'absolute', inset: 0, background: bg, opacity }} />;
}
