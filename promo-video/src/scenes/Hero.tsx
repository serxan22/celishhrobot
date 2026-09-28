import { useCurrentFrame } from 'remotion';
import { Crescent } from '../components/primitives';
import { Plate, SiteView } from '../components/media';
import { SiteLines, SiteText } from '../components/SiteText';
import { ease, progress } from '../lib/easing';
import { many, one, still } from '../lib/manifest';
import { color } from '../lib/tokens';

/**
 * The homepage's threshold, rebuilt from its capture: the site's own photograph
 * and overlay (the "bare" plate, with the type and crescent hidden), and the
 * type and crescent set live in exactly their measured places — so each can
 * be given its own timing and then handed back to the real page.
 */
export function HeroType({
  motto,
  eyebrow,
  lead,
  scroll,
  mottoStep = 7,
}: {
  /** Frame the motto begins to lift (undefined: already set). */
  motto?: number;
  eyebrow?: number;
  lead?: number;
  scroll?: number;
  mottoStep?: number;
}) {
  const frame = useCurrentFrame();
  const m = still('hero').measure;
  const fade = (at: number | undefined, dur = 72) => (at === undefined ? 1 : progress(frame, at, at + dur, ease.entrance));
  const leadP = fade(lead, 66);
  const scrollP = fade(scroll, 72);
  const line = one(m.scrollLine);
  return (
    <SiteView>
      <SiteText m={one(m.eyebrow)} opacity={fade(eyebrow)} />
      <SiteLines lines={many(m.lines)} enter={motto} step={mottoStep} />
      <SiteText
        m={one(m.lead)}
        opacity={progress(frame, lead ?? -100, (lead ?? -100) + 54, ease.entrance)}
        style={{ transform: `translateY(${(1 - leadP) * 28}px)` }}
      />
      <SiteText m={one(m.scrollLabel)} opacity={scrollP * 0.7} />
      <div
        style={{
          position: 'absolute',
          left: line.rect.x,
          top: line.rect.y,
          width: 1,
          height: line.rect.height,
          background: color.slatePale,
          opacity: 0.5 * scrollP,
        }}
      />
    </SiteView>
  );
}

export function HeroPlate() {
  return (
    <SiteView>
      <Plate id="hero" variant="bare" />
    </SiteView>
  );
}

/** The crescent exactly where the site draws it (a 3:1 arc across the viewport). */
export function HeroCrescent({ draw, from = 'start' }: { draw: number; from?: 'start' | 'end' | 'middle' }) {
  const arc = one(still('hero').measure.arc).rect;
  return <Crescent x={arc.x * 1.2} y={arc.y * 1.2} width={arc.width * 1.2} draw={draw} strokeWidth={1.25} opacity={0.7} from={from} />;
}
