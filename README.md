# Mobile Shop Management System

A full-stack app for running a mobile phone shop: point-of-sale, inventory with IMEI tracking, repairs, customer credit (udhar), purchases & suppliers, expenses, and profit reporting.

- **Backend:** Node.js + Express + Prisma (SQLite)
- **Frontend:** React + Vite + Tailwind CSS + Axios
- **Mobile:** Expo / React Native (Android + iPhone)

---

## Requirements

- Node.js 18+ and npm
- Windows / macOS / Linux

## Setup

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate deploy     # apply migrations
node prisma/seed.js           # optional: create demo data + default admin
npm run dev                   # http://localhost:5000
```

`backend/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
PORT=5000
```

### 2. Frontend

```bash
cd web
npm install
npm run dev                   # http://localhost:3000
```

Optional `web/.env` (copy from `web/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

Production build:

```bash
cd web
npm run build                 # output in web/dist
npm run preview
```

## Deploy online

The website can be hosted on **Vercel**, but the Express API needs a host with a
persistent disk or a managed Postgres database. Step-by-step instructions for
both setups are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Default login

| Field    | Value         |
| -------- | ------------- |
| Phone    | `03001234567` |
| Password | `admin123`    |

These are the credentials created by `backend/prisma/seed.js` on a fresh install. If the password or phone was changed, use the current web login instead. Change the password and `JWT_SECRET` before using real data.

## Mobile app (Expo)

The `mobile/` folder contains a native Android/iPhone app that talks to the same backend. Every phone must reach the backend — the shop PC over Wi-Fi during development, or the public HTTPS URL once the API is hosted online (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### 1. Start the backend and find the PC's IP

Keep the backend running:

```bash
cd backend
npm run dev
```

Find the PC's IPv4 address:

```bash
ipconfig
```

Example: `192.168.1.10`. The phone URL is then:

```
http://192.168.1.10:5000/api
```

Rules:

- The phone and shop PC must be on the **same Wi-Fi**.
- Allow **Node.js** through Windows Firewall on **private networks** the first time it asks.
- Never use `localhost` on a phone — `localhost` means the phone itself.

### 2. Run the app

```bash
cd mobile
npm install
npx expo start
```

- **Android:** install **Expo Go** from Play Store, scan the QR code in the terminal.
- **iPhone:** install **Expo Go** from the App Store, scan the QR code with the Camera app.
- The phone and PC must be on the same network. If the QR does not connect, use `npx expo start --tunnel`.

### 3. Connect the app to the server

On the login screen, tap **Change** next to the server address and enter:

```
http://192.168.1.10:5000/api
```

Use **Test connection**, then sign in with the same phone/password as the website. The address is saved on that phone.

You can change it later from **More → Server connection**.

### Standalone builds (optional)

- Use EAS to build installable apps: `npx eas-cli@latest build --platform android` (APK/AAB) or `--platform ios` (needs an Apple developer account; cloud builds do not need a Mac).
- `app.json` already allows HTTP traffic (`android.usesCleartextTraffic`, iOS ATS exception) so LAN addresses work in release builds. Use HTTPS if you later host the backend on the internet.
- iOS local-network access prompts on first connection; allow it.

### Mobile commands

```bash
cd mobile
npx expo start                # development server + QR
npx expo start --android      # open on a connected Android device/emulator
npx expo start --ios          # open on iOS (macOS or Expo Go)
npx expo-doctor               # dependency/config health check
npx expo export --platform android   # bundle check without a device
```

## Features

### Sales (POS)
- Cart-based checkout with per-product stock caps
- Server-side price calculation (client cannot tamper with prices)
- Cash / JazzCash / EasyLoad / credit payments
- Automatic udhar record for any unpaid balance
- Sale history with pagination and filters
- **Refunds** — restores stock, removes the linked udhar balance, blocks double refunds
- **Printable receipt** modal for any sale

### Inventory
- Products with brand, model, IMEI, purchase and selling price, stock
- Low-stock filter and dashboard alerts
- Validation: stock can never go negative (legacy negative rows are repaired by the `clamp_negative_stock` migration), IMEI optional (stored as `NULL` when empty)
- Inventory totals always use non-negative stock, so invested value and profit can't show minus amounts

### Purchases & Suppliers
- Purchase entry that restocks products and records supplier cost
- Supplier directory with running balance and paid amounts
- Suppliers with purchases cannot be deleted (guard)

### Repairs
- Job intake, status tracking, final cost
- `deliveredAt` timestamp set when a job is marked delivered — delivery income is reported on the delivery date

### Udhar (Customer Credit)
- Per-customer balances, payment recording with overpayment protection
- Payments and balances updated in a single transaction

### Dashboard
- Day view with date picker, previous/next-day buttons and a Today shortcut
- "Last active day" shortcut when the selected day has no records
- Revenue, gross profit, repair income, commissions, expenses, net profit and pending udhar
- Low-stock alerts with quick links

### Reports
- Daily and monthly revenue, COGS, **gross profit** and margin %
- Net profit = gross margin + repair income + EasyLoad/JazzCash commission − expenses
- Refunded sales excluded from revenue and profit
- Date ranges use local time (no off-by-one-day issues)

## API overview

| Route          | Description                                              |
| -------------- | -------------------------------------------------------- |
| `/api/auth`    | Login / current user                                     |
| `/api/products`| Inventory CRUD, low-stock filter                          |
| `/api/sales`   | Paginated sales, create sale, refund                     |
| `/api/purchases`| Purchase entry with supplier balance                     |
| `/api/suppliers`| Supplier CRUD                                           |
| `/api/repairs` | Repair jobs, delivery                                   |
| `/api/customers`| Customer CRUD                                          |
| `/api/udhar`   | Credit records and payments                             |
| `/api/expenses`| Shop expenses                                           |
| `/api/jazzcash`| JazzCash send/receive transactions                      |
| `/api/easyload`| Mobile network top-up sales                             |
| `/api/staff`   | Staff accounts, roles and activation                    |
| `/api/reports` | Daily/monthly profit reports                            |
| `/api/health`  | Server reachability check used by the mobile app        |

Paginated endpoints return `{ items, total, page, limit, pages }`. Unknown routes return a JSON 404.

## Notes

- Currency is PKR; money is rounded consistently to 2 decimals (`lib/money.js`).
- Pagination is currently implemented on **sales** and **purchases**; other lists return full results.
- The SQLite database lives at `backend/prisma/dev.db`.
