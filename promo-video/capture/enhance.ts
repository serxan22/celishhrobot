/**
 * npm run enhance — photographs the film shows full frame are resampled once,
 * carefully, to cover a 3840 x 2160 frame (Lanczos, then a light unsharp mask),
 * instead of being stretched by the browser at render time. Sources already
 * large enough are left alone. Writes public/photos/hd.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/captures/manifest.json'), 'utf8'));
const OUT = path.join(ROOT, 'public/photos/hd');
fs.mkdirSync(OUT, { recursive: true });

/** Photographs the cut shows at (or near) full frame. */
const FULL_FRAME = ['moot-', 'debate-2025', 'ai-debate', 'orientation-2026', 'seminar-2026-09', 'debate-2024-chamber', 'civil-code-2023', 'seminar-2019'];

const index: Record<string, { file: string; width: number; height: number }> = {};
for (const [master, p] of Object.entries(manifest.photos as Record<string, { file: string; width: number; height: number }>)) {
  if (!FULL_FRAME.some((k) => master.includes(k))) continue;
  const cover = Math.max(3840 / p.width, 2160 / p.height);
  if (cover <= 1.02) continue;
  const width = Math.round(p.width * cover);
  const height = Math.round(p.height * cover);
  const file = path.join(OUT, path.basename(p.file));
  await sharp(path.join(ROOT, 'public', p.file))
    .resize(width, height, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.9, m1: 0.5, m2: 1.6 })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(file);
  index[master] = { file: `photos/hd/${path.basename(p.file)}`, width, height };
  console.log(`hd ${path.basename(master)} ${p.width}x${p.height} → ${width}x${height}`);
}
fs.writeFileSync(path.join(ROOT, 'public/photos/hd.json'), JSON.stringify(index, null, 2));

/* A small tier for photographs shown small (portraits in a composition, cards
   on the record): a page can hold dozens without exhausting decode memory. */
const SM = path.join(ROOT, 'public/photos/sm');
fs.mkdirSync(SM, { recursive: true });
const small: Record<string, { file: string; width: number; height: number }> = {};
for (const [master, p] of Object.entries(manifest.photos as Record<string, { file: string; width: number; height: number }>)) {
  const k = Math.min(1, 960 / Math.max(p.width, p.height));
  const width = Math.round(p.width * k);
  const height = Math.round(p.height * k);
  const file = path.join(SM, path.basename(p.file));
  await sharp(path.join(ROOT, 'public', p.file)).resize(width, height, { kernel: 'lanczos3' }).jpeg({ quality: 90 }).toFile(file);
  small[master] = { file: `photos/sm/${path.basename(p.file)}`, width, height };
}
fs.writeFileSync(path.join(ROOT, 'public/photos/sm.json'), JSON.stringify(small, null, 2));
console.log(`sm ${Object.keys(small).length} photographs`);
