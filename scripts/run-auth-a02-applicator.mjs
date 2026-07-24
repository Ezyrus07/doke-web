#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.resolve('scripts/apply-auth-a02.mjs');
let source = fs.readFileSync(sourcePath, 'utf8');

const replacements = new Map([
  ["errors.push(\\`${SESSION_STORE} missing canonical sanitized-session token: \\${token}\\`);", "errors.push('assets/js/core/session.js missing canonical sanitized-session token: ' + token);"],
  ["errors.push(\\`${SESSION_STORE} still persists secret field: \\${forbidden}\\`);", "errors.push('assets/js/core/session.js still persists secret field: ' + forbidden);"],
  ["errors.push(\\`${CANONICAL_AUTH_SERVICE} missing canonical session bridge token: \\${token}\\`);", "errors.push('assets/js/services/auth-service.js missing canonical session bridge token: ' + token);"],
  ["errors.push(\\`${CANONICAL_AUTH_SERVICE} still duplicates provider secret: \\${forbidden}\\`);", "errors.push('assets/js/services/auth-service.js still duplicates provider secret: ' + forbidden);"],
  ["errors.push(\\`${AUTH_DOMAIN_CONTRACT} does not recognize Supabase session provider\\`);", "errors.push('assets/js/contracts/auth-domain-contract.js does not recognize Supabase session provider');"],
  ["errors.push(\\`${ORDERS_SERVICE} does not resolve provider token through canonical auth authority\\`);", "errors.push('assets/js/services/orders-service.js does not resolve provider token through canonical auth authority');"],
  ["errors.push(\\`${ORDERS_SERVICE} still reads token from Doke session snapshot\\`);", "errors.push('assets/js/services/orders-service.js still reads token from Doke session snapshot');"],
  ["errors.push(\\`${PROFESSIONAL_ACCESS_SERVICE} still copies refresh token into snapshot\\`);", "errors.push('assets/js/services/professional-access-service.js still copies refresh token into snapshot');"]
]);

for (const [search, replacement] of replacements) {
  if (!source.includes(search)) throw new Error(`AUTH-A02 wrapper could not find interpolation: ${search}`);
  source = source.replace(search, replacement);
}

const tempPath = path.join(os.tmpdir(), `doke-auth-a02-${process.pid}-${Date.now()}.mjs`);
fs.writeFileSync(tempPath, source);
try {
  await import(pathToFileURL(tempPath).href);
} finally {
  fs.rmSync(tempPath, { force: true });
}
