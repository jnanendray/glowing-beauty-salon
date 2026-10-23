# Supabase setup — Glowing Beauty Salon

## 1. Create the project
- Go to supabase.com → New project
- Name: `glowing-beauty-salon`
- Region: closest to your customers (e.g. Mumbai / `ap-south-1` for India)
- Pick a strong database password and save it somewhere safe (you won't need it day-to-day — the app only uses the URL + anon key below)

## 2. Run the schema
- Open the new project → **SQL Editor**
- Paste in the full contents of `migrations/0001_init_schema.sql` → Run
- Paste in the full contents of `migrations/0002_seed_services_stylists.sql` → Run
- This creates all tables, Row Level Security policies, and seeds the 6 services + 2 stylists already shown on the site

## 3. Turn on Google + email sign-in
- Project → **Authentication → Providers**
- Enable **Email** (magic link is fine, no password needed)
- Enable **Google** — you'll need a Google OAuth Client ID/Secret from the Google Cloud Console; Supabase's provider page links directly to the setup steps and tells you the exact redirect URL to paste into Google
- Leave **Phone** and any WhatsApp-based provider **off** — the site shows those as disabled placeholders on purpose (they need a paid SMS/WhatsApp service we're not turning on yet)

## 4. Get your API keys
- Project → **Settings → API**
- Copy the **Project URL** → goes in `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public** key → goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Set both in Vercel → Project → Settings → Environment Variables (see `.env.example` at the repo root)
- Do **not** copy the `service_role` key anywhere in this app yet — it bypasses Row Level Security and isn't needed until/unless we build an admin tool that requires it

## 5. Make yourself the admin
- Sign in to the live site once with the Google or email account you'll use as the salon owner — this auto-creates your row in `customers` via the trigger in the migration
- Back in the SQL Editor, find your user id: `select id, email from auth.users;`
- Then run: `insert into admin_users (auth_user_id) values ('<your-uuid-here>');`
- That account now has full access under the RLS policies (sees all bookings, all customers, all messages) — this is what the admin panel will check against

## What's already wired up in the code
- `lib/supabase/client.ts` — browser client for Client Components
- `lib/supabase/server.ts` — server client for Server Components/Actions
- `lib/supabase/middleware.ts` + root `middleware.ts` — keeps the login session fresh
- Nothing calls these yet beyond this point — auth screens, the booking calendar, admin panel and chat are the next pieces, each will use these clients rather than talking to Supabase directly
