# ADT Field Assessment → Proposal

A phone-friendly web app for ADT field security technicians. Take a photo of (or
manually enter) a paper **Home Risk Assessment Report**, and the app turns it into
a polished, customer-facing protection proposal generated at **two levels** —
**Comprehensive** and **Basic** — ready to hand the customer on the spot.

## Features

- **Intake two ways** — snap/upload a photo of the paper form (read by Claude
  vision into structured data) or enter everything manually. Both land on the same
  editable review screen.
- **Guided flow** — Review → Property snapshot → Follow-up Q&A → Proposal.
- **Deterministic recommendation engine** — maps each room's door/window counts and
  risk level, life-safety flags, and the exterior walk-around to ADT equipment
  across three escalating tiers. Key rules:
  - Wi-Fi = **none** strips every Wi-Fi/smart device from the package.
  - Pet > 80 lbs + "no motion wanted" removes motion detectors.
  - Garage → overhead door sensor (+ myQ on smart tiers); flood history → flood
    detector; exterior lighting gaps → floodlight cameras (net of existing).
- **Customer-facing proposal** — branded cover + property snapshot, plain-language
  "What we found" (Claude-generated), area-by-area equipment, life-safety/video/
  smart-home, and a pricing/signature page. One-tap **Download / Print PDF**.
- **History** — save jobs; reload past jobs by family name + date.

## Tech

Next.js (App Router) · TypeScript · Tailwind · Supabase (Auth + Postgres + Storage)
· Anthropic Claude (`claude-opus-4-8`) · deploy on Vercel.

## Security

- All secrets are **server-side only** (`ANTHROPIC_API_KEY`, `SMTP_PASS`). The browser
  only ever sees the public Supabase anon key, gated by Row-Level Security
  (`user_id = auth.uid()`).
- Auth is restricted to **`@adt.com`** emails — enforced in the sign-up server action
  and again by a Postgres trigger on `auth.users`.
- **2FA on new devices**: first sign-up and any unrecognized browser require an
  emailed verification before the app unlocks. With `SMTP_USER`/`SMTP_PASS` set, the
  app emails a **typed 6-digit code** (hashed at rest, 10-minute expiry, 5-attempt
  limit — and immune to corporate mail scanners that pre-click links). Without SMTP
  it falls back to a Supabase one-time sign-in link (note: Microsoft Defender
  SafeLinks-style scanners consume those links, so prefer the code mode).
- Uploaded form photos go to a **private** Storage bucket scoped per user.
- `middleware.ts` protects every route and fences unverified devices to `/verify`;
  API routes return their own JSON 401.

## Setup

1. **Install**: `npm install`
2. **Env**: copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project
     Settings → API)
   - `ANTHROPIC_API_KEY` (optional — enables photo OCR + AI narrative)
   - `SMTP_USER` + `SMTP_PASS` (optional — enables typed 6-digit 2FA codes; for
     Gmail, `SMTP_USER` is the address and `SMTP_PASS` is a Google app password.
     `SMTP_HOST`/`SMTP_PORT` default to `smtp.gmail.com:465`)
   - `ALLOWED_EMAIL_DOMAIN` (default `adt.com`)
3. **Database**: apply `supabase/migrations/0001_init.sql` (Supabase SQL editor or
   `supabase db push`). It creates the `jobs` table + RLS, the `@adt.com` sign-up
   trigger, and the private `form-photos` bucket.
4. **Run**: `npm run dev` → http://localhost:3000
5. **Auth note**: by default Supabase requires email confirmation on sign-up. For a
   fast field workflow you can disable it under Supabase → Authentication → Providers
   → Email → "Confirm email" off (the `@adt.com` restriction still applies).

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add the env vars above in Project Settings → Environment Variables
   (`ANTHROPIC_API_KEY` server-side; the two `NEXT_PUBLIC_*` vars).
3. Deploy. Add the deployment URL to Supabase → Authentication → URL Configuration.
