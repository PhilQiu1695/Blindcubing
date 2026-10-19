// Feedback form: builds the message and sends it to Web3Forms (see config.js). DOM-free so it can be tested in Node.
import { checkMemo, traceMemo } from './memo.js';

export const FEEDBACK_URL = 'https://api.web3forms.com/submit';
export const MAX_MESSAGE = 5000;

/** Returns an i18n key for an invalid message ('feedback.empty' / 'feedback.tooLong'), or null if it is fine. */
export function feedbackError(message) {
  if (!message.trim()) return 'feedback.empty';
  if (message.length > MAX_MESSAGE) return 'feedback.tooLong';
  return null;
}

/**
 * What the trainer was showing, so a bug report about a memo can be reproduced:
 * the scramble, the user's memo, what the checker said and the reference memo.
 */
export function feedbackContext({ scramble, cube, edges, corners }) {
  let check;
  try {
    const result = checkMemo(cube, edges, corners);
    check = result.correct ? 'correct' : result.messages.join('; ');
  } catch (err) {
    check = `checker error: ${err.message}`;
  }
  const [refEdges, refCorners] = traceMemo(cube);
  return {
    scramble: scramble || '(solved cube)',
    user_edges: edges || '-',
    user_corners: corners || '-',
    memo_check: check,
    reference_edges: refEdges || '(solved)',
    reference_corners: refCorners || '(solved)',
  };
}

/** Body for Web3Forms: fixed fields first, then each extra field shows up as a line in the email. */
export function feedbackPayload({ accessKey, message, contact = '', context = null, lang, page = '', userAgent = '' }) {
  return {
    access_key: accessKey,
    subject: '3BLD trainer feedback',
    from_name: '3BLD Memo Trainer',
    message: message.trim(),
    contact: contact.trim() || '-',
    language: lang,
    ...(context ?? {}),
    page,
    user_agent: userAgent,
    botcheck: '', // Web3Forms spam trap; must stay empty
  };
}

/** POST the payload; resolves on success, throws an Error with a short reason otherwise. */
export async function sendFeedback(payload, fetchFn = fetch) {
  const response = await fetchFn(FEEDBACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  let data = {};
  try {
    data = await response.json();
  } catch { /* not JSON; fall back to the status code */ }
  if (!response.ok || data.success === false) throw new Error(data.message || `HTTP ${response.status}`);
}
