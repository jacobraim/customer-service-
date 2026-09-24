const crypto = require('crypto');
const { google } = require('googleapis');

const SHEET_HEADERS = [
  'Reference',
  'Received At',
  'Status',
  'Request Type',
  'Full Name',
  'Email',
  'Subscriber / Account Number',
  'Current Address Line 1',
  'Current Address Line 2',
  'Current City',
  'Current State',
  'Current ZIP',
  'Topic',
  'Issue Month / Year',
  'Problem',
  'New Address Line 1',
  'New Address Line 2',
  'New City',
  'New State',
  'New ZIP',
  'Renew / Cancel Request',
  'Cancellation Reason',
  'Cancellation Other',
  'Details',
  'Source'
];

function clean(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\u0000/g, '').slice(0, max);
}

function env(name) {
  return clean(process.env[name] || '', 10000);
}

function quoteSheetName(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

async function getSheetsClient() {
  const email = env('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = env('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Sheets credentials are not configured.');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

async function ensureHeaderRow(sheets, spreadsheetId, tabName) {
  const tab = quoteSheetName(tabName);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`
  });

  const firstRow = existing.data.values && existing.data.values[0];
  if (firstRow && firstRow.length) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1:Y1`,
    valueInputOption: 'RAW',
    requestBody: { values: [SHEET_HEADERS] }
  });
}

async function appendRequestToSheet(request) {
  const spreadsheetId = env('GOOGLE_SHEET_ID');
  const tabName = env('GOOGLE_SHEET_TAB') || 'Requests';

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured.');
  }

  const sheets = await getSheetsClient();
  await ensureHeaderRow(sheets, spreadsheetId, tabName);

  const row = [
    request.reference,
    request.receivedAt,
    'New',
    request.category,
    request.name,
    request.email,
    request.details.accountNumber || '',
    request.currentMailingAddress.addressLine1,
    request.currentMailingAddress.addressLine2 || '',
    request.currentMailingAddress.city,
    request.currentMailingAddress.state,
    request.currentMailingAddress.zip,
    request.details.topic || '',
    request.details.issue || '',
    request.details.problem || '',
    request.details.newAddress1 || '',
    request.details.newAddress2 || '',
    request.details.newCity || '',
    request.details.newState || '',
    request.details.newZip || '',
    request.details.request || '',
    request.details.cancellationReason || '',
    request.details.cancellationReasonOther || '',
    request.details.details || '',
    request.details.source || ''
  ];

  // RAW prevents customer-entered values beginning with =, +, - or @ from
  // being interpreted as formulas in Google Sheets.
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteSheetName(tabName)}!A:Y`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = clean(body.name, 160);
  const email = clean(body.email, 254);
  const category = clean(body.category, 80);
  const currentAddress1 = clean(body.currentAddress1, 200);
  const currentAddress2 = clean(body.currentAddress2, 200);
  const currentCity = clean(body.currentCity, 120);
  const currentState = clean(body.currentState, 80);
  const currentZip = clean(body.currentZip, 20);

  if (!name || !email || !category || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid name, email, and request category.' });
  }

  if (!currentAddress1 || !currentCity || !currentState || !currentZip) {
    return res.status(400).json({ error: 'Please provide the current mailing address associated with the subscription.' });
  }

  if (category === 'renew-cancel' && clean(body.request, 120) === 'Cancel my subscription') {
    const cancellationReason = clean(body.cancellationReason, 120);
    const cancellationReasonOther = clean(body.cancellationReasonOther, 500);
    if (!cancellationReason) {
      return res.status(400).json({ error: 'Please provide a reason for cancellation.' });
    }
    if (cancellationReason === 'Other' && !cancellationReasonOther) {
      return res.status(400).json({ error: 'Please provide your reason for cancellation.' });
    }
  }

  const reference = `WASH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const request = {
    reference,
    receivedAt: new Date().toISOString(),
    category,
    name,
    email,
    currentMailingAddress: {
      addressLine1: currentAddress1,
      addressLine2: currentAddress2 || null,
      city: currentCity,
      state: currentState,
      zip: currentZip
    },
    details: Object.fromEntries(
      Object.entries(body)
        .filter(([key]) => ![
          'name', 'email', 'category',
          'currentAddress1', 'currentAddress2', 'currentCity', 'currentState', 'currentZip'
        ].includes(key))
        .map(([key, value]) => [key, clean(value, 3000)])
    )
  };

  try {
    await appendRequestToSheet(request);
    console.info('washingtonian_support_request_saved', JSON.stringify({
      reference: request.reference,
      category: request.category,
      receivedAt: request.receivedAt
    }));
    return res.status(200).json({ ok: true, reference });
  } catch (error) {
    console.error('washingtonian_support_request_failed', error);
    return res.status(500).json({ error: 'We could not save your request. Please email washsub@washingtonian.com.' });
  }
};
