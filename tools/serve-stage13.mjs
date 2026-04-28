#!/usr/bin/env node
/** Lightweight local server for Stage 13 responsive QA dashboard. */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 5173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function contentType(filePath) {
  return types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safePath = path.normalize(rawPath).replace(/^([/\\])+/, '');
    let filePath = path.join(rootDir, safePath || 'index.html');
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    let stat = await fsp.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = await fsp.stat(filePath).catch(() => null);
    }
    if (!stat?.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500);
    res.end(error?.message || 'Server error');
  }
});

server.listen(port, host, () => {
  console.log(`Doke Stage 13 QA: http://${host}:${port}/tools/responsive-stage13-dashboard.html`);
});
