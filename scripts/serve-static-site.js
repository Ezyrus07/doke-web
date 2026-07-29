#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.cwd();
const getArg = (name, fallback) => {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const host = getArg('--host', '127.0.0.1');
const port = Number(getArg('--port', process.env.PORT || '5500'));
const disableRemoteServicesForE2e = process.env.DOKE_E2E_DISABLE_REMOTE_SERVICES === '1';
const supabaseConfigPath = path.join(root, 'assets/js/core/supabase-config.js');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^([/\\])+/, '');
  const absolutePath = path.join(root, normalizedPath || 'index.html');

  if (!absolutePath.startsWith(root)) {
    return null;
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    return path.join(absolutePath, 'index.html');
  }

  return absolutePath;
}

function readE2eSafeFile(filePath) {
  if (!disableRemoteServicesForE2e || filePath !== supabaseConfigPath) return null;

  const source = fs.readFileSync(filePath, 'utf8');
  const marker = '  servicesEnabled: true,';
  if (!source.includes(marker)) {
    throw new Error('Supabase servicesEnabled marker missing from E2E config isolation.');
  }
  return source.replace(marker, '  servicesEnabled: false,');
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  };

  try {
    const isolatedSource = readE2eSafeFile(filePath);
    if (isolatedSource !== null) {
      headers['X-Doke-E2E-Remote-Services'] = 'disabled';
      response.writeHead(200, headers);
      response.end(isolatedSource);
      return;
    }
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'E2E config isolation failed.');
    return;
  }

  response.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Doke static server running at http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
