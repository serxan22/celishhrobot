import { useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { Photo, Plate, SiteView } from '../components/media';
import { ease, lerp, progress } from '../lib/easing';
import { content, still } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';

const K = SCENES.record.marks;
const STEP = K.yearStep;
const RESOLVE = K.resolve;

type Row = { year: string; title: string; text: string };

/** A real photograph from the Society's record for each year, where one exists. */
const YEAR_PHOTO: Record<string, string | null> = {
  '2019': 'seminar-2019-audience',
  '2020–22': null, // the seminars went online; the record keeps no photograph
  '2023': 'civil-code-2023-hall',
  '2024': 'debate-2024-chamber',
  '2025': 'blog-session-2025-group',
  '2026': 'moot-bench',
};

function masterFor(key: string | null): { master: string; focal: [number, number] } | null {
  if (!key) return null;
  const pools = ['home', 'about', 'news', 'moot', 'debate', 'aiDebate', 'orientation', 'seminar'];
  for (const p of pools) {
    const figs = (content[p]?.figures ?? []) as Array<{ master: string; focal?: [number, number] }>;
    const hit = figs.find((f) => f.master.includes(key));
    if (hit) return { master: hit.master, focal: hit.focal ?? [0.5, 0.5] };
  }
  const entries = (content.news?.entries ?? []) as Array<{ photo: { master: string; focal: [number, number] } | null }>;
  const e = entries.find((x) => x.photo?.master.includes(key));
  return e?.photo ?? null;
}

/**
 * Permanence. The chronicle from the About page, one year at a time — each
 * year set as the About page sets its founding year, with a photograph the
 * Society itself published from that year — then the camera draws back to the
 * whole record on the page, and comes in again to the chronicle's head.
 */
export function Record() {
  const frame = useCurrentFrame();
  const rows = content.about.chronicle.rows as Row[];
  const plate = still('about-chronicle');
  const at = (i: number) => 10 + i * STEP;
  const current = Math.max(0, Math.min(rows.length - 1, Math.floor((frame - 10) / STEP)));
  const resolve = progress(frame, RESOLVE - 6, RESOLVE + 16, ease.exit);
  const rise = progress(frame, RESOLVE + 2, RESOLVE + 40, ease.scenic);
  const pushIn = progress(frame, RESOLVE + 24, SCENES.record.duration, ease.travel);
  // The whole chronicle fits the frame at 0.62 design px per CSS px; the
  // push-in ends at full frame, exactly where the next scene begins.
  const scale = lerp(0.6, 1.2, pushIn);
  const plateW = 1600 * scale;
  const x = (1920 - plateW) / 2;
  const y = lerp(40, 0, pushIn);

  return (
    <Fill style={{ background: color.parchment }}>
      {/* The committees page the Team scene ended on, giving way. */}
      {frame < 18 ? (
        <Fill style={{ opacity: 1 - progress(frame, 0, 18, ease.scenic) }}>
          <SiteView scrollY={90} height={900}>
            <Plate id="team-committees" />
          </SiteView>
        </Fill>
      ) : null}
      {/* The years. */}
      {frame < RESOLVE + 18 ? (
        <Fill style={{ opacity: 1 - resolve, transform: `translateY(${-resolve * 60}px)` }}>
          {rows.map((row, i) => {
            // Outgoing and incoming years move in lockstep on one curve, a
            // fixed distance apart, like the leaves of a departure board.
            const pin = i === 0 ? progress(frame, at(0) - 2, at(0) + 22, ease.entrance) : progress(frame, at(i) - 12, at(i) + 10, ease.travel);
            const out = i === rows.length - 1 ? 0 : progress(frame, at(i + 1) - 12, at(i + 1) + 10, ease.travel);
            if (pin <= 0 || out >= 1) return null;
            const ph = masterFor(YEAR_PHOTO[row.year] ?? null);
            return (
              <div key={row.year}>
                {/* the year, lifting from behind a rule and leaving upward */}
                <div style={{ position: 'absolute', left: 140, top: 250, width: 900, height: 330, overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: 10,
                      fontFamily: font.display,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      fontSize: 300,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: color.wine,
                      fontVariantNumeric: 'lining-nums',
                      transform: `translateY(${(1 - pin) * 320 - out * 320}px)`,
                    }}
                  >
                    {row.year}
                  </div>
                </div>
                <div style={{ position: 'absolute', left: 150, top: 610, width: 720, overflow: 'hidden' }}>
                  <div style={{ transform: `translateY(${(1 - pin) * 60 - out * 60}px)`, opacity: pin * (1 - out) }}>
                    <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 44, lineHeight: 1.1, color: color.fgPaper }}>{row.title}</div>
                  </div>
                </div>
                {ph ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 1080,
                      top: 210,
                      width: 700,
                      height: 470,
                      overflow: 'hidden',
                      clipPath: `inset(0 0 ${(1 - pin) * 100}% 0)`,
                      opacity: 1 - out,
                    }}
                  >
                    <Photo master={ph.master} focal={ph.focal} zoom={1.08 - 0.06 * pin} shift={[0, -0.02 * out]} style={{ inset: 0 }} />
                  </div>
                ) : (
                  <div style={{ position: 'absolute', left: 1080, top: 210, width: 700, height: 470, opacity: pin * (1 - out) }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: 700, height: 470, border: `1px solid ${color.sand}` }} />
                    <div style={{ position: 'absolute', left: 36, bottom: 32, ...type.label, fontSize: 13, color: color.stone }}>In the room and online</div>
                  </div>
                )}
              </div>
            );
          })}
          {/* the axis of the record: a hairline, and a tick per year */}
          <div style={{ position: 'absolute', left: 150, top: 588, width: 1630, height: 1, background: 'rgba(27,39,48,0.18)' }} />
          {rows.map((row, i) => (
            <div
              key={`t${row.year}`}
              style={{
                position: 'absolute',
                left: 150 + (i / (rows.length - 1)) * 1630,
                top: 582,
                width: 1.5,
                height: 13,
                background: i <= current ? color.wine : 'rgba(27,39,48,0.3)',
                opacity: progress(frame, at(i) - 6, at(i) + 6, ease.linear) * 0.9 + 0.1,
              }}
            />
          ))}
          <div style={{ position: 'absolute', left: 150, top: 610 - 44, ...type.label, fontSize: 13, color: color.wineDeep, opacity: progress(frame, 4, 30, ease.entrance) }}>
            {content.about.chronicle.heading}
          </div>
        </Fill>
      ) : null}

      {/* The whole record, then in to its head. */}
      {frame >= RESOLVE - 2 ? (
        <Fill style={{ background: `rgba(8, 19, 27, ${progress(frame, RESOLVE - 2, RESOLVE + 24, ease.scenic)})` }}>
          <div style={{ position: 'absolute', left: x, top: y + (1 - rise) * 420, width: plateW, height: 1080 - y, overflow: 'hidden', opacity: rise, boxShadow: '0 40px 120px rgba(0,0,0,0.35)' }}>
            <SiteView scale={scale} height={plate.height} width={1600}>
              <Plate id="about-chronicle" />
            </SiteView>
          </div>
        </Fill>
      ) : null}
    </Fill>
  );
}
