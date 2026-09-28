import { useCurrentFrame } from 'remotion';
import { Fill, Label } from '../components/primitives';
import { Camera, Photo, Plate, SiteView, Unmask } from '../components/media';
import { ease, hash, lerp, progress } from '../lib/easing';
import { speedBlur } from '../components/MotionBlur';
import { content, many, still, type Rect } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';

// Local timeline (frames) — see timing.ts.
const M = SCENES.team.marks;
const SCROLL = M.scroll;
const SCROLL_END = M.scrollEnd;
const DETACH = M.detach;
const DETACH_END = M.detachEnd;
const WALL = M.wall;
const WALL_END = M.wallEnd;
const SETTLE = M.settle;
const SETTLE_END = M.settleEnd;

const BOARD_SCROLL = 700; // CSS px into the Team page when the portraits detach

type Member = { name: string; role: string; group: string; photo: { master: string; focal: [number, number] } };

/** Composition A: the Board, in depth — the President nearest. */
const BOARD_POSE: Array<Rect & { depth: number }> = [
  { x: 792, y: 214, width: 336, height: 420, depth: 1 },
  { x: 470, y: 300, width: 244, height: 305, depth: 0.82 },
  { x: 1560, y: 360, width: 176, height: 220, depth: 0.62 },
  { x: 1206, y: 300, width: 244, height: 305, depth: 0.82 },
  { x: 184, y: 360, width: 176, height: 220, depth: 0.62 },
  { x: 1432, y: 598, width: 150, height: 188, depth: 0.55 },
];

const GROUP_ORDER = ['The Board', 'Marketing Committee', 'Events Committee', 'Competitions Committee', 'Blog Committee'];

/**
 * § 06 — people. The real Team page, travelled; the Board lifts off it into a
 * composition in depth; the whole term assembles as a masthead of thirty; and
 * every portrait returns to its own place in the committees.
 */
export function Team() {
  const frame = useCurrentFrame();
  const board = still('team-board');
  const comm = still('team-committees');
  const members = (content.team.members as Member[]).slice(0, 30);
  const boardSlots = many(board.measure.portraits).map((m) => m.rect);
  const commSlots = many(comm.measure.portraits).map((m) => m.rect);

  const scroll = lerp(0, BOARD_SCROLL, progress(frame, SCROLL, SCROLL_END, ease.travel));
  const zoom = 1 + 0.05 * progress(frame, SCROLL, SCROLL_END + 40, ease.scenic);
  const dim = progress(frame, DETACH - 4, DETACH + 40, ease.scenic) * (1 - progress(frame, SETTLE + 10, SETTLE_END, ease.scenic));

  // Composition B: the term as a masthead — one column per body.
  const wallRects = wallLayout(members);

  // Committee slots at the committees page's top, full frame.
  const inComm = (r: Rect): Rect => ({ x: r.x * 1.2, y: r.y * 1.2, width: r.width * 1.2, height: r.height * 1.2 });

  const settled = frame >= SETTLE_END + 16;

  /** Where portrait i is, and how visible, at any frame — so its speed is exact. */
  const portraitAt = (f: number, i: number): { r: Rect; o: number } => {
    const detachAt = (k: number) => progress(f, DETACH + k * 4, DETACH_END + k * 4, ease.scenic);
    const wallAt = (k: number) => progress(f, WALL + k * 1.2, WALL_END + k * 1.2, ease.scenic);
    const settleAt = (k: number) => progress(f, SETTLE + (k % 8) * 2, SETTLE_END + (k % 8) * 2, ease.scenic);
    const z = 1 + 0.05 * progress(f, SCROLL, SCROLL_END + 40, ease.scenic);
    if (i < 6) {
      const s = boardSlots[i];
      const from: Rect = {
        x: 960 + (s.x * 1.2 - 960) * z,
        y: 540 + ((s.y - BOARD_SCROLL) * 1.2 - 540) * z,
        width: s.width * 1.2 * z,
        height: s.height * 1.2 * z,
      };
      let r = lerpRect(from, BOARD_POSE[i], detachAt(i));
      let o = 1;
      if (f >= WALL) r = lerpRect(BOARD_POSE[i], wallRects.rects[i], wallAt(i));
      if (f >= SETTLE) {
        const k = settleAt(i);
        r = { ...r, y: lerp(r.y, r.y - 1200, k) };
        o = 1 - k;
      }
      return { r, o };
    }
    const target = wallRects.rects[i];
    const k = wallAt(i);
    const sc = lerp(1.9, 1, k);
    const cx = target.x + target.width / 2 + (hash(i, 3) - 0.5) * 700 * (1 - k);
    const cy = target.y + target.height / 2 + (hash(i, 5) - 0.5) * 500 * (1 - k);
    let r: Rect = { x: cx - (target.width * sc) / 2, y: cy - (target.height * sc) / 2, width: target.width * sc, height: target.height * sc };
    let o = f < WALL ? 0 : Math.min(1, k * 2.2);
    if (f >= SETTLE) {
      r = lerpRect(target, inComm(commSlots[i - 6]), settleAt(i - 6));
      o = 1;
    }
    return { r, o };
  };

  return (
    <Fill style={{ background: color.ink }}>
      {/* The story page the Newsroom ended on, until the Team page has covered it. */}
      {frame < 46 ? (
        <SiteView scrollY={190} height={900}>
          <Plate id="news-story" />
        </SiteView>
      ) : null}
      {/* The Team page, travelled from its masthead to the Board. */}
      {frame < SETTLE ? (
        <Unmask start={0} duration={46} direction="down">
          <Camera zoom={zoom}>
            <SiteView scrollY={scroll} height={900}>
              <Plate id="team-board" variant={frame >= DETACH ? 'noportraits' : 'plate'} />
            </SiteView>
          </Camera>
        </Unmask>
      ) : null}

      {/* The committees page the portraits return to. */}
      {frame >= SETTLE - 4 ? (
        <Fill style={{ opacity: progress(frame, SETTLE - 4, SETTLE + 30, ease.scenic) }}>
          <SiteView scrollY={lerp(0, 90, progress(frame, SETTLE_END, SETTLE_END + 60, ease.scenic))} height={900}>
            <Plate id="team-committees" variant={settled ? 'plate' : 'noportraits'} />
          </SiteView>
        </Fill>
      ) : null}

      <Fill style={{ background: color.ink, opacity: dim * 0.94 }} />

      {/* The term's label and the bodies' names, while the masthead stands. */}
      {frame >= WALL && frame < SETTLE + 16 ? (
        <>
          <Label start={WALL + 30} tint={color.slatePale} size={14} exitAt={SETTLE - 10} style={{ position: 'absolute', left: 0, right: 0, top: 118, textAlign: 'center' }}>
            {`${content.home.team.term}`}
          </Label>
          {GROUP_ORDER.map((g, gi) => {
            const col = wallRects.columns[gi];
            return (
              <Label key={g} start={WALL + 24 + gi * 4} tint={color.wineSoft} size={12} exitAt={SETTLE - 10} style={{ position: 'absolute', left: col.x, top: col.y - 40, width: col.width }}>
                {g.replace('The ', '')}
              </Label>
            );
          })}
        </>
      ) : null}

      {/* The portraits. */}
      {frame >= DETACH - 2 && !settled
        ? order(members).map((i) => {
            const m = members[i];
            const isBoard = i < 6;
            const now = portraitAt(frame, i);
            if (now.o <= 0) return null;
            const was = portraitAt(frame - 1, i);
            const speed = Math.hypot(now.r.x + now.r.width / 2 - (was.r.x + was.r.width / 2), now.r.y + now.r.height / 2 - (was.r.y + was.r.height / 2));
            const r = now.r;
            return (
              <div
                key={m.name}
                style={{
                  position: 'absolute',
                  left: r.x,
                  top: r.y,
                  width: r.width,
                  height: r.height,
                  overflow: 'hidden',
                  opacity: now.o,
                  filter: speedBlur(speed, 0.1, 3),
                  boxShadow: isBoard && frame < WALL_END ? '0 30px 70px rgba(0,0,0,0.45)' : undefined,
                }}
              >
                <Photo master={m.photo.master} focal={m.photo.focal} size="sm" style={{ inset: 0 }} />
              </div>
            );
          })
        : null}

      {/* Names under the nearest three while the Board is held. */}
      {frame >= DETACH_END - 14 && frame < WALL + 20
        ? [0, 1, 3].map((i, k) => {
            const pose = BOARD_POSE[i];
            const m = members[i];
            const p = progress(frame, DETACH_END - 14 + k * 5, DETACH_END + 22 + k * 5, ease.entrance);
            const out = progress(frame, WALL - 10, WALL + 12, ease.exit);
            return (
              <div key={m.name} style={{ position: 'absolute', left: pose.x, top: pose.y + pose.height + 18, width: pose.width + 80, opacity: p * (1 - out), transform: `translateY(${(1 - p) * 12}px)` }}>
                <div style={{ fontFamily: font.display, fontWeight: 500, fontSize: i === 0 ? 34 : 26, color: color.paper, lineHeight: 1.1 }}>{m.name}</div>
                <div style={{ ...type.label, fontSize: 12, color: color.wineSoft, marginTop: 8 }}>{m.role}</div>
              </div>
            );
          })
        : null}

      {settled ? (
        <SiteView scrollY={lerp(0, 90, progress(frame, SETTLE_END, SETTLE_END + 60, ease.scenic))} height={900}>
          <Plate id="team-committees" />
        </SiteView>
      ) : null}
    </Fill>
  );
}

/** Paint far portraits first so near ones overlap them. */
function order(members: Member[]) {
  const idx = members.map((_, i) => i);
  const depth = (i: number) => (i < 6 ? BOARD_POSE[i].depth : 0.3);
  return idx.sort((a, b) => depth(a) - depth(b));
}

function wallLayout(members: Member[]) {
  const W = 104;
  const H = 130;
  const GAP = 10;
  const COLGAP = 64;
  const colW = W * 2 + GAP;
  const totalW = colW * 5 + COLGAP * 4;
  const x0 = (1920 - totalW) / 2;
  const y0 = 262;
  const rects: Rect[] = [];
  const columns: Rect[] = [];
  GROUP_ORDER.forEach((g, gi) => {
    const x = x0 + gi * (colW + COLGAP);
    columns.push({ x, y: y0, width: colW, height: 0 });
    members
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.group === g)
      .forEach(({ i }, k) => {
        rects[i] = { x: x + (k % 2) * (W + GAP), y: y0 + Math.floor(k / 2) * (H + GAP), width: W, height: H };
      });
  });
  return { rects, columns };
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) };
}
