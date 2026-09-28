import { Img, useCurrentFrame } from 'remotion';
import { Fill, Label } from '../components/primitives';
import { Footage, Plate, SiteView, Unmask } from '../components/media';
import { Cursor } from '../components/Cursor';
import { WordMorph, edgeColor, layoutBox, layoutOf, transformLayout, type RGB } from '../components/WordMorph';
import { ease, progress } from '../lib/easing';
import { content, many, one, plateSrc, seq, still, type Rect } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';

// Local timeline (frames) — see timing.ts.
const M = SCENES.blog.marks;
const SEP = M.separate; // the row's title separates; the other rows fall away
const ENL = M.enlarge; // → set large, centred
const ENL_END = M.enlargeEnd;
const LAND = M.land; // → into the Blog index
const LAND_END = M.landEnd;
const CURSOR_IN = M.cursorIn;
const HOVER = M.hover;
const CLICK = M.click;
const MORPH = M.morph; // → into the article's masthead
const MORPH_END = M.morphEnd;
const READ = M.readStart;

/**
 * § 04 — writing. A headline leaves the homepage's list, is set large with its
 * byline, and comes to rest as the lead story of the real Law Blog; a reader's
 * pointer finds it, and the same words recompose into the article's masthead.
 */
export function Blog() {
  const frame = useCurrentFrame();
  const home = seq('home-blog');
  const index = still('blog-index');
  const article = still('article-top');
  const rows = many(home.end?.rows);
  const titleA = many(home.end?.titles)[0];
  const titleC = one(index.measure.title);
  const titleD = one(article.measure.h1);
  const a = content.article.article as { category: string; title: string; byline: string[] };

  const A = layoutOf(titleA);
  const C = layoutOf(titleC);
  const Chover = layoutOf(titleC, { color: 'rgb(111, 39, 57)' });
  const D = layoutOf(titleD, { color: 'rgb(251, 249, 245)' });
  const dBox = layoutBox(D);
  const E = transformLayout(D, {
    scale: 1.42,
    anchor: [(dBox.x + dBox.x2) / 2, (dBox.y + dBox.y2) / 2],
    at: [960, 548],
  });
  const eBox = layoutBox(E);

  const tEnl = progress(frame, ENL, ENL_END, ease.scenic);
  const tLand = progress(frame, LAND, LAND_END, ease.scenic);
  const tMorph = progress(frame, MORPH, MORPH_END, ease.scenic);

  // Which layouts the headline is travelling between.
  // Surfaces wipe down behind the headline; each word takes the colour of
  // whatever surface is behind it at that moment.
  const landEdge = 1080 * ease.scenic(Math.min(1, Math.max(0, (frame - (LAND - 8)) / 70)));
  const morphEdge = 1080 * ease.scenic(Math.min(1, Math.max(0, (frame - MORPH) / 62)));
  const INK_TEXT: RGB = [22, 33, 42];
  const PAPER: RGB = [251, 249, 245];
  const WINE: RGB = [111, 39, 57];
  let morph: React.ReactElement | null = null;
  if (frame >= SEP && frame < LAND) morph = <WordMorph from={A} to={E} t={tEnl} stagger={0.5} reverse />;
  else if (frame >= LAND && frame < LAND_END)
    morph = <WordMorph from={E} to={C} t={tLand} stagger={0.4} colorAt={edgeColor(landEdge, INK_TEXT, PAPER)} />;
  else if (frame >= MORPH && frame < MORPH_END)
    morph = <WordMorph from={Chover} to={D} t={tMorph} stagger={0.26} dip={0.15} colorAt={edgeColor(morphEdge, PAPER, WINE)} />;

  // Target point of the pointer: where the capture hovered the title.
  const tb = titleC.rect;
  const target = { x: (tb.x + tb.width / 2 + 40) * 1.2, y: (tb.y + tb.height / 2 + 10) * 1.2 };

  const metaIn = progress(frame, ENL + 58, ENL + 100, ease.entrance);
  const metaOut = progress(frame, LAND - 10, LAND + 14, ease.exit);
  const route = frame >= CLICK ? progress(frame, CLICK, CLICK + 120, ease.route) : 0;
  const routeDone = progress(frame, MORPH_END - 16, MORPH_END + 6, ease.linear);

  return (
    <Fill style={{ background: color.ink }}>
      {/* A — the homepage list, arriving. */}
      {frame < SEP ? (
        <SiteView>
          <Footage id="home-blog" frame={frame} />
        </SiteView>
      ) : null}

      {/* B — the list without its rows; each row falls away as a slice of the page. */}
      {frame >= SEP && frame < LAND + 20 ? (
        <Fill style={{ opacity: 1 - progress(frame, SEP + 6, SEP + 50, ease.scenic) }}>
          <SiteView>
            <Img src={plateSrc('home-blog', 'norows')} style={{ position: 'absolute', left: 0, top: 0, width: 1600, height: 900 }} />
            {rows.map((r, i) => {
              const fall = progress(frame, SEP + 2 + i * 4, SEP + 40 + i * 4, ease.exit);
              return (
                <RowSlice
                  key={i}
                  rect={r.rect}
                  src={plateSrc('home-blog', i === 0 ? 'notitle' : 'end')}
                  style={{ transform: `translateY(${fall * 26}px)`, opacity: 1 - fall }}
                />
              );
            })}
          </SiteView>
        </Fill>
      ) : null}

      {/* D — the Blog index, uncovered behind the headline as it lands. */}
      {frame >= LAND - 8 && frame < MORPH_END + 2 ? (
        <Unmask start={LAND - 8} duration={70} direction="down">
          <SiteView>
            {frame < HOVER ? <Plate id="blog-index" variant={frame < LAND_END ? 'notitle' : 'plate'} /> : null}
            {frame >= HOVER ? <Footage id="blog-hover" frame={frame - HOVER + 8} /> : null}
          </SiteView>
        </Unmask>
      ) : null}

      {/* F — the article's masthead, uncovered as the headline recomposes. */}
      {frame >= MORPH ? (
        <Unmask start={MORPH} duration={62} direction="down">
          <SiteView>
            <Plate id="article-top" variant={frame < MORPH_END ? 'noh1' : 'plate'} />
          </SiteView>
        </Unmask>
      ) : null}

      {/* G — reading: the real article, stepped. */}
      {frame >= READ ? (
        <SiteView>
          <Footage id="article-read" frame={frame - READ} />
        </SiteView>
      ) : null}

      {morph}

      {/* The byline, while the headline is held large. */}
      {frame >= ENL + 50 && frame < LAND + 20 ? (
        <>
          <Label start={ENL + 58} tint={color.wineSoft} size={14} exitAt={LAND - 10} style={{ position: 'absolute', left: eBox.x, top: eBox.y - 70 }}>
            {a.category.replace(/\s*EN$/, '')}
          </Label>
          <div
            style={{
              position: 'absolute',
              left: eBox.x,
              top: eBox.y2 + 40,
              ...type.meta,
              fontSize: 17,
              color: color.slatePale,
              opacity: metaIn * (1 - metaOut),
              transform: `translateY(${(1 - metaIn) * 14}px)`,
              display: 'flex',
              gap: 22,
            }}
          >
            {a.byline.map((b, i) => (
              <span key={i} style={{ fontFamily: font.sans }}>
                {i > 0 ? <span style={{ color: color.wineSoft, marginRight: 22 }}>·</span> : null}
                {b}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {/* The route rule: the site's own navigation progress line. */}
      {route > 0 && routeDone < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 2.4,
            background: color.wine,
            transformOrigin: 'left',
            transform: `scaleX(${0.82 * route + 0.18 * routeDone})`,
            opacity: 1 - routeDone,
          }}
        />
      ) : null}

      <Cursor
        appear={CURSOR_IN}
        vanish={MORPH + 6}
        keys={[
          { at: CURSOR_IN, x: 1540, y: 930 },
          { at: HOVER - 4, x: target.x, y: target.y },
          { at: CLICK, x: target.x + 4, y: target.y + 2 },
        ]}
        clicks={[CLICK]}
      />
    </Fill>
  );
}

function RowSlice({ rect, src, style }: { rect: Rect; src: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, overflow: 'hidden', ...style }}>
      <Img src={src} style={{ position: 'absolute', left: -rect.x, top: -rect.y, width: 1600, height: 900 }} />
    </div>
  );
}
