# Deploying the shop online

The project has three parts, and they do **not** all live on the same host:

| Part | What it is | Where it goes |
| ---- | ---------- | ------------- |
| `web/` | React dashboard | **Vercel** |
| `backend/` | Express API + database | A server with a **persistent disk** (or a managed database) |
| `mobile/` | Native Android/iPhone app | Installed on each phone (EAS build), not hosted on Vercel |

Vercel runs static sites and short-lived serverless functions. It cannot keep the
SQLite file at `backend/prisma/dev.db` between requests, so the API cannot run
there as-is. The web dashboard itself deploys to Vercel perfectly.

---

## Option A — Vercel (web) + API host with a persistent disk

**No code changes.** Best if you want to keep the current SQLite database.

### 1. Deploy the API

Use a host that supports a persistent disk: Render (paid instance), Railway
(with a volume), Fly.io (with a volume), or a small VPS.

Example with Render:

1. Push this repo to GitHub (already configured as `origin`).
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** one that supports disks (not Free)
4. Add a **Disk**: mount path `/var/data`, size 1 GB.
5. Environment variables:
   ```env
   DATABASE_URL=file:/var/data/shop.db
   JWT_SECRET=<a long random string>
   NODE_VERSION=20
   ```
6. First deploy, then open the Render **Shell** and run:
   ```bash
   npx prisma migrate deploy
   ```
7. Load your data. Either:
   - copy the existing `backend/prisma/dev.db` to `/var/data/shop.db`, or
   - start fresh with `node prisma/seed.js` (creates demo data + `03001234567 / admin123`).

   To copy the live database, base64-encode it on the shop PC and paste it into
   the shell, or upload it to temporary storage and `curl` it into
   `/var/data/shop.db`.
8. Check `https://<your-service>.onrender.com/api/health` returns
   `{"status":"ok",...}`.

> The API already allows cross-origin requests (`cors()`), so no CORS setup is
> needed. Keep the service on HTTPS.

### 2. Deploy the web dashboard to Vercel

1. Vercel → **Add New → Project** → import the GitHub repo.
2. **Root Directory:** `web`
3. Framework preset: **Vite** (detected automatically).
4. **Environment Variable** (Production, Preview and Development):
   ```env
   VITE_API_URL=https://<your-service>.onrender.com/api
   ```
   This is read at build time, so set it **before** the first deploy.
5. Deploy. Vercel gives you `https://<project>.vercel.app`.

`web/vercel.json` already contains the SPA rewrite, so refreshing pages such as
`/sales` works.

CLI version:

```bash
npm i -g vercel
cd web
vercel                                    # first deploy / link project
vercel env add VITE_API_URL production    # paste the API URL
vercel --prod
```

### 3. Point the phones at the public API

In the mobile app: **More → Server connection**, enter:

```
https://<your-service>.onrender.com/api
```

Tap **Test connection**, then sign in. Use the production HTTPS URL — the LAN
address (`http://192.168.x.x:5000/api`) only works at the shop.

---

## Option B — Everything on Vercel (API + web) with Postgres

Choose this if you want a single platform and no paid disk. It requires a
database migration because Vercel's filesystem is temporary:

1. Create a free Postgres database (Neon or Supabase).
2. Change `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Regenerate migrations for Postgres and apply them:
   ```bash
   cd backend
   npx prisma migrate dev --name init_postgres
   ```
4. Move the existing rows from `dev.db` to Postgres (a small export/import
   script). Accounts, products, sales and udhar history are preserved.
5. Export the Express app (split `src/index.js` into `src/app.js` + a listener),
   add `api/index.js` for Vercel, and add a root `vercel.json` that rewrites
   `/api/(.*)` to that function.
6. Set `DATABASE_URL` (use the **pooled** Neon URL) and `JWT_SECRET` in Vercel,
   then deploy.

Tell me if you want this option and I will make the code and migration changes
and verify them locally first.

---

## Getting the app onto staff phones

Vercel does not host the native app. Build it once with EAS:

```bash
cd mobile
npx eas build -p android --profile preview   # APK download link
npx eas build -p ios --profile preview       # needs an Apple account
```

Share the APK link with staff (or publish to the Play Store / TestFlight).
The app is only a client — it reads the server address from
**More → Server connection**, so the same build works on every phone.

---

## Checklist

- [ ] API reachable over HTTPS at `/api/health`
- [ ] `JWT_SECRET` changed from the development value
- [ ] Database file on a persistent disk (Option A) or Postgres (Option B)
- [ ] `VITE_API_URL` set in Vercel **before** building the web app
- [ ] Web login works at the `*.vercel.app` URL
- [ ] Phone server setting uses the public HTTPS API URL
- [ ] Backups enabled for the database

## Common problems

| Symptom | Cause |
| ------- | ----- |
| Web page loads but every request fails | `VITE_API_URL` missing/wrong; redeploy after changing it |
| `502` / cold start on the API | Free instance sleeping; first request is slow |
| Data disappears after redeploy | SQLite was written to the temporary filesystem |
| Login fails only on phones | Phone still points at the old LAN IP |
| Mixed-content error | API must be `https://`, not `http://` |
