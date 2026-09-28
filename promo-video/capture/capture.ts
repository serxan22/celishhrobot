/**
 * npm run capture -- [--site=https://www.adalawsociety.com] [--only=id,id] [--originals=dir]
 *
 * Captures every shot in capture/shots.ts from the site at --site (production
 * by default), extracts the content the film sets, resolves photographs, and
 * writes public/captures/manifest.json — the only thing the film reads.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { launch, Stage, type Measured } from './engine';
import { SHOTS, type Anchor, type EaseName, type MorphShot, type SequenceShot, type StillShot, type Variant } from './shots';
import { CONTENT_PAGES, extractContent } from './extract';
import { FPS } from '../src/lib/timing';

const arg = (name: string, fallback?: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const SITE = (arg('site') ?? process.env.SITE_URL ?? 'https://www.adalawsociety.com').replace(/\/+$/, '');
const ONLY = arg('only')?.split(',');
const ORIGINALS = arg('originals') ?? process.env.ORIGINALS_DIR;
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/captures');
const PHOTOS = path.join(ROOT, 'public/photos');
const MANIFEST = path.join(OUT, 'manifest.json');

const DEFAULT_VIEWPORT = { width: 1600, height: 900 };
const DEFAULT_DPR = 2.4;

type ShotRecord = Record<string, unknown>;
type Manifest = {
  site: string;
  capturedAt: string;
  fps: number;
  shots: Record<string, ShotRecord>;
  content: Record<string, unknown>;
  photos: Record<string, { file: string; width: number; height: number; source: string }>;
};

const manifest: Manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : { site: SITE, capturedAt: '', fps: FPS, shots: {}, content: {}, photos: {} };
manifest.site = SITE;
manifest.capturedAt = new Date().toISOString();
manifest.fps = FPS;

const save = () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
};

/* ------------------------------------------------------------------ easing -- */
const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  // Newton-Raphson on x(t) then y(t); matches CSS cubic-bezier.
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const e = sx(u) - t;
    const d = dx(u);
    if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
    u -= e / d;
  }
  return sy(Math.min(1, Math.max(0, u)));
};
const EASES: Record<EaseName, (t: number) => number> = {
  glide: bezier(0.22, 0.61, 0.18, 1),
  travel: bezier(0.65, 0, 0.35, 1),
  scenic: bezier(0.33, 0.1, 0.2, 1),
  entrance: bezier(0.16, 1, 0.3, 1),
  linear: (t) => t,
};

/* ----------------------------------------------------------------- helpers -- */
async function resolveAnchor(stage: Stage, anchor: Anchor): Promise<number> {
  if (typeof anchor === 'number') return anchor;
  const { selector, align = 'top', offset = 0 } = anchor;
  const { top, height, vh, max } = await stage.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Anchor not found: ${sel}`);
    const r = el.getBoundingClientRect();
    return {
      top: r.top + window.scrollY,
      height: r.height,
      vh: window.innerHeight,
      max: document.documentElement.scrollHeight - window.innerHeight,
    };
  }, selector);
  const y = align === 'top' ? top : align === 'center' ? top + height / 2 - vh / 2 : top + height - vh;
  return Math.max(0, Math.min(max, Math.round((y + offset) * 100) / 100));
}

async function revealAll(stage: Stage) {
  await stage.page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.setAttribute('data-reveal', 'in'));
  });
  await stage.advance(200);
}

async function shootVariant(stage: Stage, dir: string, v: Variant) {
  await stage.hide(v.hide);
  await stage.advance(1);
  await stage.shoot(path.join(dir, `${v.name}.png`), { type: 'png' });
  await stage.unhide();
  await stage.advance(1);
}

function toRegion(m: Record<string, Measured | Measured[]>, dy: number) {
  const shift = (x: Measured) => ({
    ...x,
    rect: { ...x.rect, y: x.rect.y + dy },
    lines: x.lines.map((l) => ({ ...l, y: l.y + dy })),
    words: x.words.map((w) => ({ ...w, y: w.y + dy })),
  });
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m)) out[k] = Array.isArray(v) ? v.map(shift) : shift(v);
  return out;
}

async function measureAll(stage: Stage, measures: Record<string, string>) {
  const single: Record<string, string> = {};
  const out: Record<string, Measured | Measured[]> = {};
  for (const [name, sel] of Object.entries(measures)) {
    if (name.endsWith('[]')) {
      const count = await stage.page.evaluate((s) => document.querySelectorAll(s).length, sel);
      const list: Measured[] = [];
      for (let i = 0; i < count; i++) {
        await stage.page.evaluate(
          ({ s, i }) => {
            document.querySelectorAll('[data-film-measure]').forEach((e) => e.removeAttribute('data-film-measure'));
            document.querySelectorAll(s)[i].setAttribute('data-film-measure', '');
          },
          { s: sel, i },
        );
        const m = await stage.measure({ x: '[data-film-measure]' });
        if (m.x) list.push(m.x);
      }
      await stage.page.evaluate(() =>
        document.querySelectorAll('[data-film-measure]').forEach((e) => e.removeAttribute('data-film-measure')),
      );
      out[name.slice(0, -2)] = list;
    } else single[name] = sel;
  }
  Object.assign(out, await stage.measure(single));
  return out;
}

/* ---------------------------------------------------------------- sequence -- */
async function captureSequence(browser: Awaited<ReturnType<typeof launch>>, shot: SequenceShot) {
  const viewport = shot.viewport ?? DEFAULT_VIEWPORT;
  const dpr = shot.dpr ?? DEFAULT_DPR;
  const dir = path.join(OUT, shot.id);
  fs.rmSync(dir, { recursive: true, force: true });
  const stage = await Stage.open(browser, SITE + shot.path, { viewport, dpr, fps: FPS });
  // Let the page's own load choreography finish at the top of the page.
  await stage.advance(150);
  if (shot.revealAll) await revealAll(stage);

  const keys: Array<{ at: number; y: number; ease: (t: number) => number }> = [];
  for (const k of shot.scroll) keys.push({ at: k.at, y: await resolveAnchor(stage, k.to), ease: EASES[k.ease ?? 'travel'] });
  const yAt = (f: number) => {
    if (f <= keys[0].at) return keys[0].y;
    for (let i = 1; i < keys.length; i++) {
      if (f <= keys[i].at) {
        const t = (f - keys[i - 1].at) / (keys[i].at - keys[i - 1].at);
        return keys[i - 1].y + (keys[i].y - keys[i - 1].y) * keys[i].ease(t);
      }
    }
    return keys[keys.length - 1].y;
  };

  const record: ShotRecord = {
    kind: 'sequence',
    path: shot.path,
    viewport,
    dpr,
    frames: shot.frames,
    tail: shot.tail ?? 0,
    scroll: [] as number[],
  };
  const total = shot.frames + (shot.tail ?? 0);
  if (shot.preroll) {
    // Settle at the opening position first: reveals already played, the
    // docket already turned, as the previous shot left the page.
    await stage.scrollTo(yAt(0));
    await stage.advance(shot.preroll);
  }
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const y = yAt(Math.min(f, shot.frames));
    await stage.scrollTo(y);
    for (const m of shot.mouse ?? []) {
      if (m.at === f) {
        const box = await stage.page.locator(m.selector).first().boundingBox();
        if (box) await stage.page.mouse.move(box.x + box.width / 2 + (m.dx ?? 0), box.y + box.height / 2 + (m.dy ?? 0), { steps: 1 });
      }
    }
    await stage.advance(1);
    (record.scroll as number[]).push(await stage.scrollY());
    await stage.shoot(path.join(dir, `${String(f).padStart(4, '0')}.jpg`), { quality: shot.quality ?? 93 });
    if (f === 0 && shot.measureStart) record.start = await measureAll(stage, shot.measureStart);
    if (f % 30 === 0) process.stdout.write(`  ${shot.id} ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)\r`);
  }
  process.stdout.write('\n');
  if (shot.measureEnd) record.end = await measureAll(stage, shot.measureEnd);
  if (shot.endVariants) {
    await stage.shoot(path.join(dir, 'end.png'), { type: 'png' });
    for (const v of shot.endVariants) await shootVariant(stage, dir, v);
    record.variants = ['end', ...shot.endVariants.map((v) => v.name)];
  }
  manifest.shots[shot.id] = record;
  await stage.close();
}

/* ------------------------------------------------------------------- still -- */
async function shootTall(stage: Stage, file: string, top: number, height: number, hideHeaderAfterFirst: boolean) {
  const { width, height: vh } = stage.options.viewport;
  const dpr = stage.options.dpr;
  const tiles: { buf: Buffer; offset: number }[] = [];
  let covered = 0;
  let first = true;
  while (covered < height) {
    await stage.scrollTo(top + covered);
    if (!first && hideHeaderAfterFirst) await stage.hide(['body > header, header.fixed']);
    await stage.advance(2);
    const actual = await stage.scrollY();
    const offset = actual - top; // where this tile begins within the plate
    const tmp = file + `.tile${tiles.length}.png`;
    await stage.shoot(tmp, { type: 'png' });
    tiles.push({ buf: fs.readFileSync(tmp), offset });
    fs.rmSync(tmp);
    if (!first && hideHeaderAfterFirst) await stage.unhide();
    covered = offset + vh;
    first = false;
    if (actual + vh >= (await stage.page.evaluate(() => document.documentElement.scrollHeight)) - 1) break;
  }
  const H = Math.min(height, covered);
  await sharp({ create: { width: Math.round(width * dpr), height: Math.round(H * dpr), channels: 4, background: '#000' } })
    .composite(tiles.map((t) => ({ input: t.buf, top: Math.round(t.offset * dpr), left: 0 })))
    .png()
    .toFile(file);
  return H;
}

async function captureStill(browser: Awaited<ReturnType<typeof launch>>, shot: StillShot) {
  const viewport = shot.viewport ?? DEFAULT_VIEWPORT;
  const dpr = shot.dpr ?? DEFAULT_DPR;
  const dir = path.join(OUT, shot.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const stage = await Stage.open(browser, SITE + shot.path, { viewport, dpr, fps: FPS });
  await stage.advance(150);
  await revealAll(stage);
  const y = await resolveAnchor(stage, shot.at);
  const tall = (shot.height ?? viewport.height) > viewport.height;
  if (shot.hideHeader) await stage.page.addStyleTag({ content: 'body > header, header.fixed { visibility: hidden !important; }' });

  let height = viewport.height;
  const shoot = async (name: string) => {
    if (tall) height = await shootTall(stage, path.join(dir, `${name}.png`), y, shot.height!, !shot.hideHeader);
    else {
      await stage.scrollTo(y);
      await stage.advance(30);
      await stage.shoot(path.join(dir, `${name}.png`), { type: 'png' });
    }
  };
  await shoot('plate');
  // Geometry is measured with the page scrolled to the plate's top edge and
  // converted to plate coordinates.
  await stage.scrollTo(y);
  await stage.advance(2);
  const actualY = await stage.scrollY();
  const measured = shot.measure ? toRegion(await measureAll(stage, shot.measure), actualY - y) : {};
  for (const v of shot.variants ?? []) {
    await stage.hide(v.hide);
    await stage.advance(1);
    await shoot(v.name);
    await stage.unhide();
  }
  if (shot.hover) {
    await stage.scrollTo(y);
    await stage.advance(2);
    const box = await stage.page.locator(shot.hover).first().boundingBox();
    if (box) await stage.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await stage.advance(60);
    await stage.shoot(path.join(dir, 'hover.png'), { type: 'png' });
  }
  manifest.shots[shot.id] = {
    kind: 'still',
    path: shot.path,
    viewport,
    dpr,
    hideHeader: !!shot.hideHeader,
    scrollY: y,
    height,
    variants: ['plate', ...(shot.variants ?? []).map((v) => v.name), ...(shot.hover ? ['hover'] : [])],
    measure: measured,
  };
  await stage.close();
}

/* ------------------------------------------------------------------- morph -- */
async function captureMorph(browser: Awaited<ReturnType<typeof launch>>, shot: MorphShot) {
  const dpr = shot.dpr ?? 3;
  const dir = path.join(OUT, shot.id);
  fs.rmSync(dir, { recursive: true, force: true });
  const stage = await Stage.open(browser, SITE + shot.path, { viewport: shot.from, dpr, fps: FPS });
  await stage.advance(150);
  await revealAll(stage);
  const ease = EASES[shot.ease];
  const sizes: { width: number; height: number; scrollY: number }[] = [];
  for (let f = 0; f < shot.frames; f++) {
    const t = ease(f / (shot.frames - 1));
    const width = Math.round(shot.from.width + (shot.to.width - shot.from.width) * t);
    const height = Math.round(shot.from.height + (shot.to.height - shot.from.height) * t);
    await stage.page.setViewportSize({ width, height });
    await stage.advance(1);
    const top = await resolveAnchor(stage, { selector: shot.anchor.selector, align: 'top', offset: -shot.anchor.top });
    await stage.scrollTo(top);
    await stage.advance(1);
    sizes.push({ width, height, scrollY: await stage.scrollY() });
    await stage.shoot(path.join(dir, `${String(f).padStart(4, '0')}.jpg`), { quality: 93 });
    if (f % 20 === 0) process.stdout.write(`  ${shot.id} ${f}/${shot.frames}\r`);
  }
  process.stdout.write('\n');
  manifest.shots[shot.id] = { kind: 'morph', path: shot.path, dpr, frames: shot.frames, sizes };
  await stage.close();
}

/* ----------------------------------------------------------------- content -- */
async function captureContent(browser: Awaited<ReturnType<typeof launch>>) {
  for (const [kind, p] of Object.entries(CONTENT_PAGES)) {
    const stage = await Stage.open(browser, SITE + p, { viewport: DEFAULT_VIEWPORT, dpr: 1, fps: FPS, reducedMotion: true });
    await stage.advance(10);
    manifest.content[kind] = await extractContent(stage.page, kind);
    console.log(`  content ${kind}`);
    await stage.close();
  }
}

/* ------------------------------------------------------------------ photos -- */
async function dhash(file: string | Buffer): Promise<bigint> {
  const raw = await sharp(file).rotate().greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) h = (h << 1n) | (raw[y * 17 + x] > raw[y * 17 + x + 1] ? 1n : 0n);
  return h;
}
const hamming = (a: bigint, b: bigint) => {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
};

function collectMasters(node: unknown, into: Set<string>) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => collectMasters(n, into));
  for (const [k, v] of Object.entries(node)) {
    if (k === 'master' && typeof v === 'string' && v.startsWith('/media/')) into.add(v);
    else collectMasters(v, into);
  }
}

async function resolvePhotos() {
  fs.mkdirSync(PHOTOS, { recursive: true });
  // The film imports hd.json; `npm run enhance` fills it.
  if (!fs.existsSync(path.join(PHOTOS, 'hd.json'))) fs.writeFileSync(path.join(PHOTOS, 'hd.json'), '{}');
  const masters = new Set<string>();
  collectMasters(manifest.content, masters);
  let originals: { file: string; hash: bigint; width: number; height: number }[] = [];
  if (ORIGINALS && fs.existsSync(ORIGINALS)) {
    const files: string[] = [];
    const walk = (d: string) =>
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(jpe?g|png|webp)$/i.test(e.name)) files.push(p);
      });
    walk(ORIGINALS);
    originals = await Promise.all(
      files.map(async (file) => {
        const meta = await sharp(file).rotate().metadata();
        const portrait = (meta.orientation ?? 1) >= 5;
        return {
          file,
          hash: await dhash(file),
          width: (portrait ? meta.height : meta.width) ?? 0,
          height: (portrait ? meta.width : meta.height) ?? 0,
        };
      }),
    );
  }
  for (const master of masters) {
    const name = crypto.createHash('sha1').update(master).digest('hex').slice(0, 12) + '.jpg';
    const res = await fetch(SITE + master);
    if (!res.ok) {
      console.warn(`  photo ${master}: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    let source = 'master';
    let out = sharp(buf).rotate();
    let width = meta.width ?? 0;
    let height = meta.height ?? 0;
    if (originals.length) {
      const h = await dhash(buf);
      const match = originals
        .map((o) => ({ o, d: hamming(h, o.hash) }))
        .filter(({ o, d }) => d <= 10 && Math.abs(o.width / o.height - width / height) < 0.01)
        .sort((a, b) => a.d - b.d)[0];
      if (match && match.o.width > width) {
        out = sharp(match.o.file).rotate();
        width = match.o.width;
        height = match.o.height;
        source = `original:${path.relative(ORIGINALS!, match.o.file)}`;
      }
    }
    await out.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(path.join(PHOTOS, name));
    manifest.photos[master] = { file: `photos/${name}`, width, height, source };
    console.log(`  photo ${master} → ${name} ${width}x${height} (${source})`);
  }
}

/* -------------------------------------------------------------------- main -- */
const browser = await launch();
const want = (id: string) => !ONLY || ONLY.includes(id);
console.log(`Capturing ${SITE}`);
if (want('content')) {
  await captureContent(browser);
  save();
}
if (want('photos')) {
  await resolvePhotos();
  save();
}
for (const shot of SHOTS) {
  if (!want(shot.id) && !(ONLY?.includes('morph') && shot.kind === 'morph')) continue;
  const t0 = Date.now();
  if (shot.kind === 'sequence') await captureSequence(browser, shot);
  else if (shot.kind === 'still') await captureStill(browser, shot);
  else await captureMorph(browser, shot);
  console.log(`✓ ${shot.id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  save();
}
await browser.close();
console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}`);
