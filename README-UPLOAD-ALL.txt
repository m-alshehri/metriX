metriX — FULL UPDATE v4.2
=========================

This is a COMPLETE repository bundle.

WHAT CHANGED
------------
1) HOME PAGE
- Rebuilt into a richer social-listening SaaS homepage inspired by the current structure and visual rhythm of leading products such as Brand24.
- Uses original metriX copy and original UI; no Brand24 assets or copied page content.
- New hero, analytics preview, platform strip, product cards, alert section, AI Insights section, sources section and Request a Demo section.
- English and Arabic supported.

2) HEADER
- Dashboard button removed from the public header.
- If visitor is signed out: shows Login.
- If visitor is signed in: shows Logout.
- Start Free replaced with Request a demo.
- Request a demo scrolls to the demo request form.

3) REQUEST A DEMO FORM
- New component: components/RequestDemoForm.tsx
- New API route: app/api/request-demo/route.ts
- Demo submissions are emailed to:
  ma.alshehri@hotmail.com
- Uses existing Vercel environment variables:
  RESEND_API_KEY
  ALERT_FROM_EMAIL
- No extra package is required because the API calls Resend directly with fetch.
- Reply-To is set to the visitor's submitted email.
- Includes a simple honeypot field against basic form bots.

4) FOOTER
- Footer background changed to:
  #660066

5) SENTIMENT
- Positive = green
- Neutral = gray
- Negative = red
- Applied to project sentiment donut and legend.
- Homepage dashboard preview uses the same sentiment color convention.

DEPLOYMENT
----------
Replace the complete repository contents with this ZIP contents and deploy to Vercel.

No new SQL is required for v4.2.

IMPORTANT
---------
The demo form requires the already-used email environment variables to exist in Vercel:
RESEND_API_KEY
ALERT_FROM_EMAIL

ALERT_FROM_EMAIL must be a sender/domain that Resend has verified.

This bundle also preserves the existing provider/backend fixes from v4.1.
