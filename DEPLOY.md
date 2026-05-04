# Deploy to Vercel

Three Vercel projects, one Postgres. Total time ~30 minutes the first time.

## What gets deployed where

| App | Path | Vercel project name (suggested) | Public URL |
|---|---|---|---|
| API (NestJS) | `server/` | `barber-api` | `https://barber-api.vercel.app` |
| Customer site (Next.js) | `customer-site/` | `barber-customer` | `https://barber-customer.vercel.app` |
| Dashboard (Vite SPA) | `.` (repo root) | `barber-dashboard` | `https://barber-dashboard.vercel.app` |

The API and both frontends are independent Vercel projects pointed at the same Git repo, each with a different root directory.

---

## Step 1 — Provision Postgres (5 min)

Pick one. **Vercel Postgres** is the path of least resistance because it's bundled into the same dashboard.

1. In the Vercel dashboard → Storage → Create → Postgres
2. Region: `fra1` (Frankfurt — closest to Vilnius)
3. Copy both connection strings the wizard gives you:
   - `DATABASE_URL` (pooled, with `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (unpooled — used by `prisma migrate deploy`)

## Step 2 — Apply schema + seed (5 min)

From your local machine, point Prisma at the production DB and run migrations + seed once:

```bash
cd server
DATABASE_URL="<paste_DIRECT_URL_here>" npx prisma migrate deploy
DATABASE_URL="<paste_DIRECT_URL_here>" npm run prisma:seed
```

The seed prints a `Tenant: <id>` line — **copy that ID**, you'll need it as `PUBLIC_TENANT_ID` in the frontend env vars.

## Step 3 — Deploy the API (10 min)

```bash
cd server
vercel link            # → "barber-api" project
vercel --prod          # first deploy will fail until env vars are set
```

In the Vercel dashboard for `barber-api` → Settings → Environment Variables, paste these (use `server/.env.production.example` as the checklist):

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled URL from Step 1 |
| `DIRECT_URL` | direct URL from Step 1 |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://barber-customer.vercel.app,https://barber-dashboard.vercel.app` (update after Step 4-5) |
| `PUBLIC_TENANT_ID` | tenant ID from Step 2 |
| `JWT_SECRET` | output of `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | `7d` |
| `RESEND_API_KEY` | from resend.com |
| `EMAIL_FROM` | `De Legends Barbershop <bookings@delegendsbarbershop.lt>` |
| `EMAIL_DRY_RUN` | `false` |

Then redeploy: `vercel --prod`.

Verify: `curl https://barber-api.vercel.app/api/v1/public/offices` — should return your two offices as JSON.

## Step 4 — Deploy the customer site (5 min)

```bash
cd customer-site
vercel link            # → "barber-customer" project
vercel --prod
```

Env vars (set before first successful deploy — use `customer-site/.env.example` as the checklist). The critical one:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://barber-api.vercel.app/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://barber-customer.vercel.app` (or your custom domain) |
| `NEXT_PUBLIC_SHOP_NAME`, `NEXT_PUBLIC_OFFICE_*`, etc. | from `.env.example` |

Then redeploy: `vercel --prod`.

## Step 5 — Deploy the dashboard (5 min)

```bash
cd ..                   # back to repo root
vercel link             # → "barber-dashboard" project
vercel --prod
```

Env vars:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://barber-api.vercel.app/api/v1` |

Redeploy: `vercel --prod`.

## Step 6 — Tighten CORS (1 min)

Now that you know the final Vercel URLs, go back to the `barber-api` project's `ALLOWED_ORIGINS` env var and replace the placeholders with the **actual** URLs Vercel assigned in Step 4-5. Redeploy the API one more time.

---

## What about a custom domain?

After everything works on `*.vercel.app`:

1. Buy `delegendsbarbershop.lt` (or use the existing one)
2. In each Vercel project → Settings → Domains → add the subdomain you want:
   - `delegendsbarbershop.lt` → customer site
   - `app.delegendsbarbershop.lt` → dashboard
   - `api.delegendsbarbershop.lt` → API
3. Vercel walks you through DNS records — usually a CNAME to `cname.vercel-dns.com`
4. Update `ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`, `VITE_API_URL`, `NEXT_PUBLIC_SITE_URL` to the real domain names
5. Redeploy each project once more

---

## Known caveats

- **NestJS on Vercel uses `@vendia/serverless-express`** — first request after idle has a 1-3s cold start. For a barbershop ops app this is fine; for high-traffic workloads consider Railway/Fly.io instead.
- **Prisma's binary engine** is bundled by Vercel automatically. If you ever see "Could not find the binary file" errors, check the `binaryTargets` in `prisma/schema.prisma`.
- **Resend webhooks** — if you use them, set the URL to `https://barber-api.vercel.app/api/v1/webhooks/resend`. Vercel functions accept POST out of the box.
- **Function timeout** is 10s on the Hobby plan, 60s on Pro. The `vercel.json` requests 30s; that's clamped at 10s on Hobby. Booking flows complete well under 1s in normal use.
- **Database migrations** — Vercel does not auto-run migrations. Apply them yourself via the local `prisma migrate deploy` pattern from Step 2 whenever the schema changes.

## Rollback

Every Vercel deploy is immutable. To roll back: in the project → Deployments → click an older successful deploy → "Promote to Production".
