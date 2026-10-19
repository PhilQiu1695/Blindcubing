import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube } from '../js/cube.js';
import { traceMemo } from '../js/memo.js';
import { FEEDBACK_URL, MAX_MESSAGE, feedbackContext, feedbackError, feedbackPayload, sendFeedback } from '../js/feedback.js';
import { counterEndpoint, startAnalytics } from '../js/analytics.js';

test('feedbackError: empty and too-long messages are rejected', () => {
  assert.equal(feedbackError('   '), 'feedback.empty');
  assert.equal(feedbackError('x'.repeat(MAX_MESSAGE + 1)), 'feedback.tooLong');
  assert.equal(feedbackError('Checker said my memo was wrong'), null);
});

test('feedbackContext holds what is needed to reproduce a memo problem', () => {
  const cube = new Cube();
  cube.scrambleWca('R U');
  const [edges, corners] = traceMemo(cube);
  const ok = feedbackContext({ scramble: 'R U', cube, edges, corners });
  assert.equal(ok.scramble, 'R U');
  assert.equal(ok.memo_check, 'correct');
  assert.equal(ok.reference_edges, edges);

  const wrong = feedbackContext({ scramble: 'R U', cube, edges: '', corners: 'Q1' });
  assert.equal(wrong.user_edges, '-');
  assert.match(wrong.memo_check, /Edges: memo leaves .* unsolved; Corners: '1' is not a corner letter/);

  const solved = feedbackContext({ scramble: '', cube: new Cube(), edges: '', corners: '' });
  assert.equal(solved.scramble, '(solved cube)');
  assert.equal(solved.reference_edges, '(solved)');
});

test('feedbackPayload: trimmed message, optional context, empty spam trap', () => {
  const p = feedbackPayload({ accessKey: 'k', message: '  hi  ', lang: 'zh', context: { scramble: 'R' } });
  assert.equal(p.access_key, 'k');
  assert.equal(p.message, 'hi');
  assert.equal(p.contact, '-');
  assert.equal(p.scramble, 'R');
  assert.equal(p.botcheck, '');
  assert.ok(!('scramble' in feedbackPayload({ accessKey: 'k', message: 'hi', lang: 'en' })));
});

const fakeFetch = (status, body) => async (url, options) => {
  fakeFetch.last = { url, options };
  return { ok: status < 400, status, json: async () => { if (body === null) throw new Error('no json'); return body; } };
};

test('sendFeedback posts JSON and reports failures', async () => {
  await sendFeedback({ message: 'hi' }, fakeFetch(200, { success: true }));
  assert.equal(fakeFetch.last.url, FEEDBACK_URL);
  assert.equal(fakeFetch.last.options.method, 'POST');
  assert.deepEqual(JSON.parse(fakeFetch.last.options.body), { message: 'hi' });

  await assert.rejects(sendFeedback({}, fakeFetch(400, { success: false, message: 'Invalid access key' })), /Invalid access key/);
  await assert.rejects(sendFeedback({}, fakeFetch(500, null)), /HTTP 500/);
});

test('analytics: endpoint from the site code, and never counted locally', () => {
  assert.equal(counterEndpoint('blindcubing'), 'https://blindcubing.goatcounter.com/count');
  assert.equal(counterEndpoint(''), null);
  assert.equal(counterEndpoint('bad code/'), null);

  const fakeDoc = (hostname, protocol = 'https:') => {
    const added = [];
    return {
      added,
      location: { hostname, protocol },
      createElement: () => ({ dataset: {} }),
      head: { append: (el) => added.push(el) },
    };
  };
  const live = fakeDoc('philqiu1695.github.io');
  startAnalytics('blindcubing', live);
  assert.equal(live.added.length, 1);
  assert.equal(live.added[0].dataset.goatcounter, 'https://blindcubing.goatcounter.com/count');

  for (const doc of [fakeDoc('localhost'), fakeDoc('127.0.0.1'), fakeDoc('', 'file:')]) {
    startAnalytics('blindcubing', doc);
    assert.equal(doc.added.length, 0);
  }
  const off = fakeDoc('philqiu1695.github.io');
  startAnalytics('', off);
  assert.equal(off.added.length, 0);
});
