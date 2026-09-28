import { useVideoConfig } from 'remotion';

/**
 * The frame the film is being composed for. Scenes take their anchor points
 * from here rather than from the landscape frame, so a portrait (9:16) cut can
 * re-compose rather than crop: the same scene, laid out for the other shape,
 * fed with shots captured at a phone width.
 */
export type Layout = {
  width: number;
  height: number;
  portrait: boolean;
  /** Side margin of the editorial grid, design px. */
  gutter: number;
  /** Centre of the frame. */
  cx: number;
  cy: number;
  /** Site viewport shown full-frame: CSS px wide, and design px per CSS px. */
  site: { width: number; height: number; scale: number };
};

export function layoutFor(width: number, height: number): Layout {
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    gutter: portrait ? 72 : 112,
    cx: width / 2,
    cy: height / 2,
    site: portrait ? { width: 390, height: 844, scale: width / 390 } : { width: 1600, height: 900, scale: width / 1600 },
  };
}

export function useLayout(): Layout {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
}
