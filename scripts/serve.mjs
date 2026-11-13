import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = resolve(root, `.${path === '/' ? '/index.html' : path}`);
    if (!target.startsWith(root + sep) || path.split('/').some((segment) => segment.startsWith('.'))) { response.writeHead(403); response.end('Acesso negado'); return; }
    if (!(await stat(target)).isFile()) throw new Error('Arquivo não encontrado');
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body);
  } catch { response.writeHead(404); response.end('Arquivo não encontrado'); }
}).listen(port, '127.0.0.1', () => console.log(`Portfólio disponível em http://127.0.0.1:${port}`));
