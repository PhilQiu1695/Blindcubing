// Anonymous visitor counting with GoatCounter (see config.js): no cookies, no personal data.

/** Script URL for a GoatCounter site code, or null when counting is off. */
export function counterEndpoint(code) {
  return /^[a-z0-9-]+$/.test(code) ? `https://${code}.goatcounter.com/count` : null;
}

/** Load the counter script; it records one page view. Local copies (localhost, file://) aren't counted. */
export function startAnalytics(code, doc = document) {
  const endpoint = counterEndpoint(code);
  const { hostname, protocol } = doc.location;
  if (!endpoint || protocol !== 'https:' || hostname === 'localhost' || hostname === '127.0.0.1') return;
  const script = doc.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = endpoint;
  doc.head.append(script);
}

/** Count an event (e.g. 'memo-check'); does nothing until the script has loaded. */
export function trackEvent(name) {
  try {
    globalThis.goatcounter?.count?.({ path: name, title: name, event: true });
  } catch { /* counting must never break the page */ }
}
