# Washingtonian Customer Service

Static customer-service interface for Washingtonian, deployed on Vercel. Subscriber-service requests are stored in a private Google Sheet through the Google Sheets API.

## Files

- `index.html` - customer-facing interface
- `styles.css` - Washingtonian styling
- `app.js` - navigation and form behavior
- `api/support.js` - Vercel serverless function that validates requests and appends them to Google Sheets
- `package.json` - installs the Google API client used by the Vercel function
- `vercel.json` - Vercel configuration

## Google Sheet setup

1. Create a Google Sheet for subscriber-service requests.
2. Rename the worksheet tab to `Requests` (or set `GOOGLE_SHEET_TAB` in Vercel to another tab name).
3. Copy the spreadsheet ID from its URL. It is the long string between `/d/` and `/edit`.
4. In Google Cloud Console, create a project and enable the Google Sheets API.
5. Create a service account for the project and create a JSON key for that service account.
6. Share the Google Sheet with the service account's email address as an Editor. Do not make the sheet public.
7. In Vercel, open the project and go to **Settings > Environment Variables**. Add:
   - `GOOGLE_SHEET_ID` - spreadsheet ID
   - `GOOGLE_SHEET_TAB` - `Requests` (optional; defaults to `Requests`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` - `client_email` from the service-account JSON
   - `GOOGLE_PRIVATE_KEY` - `private_key` from the service-account JSON
8. Mark `GOOGLE_PRIVATE_KEY` as sensitive and do not commit the JSON key file to GitHub.
9. Redeploy the Vercel project after adding the environment variables.
10. Submit one test request. The app will automatically create the header row if the worksheet is blank and append the request below it.

## Sheet columns

The app records reference number, timestamp, status, request type, customer identity, account number, current mailing address, topic or delivery issue, requested new address, renew/cancel choice, cancellation reason, details, and source.

Every new row begins with Status `New`, so the team can later use that column for a lightweight workflow such as `New`, `In Progress`, and `Resolved`.

## Security notes

- The Google service-account private key belongs only in Vercel environment variables.
- Do not commit a Google credentials JSON file to the repository.
- Keep the Sheet restricted to the staff who need subscriber information.
- The API writes customer-entered cell values using Google Sheets' `RAW` mode so content cannot be interpreted as spreadsheet formulas.

## Retention offer

The Shopify destination is defined near the top of `app.js`:

```js
const RETENTION_OFFER_URL = 'https://shop.washingtonian.com/';
```

Replace that one URL when the dedicated retention-offer page is ready.
