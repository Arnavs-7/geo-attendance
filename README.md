# GeoAttendance — Smart Location-Based Attendance

A geofenced attendance system for small teams (20–50 employees). Employees
check in and out from their phone; the app verifies they are physically inside
the office boundary using GPS + the Haversine formula. Admins get a live
overview, employee management, reports and CSV export.

**Runs 100% free** — Next.js on Vercel (Hobby) + Firebase (Spark). No Cloud
Functions, no paid services.

## Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui |
| Backend     | Firebase Firestore + Firebase Auth (Spark / free plan) |
| Geofencing  | Haversine formula, client-side |
| Hosting     | Vercel (Hobby / free) |
| PWA         | Manual service worker + Web App Manifest (installable) |

All business logic runs client-side or in the browser — there is **no server
component to deploy** and **no Firebase Admin SDK / Cloud Functions**.

---

## 1. Setup Guide

### 1.1 Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Build → Authentication → Get started** → enable **Email/Password**.
3. **Build → Firestore Database → Create database** → Start in **production mode**
   → pick a location close to your office.
4. **Project settings (⚙️) → Your apps → Web (`</>`)** → register an app →
   copy the `firebaseConfig` values.

### 1.2 Install & configure locally

```bash
git clone https://github.com/Arnavs-7/geo-attendance.git
cd geo-attendance
npm install
cp .env.example .env.local   # then fill in the values
```

Fill `.env.local` with the config from step 1.4. See `.env.example` for the
full list — every variable is `NEXT_PUBLIC_*` because Firebase web keys are
public by design (access is controlled by Security Rules, not key secrecy).

```bash
npm run dev        # http://localhost:3000
```

### 1.3 Deploy Firestore rules & indexes

Install the Firebase CLI once: `npm install -g firebase-tools`, then:

```bash
firebase login
firebase use --add            # select your project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

> The rules are the **only** backend security layer — deploy them before going
> live. They block privilege escalation, lock attendance fields, and enforce
> server timestamps.

### 1.4 Seed the office configuration

The app reads office location/geofence settings from a single Firestore
document: `officeConfig/default`. The easiest way to create it:

1. Sign up the first user (step 2), promote them to admin (step 2).
2. Log in as that admin → **Settings** → fill in office name, latitude,
   longitude, radius, and the late cutoff time → **Save**. This creates the
   `officeConfig/default` document automatically.

To get your office coordinates: open Google Maps, right-click the office →
click the lat/long to copy it.

---

## 2. First Admin Setup (one-time)

There is **no client-side admin promotion** anywhere in the app — by design.
The first admin must be promoted manually in the Firebase Console:

1. Have the person sign up normally at `/signup`. This creates:
   - a Firebase Auth user, and
   - a `users/{uid}` document with `role: "employee"`.
2. Open **Firebase Console → Firestore Database → `users` collection**.
3. Find that person's document (match by `email`).
4. Click the **`role`** field → change its value from `employee` to `admin` →
   **Update**.
5. They refresh the app — they now land on the **/admin** dashboard.

The Firestore rules forbid changing `role` from any client, so the Console is
the only path. Repeat these steps if you ever need a second admin.

---

## 3. Onboarding New Employees

Admins add employees from **Admin → Employees → Add Employee**:

1. Enter the employee's name, email, employee ID and department → **Add**.
2. The app creates their Firebase Auth account and profile, then emails them a
   **password-setup link**.
3. The employee opens the email, sets a password, and logs in at `/login`.

This uses a *secondary* Firebase app instance in the browser, so creating the
new account does **not** log the admin out — fully free, no Admin SDK.

Employees can also self-register at `/signup` if you prefer to just share the
link.

To remove access, use **Deactivate** on the Employees page — it sets
`active: false`; the rules then block that account from marking attendance
while keeping their history intact. **Reactivate** reverses it.

---

## 4. Deploy to Vercel (free)

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the
   repo. Vercel auto-detects Next.js — no build settings to change.
3. In **Settings → Environment Variables**, add every variable from
   `.env.example` (see also `docs/vercel-env-checklist.md`). Apply them to
   Production, Preview and Development.
4. **Deploy.** Vercel gives you an HTTPS URL — geolocation requires HTTPS, and
   Vercel provides it automatically.
5. Add the Vercel domain to **Firebase Console → Authentication → Settings →
   Authorized domains**, otherwise login will be rejected.

Redeploys happen automatically on every `git push`.

---

## 5. Free Tier Limits

This app is sized for **20–50 daily employees** and stays comfortably inside
the free tiers.

**Firebase Spark (free):**

| Resource           | Free quota        | Typical daily use (50 employees) |
|--------------------|-------------------|----------------------------------|
| Firestore reads    | 50,000 / day      | ~2,000–5,000                     |
| Firestore writes   | 20,000 / day      | ~100 (2 per employee)            |
| Stored data        | 1 GiB             | a few MB / year                  |
| Auth users         | Unlimited         | 50                               |

**Vercel Hobby (free):** 100 GB bandwidth/month — this app serves a few MB of
static JS, so it is never a concern.

**How the app stays free:**

- No Cloud Functions — all logic is client-side or in the browser.
- Reads are batched (`Promise.all`) and queries are bounded (`limit(30)`,
  date-range filters).
- Geofencing and CSV export run entirely in the browser.
- The PWA service worker caches the app shell, cutting repeat bandwidth.

---

## 6. How It Works

- **Geofencing** — the browser reports GPS coordinates; the Haversine formula
  measures the distance to `officeConfig`. Check-in is enabled only inside the
  configured radius.
- **GPS accuracy** — accuracy worse than 50 m warns the user; worse than 200 m
  blocks check-in.
- **Anti-spoofing** — flags impossible movement speed and static (mock-GPS)
  coordinates. Flags are advisory; admins see them in the records view.
- **Server timestamps** — check-in / check-out times are written with
  `serverTimestamp()` and the rules require them to equal the request time, so
  the device clock cannot be faked.
- **Authoritative status** — admin views recompute `Present`/`Late` from the
  server check-in time, so a late employee cannot mask their status.

## 7. Project Scripts

```bash
npm run dev            # local dev server
npm run build          # production build
npm run test:rules     # Firestore rules tests (needs the Firestore emulator)
npm run deploy:indexes # deploy Firestore indexes
```

## 8. Known Limitations

- GPS accuracy is poor indoors — advise employees to check in near a window or
  doorway.
- Some mobile browsers throttle location in the background; keep the app in the
  foreground while checking in.
- Reports count every calendar day in the range as a potential working day
  (weekends are not auto-excluded — there is no working-days config).
