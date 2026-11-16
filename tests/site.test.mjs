import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(root, path), 'utf8');

test('site ships the complete splash-page content contract', async () => {
  const html = await read('index.html');

  assert.match(html, /<canvas[^>]+id="signal-field"[^>]+aria-hidden="true"/);
  assert.match(html, /aria-label="UpgradeYa"/);
  assert.match(html, />ITS NOT TOO LATE</);
  assert.match(html, /href="mailto:admin@upgradeya\.com"/);
  assert.match(html, />admin@upgradeya\.com</);
  assert.doesNotMatch(html, /Bitcoin Mining|Charleston, SC|steve@upgradeya\.com|marc@upgradeya\.com/);
});

test('site is self-contained and avoids third-party runtime dependencies', async () => {
  const html = await read('index.html');

  assert.doesNotMatch(html, /<(?:script|img)[^>]+(?:src)="https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//i);
  assert.doesNotMatch(html, /bootstrap|jquery|three\.js|google-analytics|googletagmanager/i);
  assert.match(html, /<script type="module" src="js\/signal-field\.js"><\/script>/);
});

test('site uses the standalone UpgradeYa mark for browser icons', async () => {
  const html = await read('index.html');

  assert.match(html, /<link rel="icon" href="favicon\.ico" sizes="any">/);
  assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="assets\/favicon-32\.png">/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="assets\/apple-touch-icon\.png">/);
});

test('layout keeps the logo centered and protects the footer safe area', async () => {
  const css = await read('css/main.css');

  assert.match(css, /\.hero\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;/s);
  assert.match(css, /\.brand-mark\s*\{[^}]*width:\s*min\(680px,\s*78vw\);/s);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms/);
});

test('motion engine exports deterministic sizing and rendering helpers', async () => {
  const modulePath = new URL('../js/signal-field.js', import.meta.url);
  const {
    broadcastNodeIntensity,
    broadcastRadius,
    buildPeerConnections,
    buildSignalRoute,
    calculateNodeCount,
    cappedPixelRatio,
    connectionOpacity,
    connectionProfile,
    electricHopDuration,
    pickVisibleNodeIndex,
    pointAlongConnection,
  } = await import(modulePath);

  assert.equal(cappedPixelRatio(3), 1.5);
  assert.equal(cappedPixelRatio(1), 1);
  assert.ok(calculateNodeCount(390, 844) >= 20);
  assert.ok(calculateNodeCount(390, 844) <= 32);
  assert.ok(calculateNodeCount(1440, 900) > calculateNodeCount(390, 844));
  assert.ok(calculateNodeCount(1440, 900) <= 78);
  assert.deepEqual(connectionProfile(390), { maxPeers: 5, maxDistance: 210 });
  assert.deepEqual(connectionProfile(1440), { maxPeers: 5, maxDistance: 280 });
  assert.ok(connectionOpacity(20, 180) > connectionOpacity(140, 180));
  assert.ok(connectionOpacity(20, 180) > 0.48, 'nearby peer connections should stand out');
  assert.equal(connectionOpacity(181, 180), 0);

  const peerNodes = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 },
    { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 200, y: 100 },
    { x: 0, y: 200 }, { x: 100, y: 200 }, { x: 200, y: 200 },
  ];
  const peerConnections = buildPeerConnections(peerNodes, 4, 160);
  const degrees = Array(peerNodes.length).fill(0);
  const uniqueEdges = new Set();
  for (const [first, second] of peerConnections) {
    assert.notEqual(first, second);
    degrees[first] += 1;
    degrees[second] += 1;
    uniqueEdges.add(`${Math.min(first, second)}-${Math.max(first, second)}`);
  }
  assert.equal(uniqueEdges.size, peerConnections.length, 'peer links should be unique');
  assert.ok(degrees.every((degree) => degree >= 2), 'every node should participate in the web');
  assert.ok(degrees.every((degree) => degree <= 4), 'no node should become a central hub');

  const connections = [[0, 1], [1, 2], [2, 3], [3, 4]];
  const route = buildSignalRoute(connections, 4, () => 0);
  assert.deepEqual(route, [0, 1, 2, 3, 4]);
  assert.equal(new Set(route).size, route.length, 'signal route should not immediately revisit nodes');
  assert.equal(electricHopDuration(() => 0), 260);
  assert.equal(electricHopDuration(() => 1), 380);
  assert.deepEqual(
    pointAlongConnection({ x: 10, y: 20 }, { x: 110, y: 60 }, 0.5),
    { x: 60, y: 40 },
    'electricity should travel in a straight line between nodes',
  );

  assert.equal(broadcastRadius(1000, 280), 280);
  assert.equal(broadcastNodeIntensity(100, 90, 120), 0, 'nodes should stay quiet before the wave arrives');
  assert.equal(broadcastNodeIntensity(100, 100, 120), 1, 'nodes should flash as the wave touches them');
  assert.equal(broadcastNodeIntensity(100, 160, 120), 0.5, 'nodes should fade behind the wave');
  assert.equal(broadcastNodeIntensity(100, 220, 120), 0, 'nodes should return to rest after the wave passes');
  assert.equal(
    pickVisibleNodeIndex(
      [{ x: -20, y: 40 }, { x: 50, y: 50 }, { x: 120, y: 40 }],
      100,
      100,
      () => 0,
    ),
    1,
    'broadcasts should originate from a visible node',
  );
});

test('motion engine supports reduced motion, visibility pausing, and pointer input', async () => {
  const js = await read('js/signal-field.js');

  assert.match(js, /prefers-reduced-motion:\s*reduce/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /pointermove/);
  assert.match(js, /requestAnimationFrame/);
  assert.match(js, /ResizeObserver/);
});

test('required first-party assets exist', () => {
  for (const path of [
    'assets/upgradeya-logo.png',
    'assets/og-image.png',
    'assets/favicon-32.png',
    'assets/favicon-192.png',
    'assets/apple-touch-icon.png',
    'favicon.ico',
    'css/main.css',
    'js/signal-field.js',
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
  }
});
