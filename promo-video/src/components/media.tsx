import type { CSSProperties, ReactNode } from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { ease, progress } from '../lib/easing';
import { color, site } from '../lib/tokens';
import { frameSrc, photo, plateSrc, seq, still, type PhotoSize } from '../lib/manifest';

/* ----------------------------------------------------------------- Photo -- */
/**
 * A photograph the website serves, at the best resolution captured, cropped
 * `cover` around a focal point — as the site's Figure does.
 */
export function Photo({
  master,
  focal = [0.5, 0.5],
  zoom = 1,
  shift = [0, 0],
  style,
  imgStyle,
  size = 'full',
}: {
  master: string;
  /** 'sm' for photographs shown small — keeps a frame's decode memory in check. */
  size?: PhotoSize;
  focal?: [number, number];
  zoom?: number;
  /** Fractional pan of the image inside its frame, e.g. [0.02, 0]. */
  shift?: [number, number];
  style?: CSSProperties;
  imgStyle?: CSSProperties;
}) {
  const p = photo(master, size);
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', ...style }}>
      <Img
        src={p.src}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%`,
          transform: `translate(${shift[0] * 100}%, ${shift[1] * 100}%) scale(${zoom})`,
          transformOrigin: `${focal[0] * 100}% ${focal[1] * 100}%`,
          ...imgStyle,
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Unmask -- */
export type UnmaskDirection = 'down' | 'up' | 'openV' | 'openH' | 'right' | 'left';

/**
 * Photography arrives by uncovering, never by sliding (globals.css): a clip
 * that opens, led by a burgundy hairline that travels with its edge and fades
 * as the frame becomes whole. Here it is also the film's scene transition.
 */
export function Unmask({
  start,
  duration = 96,
  direction = 'down',
  children,
  style,
  edge = true,
  edgeTint = color.wine,
  edgeWidth = 1.5,
  easing = ease.scenic,
  settle = 0,
}: {
  start: number;
  duration?: number;
  direction?: UnmaskDirection;
  children: ReactNode;
  style?: CSSProperties;
  edge?: boolean;
  edgeTint?: string;
  edgeWidth?: number;
  easing?: (t: number) => number;
  /** Extra scale the content settles from while it opens (the site uses 0.08). */
  settle?: number;
}) {
  const frame = useCurrentFrame();
  const p = progress(frame, start, start + duration, easing);
  if (p <= 0) return null;
  const q = (1 - p) * 100;
  const clip =
    direction === 'down'
      ? `inset(0 0 ${q}% 0)`
      : direction === 'up'
        ? `inset(${q}% 0 0 0)`
        : direction === 'openV'
          ? `inset(${q / 2}% 0 ${q / 2}% 0)`
          : direction === 'openH'
            ? `inset(0 ${q / 2}% 0 ${q / 2}%)`
            : direction === 'right'
              ? `inset(0 ${q}% 0 0)`
              : `inset(0 0 0 ${q}%)`;
  const edgeOpacity = edge ? 1 - progress(frame, start + duration * 0.8, start + duration, ease.linear) : 0;
  const settleScale = 1 + settle * (1 - progress(frame, start, start + duration * 1.4, ease.scenic));
  const edges: CSSProperties[] = [];
  const line = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', background: edgeTint, opacity: edgeOpacity, ...pos });
  if (direction === 'down') edges.push(line({ left: 0, right: 0, top: `calc(${100 - q}% - ${edgeWidth}px)`, height: edgeWidth }));
  if (direction === 'up') edges.push(line({ left: 0, right: 0, top: `${q}%`, height: edgeWidth }));
  if (direction === 'openV') {
    edges.push(line({ left: 0, right: 0, top: `calc(${q / 2}% - ${edgeWidth / 2}px)`, height: edgeWidth }));
    edges.push(line({ left: 0, right: 0, top: `calc(${100 - q / 2}% - ${edgeWidth / 2}px)`, height: edgeWidth }));
  }
  if (direction === 'openH') {
    edges.push(line({ top: 0, bottom: 0, left: `calc(${q / 2}% - ${edgeWidth / 2}px)`, width: edgeWidth }));
    edges.push(line({ top: 0, bottom: 0, left: `calc(${100 - q / 2}% - ${edgeWidth / 2}px)`, width: edgeWidth }));
  }
  if (direction === 'right') edges.push(line({ top: 0, bottom: 0, left: `calc(${100 - q}% - ${edgeWidth}px)`, width: edgeWidth }));
  if (direction === 'left') edges.push(line({ top: 0, bottom: 0, left: `${q}%`, width: edgeWidth }));
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: clip, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${settleScale})` }}>{children}</div>
      </div>
      {p < 1 || edgeOpacity > 0 ? edges.map((s, i) => <div key={i} style={s} />) : null}
    </div>
  );
}

/* -------------------------------------------------------------- SiteView -- */
/**
 * A window onto the website: a captured plate or a frame of captured footage,
 * placed in design px. Children are laid out in the site's own CSS px (the
 * coordinates capture measured), so overlays land exactly on what they replace.
 */
export function SiteView({
  x = 0,
  y = 0,
  scale = site.toDesign,
  width = site.width,
  height = site.height,
  scrollY = 0,
  children,
  style,
  clip = true,
}: {
  x?: number;
  y?: number;
  /** Design px per site CSS px. 1.2 = full-frame. */
  scale?: number;
  /** Visible window, in site CSS px. */
  width?: number;
  height?: number;
  /** Offset into a tall plate, CSS px. */
  scrollY?: number;
  children: ReactNode;
  style?: CSSProperties;
  clip?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width * scale,
        height: height * scale,
        overflow: clip ? 'hidden' : 'visible',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height: height + scrollY + 4000,
          transform: `scale(${scale}) translateY(${-scrollY}px)`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A captured plate, in site CSS px, at (0, 0) of its SiteView. */
export function Plate({ id, variant = 'plate', style }: { id: string; variant?: string; style?: CSSProperties }) {
  const s = still(id);
  return (
    <Img
      src={plateSrc(id, variant)}
      style={{ position: 'absolute', left: 0, top: 0, width: s.viewport.width, height: s.height, ...style }}
    />
  );
}

/** One frame of captured footage, chosen by the local frame (clamped). */
export function Footage({ id, frame, style }: { id: string; frame: number; style?: CSSProperties }) {
  const s = seq(id);
  const f = Math.max(0, Math.min(s.frames + s.tail - 1, Math.round(frame)));
  return (
    <Img
      src={frameSrc(id, f)}
      style={{ position: 'absolute', left: 0, top: 0, width: s.viewport.width, height: s.viewport.height, ...style }}
    />
  );
}

/** A still captured at the end of a sequence (e.g. with an element hidden). */
export function EndPlate({ id, variant = 'end', style }: { id: string; variant?: string; style?: CSSProperties }) {
  const s = seq(id);
  return (
    <Img
      src={plateSrc(id, variant)}
      style={{ position: 'absolute', left: 0, top: 0, width: s.viewport.width, height: s.viewport.height, ...style }}
    />
  );
}

/* ---------------------------------------------------------------- Camera -- */
/**
 * Moves everything inside it as one: a push, a pull, a drift. Transforms are
 * applied about a focus point (design px), so a push-in lands on its subject.
 */
export function Camera({
  children,
  zoom = 1,
  x = 0,
  y = 0,
  rotate = 0,
  focus = [960, 540],
  tilt = 0,
  style,
}: {
  children: ReactNode;
  zoom?: number;
  x?: number;
  y?: number;
  rotate?: number;
  focus?: [number, number];
  /** Degrees of rotateX, with a long lens — for the rare perspective move. */
  tilt?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: `${focus[0]}px ${focus[1]}px`,
        transform: `${tilt ? `perspective(4200px) rotateX(${tilt}deg) ` : ''}translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
