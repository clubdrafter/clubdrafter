# Clubdrafter — Fantasy IPL Auction Platform

A full-stack fantasy sports auction platform built with Next.js, Supabase, and Tailwind CSS. Starts with IPL cricket; add future tournaments without restructuring the codebase.

---

## Tech Stack

| Layer     | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling   | Tailwind CSS (custom dark theme) |
| Database  | Supabase (PostgreSQL + Realtime) |
| Auth      | Supabase Auth (email + OTP) |
| Email     | Resend |
| Hosting   | Vercel + Supabase |

---

## Deployment (Vercel + Supabase)

### 1 — Create Supabase project

1. [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste `supabase/migrations/001_initial_schema.sql` → Run

### 2 — Configure Auth

1. Authentication → Providers → Email → enable OTP
2. URL Config → Site URL: `https://yourapp.vercel.app`
3. Redirect URLs: `https://yourapp.vercel.app/api/auth/callback`

### 3 — Set up Resend

[resend.com](https://resend.com) → create API key → verify your domain

### 4 — Deploy to Vercel

```bash
cd clubdrafter
npx vercel
```

### 5 — Environment variables (Vercel dashboard)

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
RESEND_API_KEY                  = re_...
RESEND_FROM_EMAIL               = noreply@yourdomain.com
NEXT_PUBLIC_APP_URL             = https://yourapp.vercel.app
```

### 6 — Make yourself admin

```sql
UPDATE user_profiles SET is_admin = TRUE WHERE email = 'your@email.com';
```

Then go to `/admin` to access the admin panel and add IPL players.

---

## Local Development

```bash
cd clubdrafter
npm install
cp .env.local.example .env.local
# fill in Supabase + Resend values
npm run dev
# open http://localhost:3000
```

---

## Security

- All bid validation is server-side (wallet, max-spendable, role limits, foreign cap)
- Row Level Security on every Supabase table
- Session cookies: httpOnly, SameSite via Supabase SSR
- Security headers in `next.config.ts` (CSP, X-Frame-Options, etc.)
- Admin access gated by `is_admin` DB flag, not just a secret URL

---

## Adding Future Tournaments

1. Admin → Tournaments → Add (e.g. FIFA World Cup)
2. Admin → Players → Add players for that tournament
3. Hosts select the tournament when creating a new auction

No code changes required.
