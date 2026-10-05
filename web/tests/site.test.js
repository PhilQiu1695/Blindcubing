// Checks for the deployed site (see .github/workflows/pages.yml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('service worker caches every site file, so the site works offline', () => {
  const listed = new Set([...read('sw.js').matchAll(/'([^']+\.(?:js|css|html))'/g)].map((m) => m[1]));
  const files = ['index.html', 'css/style.css', ...readdirSync(new URL('../js', import.meta.url)).map((f) => `js/${f}`)];
  for (const file of files) assert.ok(listed.has(file), `${file} is missing from FILES in sw.js`);
  for (const file of listed) assert.ok(files.includes(file), `sw.js lists ${file}, which doesn't exist`);
});

test('page uses relative paths (the site is served from /Blindcubing/ on GitHub Pages)', () => {
  const html = read('index.html');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (url.startsWith('data:')) continue;
    assert.ok(!url.startsWith('/') && !/^https?:/.test(url), `${url} should be a relative path`);
  }
});
