# AutoLux — status and open items

Setup: see `docs/SUPABASE_SETUP.md`.

## Built
- Supabase schema (`supabase/migrations`): dealerships, memberships, per-dealership role permissions, customers, leads, activities, tasks, sales with event history, six request types with status history, reservations with holds, price history and approvals, vehicle media, private stock records, notifications, audit log, storage buckets. RLS on every table; cross-dealership links blocked by composite foreign keys.
- Staff roles: owner, general manager, sales manager, sales representative, inventory manager, finance manager, receptionist. Permission matrix in `src/lib/auth/permissions.ts`, mirrored and enforced in SQL (`tests/db/permissions.test.ts` keeps them identical).
- Dashboard `/[locale]/admin`: overview, inventory (photos, pricing, lifecycle, publication, bulk actions), price approvals, leads, customers, tasks, sales, calendar, requests, analytics, team (invitations, roles, suspension, permission matrix), settings, audit log, notifications.
- Public forms write to Supabase with server-side validation, consent, rate limiting and duplicate protection; customer account shows requests and statuses; staff invitation page `/invite/[token]`; privacy notice `/privacy`.

## Not verifiable without credentials
- End-to-end runs against a real Supabase project (auth e-mails, storage uploads, PostgREST queries from the dashboard). Database logic is tested in PGlite (`tests/db`), which does not run Supabase Auth, Storage or PostgREST.

## Vehicle photography (demo catalogue)
All photos are Unsplash-licensed and labelled on the site as representative model photos — none show the actual stock car.

| Vehicle | Photos | Verification |
| --- | --- | --- |
| Porsche 911 Carrera S | 3 | 992 with "911 Carrera S" badge |
| Porsche 718 Cayman GT4 | 3 | 982 GT4 (not GT4 RS) |
| Tesla Model S Plaid | 3 | "PLAID" badge, yoke interior |
| Ferrari Roma | 3 | Roma |
| Lamborghini Huracán EVO | 3 | EVO bumper, EVO seat embroidery |
| Mercedes-AMG G 63 | 3 | W463A G 63 |
| Mercedes-Benz S 580 4MATIC | 2 | W223 S-Class, trim not visible |
| Mercedes-AMG GT 63 S 4-Door | 1 | X290 4-Door, trim not visible |
| Porsche Taycan Turbo S | 3 | Taycan sedan, trim not visible |
| BMW M5 Competition | 2 | F90 LCI M5; listing year 2024 does not match (F90 Competition ended 2023) — check the specification |
| BMW i7 xDrive60 | 2 | G70 body + "i7" badge detail |
| Audi RS e-tron GT | 3 | one shot shows the RS badge |
| Range Rover Autobiography LWB | 2 | L460, wheelbase not visible |
| Porsche 911 Carrera 4 Cabriolet | 1 | 992 Cabriolet, variant not visible |
| Lexus LS 500h F Sport | 0 | no licensed LS photo found — placeholder shown |

## Not built
- E-mail / Telegram delivery of notifications (in-app notifications only; provider needed).
- Payment processing (not authorised).
- 360° viewer, CSV import/export, sitemap/JSON-LD.
