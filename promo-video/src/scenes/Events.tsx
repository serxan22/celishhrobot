import { useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { EndPlate, Footage, Photo, Plate, SiteView } from '../components/media';
import { CaptionBlock, Scrim, type Caption } from '../components/Editorial';
import { toDesign } from '../components/SiteText';
import { ease, lerp, progress } from '../lib/easing';
import { content, one, seq, still, type Rect } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color } from '../lib/tokens';
import { ArgumentWord } from './Threshold';

const K = SCENES.events.marks;
const FULL: Rect = { x: 0, y: 0, width: 1920, height: 1080 };

type Figure = { master: string; caption: string };
const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.!?](?=\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > 72 ? out.slice(0, out.indexOf(',') > 20 ? out.indexOf(',') : 72) + '.' : out;
};
const findFigure = (list: Figure[], key: string): Figure => {
  const f = list.find((x) => x.master.includes(key));
  if (!f) throw new Error(`No figure matching ${key}`);
  return f;
};

/**
 * § 02 — argument. The real docket; one exhibit held up; then the photograph
 * leaves its frame and the record is turned page by page — matched on the
 * shape of each picture (a row of figures, a lectern) — until it settles back
 * into the docket, four events down.
 */
export function Events() {
  const frame = useCurrentFrame();
  const docket = content.home.docket as Array<{ label: string; title: string; plate: string; photo: { master: string; focal: [number, number] } }>;
  const moot = content.moot.figures as Figure[];
  const debate = content.debate.figures as Figure[];

  const titleCase = (label: string) => label; // labels are set in caps by the type style
  const photos: Array<{ master: string; focal: [number, number]; caption: Caption }> = [
    { master: docket[0].photo.master, focal: [0.5, 0.66], caption: { label: docket[0].label, title: docket[0].title, plate: firstSentence(findFigure(moot, 'moot-bench').caption), figure: 1 } },
    { master: findFigure(moot, 'moot-award').master, focal: [0.5, 0.6], caption: { label: docket[0].label, title: docket[0].title, plate: firstSentence(findFigure(moot, 'moot-award').caption), figure: 2 } },
    { master: findFigure(moot, 'moot-counsel').master, focal: [0.46, 0.63], caption: { label: docket[0].label, title: docket[0].title, plate: firstSentence(findFigure(moot, 'moot-counsel').caption), figure: 3 } },
    { master: findFigure(moot, 'moot-hall').master, focal: [0.6, 0.7], caption: { label: docket[0].label, title: docket[0].title, plate: firstSentence(findFigure(moot, 'moot-hall').caption), figure: 4 } },
    { master: findFigure(debate, 'debate-2025-speaker').master, focal: [0.42, 0.5], caption: { label: titleCase(docket[2].label), title: docket[2].title, plate: firstSentence(findFigure(debate, 'debate-2025-speaker').caption), figure: 5 } },
    { master: docket[3].photo.master, focal: [0.5, 0.5], caption: { label: docket[3].label, title: docket[3].title, plate: firstSentence(docket[3].plate), figure: 6 } },
  ];
  const cutAt = (i: number) => (i === 0 ? K.expandEnd : K.firstCut + (i - 1) * K.photoStep);
  const active = photos.reduce((a, _, i) => (frame >= cutAt(i) ? i : a), 0);

  const events = seq('home-events');
  const stage = toDesign(one(events.end?.stage).rect);
  const d4 = still('docket-04');
  const stage4 = toDesign(one(d4.measure.stage).rect);

  // Phases
  const fadeIn = progress(frame, 16, 44, ease.scenic);
  const onStage = frame >= K.push - 8;
  const push = progress(frame, K.push, K.expand + 6, ease.scenic);
  const expand = progress(frame, K.expand, K.expandEnd, ease.scenic);
  const back = progress(frame, K.pullBack, K.pullBackEnd, ease.scenic);
  const dimPage = Math.max(push * 0.45, expand) * (1 - back);

  // The photograph's frame: stage → full frame → stage four entries down.
  let rect: Rect = stage;
  if (frame >= K.expand) rect = lerpRect(stage, FULL, expand);
  if (frame >= K.pullBack) rect = lerpRect(FULL, stage4, back);
  const pushScale = 1 + 0.035 * push * (1 - expand);
  const cur = photos[active];
  const siteFocal = active === 0 ? docket[0].photo.focal : docket[3].photo.focal;
  const focal: [number, number] =
    active === 0
      ? [lerp(siteFocal[0], cur.focal[0], expand), lerp(siteFocal[1], cur.focal[1], expand)]
      : active === photos.length - 1
        ? [lerp(cur.focal[0], siteFocal[0], back), lerp(cur.focal[1], siteFocal[1], back)]
        : cur.focal;
  // Each exhibit drifts a little while it is held.
  const held = frame - cutAt(active);
  const drift = 1 + 0.045 * progress(held, 0, 90, ease.linear) * (1 - back);
  const cornerRadius = 0;

  const captions = photos.map((p, i) => ({ ...p.caption, at: i === 0 ? K.expand + 40 : cutAt(i) }));

  return (
    <Fill style={{ background: color.ink }}>
      {/* The page: footage of § 02 arriving at the docket, then its settled plate. */}
      {frame < K.pullBack ? (
        <Fill style={{ opacity: fadeIn }}>
          <SiteView>
            {frame < K.push + 8 ? <Footage id="home-events" frame={frame} /> : null}
            {onStage ? (
              <EndPlate id="home-events" variant="nostage" style={{ opacity: progress(frame, K.push - 8, K.push + 8, ease.linear) }} />
            ) : null}
          </SiteView>
        </Fill>
      ) : (
        <SiteView>
          <Plate id="docket-04" variant="nostage" />
        </SiteView>
      )}
      <Fill style={{ background: color.ink, opacity: dimPage, pointerEvents: 'none' }} />

      {/* The exhibit. */}
      {onStage ? (
        <div
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            transform: `scale(${pushScale})`,
            borderRadius: cornerRadius,
            overflow: 'hidden',
            boxShadow: push > 0 && expand < 1 ? `0 ${30 * push}px ${80 * push}px rgba(0,0,0,${0.45 * push * (1 - expand)})` : undefined,
          }}
        >
          <Photo master={cur.master} focal={focal} zoom={frame >= K.expandEnd ? drift : 1} style={{ inset: 0 }} />
          <Scrim opacity={Math.min(expand, 1 - back) * 0.95} />
        </div>
      ) : null}

      {frame >= K.expand + 30 && frame < K.pullBack + 30 ? (
        <CaptionBlock items={captions} x={112} y={694} width={900} exitAt={K.pullBack - 8} />
      ) : null}

      {/* "argument." leaves as § 02 arrives. */}
      {frame < 30 ? <ArgumentWord exit={progress(frame, 0, 26, ease.exit)} /> : null}

      {/* Back in the docket: the settled plate with its photograph in place. */}
      {frame >= K.pullBackEnd ? (
        <SiteView>
          <Plate id="docket-04" />
        </SiteView>
      ) : null}
    </Fill>
  );
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) };
}
