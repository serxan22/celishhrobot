import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, progress } from '../lib/easing';
import type { Measured, Rect } from '../lib/manifest';
import { site } from '../lib/tokens';

/** Site CSS px → design px, for a SiteView at the default full-frame placement. */
export function toDesign(r: Rect, scale: number = site.toDesign, origin: [number, number] = [0, 0]): Rect {
  return { x: origin[0] + r.x * scale, y: origin[1] + r.y * scale, width: r.width * scale, height: r.height * scale };
}

/** The measured computed type (not layout) as React style. */
export function measuredStyle(m: Measured): CSSProperties {
  const s = m.style;
  return {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight as CSSProperties['fontWeight'],
    fontStyle: s.fontStyle,
    letterSpacing: s.letterSpacing,
    color: s.color,
    fontVariantNumeric: s.fontVariantNumeric,
  };
}

export type VisualLine = Rect & { text: string; words: (Rect & { text: string })[]; style: CSSProperties };

/**
 * The lines of text exactly as the browser broke them, each with the box of its
 * glyphs. Setting each line at its box with line-height equal to the box
 * height puts every glyph back where the site drew it.
 */
export function visualLines(ms: Measured | Measured[]): VisualLine[] {
  const list = Array.isArray(ms) ? ms : [ms];
  const out: VisualLine[] = [];
  for (const m of list) {
    const style = measuredStyle(m);
    const words = m.words ?? [];
    m.lines.forEach((line, i) => {
      out.push({
        ...line,
        text: m.lineTexts?.[i] ?? m.text,
        words: words.filter((w) => Math.abs(w.y - line.y) < line.height * 0.5),
        style,
      });
    });
  }
  return out;
}

function Line({ line, style }: { line: VisualLine; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: line.x,
        top: line.y,
        whiteSpace: 'pre',
        lineHeight: `${line.height}px`,
        ...line.style,
        ...style,
      }}
    >
      {line.text}
    </div>
  );
}

/**
 * Text the site measured, set again in place with the same type, inside a
 * SiteView (site CSS px). Indistinguishable from the capture beneath it until
 * it starts to move.
 */
export function SiteText({ m, style, opacity = 1 }: { m: Measured | Measured[]; style?: CSSProperties; opacity?: number }) {
  if (opacity <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {visualLines(m).map((line, i) => (
        <Line key={i} line={line} style={style} />
      ))}
    </div>
  );
}

/**
 * Display type as the site's RevealLines sets it — each line clipped by its own
 * invisible rule — lifting in and lifting out on film time.
 */
export function SiteLines({
  lines,
  enter,
  exit,
  step = 7,
  duration = 63,
  exitStep = 4,
  exitDuration = 34,
  tint,
  style,
}: {
  lines: Measured | Measured[];
  /** Frame the first line starts to lift; omit to start already set. */
  enter?: number;
  exit?: number;
  step?: number;
  duration?: number;
  exitStep?: number;
  exitDuration?: number;
  tint?: string;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  return (
    <>
      {visualLines(lines).map((line, i) => {
        const p = enter === undefined ? 1 : progress(frame, enter + i * step, enter + i * step + duration, ease.entrance);
        const o = enter === undefined ? 1 : progress(frame, enter + i * step, enter + i * step + duration * 0.66, ease.entrance);
        const e = exit === undefined ? 0 : progress(frame, exit + i * exitStep, exit + i * exitStep + exitDuration, ease.exit);
        if (o <= 0 || e >= 1) return null;
        const pad = line.height * 0.12;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: line.x - pad,
              top: line.y - pad,
              width: line.width + pad * 4,
              height: line.height + pad * 2,
              overflow: 'hidden',
            }}
          >
            <Line
              line={{ ...line, x: pad, y: pad }}
              style={{
                ...(tint ? { color: tint } : {}),
                transform: `translate3d(0, ${(1 - p) * 0.9 - e * 1.1}em, 0)`,
                opacity: o * (1 - e * 0.5),
                ...style,
              }}
            />
          </div>
        );
      })}
    </>
  );
}
