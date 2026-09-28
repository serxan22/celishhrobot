/**
 * The film's small vocabulary of marks: the hairline, the lifted line of type,
 * the label, the chapter mark and the crescent. Each is the website's own
 * device (see globals.css: `.rule`, `[data-reveal-kind='lift']`, `.t-label`,
 * `.t-section-mark`, `CrescentArc`) given a timeline.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame, type EasingFunction } from 'remotion';
import { ease, progress, lerp } from '../lib/easing';
import { color, font, type } from '../lib/tokens';

/* ------------------------------------------------------------------ Rule -- */
/** A hairline that draws itself — `[data-reveal-kind='rule']`, on film time. */
export function Rule({
  x,
  y,
  length,
  start,
  duration = 66,
  thickness = 1,
  tint = color.wine,
  origin = 'left',
  vertical = false,
  opacity = 1,
  easing = ease.scenic,
  retract,
}: {
  x: number;
  y: number;
  length: number;
  start: number;
  duration?: number;
  thickness?: number;
  tint?: string;
  origin?: 'left' | 'center' | 'right';
  vertical?: boolean;
  opacity?: number;
  easing?: EasingFunction;
  /** Frame at which the line retracts toward its far end. */
  retract?: { at: number; duration?: number };
}) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, start + duration, easing);
  const r = retract ? progress(frame, retract.at, retract.at + (retract.duration ?? 40), ease.exit) : 0;
  if (p <= 0 || r >= 1) return null;
  const transformOrigin =
    origin === 'center' ? 'center' : vertical ? (origin === 'left' ? 'top' : 'bottom') : origin === 'left' ? 'left' : 'right';
  const retractOrigin = vertical ? (origin === 'left' ? 'bottom' : 'top') : origin === 'left' ? 'right' : 'left';
  const style: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: vertical ? thickness : length,
    height: vertical ? length : thickness,
    background: tint,
    opacity,
    transformOrigin: r > 0 ? retractOrigin : transformOrigin,
    transform: vertical ? `scaleY(${r > 0 ? 1 - r : p})` : `scaleX(${r > 0 ? 1 - r : p})`,
  };
  return <div style={style} />;
}

/* ------------------------------------------------------------------ Lift -- */
/**
 * Lines of display type that lift from behind an invisible rule, one after
 * another — the site's `RevealLines`. With `exitAt`, they leave the same way,
 * upward, behind the rule above.
 */
export function Lift({
  lines,
  start,
  step = 7,
  duration = 63,
  style,
  lineStyle,
  exitAt,
  exitStep = 4,
  exitDuration = 30,
  distance = 0.9,
}: {
  lines: ReactNode[];
  start: number;
  step?: number;
  duration?: number;
  style?: CSSProperties;
  lineStyle?: CSSProperties;
  exitAt?: number;
  exitStep?: number;
  exitDuration?: number;
  distance?: number;
}) {
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {lines.map((line, i) => {
        const p = progress(frame, start + i * step, start + i * step + duration, ease.entrance);
        const o = progress(frame, start + i * step, start + i * step + duration * 0.66, ease.entrance);
        const e = exitAt === undefined ? 0 : progress(frame, exitAt + i * exitStep, exitAt + i * exitStep + exitDuration, ease.exit);
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: '0.08em' }}>
            <div
              style={{
                display: 'block',
                transform: `translate3d(0, ${(1 - p) * distance - e * 1.05}em, 0)`,
                opacity: o * (1 - e * 0.6),
                ...lineStyle,
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Label -- */
/** The law-report register: small caps-tracked sans for marginalia. */
export function Label({
  children,
  start,
  duration = 40,
  style,
  size = 13,
  tint = color.slatePale,
  rise = 10,
  exitAt,
}: {
  children: ReactNode;
  start: number;
  duration?: number;
  style?: CSSProperties;
  size?: number;
  tint?: string;
  rise?: number;
  exitAt?: number;
}) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, start + duration, ease.entrance);
  const e = exitAt === undefined ? 0 : progress(frame, exitAt, exitAt + 24, ease.exit);
  return (
    <div
      style={{
        ...type.label,
        fontSize: size,
        color: tint,
        opacity: p * (1 - e),
        transform: `translateY(${(1 - p) * rise - e * rise * 0.6}px)`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------- ChapterMark -- */
/** "§ 02 —— ALS EVENTS": index, a short burgundy rule, the chapter's name. */
export function ChapterMark({
  index,
  title,
  start,
  x,
  y,
  size = 13,
  onInk = true,
  exitAt,
}: {
  index: string;
  title: string;
  start: number;
  x: number;
  y: number;
  size?: number;
  onInk?: boolean;
  exitAt?: number;
}) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, start + 36, ease.entrance);
  const r = progress(frame, start + 6, start + 60, ease.scenic);
  const e = exitAt === undefined ? 0 : progress(frame, exitAt, exitAt + 24, ease.exit);
  const faint = onInk ? '#74888f' : '#69747c';
  const accent = onInk ? color.wineSoft : color.wineDeep;
  const markStyle: CSSProperties = {
    fontFamily: font.sans,
    fontSize: size,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    fontVariantNumeric: 'tabular-nums',
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.9,
        opacity: p * (1 - e),
      }}
    >
      <span style={{ ...markStyle, color: accent }}>{index}</span>
      <span style={{ display: 'block', width: size * 3, height: 1, background: accent, transform: `scaleX(${r})`, transformOrigin: 'left' }} />
      <span style={{ ...markStyle, color: faint }}>{title}</span>
    </div>
  );
}

/* -------------------------------------------------------------- Crescent -- */
/**
 * The crescent from the seal, drawn as a stroke — the site's CrescentArc
 * (viewBox 0 0 300 100, path M 2 2 A 149 96 0 0 0 298 2). `draw` is 0..1.
 */
export function Crescent({
  x,
  y,
  width,
  draw,
  strokeWidth = 1.25,
  tint = color.wine,
  opacity = 0.7,
  from = 'start',
}: {
  x: number;
  y: number;
  width: number;
  draw: number;
  strokeWidth?: number;
  tint?: string;
  opacity?: number;
  /** Draw from the path's start, its end, or outward from its middle. */
  from?: 'start' | 'end' | 'middle';
}) {
  const d = Math.max(0, Math.min(1, draw));
  const L = 100;
  // Dashes are measured in pathLength units, so the stroke must scale with the
  // drawing (vector-effect: non-scaling-stroke would measure them in screen
  // px); the width is converted to user units to stay a true hairline.
  const userStroke = (strokeWidth * 300) / width;
  let dasharray = `${L} ${L}`;
  let dashoffset = L * (1 - d);
  if (from === 'end') dashoffset = -L * (1 - d);
  if (from === 'middle') {
    dasharray = `${L * d} ${L}`;
    dashoffset = -L * (1 - d) * 0.5;
  }
  return (
    <svg
      viewBox="0 0 300 100"
      fill="none"
      style={{ position: 'absolute', left: x, top: y, width, height: width / 3, overflow: 'visible', opacity }}
    >
      <path
        d="M 2 2 A 149 96 0 0 0 298 2"
        stroke={tint}
        strokeWidth={userStroke}
        strokeLinecap="round"
        pathLength={L}
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ misc -- */
export function Fill({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>{children}</div>;
}

/** Fades a whole layer in and/or out on film time. */
export function Fade({
  children,
  inAt,
  inDur = 30,
  outAt,
  outDur = 30,
  style,
}: {
  children: ReactNode;
  inAt?: number;
  inDur?: number;
  outAt?: number;
  outDur?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const a = inAt === undefined ? 1 : progress(frame, inAt, inAt + inDur, ease.scenic);
  const b = outAt === undefined ? 0 : progress(frame, outAt, outAt + outDur, ease.scenic);
  const o = a * (1 - b);
  if (o <= 0.001) return null;
  return <div style={{ position: 'absolute', inset: 0, opacity: o, ...style }}>{children}</div>;
}

export { lerp };
