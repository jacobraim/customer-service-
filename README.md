# Washingtonian Customer Service

A lightweight, dependency-free customer-service app designed for deployment from Git to Vercel.

## What changed from the prototype

- Removed the fake browser-preview screen and internal draft/placeholder language.
- Removed the hard-coded Supabase dependency.
- Replaced placeholder subscription and advertising contacts with Washingtonian's current public contacts.
- Removed all email-subscriber counts and the newsletter-by-list audience table from Advertising.
- Removed the hard-coded retention discount from the prototype; the cancellation flow now supports a configurable Shopify retention-offer URL.
- Reworded renewal, cancellation, delivery, and address-change flows so the UI does not claim the underlying subscription system has already been updated.
- Added the existing Washingtonian subscriber portal as the fastest self-service option.
- Added an optional subscriber/account-number field to every Subscriber Services request.
- Kept renewal, address-change, delivery, and cancellation actions request-only; the app does not claim that the circulation system was changed immediately.
- Added semantic HTML, keyboard focus states, responsive layouts, reduced-motion support, and basic form validation.
- Split the project into maintainable HTML, CSS, JS, and a small Vercel Function.

## Important before public launch

The `/api/support` endpoint currently validates requests, creates a reference number, and writes the request to Vercel function logs. It does **not** email staff, update the circulation/subscription platform, or persist requests in a customer-service database.

Connect that endpoint to `washsub@washingtonian.com` (or another approved help-desk destination) before using the forms for live customer support. The frontend should not need to change when that integration is added.

## Shopify retention offer

The cancellation flow is already wired for a retention offer, but it stays hidden until a real Shopify URL exists. In `app.js`, set:

```js
const RETENTION_OFFER_URL = 'https://your-final-shopify-offer-url';
```

When configured, customers who choose **Cancel my subscription** will see the offer before they submit a cancellation request. Choosing the offer opens Shopify in a new tab; ignoring it and submitting the form still sends a cancellation request only.

## Deploy to Vercel

1. Create a Git repository and add the contents of this folder at the repository root.
2. Push the repository to GitHub/GitLab/Bitbucket.
3. Import the repository into Vercel.
4. Framework preset: **Other**.
5. No build command or output directory is required.
6. Deploy.

## Local preview

Run any static file server from the project root to review the frontend. The support forms require Vercel (or another server that implements `/api/support`) to submit successfully.

## Current public links/contact values used

- Subscribe: `https://washingtonian.com/subscribe/`
- Subscriber portal: `https://w1.buysub.com/servlet/CSGateway?cds_mag_code=WSH&cds_page_id=22265`
- Subscriber Services: `washsub@washingtonian.com`
- Advertising: `AdInfo@washingtonian.com`
- General phone: `202-296-3600`
