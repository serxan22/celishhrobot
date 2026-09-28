import { useCurrentFrame } from 'remotion';
import { ChapterMark, Fill } from '../components/primitives';
import { Footage, Photo, Plate, SiteView } from '../components/media';
import { MeasuredBlock, lerpPlacement, pagePlacement } from '../components/Morph';
import { SiteLines, toDesign } from '../components/SiteText';
import { ease, lerp, progress } from '../lib/easing';
import { content, many, one, seq, still } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font } from '../lib/tokens';

// Local timeline (frames) — see timing.ts.
const M = SCENES.seminars.marks;
const CLEAR = M.clear; // the page gives way to its photograph and heading
const HEAD_OUT = M.headOut;
const SPLIT = M.split;
const SPLIT_END = M.splitEnd;
const ROLL = M.roll; // each date reaches the reading line
const LOCK = M.lock;
const DIAL_OUT = M.dialOut;
const RESOLVE = M.resolve;
const RESOLVE_END = SCENES.seminars.duration - 6;

/** Reading line of the dial and the panel it sits in (design px). */
const PANEL_X = 1040;
const LINE_Y = 430;
const STEP = 132;

/**
 * § 03 — ideas. The seminar programme treated as an archive: dates travel on
 * one axis past a fixed reading line, and the photograph of a seminar only
 * develops when the dial stops on the seminar it shows. Then the entry drops
 * back into its row of the real programme.
 */
export function Seminars() {
  const frame = useCurrentFrame();
  const footage = seq('home-seminars');
  const prog = still('seminar-programme');
  const programme = content.home.seminars.programme as Array<{ date: string; title: string; speaker: string }>;
  const titles = many(prog.measure.titles);
  const speakers = many(prog.measure.speakers);
  const dates = many(prog.measure.dates);
  const pagePhoto = toDesign(one(footage.end?.photo).rect);
  const headLines = many(footage.end?.lines);
  const photoMaster = (content.home.seminars.photos as Array<{ master: string; focal: [number, number] }>)[0];
  const inset = (content.seminar.figures as Array<{ master: string }>).find((f) => f.master.includes('seminar-question'));

  const clear = progress(frame, CLEAR, CLEAR + 14, ease.linear);
  const split = progress(frame, SPLIT, SPLIT_END, ease.scenic);
  const dialOut = progress(frame, DIAL_OUT, DIAL_OUT + 22, ease.exit);
  const resolve = progress(frame, RESOLVE, RESOLVE_END, ease.scenic);
  const wipe = progress(frame, RESOLVE - 6, RESOLVE + 40, ease.scenic);
  const panel = {
    x: lerp(pagePhoto.x, 0, split),
    y: lerp(pagePhoto.y, 0, split),
    w: lerp(pagePhoto.width, 960, split),
    h: lerp(pagePhoto.height, 1080, split),
  };
  let dial = 0;
  for (let i = 1; i < ROLL.length; i++) dial += progress(frame, ROLL[i] - 24, ROLL[i], ease.travel);
  const develop = progress(frame, LOCK - 8, LOCK + 30, ease.scenic);

  const titleAt = { x: PANEL_X, y: LINE_Y + 74, scale: 1.72 };
  const speakerAt = { x: PANEL_X, y: LINE_Y + 74 + titles[2].rect.height * 1.72 + 30, scale: 1.3 };

  return (
    <Fill style={{ background: color.paper }}>
      {/* The real page, arriving at § 03. */}
      {clear < 1 ? (
        <Fill style={{ opacity: 1 - clear }}>
          <SiteView>
            <Footage id="home-seminars" frame={frame} />
          </SiteView>
        </Fill>
      ) : null}

      {/* Its heading, set live in place, lifting away. */}
      {frame >= CLEAR && frame < HEAD_OUT + 50 ? (
        <SiteView>
          <SiteLines lines={headLines} exit={HEAD_OUT} exitStep={3} exitDuration={20} />
        </SiteView>
      ) : null}

      {/* After the resolve: the programme itself, its rows set live until the end. */}
      {frame >= RESOLVE - 6 ? (
        <Fill style={{ opacity: progress(frame, RESOLVE - 6, RESOLVE + 26, ease.scenic) }}>
          <SiteView>
            <Plate id="seminar-programme" variant={frame < RESOLVE_END ? 'norows' : 'plate'} />
          </SiteView>
        </Fill>
      ) : null}

      {/* The archive: § 03, the programme label, and the dial of dates. */}
      {frame >= SPLIT && frame < DIAL_OUT + 24 ? (
        <Fill>
          <ChapterMark index="§ 03" title="Seminars" start={SPLIT + 10} x={PANEL_X} y={132} onInk={false} exitAt={DIAL_OUT} />
          {programme.map((row, i) => {
            // Past dates stack above the reading line and fade; the next date
            // lifts into the line from behind it, never crossing the entry below.
            const offset = i - dial;
            const arriving = offset > 0 ? Math.max(0, 1 - offset) : 1;
            if (offset > 1 || (i === 0 && frame < ROLL[0] - 30)) return null;
            const first = progress(frame, ROLL[0] - 30, ROLL[0], ease.entrance);
            const lift = i === 0 ? first : offset > 0 ? arriving : 1;
            const y = LINE_Y + Math.min(0, offset) * STEP;
            const fadeUp = offset < 0 ? Math.max(0, 1 + offset * 0.86) : 1;
            const out = progress(frame, DIAL_OUT + (2 - i) * 3, DIAL_OUT + 18 + (2 - i) * 3, ease.exit);
            return (
              <div key={row.date} style={{ position: 'absolute', left: PANEL_X - 6, top: y - 72, height: 96, width: 900, overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: 8,
                    fontFamily: font.display,
                    fontWeight: 500,
                    fontSize: 84,
                    lineHeight: 1,
                    letterSpacing: '-0.015em',
                    fontVariantNumeric: 'lining-nums tabular-nums',
                    color: color.fgPaper,
                    transform: `translateY(${(1 - lift) * 92 - out * 90}px)`,
                    opacity: fadeUp * Math.min(1, lift * 1.4) * (1 - out * 0.5),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.date}
                </div>
              </div>
            );
          })}
          {programme.map((_, i) => {
            const first = i === 0 ? progress(frame, ROLL[0] - 18, ROLL[0] + 8, ease.entrance) : 1;
            const on = (1 - Math.min(1, Math.abs(i - dial) * 1.6)) * first;
            if (on <= 0 || i === 2) return null;
            return (
              <div key={i} style={{ opacity: on }}>
                <MeasuredBlock m={titles[i]} x={titleAt.x} y={titleAt.y + (i - dial) * 40} scale={titleAt.scale} />
                <MeasuredBlock m={speakers[i]} x={speakerAt.x} y={speakerAt.y + (i - dial) * 40} scale={speakerAt.scale} />
              </div>
            );
          })}
        </Fill>
      ) : null}

      {/* The photograph panel: the page's own photograph, opened to half the frame. */}
      {frame >= CLEAR && frame < RESOLVE + 44 ? (
        <div
          style={{
            position: 'absolute',
            left: panel.x,
            top: panel.y,
            width: panel.w,
            height: panel.h,
            overflow: 'hidden',
            clipPath: `inset(0 ${wipe * 100}% 0 0)`,
          }}
        >
          <Photo
            master={photoMaster.master}
            focal={photoMaster.focal}
            zoom={1.06 - 0.04 * develop}
            shift={[0, -0.018 * dial]}
            style={{ inset: 0 }}
            imgStyle={{ filter: `grayscale(${0.85 * (1 - develop) * split}) brightness(${1 - 0.3 * (1 - develop) * split})` }}
          />
          {inset ? (
            <div
              style={{
                position: 'absolute',
                left: 72 + 30 * dial,
                top: 770 - 70 * develop - 16 * dial,
                width: 330,
                height: 220,
                overflow: 'hidden',
                opacity: develop,
                boxShadow: '0 24px 60px rgba(8,19,27,0.35)',
              }}
            >
              <Photo master={inset.master} focal={[0.5, 0.45]} zoom={1.02 + 0.03 * progress(frame, LOCK, RESOLVE_END)} style={{ inset: 0 }} />
            </div>
          ) : null}
          {/* the edge that leads the wipe */}
          {wipe > 0 && wipe < 1 ? (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${(1 - wipe) * 100}% - 1.5px)`, width: 1.5, background: color.wine }} />
          ) : null}
        </div>
      ) : null}

      {/* The locked entry travels into its row; the other rows rise into theirs. */}
      {frame >= ROLL[2] - 24 && frame < RESOLVE_END ? (() => {
        const on = 1 - Math.min(1, Math.abs(2 - dial) * 1.6);
        const tp = lerpPlacement(titleAt, pagePlacement(titles[2]), resolve);
        const sp = lerpPlacement(speakerAt, pagePlacement(speakers[2]), resolve);
        return (
          <>
            <MeasuredBlock m={titles[2]} {...tp} opacity={on} />
            <MeasuredBlock m={speakers[2]} {...sp} opacity={on} />
            {[0, 1, 2].map((i) => {
              const r = progress(frame, RESOLVE + 14 + i * 5, RESOLVE + 38 + i * 5, ease.entrance);
              const lift = (1 - r) * 16;
              return (
                <div key={i} style={{ opacity: r, transform: `translateY(${lift}px)` }}>
                  <MeasuredBlock m={dates[i]} {...pagePlacement(dates[i])} />
                  {i < 2 ? <MeasuredBlock m={titles[i]} {...pagePlacement(titles[i])} /> : null}
                  {i < 2 ? <MeasuredBlock m={speakers[i]} {...pagePlacement(speakers[i])} /> : null}
                </div>
              );
            })}
          </>
        );
      })() : null}
    </Fill>
  );
}
