# 🚜 KBS Earthmovers & Harvesters

Harvester rental management for KBS Harvesters, Pathur, Thiruvarur — job recording,
UPI payment collection, and billing.

One codebase serves **three different people**:

| Who | Where | What they do |
|---|---|---|
| **Customer** | `/` and `/pay` | Read about the business; scan a QR on the harvester and pay their bill |
| **Driver** | `/driver` | Sign in, record a job, collect payment on the spot, chase what's unpaid |
| **Owner/Admin** | `/admin` | See every job and balance, edit entries, export, send bills |

---

## 📋 Table of Contents

- [How it fits together](#-how-it-fits-together)
- [Tech stack](#️-tech-stack)
- [Getting started](#-getting-started)
- [Project structure](#-project-structure)
- [Environment variables](#-environment-variables)
- [Database](#-database)
- [Payments](#-payments)
- [The driver app](#-the-driver-app)
- [Bills and receipts](#-bills-and-receipts)
- [Rate calculation](#-rate-calculation)
- [Keep-alive](#-keep-alive)
- [Testing](#-testing)
- [Deploying to production](#-deploying-to-production)
- [Known issues and security posture](#️-known-issues-and-security-posture)

---

## 🧭 How it fits together

The frontend is a **Vite React SPA that talks to Supabase directly from the browser**
using the anon key. There is no application server for ordinary reads and writes.

Anything involving money is different. Cashfree secrets can never reach a browser, and
payment state must never be writable by one, so all of it runs in **Vercel serverless
functions under `api/`** using the Supabase **service-role** key.

```
Browser (anon key) ──────────────► Supabase        work entries: read + write
     │
     │ POST /api/payments/*
     ▼
Vercel Functions (service role + Cashfree secret)
     │                                   ▲
     ▼                                   │ webhook (HMAC-verified)
 Cashfree PG ◄──── customer pays ────► Cashfree
```

Two rules the payment design hangs on:

1. **The server is the only authority on amounts.** Every endpoint recomputes the
   balance from the database. A client-supplied amount is only ever accepted as a
   *cap* for a partial payment.
2. **The server is the only writer of payment state.** The `payments` table is written
   exclusively by the verified webhook. The browser can read status, never set it.

---

## 🛠️ Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite 5 · React 18 · TypeScript · React Router 6 |
| Styling | Tailwind CSS · IBM Plex Sans / IBM Plex Mono |
| Backend | Vercel Serverless Functions (Node) |
| Database | Supabase (Postgres) |
| Payments | Cashfree PG — UPI QR, UPI intent links, Payment Links |
| Mobile | PWA (vite-plugin-pwa) · Capacitor 7 for the Android/iOS shell |
| Reports | xlsx · jspdf |
| Tests | Vitest |

---

## 🚀 Getting started

```bash
git clone https://github.com/SHRIKAVIN/kbsearthmovers.git
cd kbsearthmovers
npm install
cp .env.example .env      # then fill it in
npm run dev
```

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |

> **Vite reads `.env` only at startup.** After changing it, restart the dev server —
> a hot reload will not pick it up.

Payment webhooks need a public URL, so they cannot be tested against `localhost`.
Deploy a preview branch and point Cashfree's sandbox webhook at it.

---

## 📁 Project structure

```
kbsearthmovers/
├── api/                             # Vercel serverless functions
│   ├── _lib/                        # shared; the _ prefix keeps Vercel from routing these
│   │   ├── cashfree.ts              # Cashfree client + webhook signature verification
│   │   ├── env.ts                   # env parsing, Vercel protection bypass
│   │   ├── http.ts                  # raw-body reader, request helpers
│   │   ├── phone.ts                 # E.164 normalisation (the dues lookup key)
│   │   ├── rate-limit.ts            # distinct-phone throttle for the public lookup
│   │   ├── supabase.ts              # service-role client
│   │   └── teams.ts                 # Teams MessageCard sender
│   ├── payments/
│   │   ├── create-qr.ts             # UPI QR (driver) or app links (customer)
│   │   ├── create-link.ts           # Cashfree payment link over WhatsApp + SMS
│   │   ├── dues.ts                  # public: what a phone number owes
│   │   └── status.ts                # poll target for the waiting QR screen
│   ├── webhooks/cashfree.ts         # the money-critical one
│   ├── cron/payment-reminders.ts    # dormant; not scheduled
│   └── keep-alive.ts                # keeps the Supabase project awake
├── src/
│   ├── components/
│   │   ├── Amount.tsx               # the shared money readout
│   │   ├── PaymentQRModal.tsx       # the dark payment terminal
│   │   ├── BillPreviewModal.tsx     # review a bill before sending it
│   │   ├── admin/EntryCards.tsx     # the work-entry table, as cards, for phones
│   │   └── driver/
│   │       ├── JobForm.tsx          # record a job
│   │       ├── JobList.tsx          # my jobs + payment status
│   │       └── TimeAndRate.tsx      # calculator-style hours/minutes + rate
│   ├── lib/
│   │   ├── billImage.ts             # renders the bill/receipt PNG on a canvas
│   │   ├── billFormat.ts            # H.MM arithmetic, number-to-words
│   │   ├── rateChart.ts             # the KBS calculator's rate chart
│   │   ├── driverAuth.ts            # driver sign-in
│   │   ├── jobStatus.ts             # paid / part paid / unpaid
│   │   ├── payments.ts              # frontend payment client
│   │   └── useManifest.ts           # swaps in the driver-scoped PWA manifest
│   └── pages/
│       ├── DriverLogin.tsx · DriverApp.tsx
│       ├── PublicPayPage.tsx        # behind the QR sticker
│       ├── QrStickerPage.tsx        # printable sticker
│       ├── AdminLogin.tsx · AdminPanel.tsx
│       └── HomePage · ServicesPage · ContactPage
├── supabase/
│   ├── migrations/                  # schema, in order
│   └── tests/                       # SQL verification scripts
├── public/
│   ├── driver-manifest.json         # PWA manifest scoped to /driver
│   └── signature_stamp.png          # company stamp used on bills
└── vercel.json                      # SPA rewrite, headers, cron
```

---

## 🔧 Environment variables

### Browser (`VITE_` prefixed — these ship inside the JavaScript bundle)

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon key |
| `VITE_ADMIN_PASSWORD` | Yes | Admin login |
| `VITE_DRIVER_CREDENTIALS` | Yes | `code:Name:password`, comma separated |
| `VITE_PUBLIC_SITE_URL` | Recommended | Origin encoded into the printed QR sticker. **Never a preview URL** |

> ⚠️ Everything `VITE_`-prefixed is **readable by anyone who opens the deployed site**.
> Vite inlines these at build time. See [security posture](#️-known-issues-and-security-posture).

### Server-side (never `VITE_` prefixed)

| Variable | Required | Notes |
|---|---|---|
| `CASHFREE_CLIENT_ID` | Yes | Cashfree App ID |
| `CASHFREE_CLIENT_SECRET` | Yes | Cashfree Secret Key |
| `CASHFREE_ENV` | Yes | `sandbox` or `production` |
| `CASHFREE_WEBHOOK_SECRET` | Optional | Defaults to the client secret |
| `CASHFREE_API_VERSION` | Optional | Defaults to `2026-01-01` |
| `SUPABASE_URL` | Optional | Falls back to `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Required by every payment endpoint |
| `PUBLIC_BASE_URL` | Recommended | Origin for Cashfree `return_url` / `notify_url` |
| `CRON_SECRET` | Recommended | Lets you trigger the reminder sweep by hand |
| `TEAMS_WEBHOOK_URL` | Optional | Keep-alive alerts |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Preview only | Lets Cashfree reach an SSO-protected preview. **Leave unset in production** |

---

## 📊 Database

### `work_entries` — the core ledger

| Column | Notes |
|---|---|
| `rental_person_name` | The customer |
| `customer_phone` | E.164 (`+919486532856`). The key both payment flows look up by |
| `driver_name`, `driver_code` | Who recorded it; `driver_code` drives the driver's own view |
| `broker`, `owner`, `machine_type` | |
| `hours_driven` | **H.MM base-60**: `4.30` means 4h 30m, **not** 4.5 hours |
| `hourly_rate` | The rate charged, from the KBS rate chart. Null on older rows |
| `total_amount`, `advance_amount`, `amount_received` | Balance = total − received − advance |
| `date`, `time`, `entry_type` | |

### Payment tables

- **`payments`** — one row per collection attempt. `cf_order_id` is unique and is the
  webhook correlation key. `target_entry_ids` snapshots which entries the payment is
  meant to settle.
- **`payment_allocations`** — which rupee of a payment settled which job.
- **`reminder_log`** — what reminder went out for which entry.

All three have **RLS enabled with no policies**, so the anon role can neither read nor
write them. Only the service-role key reaches them.

### Functions

| Function | Does |
|---|---|
| `apply_payment(...)` | Credits a settled payment across its targeted entries, oldest first. Atomic and **idempotent** — a duplicate webhook is a no-op |
| `outstanding_for_phone(...)` | What a phone still owes, oldest first, with per-job detail |

### Migrations

Run in filename order, **except** `20250103000000_add_owner_field.sql`, which is
misdated and must run *after* the June 2025 files that create the tables.

```
20250628162601_copper_shape.sql        work_entries
20250628164824_lively_tooth.sql
20250628172217_late_breeze.sql
20250628172340_green_jungle.sql
20250628172924_dawn_bonus.sql          RLS policies
20250703154733_solitary_portal.sql     broker_entries
20250103000000_add_owner_field.sql     ← runs here despite its name
20260914000000_add_payments.sql        payments + apply_payment()
20260914120000_outstanding_detail.sql  itemised dues
20260914140000_driver_accounts.sql     driver_code
20260914160000_hourly_rate.sql         hourly_rate
```

---

## 💳 Payments

Two ways a customer can pay, both settling into the same ledger.

**1. The driver collects on site.** Driver saves a job, taps *Collect payment*, and a
dynamic UPI QR for the exact balance appears. The customer scans with GPay / PhonePe /
Paytm. The screen flips to a confirmation with the UPI reference number, which the
driver shows the customer as proof.

**2. The QR sticker on the harvester.** Printed from **Admin → QR Sticker**. A customer
scans it, enters their mobile on `/pay`, sees each job itemised — date, machine, hours,
rate — picks which ones to pay, and pays. Because they are holding the phone that
scanned the sticker, that flow serves **UPI app deep links**, not a QR they cannot scan.

### How the money is kept correct

| Concern | How |
|---|---|
| Can a browser fake a payment? | No. `payments` has RLS on with no policies and no anon grants. Only the verified webhook writes payment state. |
| Can someone underpay by tampering? | No. Every endpoint recomputes the balance. A client amount is only a cap. |
| Can a crafted request settle someone else's job? | No. Chosen entry ids are intersected with what that phone actually owes. |
| Duplicate webhook? | `apply_payment()` returns early when already paid. Replays credit nothing. |
| Partial payment? | Oldest job first, each allocation recorded in `payment_allocations`. |
| Spoofed webhook? | HMAC-SHA256 over `timestamp + raw body`, checked before anything else. |

Payments credit the existing `amount_received` column, so admin totals, exports and
realtime updates all keep working unchanged.

### Cashfree setup

1. Add a webhook at `https://<your-domain>/api/webhooks/cashfree`, subscribed to
   payment success and failure.
2. Set the environment variables above, starting with `CASHFREE_ENV=sandbox`.
3. Test end to end, then switch to `production` and repoint the webhook.

> In sandbox, UPI QRs **cannot** be scanned by a real GPay. Use `testsuccess@gocash` or
> Cashfree's UPI Intent Simulator. Only a production ₹1 payment proves the real flow.

### Reminders — currently off

`api/cron/payment-reminders.ts` can send one Cashfree payment link per customer over
WhatsApp and SMS, but it is **not scheduled** — it was removed from `vercel.json`.
Trigger it by hand with `CRON_SECRET`, or restore the cron entry to turn it back on.

Settlement is also **silent**: no Teams card when money arrives. The record is the
`payments` row, the balance dropping in the admin panel, and a `console.info` line.

---

## 🚜 The driver app

`/driver` — sign in, then two tabs.

- **New job** — grouped Customer / Work / Money, 56px targets, sticky save, and a
  **live balance** that updates as they type.
- **My jobs** — every job they recorded, headed by "Still to collect". Each card shows
  Total / Collected / Balance, a status chip, **Call**, and **Collect** when money is
  owed. Subscribes to realtime, so a settling payment updates their phone.

### Installing it as its own app

`/driver` links **its own manifest** (`driver-manifest.json`, scoped to `/driver`).
Opening `/driver` on a phone and choosing **Add to Home Screen** installs a separate
**KBS Driver** app that opens on the driver login — not the company website.

### Sign-in

`VITE_DRIVER_CREDENTIALS` in the form `code:Name:password`, comma separated. Checked in
the browser, session in `localStorage`, matching the existing admin pattern.

---

## 🧾 Bills and receipts

Rendered as a **PNG on a canvas** in the browser (`src/lib/billImage.ts`) — drawn
directly rather than with html2canvas, which is only a transitive dependency here and
should not be what a customer-facing document rests on.

- **RENTAL BILL** when money is owed, **PAYMENT RECEIPT** when it has been received.
  The preview lets either be chosen, since an advance can be receipted while the rest
  is outstanding.
- Signed with the company stamp (`public/signature_stamp.png`), composited with
  `multiply` so its white background drops out. No handwritten signature is drawn.
- Sent via the **Web Share API**, which puts a real image into WhatsApp. `wa.me` links
  can only pre-fill text — no URL scheme attaches a file. On desktop the bill downloads
  and WhatsApp opens with the text version to attach.

---

## 🧮 Rate calculation

`src/lib/rateChart.ts` holds the rate chart **copied verbatim** from the KBS Harvester
Rental Calculator, so the two tools can never quote different figures for the same job.
A test asserts all 300 entries still equal `minutes × rate ÷ 60`, catching any drift.

```
total = whole hours × rate  +  rateChart[rate][leftover minutes]
```

Drivers see a **fixed rate of ₹2,600** rather than choosing one. Tapping the rate five
times reveals the full set (₹2,300–₹2,700) for a job priced differently; picking one
collapses it again.

Hours are entered as **separate hours and minutes fields**, as in the calculator, and
composed into the H.MM value the database has always stored.

---

## 💓 Keep-alive

Supabase pauses free projects after inactivity. `/api/keep-alive` runs daily at 03:00
UTC via Vercel Cron, queries one row, and posts the result to Teams.

Trigger manually:
```bash
curl https://kbsearthmovers.vercel.app/api/keep-alive
```

> The Vercel Hobby plan allows **2 cron jobs**. Only keep-alive is scheduled, so there
> is one slot free.

---

## 🧪 Testing

```bash
npm test
```

61 tests covering the parts where a silent mistake costs money:

- **Phone normalisation** — every input shape reduces to one string. A mismatch here
  returns "you owe nothing" to someone who owes money.
- **Webhook signatures** — valid passes, tampered body fails, replay rejected. One test
  documents why the raw body matters: re-serialising JSON turns `4500.00` into `4500`
  and breaks the HMAC.
- **Rate chart** — parity with the calculator.
- **H.MM arithmetic** — `4.30` is 4.5 hours, not 4.3.
- **Rate limiter** — a customer retrying their own number is never blocked.

**SQL checks** in `supabase/tests/` run against a real Postgres:

- `apply_payment_test.sql` — FIFO allocation, partial payments, idempotency,
  overpayment. Runs in a transaction that rolls back, so it is safe against production.
- `cleanup_test_data.sql` — removes entries named `TEST %` after a test run.

---

## 🚀 Deploying to production

1. **Run the 4 payment migrations** in Supabase, in order.
2. **Add production env vars**: `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`,
   `CASHFREE_ENV=production`, `PUBLIC_BASE_URL`, `VITE_DRIVER_CREDENTIALS`.
3. **Add the Cashfree production webhook** → `/api/webhooks/cashfree`.
4. **Merge and deploy.**
5. **Test with ₹1** using a real UPI app. Only this proves the live keys and webhook.
6. **Print the QR sticker** — `/pay` must exist in production first.
7. **Install the driver app** on each driver's phone.

**Brief the drivers first:** a job cannot be saved without a customer mobile number,
and hours are now required.

---

## ⚠️ Known issues and security posture

Recorded plainly so nobody has to rediscover them.

### The database is world-writable

`20250628172924_dawn_bonus.sql` grants `anon` SELECT/INSERT/**UPDATE/DELETE** on
`work_entries` with `USING (true)`, and the anon key ships in the browser bundle.
**Anyone can read or delete the entire ledger.** The payment tables are locked down and
payment state is server-only, but the ledger itself is not.

Minimal fix: revoke anon `INSERT/UPDATE/DELETE`, route writes through server endpoints,
and move `StatsSection` onto an aggregate view.

### Browser-checked passwords

`VITE_ADMIN_PASSWORD` and `VITE_DRIVER_CREDENTIALS` are inlined into the JavaScript
bundle and readable by anyone who opens the site. They keep the wrong person from
wandering in; they are **not** a security boundary. Vercel's CLI refuses to store a
`VITE_`-prefixed credential without an explicit acknowledgement of this.

### The dues lookup has no OTP

`/pay` reveals a customer's job history to anyone who guesses their phone number. The
customer's **name** is withheld, and a distinct-phone rate limiter raises the cost of
scanning, but this is friction rather than a guarantee. An SMS OTP step is the fix if
it matters.

### Migration ordering

`20250103000000_add_owner_field.sql` sorts before the migrations that create the tables
it alters, so a clean `supabase db reset` fails. Apply it after the June 2025 files.

### Smaller things

- `signature_stamp.png` is 1.6 MB but renders at 132px.
- A handful of `payments` rows sit in `created` status from an early bug; they never
  settled and are harmless.
- `hours_driven` is H.MM base-60. A naive `SUM()` or `hours × rate` in SQL will be
  wrong — use the helpers in `src/lib/billFormat.ts`.

---

## 📄 License

Proprietary — KBS Earthmovers & Harvesters, Pathur, Thiruvarur.
