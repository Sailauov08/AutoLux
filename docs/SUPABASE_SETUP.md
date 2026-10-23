# Connecting AutoLux to Supabase

The site runs in demo mode (sample cars, forms disabled, no dashboard) until these steps are done.
Only the public URL and the **publishable** key are used. The app never needs the secret / service-role key — do not add it anywhere.

## 1. Create the project
1. Create a Supabase project (region close to Kazakhstan, e.g. Frankfurt).
2. Authentication → Providers → Email: keep **Confirm email** on.
3. Authentication → URL configuration: set the Site URL to your domain and add
   `https://YOUR-DOMAIN/api/auth/confirm` (and `http://localhost:3000/api/auth/confirm` for local use) to the redirect URLs.

## 2. Apply the database
In the SQL editor, run each file from `supabase/migrations/` **in filename order**, then `supabase/seed.sql`
(or `supabase link` + `supabase db push` with the Supabase CLI, followed by the seed).
The seed only inserts rows that do not exist; it never changes or deletes data.

## 3. Configure the app
Copy `.env.example` to `.env.local` and fill in, from Project Settings → API:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) or the legacy anon key |
| `NEXT_PUBLIC_DEALERSHIP_SLUG` | `autolux` (the row created by the seed) |
| `NEXT_PUBLIC_SITE_URL` | Public origin, e.g. `https://autolux.kz` |

The app refuses to start with a secret or service-role key in these variables. Rebuild after changing them.

## 4. Create the owner account
1. Open `/kk/auth/sign-up`, register with the owner's e-mail and confirm it from the e-mail.
2. In the SQL editor (runs with full privileges; not callable from the website):
   ```sql
   select public.bootstrap_owner('autolux', 'owner@your-dealership.kz');
   ```
   It works only while the dealership has no active owner, so it cannot be used to take over an existing dealership.
3. Sign in and open `/kk/admin`. Invite employees from **Team** — each invitation is a single-use link valid for 7 days that you send yourself.

## 5. Before going live
- Settings: replace the demo contact details, hours, address and booking times; upload the logo.
- Inventory: the 15 demo vehicles use representative model photos (Unsplash licence) and one placeholder. Replace them with photos of the actual cars and correct specifications, or archive them.
- Auth → Rate limits and SMTP: configure a custom SMTP sender for confirmation e-mails.
- Have the privacy notice (`/privacy`) reviewed by your legal adviser.
