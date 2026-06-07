import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '0.0.0.0';
const port = Number.parseInt(process.env.PORT ?? '4173', 10);
const distDir = fileURLToPath(new URL('./dist/', import.meta.url));

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function getContentType(filePath) {
  return contentTypes.get(extname(filePath)) ?? 'application/octet-stream';
}

function getSafePath(requestPath) {
  const normalizedPath = normalize(decodeURIComponent(requestPath)).replace(/^([.]{2}[\/\\])+/, '');
  return normalizedPath === '/' ? '/index.html' : normalizedPath;
}

async function resolveFile(requestPath) {
  const safePath = getSafePath(requestPath);
  const filePath = join(distDir, safePath);

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      return join(filePath, 'index.html');
    }
    return filePath;
  } catch {
    if (extname(safePath)) {
      return null;
    }
    return join(distDir, 'index.html');
  }
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400).end('Bad Request');
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  const filePath = await resolveFile(url.pathname);

  if (!filePath) {
    response.writeHead(404).end('Not Found');
    return;
  }

  try {
    const fileBuffer = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    response.end(fileBuffer);
  } catch {
    response.writeHead(500).end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`SwipeJobs client serving on http://${host}:${port}`);
});
