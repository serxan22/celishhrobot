// A local stand-in for the Supabase Storage REST API, covering exactly the
// calls the ADA Law Society site makes (src/lib/media/storage.ts): upload,
// download, remove, list, bucket admin and signed upload URLs. It lets the
// unmodified site run against local disk so its pages can be captured.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = process.env.STORAGE_ROOT ?? path.resolve('storage-data');
const PORT = Number(process.env.STORAGE_PORT ?? 54321);

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

const buckets = new Map([
  ['media', { id: 'media', name: 'media', public: true }],
  ['media-uploads', { id: 'media-uploads', name: 'media-uploads', public: false, file_size_limit: 20971520, allowed_mime_types: ['image/avif', 'image/jpeg', 'image/png', 'image/webp'] }],
]);

function safeJoin(bucket, objectPath) {
  const target = path.resolve(ROOT, bucket, objectPath);
  if (!target.startsWith(path.resolve(ROOT, bucket) + path.sep)) throw new Error('bad path');
  return target;
}

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

function serveFile(res, file, head = false) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
  const stat = fs.statSync(file);
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': 'public, max-age=31536000',
  });
  if (head) return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = decodeURIComponent(url.pathname).replace(/^\/storage\/v1/, '');
    let m;

    if (p === '/bucket' && req.method === 'GET') return json(res, 200, [...buckets.values()]);
    if (p === '/bucket' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      buckets.set(body.id ?? body.name, { id: body.id ?? body.name, name: body.name ?? body.id, public: !!body.public });
      return json(res, 200, { name: body.name ?? body.id });
    }
    if ((m = p.match(/^\/bucket\/([^/]+)$/)) && req.method === 'PUT') return json(res, 200, { message: 'Successfully updated' });

    if ((m = p.match(/^\/object\/list\/([^/]+)$/)) && req.method === 'POST') return json(res, 200, []);

    if ((m = p.match(/^\/object\/upload\/sign\/([^/]+)\/(.+)$/))) {
      if (req.method === 'POST') return json(res, 200, { url: `/object/upload/sign/${m[1]}/${m[2]}?token=local` });
      const file = safeJoin(m[1], m[2]);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, await readBody(req));
      return json(res, 200, { Key: `${m[1]}/${m[2]}` });
    }

    if ((m = p.match(/^\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/))) return serveFile(res, safeJoin(m[1], m[2]), req.method === 'HEAD');

    if ((m = p.match(/^\/object\/([^/]+)$/)) && req.method === 'DELETE') {
      const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || '{}');
      const removed = [];
      for (const prefix of prefixes) {
        const file = safeJoin(m[1], prefix);
        if (fs.existsSync(file)) { fs.rmSync(file); removed.push({ name: prefix }); }
      }
      return json(res, 200, removed);
    }

    if ((m = p.match(/^\/object\/([^/]+)\/(.+)$/))) {
      const [, bucket, objectPath] = m;
      const file = safeJoin(bucket, objectPath);
      if (req.method === 'GET' || req.method === 'HEAD') return serveFile(res, file, req.method === 'HEAD');
      if (req.method === 'POST' || req.method === 'PUT') {
        const upsert = String(req.headers['x-upsert'] ?? 'false') === 'true' || req.method === 'PUT';
        if (fs.existsSync(file) && !upsert) return json(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
        const body = await readBody(req);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, body);
        return json(res, 200, { Key: `${bucket}/${objectPath}`, Id: randomUUID() });
      }
    }

    json(res, 404, { statusCode: '404', error: 'not_found', message: `No route for ${req.method} ${p}` });
  } catch (error) {
    json(res, 500, { statusCode: '500', error: 'internal', message: String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`storage mock on http://127.0.0.1:${PORT} → ${ROOT}`));
