import { Img, staticFile, useCurrentFrame } from 'remotion';
import { Crescent, Fill } from '../components/primitives';
import { Photo } from '../components/media';
import { Scrim } from '../components/Editorial';
import { ease, progress } from '../lib/easing';
import { content } from '../lib/manifest';
import { SCENES } from '../lib/timing';
import { color, font, type } from '../lib/tokens';

const K = SCENES.finale.marks;
const STEP = K.montageStep;

type Shot = { label: string; master: string; focal: [number, number] };

function montage(): Shot[] {
  const home = content.home;
  const docket = home.docket as Array<{ photo: { master: string } }>;
  const blog = content.article.article.plate as { master: string };
  const news = (content.news.entries as Array<{ photo: { master: string; focal: [number, number] } | null }>)[0];
  const teamFig = (home.figures as Array<{ master: string; focal?: [number, number] }>).find((f) => /fair-team|team/.test(f.master));
  const ch = home.chapters as Record<string, { index: string; title: string }>;
  return [
    { label: `${ch.events.index} · ${ch.events.title}`, master: docket[0].photo.master, focal: [0.5, 0.66] },
    { label: `${ch.publication.index} · ${ch.publication.title}`, master: blog.master, focal: [0.5, 0.5] },
    { label: `${ch.newsroom.index} · ${ch.newsroom.title}`, master: news.photo!.master, focal: news.photo!.focal },
    { label: `${ch.team.index} · ${ch.team.title}`, master: teamFig?.master ?? docket[2].photo.master, focal: teamFig?.focal ?? [0.5, 0.5] },
  ];
}

/** One beat of the closing montage: a chapter, almost the whole frame. */
export function MontageShot({ index, local }: { index: number; local: number }) {
  const shot = montage()[index];
  const push = 1.06 - 0.05 * progress(local, 0, STEP + 12, ease.linear);
  return (
    <Fill style={{ background: color.ink }}>
      <Photo master={shot.master} focal={shot.focal} zoom={push} style={{ left: 28, top: 28, right: 28, bottom: 28 }} />
      <div style={{ position: 'absolute', left: 28, top: 28, right: 28, bottom: 28 }}>
        <Scrim side="bottom-left" opacity={0.8} />
      </div>
      <div style={{ position: 'absolute', left: 84, bottom: 78, ...type.label, fontSize: 14, color: color.paper, letterSpacing: '0.24em' }}>{shot.label}</div>
    </Fill>
  );
}

/**
 * The last beat: the four chapters in quick succession, the Society's
 * invitation in each of the site's languages, and the name.
 */
export function Finale() {
  const frame = useCurrentFrame();
  const shots = montage();
  const beat = Math.min(shots.length - 1, Math.floor(frame / STEP));
  const inMontage = frame < K.montage * STEP;
  const inviteIn = progress(frame, K.invite - 10, K.invite + 8, ease.linear);
  const cardIn = progress(frame, K.card - 8, K.card + 10, ease.linear);
  const fade = progress(frame, K.fade, SCENES.finale.duration, ease.scenic);

  const inv = content.home.invitation as { index: string; title: string; lines: string[] };
  const az = content.homeAz?.invitation?.lines?.join(' ') ?? '';
  const ru = content.homeRu?.invitation?.lines?.join(' ') ?? '';

  return (
    <Fill style={{ background: color.ink }}>
      {inMontage || frame < K.invite + 10 ? <MontageShot index={beat} local={frame - beat * STEP} /> : null}

      {/* § 07 — the invitation, on the site's slate field. */}
      {frame >= K.invite - 10 && frame < K.card + 12 ? (
        <Fill style={{ background: color.slateDeep, opacity: inviteIn }}>
          <div style={{ position: 'absolute', left: 160, top: 300, display: 'flex', alignItems: 'center', gap: 12, opacity: progress(frame, K.invite, K.invite + 30, ease.entrance) }}>
            <span style={{ ...type.label, fontSize: 13, letterSpacing: '0.22em', color: color.winePale }}>{inv.index}</span>
            <span style={{ width: 40, height: 1, background: color.winePale, transform: `scaleX(${progress(frame, K.invite + 6, K.invite + 46, ease.scenic)})`, transformOrigin: 'left' }} />
            <span style={{ ...type.label, fontSize: 13, letterSpacing: '0.22em', color: '#93b0be' }}>{inv.title}</span>
          </div>
          {inv.lines.map((line, i) => {
            const p = progress(frame, K.invite + 6 + i * 7, K.invite + 66 + i * 7, ease.entrance);
            return (
              <div key={line} style={{ position: 'absolute', left: 156, top: 350 + i * 140, height: 150, overflow: 'hidden' }}>
                <div style={{ fontFamily: font.display, fontWeight: 500, fontSize: 140, lineHeight: 1.02, letterSpacing: '-0.02em', color: '#eaf1f4', transform: `translateY(${(1 - p) * 0.9}em)`, opacity: Math.min(1, p * 1.5) }}>
                  {line}
                </div>
              </div>
            );
          })}
          {/* The same invitation as the Azerbaijani and Russian editions set it. */}
          {[
            { lang: 'AZ', line: az },
            { lang: 'RU', line: ru },
          ].map(({ lang, line }, i) => {
            const p = progress(frame, K.invite + 40 + i * 9, K.invite + 88 + i * 9, ease.entrance);
            return (
              <div key={lang} style={{ position: 'absolute', left: 160, top: 690 + i * 62, display: 'flex', alignItems: 'baseline', gap: 22, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
                <span style={{ ...type.label, fontSize: 12, letterSpacing: '0.2em', color: color.winePale }}>{lang}</span>
                <span style={{ fontFamily: font.display, fontStyle: 'italic', fontWeight: 500, fontSize: 46, color: '#a9c2ce' }}>{line}</span>
              </div>
            );
          })}
        </Fill>
      ) : null}

      {/* The name. */}
      {frame >= K.card - 8 ? (
        <Fill style={{ background: color.ink, opacity: cardIn }}>
          <EndCard frame={frame - K.card} />
        </Fill>
      ) : null}

      <Fill style={{ background: '#000', opacity: fade }} />
    </Fill>
  );
}

/** The opening's crescent, raised so its bowl cradles the seal. */
function HeroCrescentAt({ draw }: { draw: number }) {
  return <Crescent x={0} y={-92} width={1920} draw={draw} strokeWidth={1.25} opacity={0.7} from="middle" />;
}

function EndCard({ frame }: { frame: number }) {
  const arc = progress(frame, 4, 80, ease.scenic);
  const seal = progress(frame, 30, 76, ease.entrance);
  const name = progress(frame, 44, 104, ease.entrance);
  const motto = progress(frame, 70, 120, ease.entrance);
  const url = progress(frame, K.url - K.card, K.url - K.card + 50, ease.entrance);
  const drift = progress(frame, 0, SCENES.finale.duration - K.card, ease.linear);
  return (
    <Fill>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1.012 - 0.012 * drift})`, transformOrigin: '50% 45%' }}>
        {/* The crescent across the frame, exactly as it crossed the opening. */}
        <HeroCrescentAt draw={arc} />
        <Img
          src={staticFile('brand/als-seal.png')}
          style={{ position: 'absolute', left: 960 - 60, top: 318, width: 120, height: 120, opacity: seal, transform: `translateY(${(1 - seal) * 10}px)` }}
        />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 604, height: 56, overflow: 'hidden' }}>
          <div
            style={{
              textAlign: 'center',
              fontFamily: font.sans,
              fontWeight: 500,
              fontSize: 40,
              letterSpacing: '0.36em',
              textIndent: '0.36em',
              textTransform: 'uppercase',
              color: color.paper,
              transform: `translateY(${(1 - name) * 56}px)`,
            }}
          >
            ADA&nbsp;Law&nbsp;Society
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 684, textAlign: 'center', ...type.label, fontSize: 15, letterSpacing: '0.34em', textIndent: '0.34em', color: color.slatePale, opacity: motto }}>
          {content.home.hero.lines.join(' ')}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 830, textAlign: 'center', fontFamily: font.sans, fontWeight: 500, fontSize: 19, letterSpacing: '0.28em', textIndent: '0.28em', color: color.wineSoft, opacity: url, transform: `translateY(${(1 - url) * 8}px)` }}>
          ADALAWSOCIETY.COM
        </div>
      </div>
    </Fill>
  );
}
