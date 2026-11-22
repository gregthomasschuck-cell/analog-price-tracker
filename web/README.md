# Paid website (Next.js + Supabase + Stripe)

The subscriber site for the tracker. Visitors get a free preview (basket index, headline
numbers, five sample SKUs). Subscribers sign in with an email link, pay monthly through
Stripe, and get the full dashboard plus Excel and CSV downloads.

**How the data gets here:** the daily GitHub Action runs `python tracker.py publish`, which
uploads `dashboard.html`, `tracker.xlsx` and `observations.csv` to a **private** Supabase
Storage bucket (`paid`) and `teaser.json` to a public one (`public`). The site only streams
the private files after checking that the visitor's subscription is active.

## One-time setup (about 45 minutes)

### 1. Supabase (login + storage)
1. Create a project at supabase.com.
2. SQL Editor → paste and run `web/supabase/schema.sql`.
3. Project Settings → API: copy the **Project URL**, the **anon** key and the **service_role** key.
4. Authentication → URL Configuration: set **Site URL** to your site address (e.g.
   `https://analogprices.com`) and add `https://YOUR-SITE/auth/callback` under Redirect URLs.
   Add `http://localhost:3000/auth/callback` too if you'll run it locally.
5. (Recommended before launch) Authentication → Emails → SMTP: plug in a real sender
   (Resend, Postmark, SES). Supabase's built-in mailer is rate-limited to a few emails an hour.

### 2. Stripe (payments)
1. Products → Add product, e.g. "Analog Price Tracker". Pick **Recurring, Monthly** and set
   the price. Copy the **price ID** (`price_...`).
2. Developers → API keys: copy the **secret key** (start in Test mode: `sk_test_...`).
3. Settings → Billing → Customer portal: turn it on (lets subscribers cancel or update cards).
4. After the site is deployed (step 3): Developers → Webhooks → Add endpoint
   `https://YOUR-SITE/api/stripe/webhook` with events `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its **signing secret** (`whsec_...`).

### 3. Vercel (hosting)
1. vercel.com → Add New → Project → import this GitHub repo.
2. **Root Directory: `web`**. Framework: Next.js (auto-detected).
3. Environment variables (names in `.env.example`):
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
4. Deploy, then add the webhook (Stripe step 4), paste its secret into
   `STRIPE_WEBHOOK_SECRET`, and redeploy.
5. Optional: Settings → Domains to use your own domain (then update `NEXT_PUBLIC_SITE_URL`
   and the Supabase Site URL).

Note: Vercel's free Hobby plan is for non-commercial use; a paid site needs Pro.

### 4. Connect the daily pull
GitHub repo → Settings → Secrets and variables → Actions → add `SUPABASE_URL` (the Project
URL) and `SUPABASE_SERVICE_ROLE_KEY`. Then Actions → Price pull → Run workflow. The publish
step uploads the files; the landing page shows the preview within ~15 minutes.

### 5. Lock down the old copies (at launch)
The data is only private if every other copy is gone:
* Settings → Pages → **unpublish** the GitHub Pages site.
* Settings → General → Danger Zone → **make the repository private** (Vercel keeps working).
* Optionally delete the `docs/` folder and the "Rebuild the website" step in the workflow.

### 6. Test end to end (Stripe test mode)
Sign in with your email → Subscribe → pay with card `4242 4242 4242 4242`, any future date
and CVC → you land on Account showing "Subscription active" → Open the full dashboard.
Cancel from Manage billing and check the dashboard locks again at period end.
Switch Stripe to Live keys and a live price when ready.

## Run locally
```
cd web
cp .env.example .env.local    # fill in
npm install
npm run dev                   # http://localhost:3000
stripe listen --forward-to localhost:3000/api/stripe/webhook   # Stripe CLI, for webhooks
```

## Files
| Path | What it is |
|---|---|
| `app/page.tsx` | Public landing page with the free preview and pricing |
| `app/login`, `app/auth/*` | Email-link sign-in and sign-out |
| `app/account/page.tsx` | Subscription status, Subscribe / Manage billing |
| `app/api/checkout`, `app/api/portal` | Stripe Checkout and billing portal |
| `app/api/stripe/webhook` | Keeps `subscriptions` in sync with Stripe |
| `app/dashboard/*` | Streams the paid dashboard and downloads to active subscribers |
| `supabase/schema.sql` | Database table, row-level security and storage buckets |
