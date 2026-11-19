// BookLens mentor-code check. The mentor code lives ONLY in the
// BL_MENTOR_CODE server-side environment variable on the Vercel project —
// it is never shipped to the browser. The page posts the typed code here
// and gets back a uniform { ok: true | false }: no hints, no echoes,
// no distinction between "wrong code" and any other failure.
// Requires the BL_MENTOR_CODE environment variable on the Vercel project.
var crypto = require('crypto');

// Best-effort rate limiting, per warm serverless instance: at most
// MAX_ATTEMPTS checks per source IP per WINDOW. Blunts casual guessing;
// the response stays the same shape either way.
var WINDOW_MS = 10 * 60 * 1000;
var MAX_ATTEMPTS = 10;
var attempts = new Map();

function rateLimited(ip, now) {
  var list = attempts.get(ip) || [];
  list = list.filter(function (t) { return now - t < WINDOW_MS; });
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 5000) attempts.clear(); // memory hygiene on a long-lived instance
  return list.length > MAX_ATTEMPTS;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  var expected = process.env.BL_MENTOR_CODE;
  if (!expected) {
    // Fail closed: without the env var nothing is accepted.
    res.status(503).json({ ok: false });
    return;
  }
  var ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip, Date.now())) {
    res.status(429).json({ ok: false });
    return;
  }
  var body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  var given = String(body.code || '');
  var a = Buffer.from(given, 'utf8');
  var b = Buffer.from(expected, 'utf8');
  var match = a.length === b.length && crypto.timingSafeEqual(a, b);
  res.status(200).json({ ok: match });
};
