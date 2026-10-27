import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = resolve(projectRoot, 'dist/mygpass-client/server/server.mjs');
const port = 4318;
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [serverPath], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`SSR server exited with code ${server.exitCode}.`);
    }

    try {
      return await fetch(url);
    } catch {
      await delay(200);
    }
  }

  throw new Error('SSR server did not become ready within 10 seconds.');
}

function getNonce(html) {
  const match = html.match(/<app-root\b[^>]*\bngcspnonce="([^"]+)"/i);
  assert.ok(match, 'HTML must provide ngCspNonce on the Angular root.');
  return match[1];
}

async function assertSecuredHtml(path) {
  const response = await fetchWithRetry(`${origin}${path}`);
  assert.equal(response.status, 200, `${path} should return HTTP 200.`);
  assert.equal(response.headers.get('server'), null);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('strict-transport-security'), null);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const policy = response.headers.get('content-security-policy');
  assert.ok(policy, `${path} must have an enforced CSP header.`);
  assert.equal(response.headers.get('content-security-policy-report-only'), null);
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' 'nonce-[^']+'/);
  assert.match(policy, /style-src 'self' 'nonce-[^']+'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(
    policy,
    /connect-src 'self' https:\/\/localhost:5001/,
  );
  assert.doesNotMatch(policy, /'unsafe-inline'|\*/);

  const html = await response.text();
  const nonce = getNonce(html);
  const policyNonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.equal(policyNonce, nonce, `${path} CSP and Angular nonce must match.`);

  const inlineElements = [
    ...html.matchAll(/<(script|style)\b([^>]*)>/gi),
  ].filter(([, tag, attributes]) =>
    tag.toLowerCase() === 'style' || !/\bsrc\s*=/i.test(attributes),
  );
  assert.ok(inlineElements.length > 0, `${path} should exercise inline nonces.`);
  for (const [, , attributes] of inlineElements) {
    assert.match(attributes, new RegExp(`\\bnonce="${nonce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }

  return { response, html, nonce };
}

try {
  const root = await assertSecuredHtml('/');
  const login = await assertSecuredHtml('/login/');
  const booking = await assertSecuredHtml('/booking/route');
  assert.notEqual(root.nonce, login.nonce, 'HTML requests must use fresh nonces.');
  assert.notEqual(login.nonce, booking.nonce, 'HTML requests must use fresh nonces.');

  const scriptPath = login.html.match(/<script\b[^>]*\bsrc="([^"]+)"/i)?.[1];
  const stylesheetPath = login.html.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/i)?.[1];
  assert.ok(scriptPath, 'SSR HTML must include an external application script.');
  assert.ok(stylesheetPath, 'SSR HTML must include an external stylesheet.');

  for (const path of [scriptPath, stylesheetPath]) {
    const response = await fetch(new URL(path, `${origin}/`));
    assert.equal(response.status, 200, `${path} should be served successfully.`);
    assert.equal(response.headers.get('server'), null);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('strict-transport-security'), null);
    assert.equal(response.headers.get('content-security-policy'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }

  const unknownRoute = await fetch(`${origin}/missing-asset-for-header-test.txt`);
  assert.equal(unknownRoute.status, 200, 'Unknown routes should use the Angular SSR fallback.');
  assert.match(
    unknownRoute.headers.get('content-type') ?? '',
    /text\/html/i,
    'Unknown routes should return SSR HTML rather than a static-asset 404.',
  );
  assert.ok(
    unknownRoute.headers.get('content-security-policy'),
    'The SSR fallback must retain its enforced CSP.',
  );
  assert.match(await unknownRoute.text(), /<app-root\b/i, 'The unknown route should render the Angular app.');
  assert.equal(unknownRoute.headers.get('server'), null);
  assert.equal(unknownRoute.headers.get('x-powered-by'), null);
  assert.equal(unknownRoute.headers.get('strict-transport-security'), null);
  assert.equal(unknownRoute.headers.get('x-frame-options'), 'DENY');
  assert.equal(unknownRoute.headers.get('x-content-type-options'), 'nosniff');

  console.log('SSR header smoke tests passed for HTML, static assets, and the unknown-route SSR fallback.');
} finally {
  if (server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill();
    await exited;
  }
}
