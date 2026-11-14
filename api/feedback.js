// BookLens feedback endpoint. Sends ONE email via Resend and stores nothing.
// Requires the RESEND_API_KEY environment variable on the Vercel project.
// From: BookLens <info@iecincglobal.com>  To: info@iecincglobal.com
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  var body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  // Honeypot: real users never fill the hidden "website" field.
  if (body.website) {
    res.status(200).json({ ok: true });
    return;
  }
  var categories = ['Bug report', 'Suggestion', 'Book or content', 'Other'];
  var category = categories.indexOf(body.category) >= 0 ? body.category : 'Other';
  var message = String(body.message || '').trim().slice(0, 2000);
  var name = String(body.name || '').trim().slice(0, 100);
  var email = String(body.email || '').trim().slice(0, 120);
  var role = ['student', 'mentor', 'guest'].indexOf(body.role) >= 0 ? body.role : 'guest';
  var page = String(body.page || 'BookLens app').slice(0, 120);
  var stars = parseInt(body.stars, 10);
  if (!(stars >= 1 && stars <= 5)) stars = null;
  if (!message) {
    res.status(400).json({ ok: false, error: 'message_required' });
    return;
  }
  var key = process.env.RESEND_API_KEY;
  if (!key) {
    res.status(503).json({ ok: false, error: 'not_configured' });
    return;
  }
  var lines = [];
  lines.push('Category: ' + category);
  if (stars) lines.push('Rating: ' + stars + '/5');
  if (name) lines.push('Name: ' + name);
  if (email) lines.push('Contact email: ' + email);
  lines.push('Profile role: ' + role);
  lines.push('App: ' + page);
  lines.push('');
  lines.push(message);
  var payload = {
    from: 'BookLens <info@iecincglobal.com>',
    to: ['info@iecincglobal.com'],
    subject: 'BookLens feedback — ' + category,
    text: lines.join('\n')
  };
  if (email) payload.reply_to = email;
  try {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      res.status(200).json({ ok: true });
    } else {
      res.status(502).json({ ok: false, error: 'send_failed' });
    }
  } catch (e) {
    res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
