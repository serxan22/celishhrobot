/**
 * npm run render:stills -- --frames=0,60,120 [--scale=0.5] [--out=out/stills] [--sheet=name]
 *
 * Renders review stills from the Film composition (one bundle, many frames)
 * and, with --sheet, lays them out in a contact sheet for frame-by-frame review.
 */
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import sharp from 'sharp';

const arg = (name: string, fallback?: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ROOT = path.resolve(import.meta.dirname, '..');
const frames = (arg('frames') ?? '0')
  .split(',')
  .flatMap((part) => {
    const range = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (!range) return [Number(part)];
    const [, a, b, step] = range;
    const out: number[] = [];
    for (let f = Number(a); f <= Number(b); f += Number(step ?? 1)) out.push(f);
    return out;
  });
const scale = Number(arg('scale', '0.5'));
const out = path.resolve(ROOT, arg('out', 'out/stills')!);
const sheet = arg('sheet');
const comp = arg('comp', 'Film')!;
const browser = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public') });
const composition = await selectComposition({
  serveUrl,
  id: comp,
  browserExecutable: fs.existsSync(browser) ? browser : undefined,
  chromeMode: 'headless-shell',
});

const files: string[] = [];
for (const frame of frames) {
  const file = path.join(out, `${comp}-${String(frame).padStart(5, '0')}.jpg`);
  const t0 = Date.now();
  await renderStill({
    serveUrl,
    composition,
    frame,
    output: file,
    imageFormat: 'jpeg',
    jpegQuality: 92,
    scale,
    browserExecutable: fs.existsSync(browser) ? browser : undefined,
    chromeMode: 'headless-shell',
    timeoutInMilliseconds: 180_000,
  });
  files.push(file);
  console.log(`frame ${frame} → ${path.relative(ROOT, file)} (${Date.now() - t0} ms)`);
}

if (sheet) {
  const cols = Number(arg('cols', '3'));
  const w = Number(arg('w', '640'));
  const h = Math.round((w * composition.height) / composition.width);
  const rows = Math.ceil(files.length / cols);
  const pad = 6;
  const label = (f: number) =>
    Buffer.from(
      `<svg width="${w}" height="26"><rect width="100%" height="100%" fill="rgba(0,0,0,0.55)"/><text x="8" y="18" font-family="monospace" font-size="15" fill="#fff">f${f}  ${(f / composition.fps).toFixed(2)}s</text></svg>`,
    );
  const tiles = await Promise.all(
    files.map(async (file, i) => ({
      input: await sharp(file)
        .resize(w, h)
        .composite([{ input: label(frames[i]), top: 0, left: 0 }])
        .toBuffer(),
      left: (i % cols) * (w + pad),
      top: Math.floor(i / cols) * (h + pad),
    })),
  );
  const target = path.join(out, `${sheet}.jpg`);
  await sharp({ create: { width: cols * (w + pad) - pad, height: rows * (h + pad) - pad, channels: 3, background: '#222' } })
    .composite(tiles)
    .jpeg({ quality: 88 })
    .toFile(target);
  console.log(`sheet → ${path.relative(ROOT, target)}`);
}
