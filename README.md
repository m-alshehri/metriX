# metriX — Step 2: Supabase Authentication

This version adds real Supabase authentication to the bilingual metriX site.

## What works

- English default route `/en`
- Arabic route `/ar` with RTL
- Real signup through Supabase Auth
- Email confirmation
- Real login
- Real logout
- Protected dashboard
- User name/email shown in dashboard

## Required Vercel environment variables

These should already exist in Vercel:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Do NOT commit secrets or database passwords to GitHub.

## Supabase URL Configuration

Site URL:
https://metrix-two-swart.vercel.app

Redirect URL:
https://metrix-two-swart.vercel.app/**

## Upload

Replace the current repository files with the CONTENTS of this folder.
Keep package.json at repository root.

After committing to main, Vercel should deploy automatically.

## Test flow

1. Open `/en/signup`
2. Create a test account
3. Check your email
4. Click the confirmation link
5. You should be taken to `/en/dashboard`
6. Log out
7. Log back in via `/en/login`

## Next step

Create database tables for:
- profiles
- projects
- keywords
- mentions
