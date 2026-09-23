const crypto = require('crypto');

function clean(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\u0000/g, '').slice(0, max);
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = clean(body.name, 160);
  const email = clean(body.email, 254);
  const category = clean(body.category, 80);

  if (!name || !email || !category || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid name, email, and request category.' });
  }

  const reference = `WASH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const request = {
    reference,
    receivedAt: new Date().toISOString(),
    category,
    name,
    email,
    details: Object.fromEntries(
      Object.entries(body)
        .filter(([key]) => !['name', 'email', 'category'].includes(key))
        .map(([key, value]) => [key, clean(value, 3000)])
    )
  };

  // Preview implementation: requests are written to Vercel function logs only.
  // Before public launch, replace or extend this line with the team's chosen
  // email/help-desk/database integration.
  console.info('washingtonian_support_request', JSON.stringify(request));

  return res.status(200).json({ ok: true, reference });
};
