# Tamarind Business Tracker PWA

A simple, mobile-first Progressive Web App for managing a tamarind seed processing business.

## Setup Instructions

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a **New Project** (e.g. "tamarind-biz")
3. Once ready, go to **Database → SQL Editor** and paste the contents of `schema.sql` → Run it
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key

### Step 2 — Add your Supabase credentials

Open `js/config.js` and replace:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```
with your actual values.

### Step 3 — Enable Email Auth in Supabase

Go to **Authentication → Providers → Email** and make sure it is enabled.
For easier testing, go to **Authentication → Settings** and disable "Confirm email" (you can re-enable later).

### Step 4 — Host the app

**Option A — Free hosting with Netlify (recommended)**
1. Go to [netlify.com](https://netlify.com) → "Deploy manually"
2. Drag and drop the entire `tamarind-pwa` folder
3. Your app will get a URL like `https://xxxx.netlify.app`

**Option B — GitHub Pages**
1. Push the folder to a GitHub repository
2. Go to Settings → Pages → Deploy from branch (main)

**Option C — Test locally**
```bash
# Install a simple server
npx serve .
# or
python3 -m http.server 8080
```
Then open `http://localhost:8080`

### Step 5 — Add to iPhone Home Screen

1. Open the app URL in **Safari** (must be Safari for iPhone PWA)
2. Tap the **Share** button (rectangle with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

The app icon will appear on your home screen just like a native app!

---

## Features

- **Dashboard** — Overview of receivables, payables, expenses, overdue payments
- **Add Entry** — One smart form for Purchase / Sale / Expense
- **Parties** — Manage customers and suppliers with full ledger view
- **Purchases / Sales / Expenses** — Lists with filtering, search, status badges
- **Reports** — P&L summary with date range filters, export to CSV
- **PIN Lock** — 4-digit PIN to protect app access
- **PWA** — Works offline, installable on iPhone/Android home screen

---

## File Structure

```
tamarind-pwa/
├── index.html          # Main HTML shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── app.css             # All styles (mobile-first)
├── schema.sql          # Supabase database schema
├── icons/
│   └── icon.svg        # App icon source
└── js/
    ├── config.js       # Supabase URL + keys (edit this!)
    ├── utils.js        # Shared helpers (currency, dates, toast)
    ├── db.js           # All Supabase queries
    ├── auth.js         # Login/signup/PIN lock
    ├── app.js          # App init, navigation
    ├── dashboard.js    # Dashboard page
    ├── add-entry.js    # Add/edit entry form
    ├── parties.js      # Parties list + ledger
    ├── lists.js        # Purchases/Sales/Expenses lists
    └── reports.js      # Reports & export
```
