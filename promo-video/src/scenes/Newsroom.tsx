import { useCurrentFrame } from 'remotion';
import { Fill } from '../components/primitives';
import { Photo, Plate, SiteView, Unmask } from '../components/media';
import { CaptionBlock, Scrim } from '../components/Editorial';
import { toDesign } from '../components/SiteText';
import { ease, lerp, progress } from '../lib/easing';
import { content, one, still, type Rect } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';

// Local timeline (frames) — see timing.ts.
const M = SCENES.newsroom.marks;
const MAST = M.masthead;
const TIMELINE = M.timeline;
const TL_END = M.timelineEnd; // lands on the latest story
const SELECT = M.select;
const EXPAND_END = M.expandEnd;
const SETTLE = M.settle; // the photograph settles into the story's page
const SETTLE_END = M.settleEnd;

const AXIS_X = 352;
const READ_Y = 540;
const SPACING = 188;
const DATE_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;
const CATEGORIES = ['Announcements', 'Competitions', 'Seminars', 'Partnerships'];

type Entry = { title: string; date: string; category: string; photo: { master: string; focal: [number, number] } | null; href: string };

function entries(): Entry[] {
  const raw = content.news.entries as Array<{ title: string; meta: string[]; href: string; photo: { master: string; focal: [number, number] } | null }>;
  return raw.map((e) => {
    const date = e.meta.find((m) => DATE_RE.test(m.trim())) ?? e.meta[0];
    const category = CATEGORIES.find((c) => e.meta.some((m) => m.toLowerCase().includes(c.toLowerCase()))) ?? '';
    return { title: e.title, date: date.trim(), category, photo: e.photo, href: e.href };
  });
}

/**
 * § 05 — the record. The newsroom as an institutional record in motion: a
 * pinned date ticks at the reading line while the real headlines pass it,
 * photographs travelling at their own depths; it stops at the latest story,
 * whose photograph opens and settles into the story's own page.
 */
export function Newsroom() {
  const frame = useCurrentFrame();
  const story = still('news-story');
  const all = entries();
  // The last two years of the record, oldest first, ending on the latest story.
  const list = all.filter((e) => /202[4-6]$/.test(e.date) && !/August|May 10|March 11/.test(e.date)).slice(0, 11).reverse();
  const n = list.length;
  const latest = list[n - 1];

  const tl = progress(frame, TIMELINE, TL_END, ease.travel);
  const pos = tl * (n - 1); // which entry sits on the reading line
  const tlIn = progress(frame, TIMELINE - 6, TIMELINE + 30, ease.scenic);
  const expand = progress(frame, SELECT, EXPAND_END, ease.scenic);
  const settle = progress(frame, SETTLE, SETTLE_END, ease.scenic);

  // The latest story's photograph card, where it rests on the timeline.
  const card = cardRect(n - 1, pos, n);
  const FULL: Rect = { x: 0, y: 0, width: 1920, height: 1080 };
  const storyScroll = 190;
  const fig = toDesign(one(story.measure.photo).rect);
  const figOnPage: Rect = { ...fig, y: fig.y - storyScroll * 1.2 };
  let photoRect = card;
  if (frame >= SELECT) photoRect = lerpRect(card, FULL, expand);
  if (frame >= SETTLE) photoRect = lerpRect(FULL, figOnPage, settle);

  return (
    <Fill style={{ background: color.ink }}>
      {/* The newsroom's masthead, uncovered, its title lifting as on the site. */}
      {frame < TIMELINE + 40 ? (
        <Unmask start={MAST - 4} duration={48} direction="down">
          <Fill style={{ opacity: 1 - progress(frame, TIMELINE - 4, TIMELINE + 30, ease.scenic), transform: `translateY(${-60 * progress(frame, TIMELINE - 4, TIMELINE + 40, ease.scenic)}px)` }}>
            <SiteView>
              <Plate id="news-index" />
            </SiteView>
          </Fill>
        </Unmask>
      ) : null}

      {/* The record. */}
      {frame >= TIMELINE - 6 && frame < SELECT + 20 ? (
        <Fill style={{ opacity: tlIn * (1 - progress(frame, SELECT, SELECT + 16, ease.linear)) }}>
          <Years list={list} pos={pos} />
          <div style={{ position: 'absolute', left: AXIS_X, top: 0, width: 1, height: 1080, background: color.ruleInk }} />
          <div style={{ position: 'absolute', left: AXIS_X - 18, top: READ_Y, width: 36, height: 1.5, background: color.wine }} />
          {list.map((e, i) => {
            const y = READ_Y + (i - pos) * SPACING;
            if (y < -260 || y > 1340) return null;
            const near = 1 - Math.min(1, Math.abs(i - pos) * 0.9);
            return (
              <div key={e.href} style={{ position: 'absolute', left: AXIS_X + 64, top: y - 44, width: 820, opacity: 0.32 + 0.68 * near }}>
                <div style={{ ...type.label, fontSize: 13, color: color.wineSoft }}>{e.category}</div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: font.display,
                    fontWeight: 600,
                    fontSize: 44,
                    lineHeight: 1.08,
                    color: color.paper,
                    textWrap: 'balance',
                  }}
                >
                  {e.title}
                </div>
              </div>
            );
          })}
          {list.map((e, i) => {
            if (!e.photo || i === n - 1) return null;
            const r = cardRect(i, pos, n);
            if (r.y < -400 || r.y > 1200) return null;
            return (
              <div key={`p${i}`} style={{ position: 'absolute', left: r.x, top: r.y, width: r.width, height: r.height, overflow: 'hidden', opacity: 0.85 }}>
                <Photo master={e.photo.master} focal={e.photo.focal} size="sm" style={{ inset: 0 }} />
              </div>
            );
          })}
          <DatePin list={list} pos={pos} frame={frame} />
        </Fill>
      ) : null}

      {/* The story's page, as the photograph settles into it. */}
      {frame >= SETTLE - 2 ? (
        <Fill style={{ opacity: progress(frame, SETTLE - 2, SETTLE + 26, ease.scenic) }}>
          <SiteView scrollY={storyScroll} height={900}>
            <Plate id="news-story" variant="nophoto" />
          </SiteView>
        </Fill>
      ) : null}

      {/* The latest story's photograph: on the record, opened, then in place. */}
      {latest.photo && frame >= TIMELINE && frame < SETTLE_END + 2 ? (
        <div style={{ position: 'absolute', left: photoRect.x, top: photoRect.y, width: photoRect.width, height: photoRect.height, overflow: 'hidden', opacity: tlIn }}>
          <Photo master={latest.photo.master} focal={latest.photo.focal} zoom={1 + 0.04 * progress(frame, EXPAND_END, SETTLE, ease.linear) * (1 - settle)} style={{ inset: 0 }} />
          <Scrim opacity={expand * (1 - settle)} />
        </div>
      ) : null}
      {frame >= EXPAND_END - 20 && frame < SETTLE + 10 ? (
        <CaptionBlock
          items={[{ at: EXPAND_END - 20, label: `${latest.category} · ${latest.date}`, title: latest.title }]}
          x={112}
          y={760}
          width={1100}
          exitAt={SETTLE - 16}
        />
      ) : null}
      {frame >= SETTLE_END ? (
        <SiteView scrollY={storyScroll} height={900}>
          <Plate id="news-story" />
        </SiteView>
      ) : null}
    </Fill>
  );
}

/** Photograph cards travel nearer the camera than the text: faster, larger. */
function cardRect(i: number, pos: number, n: number): Rect {
  const depth = 1.32;
  const y = READ_Y + (i - pos) * SPACING * depth - 150;
  const w = i === n - 1 ? 560 : 420 + (i % 3) * 40;
  const h = w * 0.66;
  const x = 1920 - 150 - w - (i % 2) * 110;
  return { x, y, width: w, height: h };
}

function DatePin({ list, pos, frame }: { list: Entry[]; pos: number; frame: number }) {
  const idx = Math.round(pos);
  const frac = pos - Math.floor(pos);
  // The date holds while a headline passes, and turns over as the next arrives.
  const turn = Math.min(1, Math.max(0, (Math.abs(pos - idx) < 0.5 ? 0 : 1)));
  void turn;
  void frame;
  const [month, day, year] = list[idx].date.replace(',', '').split(' ');
  return (
    <div style={{ position: 'absolute', left: 96, top: READ_Y - 62, width: AXIS_X - 140, textAlign: 'right' }}>
      <div style={{ overflow: 'hidden', height: 76 }}>
        <div
          key={idx}
          style={{
            fontFamily: font.display,
            fontWeight: 500,
            fontSize: 64,
            lineHeight: '76px',
            color: color.paper,
            fontVariantNumeric: 'lining-nums tabular-nums',
            transform: `translateY(${frac > 0.5 ? (1 - frac) * 40 : 0}px)`,
          }}
        >
          {day}&nbsp;{month.slice(0, 3)}
        </div>
      </div>
      <div style={{ ...type.label, fontSize: 13, color: color.slatePale, marginTop: 6 }}>{year}</div>
    </div>
  );
}

/** Faint years at the back, moving slowest. */
function Years({ list, pos }: { list: Entry[]; pos: number }) {
  const years = Array.from(new Set(list.map((e) => e.date.slice(-4))));
  return (
    <>
      {years.map((yr) => {
        const first = list.findIndex((e) => e.date.endsWith(yr));
        const y = READ_Y + (first - pos) * SPACING * 0.55 - 200;
        return (
          <div
            key={yr}
            style={{
              position: 'absolute',
              right: 90,
              top: y,
              fontFamily: font.display,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 380,
              lineHeight: 1,
              color: color.slateDeep,
              opacity: 0.55,
            }}
          >
            {yr}
          </div>
        );
      })}
    </>
  );
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) };
}
