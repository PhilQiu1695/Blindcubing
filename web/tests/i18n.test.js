import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS, pickLanguage, t, translateMessage } from '../js/i18n.js';
import { Cube } from '../js/cube.js';
import { checkMemo, parseMemo } from '../js/memo.js';
import { scrambleError } from '../js/render.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('every English string has a Chinese translation, and no extras', () => {
  assert.deepEqual(Object.keys(STRINGS.zh).sort(), Object.keys(STRINGS.en).sort());
});

test('every data-i18n key in index.html exists', () => {
  const keys = [...html.matchAll(/data-i18n(?:-html|-placeholder|-aria-label)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 40);
  for (const key of keys) assert.ok(key in STRINGS.en, `${key} is missing from STRINGS`);
});

test('placeholders in a translation match the English ones', () => {
  const names = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, en] of Object.entries(STRINGS.en)) {
    if (key === 'err.letter') continue; // {article} is English grammar only
    assert.deepEqual(names(STRINGS.zh[key]), names(en), key);
  }
});

test('t fills placeholders and falls back to English, then the key', () => {
  assert.equal(t('zh', 'stats.solvedCount', { n: 3 }), '成功 3 次');
  assert.equal(t('en', 'stats.solvedCount', { n: 3 }), '3 solved');
  assert.equal(t('fr', 'memo.check'), 'Check');
  assert.equal(t('zh', 'no.such.key'), 'no.such.key');
});

test('pickLanguage: URL, then saved choice, then browser language', () => {
  assert.equal(pickLanguage({ param: 'zh', saved: 'en', browser: ['en-US'] }), 'zh');
  assert.equal(pickLanguage({ param: 'xx', saved: 'en', browser: ['zh-CN'] }), 'en');
  assert.equal(pickLanguage({ browser: ['zh-TW'] }), 'zh');
  assert.equal(pickLanguage({ browser: ['en-GB', 'zh'] }), 'zh');
  assert.equal(pickLanguage({ browser: ['fr'] }), 'en');
  assert.equal(pickLanguage(), 'en');
});

test('checker and scramble messages are translated, letters and piece names kept', () => {
  const cube = new Cube();
  cube.scrambleWca("R U R' U'");
  const wrong = checkMemo(cube, '', '').messages;
  assert.ok(wrong.length);
  for (const m of wrong) {
    assert.equal(translateMessage('en', m), m);
    const zh = translateMessage('zh', m);
    assert.match(zh, /^(棱块|角块)：编码后 [A-Z, ]+ 仍未复原$/, zh);
  }

  assert.throws(() => parseMemo('A1', 'edge'), (err) => {
    assert.equal(translateMessage('zh', err.message), '“1”不是 JB 编码中的棱块字母');
    return true;
  });
  const bad = checkMemo(new Cube(), 'A', 'Q1').messages;
  assert.ok(bad.includes("Corners: '1' is not a corner letter in the JB scheme"));
  assert.ok(bad.map((m) => translateMessage('zh', m)).includes('角块：“1”不是 JB 编码中的角块字母'));

  assert.equal(translateMessage('zh', scrambleError('R x')), '不支持的转动：“x”');
  assert.equal(translateMessage('zh', 'Something new'), 'Something new');
});
