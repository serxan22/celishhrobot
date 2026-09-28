/**
 * npm run verify -- [--site=https://www.adalawsociety.com] [--no-visual]
 *
 * Checks the capture the film is built from against a site — production by
 * default — before a render is accepted:
 *
 *  1. Content: every headline, date, name, role, caption and photograph the
 *     film sets is re-read from the site with the same extractors and diffed
 *     field by field against public/captures/manifest.json.
 *  2. Pictures: every captured still is re-shot at low resolution at the same
 *     scroll position and compared with the plate the film uses.
 *
 * Writes capture/verify-report.md and exits non-zero on any difference, so a
 * render can be gated on it:  npm run verify && npm run render:master
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { launch, Stage } from './engine';
import { CONTENT_PAGES, extractContent } from './extract';

const arg = (name: string, fallback?: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const SITE = (arg('site') ?? process.env.SITE_URL ?? 'https://www.adalawsociety.com').replace(/\/+$/, '');
const VISUAL = !process.argv.includes('--no-visual');
const ROOT = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/captures/manifest.json'), 'utf8'));

type Finding = { area: string; item: string; ok: boolean; detail?: string };
const findings: Finding[] = [];
const check = (area: string, item: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  findings.push({ area, item, ok, detail: ok ? undefined : `film: ${JSON.stringify(a)}\n    site: ${JSON.stringify(b)}` });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = Record<string, any>;
/** The fields the film actually sets, per page. */
const FIELDS: Record<string, (c: C) => Record<string, unknown>> = {
  home: (c) => ({
    hero: [c.hero?.eyebrow, c.hero?.lines, c.hero?.lead, c.hero?.photo?.master],
    chapters: c.chapters,
    invitation: c.invitation?.lines,
    docket: (c.docket ?? []).map((d: C) => [d.label, d.title, d.plate, d.photo?.master]),
    seminars: c.seminars?.programme,
    seminarPhotos: (c.seminars?.photos ?? []).map((p: C) => p.master),
    blog: c.blog,
    team: c.team,
  }),
  homeAz: (c) => ({ invitation: c.invitation?.lines }),
  homeRu: (c) => ({ invitation: c.invitation?.lines }),
  blog: (c) => ({ masthead: c.masthead, lead: c.articles?.[0] && [c.articles[0].title, c.articles[0].meta, c.articles[0].plate?.master] }),
  article: (c) => ({ article: c.article && [c.article.category, c.article.title, c.article.byline, c.article.plate?.master] }),
  news: (c) => ({ entries: (c.entries ?? []).map((e: C) => [e.title, e.meta?.[0], e.photo?.master ?? null]) }),
  orientation: (c) => ({ story: c.story, figures: (c.figures ?? []).map((f: C) => f.master) }),
  moot: (c) => ({ story: c.story, figures: (c.figures ?? []).map((f: C) => [f.master, f.caption]) }),
  debate: (c) => ({ story: c.story, figures: (c.figures ?? []).map((f: C) => [f.master, f.caption]) }),
  aiDebate: (c) => ({ story: c.story }),
  seminar: (c) => ({ story: c.story, figures: (c.figures ?? []).map((f: C) => f.master) }),
  team: (c) => ({
    masthead: c.masthead,
    currentTerm: (c.members ?? []).slice(0, 30).map((m: C) => [m.name, m.role, m.group, m.photo?.master]),
  }),
  about: (c) => ({ masthead: c.masthead, chronicle: c.chronicle }),
};

const browser = await launch();
console.log(`Verifying the film's capture (${manifest.site}, ${manifest.capturedAt}) against ${SITE}`);

for (const [kind, p] of Object.entries(CONTENT_PAGES)) {
  const stage = await Stage.open(browser, SITE + p, { viewport: { width: 1600, height: 900 }, dpr: 1, fps: 60, reducedMotion: true });
  const live = await extractContent(stage.page, kind);
  await stage.close();
  const pick = FIELDS[kind];
  if (!pick) continue;
  const film = pick(manifest.content[kind] ?? {});
  const site = pick(live);
  for (const key of Object.keys(film)) check(`content ${p}`, key, film[key], site[key]);
}

if (VISUAL) {
  for (const [id, shot] of Object.entries(manifest.shots as Record<string, C>)) {
    if (shot.kind !== 'still') continue;
    const stage = await Stage.open(browser, SITE + shot.path, { viewport: shot.viewport, dpr: 1, fps: 60 });
    const hideHeader = shot.hideHeader ?? id === 'team-committees';
    if (hideHeader) await stage.page.addStyleTag({ content: 'body > header, header.fixed { visibility: hidden !important; }' });
    await stage.advance(120);
    await stage.page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.setAttribute('data-reveal', 'in')));
    await stage.advance(200);
    await stage.scrollTo(shot.scrollY);
    await stage.advance(30);
    const liveBuf = await stage.page.screenshot({ type: 'png' });
    await stage.close();
    const W = 320;
    const H = Math.round((W * shot.viewport.height) / shot.viewport.width);
    const a = await sharp(path.join(ROOT, 'public/captures', id, 'plate.png'))
      .extract({ left: 0, top: 0, width: Math.round(shot.viewport.width * shot.dpr), height: Math.round(shot.viewport.height * shot.dpr) })
      .resize(W, H)
      .greyscale()
      .raw()
      .toBuffer();
    const b = await sharp(liveBuf).resize(W, H).greyscale().raw().toBuffer();
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    const mean = diff / a.length / 255;
    findings.push({ area: `picture ${shot.path}`, item: id, ok: mean < 0.04, detail: `mean difference ${(mean * 100).toFixed(1)}%` });
  }
}
await browser.close();

const bad = findings.filter((f) => !f.ok);
const lines = [
  `# Capture verification`,
  ``,
  `- Film capture: ${manifest.site} at ${manifest.capturedAt}`,
  `- Checked against: ${SITE} at ${new Date().toISOString()}`,
  `- Result: **${bad.length ? `${bad.length} difference(s)` : 'identical'}** (${findings.length} checks)`,
  ``,
  ...findings.map((f) => `- ${f.ok ? '✓' : '✗'} ${f.area} — ${f.item}${f.detail && !f.ok ? `\n    ${f.detail}` : f.detail ? ` (${f.detail})` : ''}`),
];
fs.writeFileSync(path.join(ROOT, 'capture/verify-report.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 6).join('\n'));
for (const f of bad) console.log(`✗ ${f.area} — ${f.item}\n    ${f.detail}`);
process.exit(bad.length ? 1 : 0);
