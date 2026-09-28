/**
 * Local capture only: make a photograph the homepage cover of the local site,
 * exactly as an editor would in Admin → Site images, so the site renders its
 * own hero (its crop, its overlay) with it.
 *
 *   cd <adalawsociety-v2> && npx tsx --env-file=.env \
 *     <promo-video>/capture/local-site/set-hero.ts <image> [focalX] [focalY]
 *
 * Then rebuild the site (next build && next start) and re-capture the shots
 * that show the hero:  npm run capture -- --only=content,photos,hero,home-threshold
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repo = process.cwd();
const [file, fx = '0.5', fy = '0.5'] = process.argv.slice(2);
if (!file) throw new Error('usage: set-hero.ts <image> [focalX] [focalY]');

const { PrismaPg } = await import(path.join(repo, 'node_modules/@prisma/adapter-pg/dist/index.js'));
const { PrismaClient } = await import(path.join(repo, 'src/generated/prisma/client.ts'));
const { writeMedia } = await import(path.join(repo, 'src/lib/media/storage.ts'));

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }) });
const stored = await writeMedia(await readFile(path.resolve(file)), { collection: 'site-images', name: 'homepage-cover' });
const media = await db.media.create({
  data: {
    path: stored.path,
    mime: stored.mime,
    width: stored.width,
    height: stored.height,
    bytes: stored.bytes,
    blurData: stored.blurData,
    focalX: Number(fx),
    focalY: Number(fy),
    kind: 'general',
    title: 'Homepage cover',
    collection: 'site-images',
  },
});
await db.section.update({ where: { pageKey_key: { pageKey: 'home', key: 'threshold' } }, data: { mediaId: media.id } });
console.log(`homepage cover → /media/${stored.path} (${stored.width}x${stored.height}, focal ${fx}, ${fy})`);
await db.$disconnect();
