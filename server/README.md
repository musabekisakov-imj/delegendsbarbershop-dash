# BarberPro Server

Backend for the BarberPro multi-office barbershop dashboard. NestJS + Prisma + PostgreSQL + Resend.

## Status

**Phase 0 scaffold.** Not in production. The frontend still reads/writes its own localStorage via `src/app/lib/api.ts`. This server stands up the foundation (auth + email + appointments) and the database schema for the full domain. Phase 1 is the module-by-module migration.

## Stack

| Concern         | Pick                                   |
| --------------- | -------------------------------------- |
| Framework       | NestJS 10                              |
| ORM             | Prisma 5                               |
| Database        | PostgreSQL 16                          |
| Auth            | JWT (Passport) + argon2 password hash  |
| Validation      | class-validator + class-transformer    |
| Rate limiting   | @nestjs/throttler (100/min, 5/min /auth/login) |
| Email           | Resend (dry-run mode in dev)           |
| Docs            | Swagger UI at `/api/docs` (dev only)   |
| Test runner     | vitest                                 |

## Quick start

Requires Node 20+, npm, Docker.

```bash
cd server
npm install
cp .env.example .env            # adjust JWT_SECRET, RESEND_API_KEY if needed
npm run db:up                   # spins up Postgres in Docker
npm run prisma:migrate          # creates tables (asks for migration name on first run)
npm run prisma:seed             # loads tenant + 2 offices + 4 staff + 5 services + clients + today's appointments
npm run start:dev               # http://localhost:3001
```

API base: `http://localhost:3001/api/v1`
Swagger: `http://localhost:3001/api/docs`
Studio: `npm run prisma:studio` → `http://localhost:5555`

Default login from seed:

```
owner@kirpykla.lt / password
```

## Environment

See `.env.example`. Notable variables:

- `DATABASE_URL` — Postgres connection string. Defaults match `docker-compose.yml`.
- `JWT_SECRET` — change before any deploy. The seed value is for local development only.
- `EMAIL_DRY_RUN=true` — logs the rendered email to stdout instead of calling Resend. Default for dev. Flip to `false` once `RESEND_API_KEY` is real.
- `EMAIL_FROM` — must be a verified sender on Resend before going live.
- `ALLOWED_ORIGINS` — comma-separated list of frontend origins (CORS).

## What's implemented

- **Schema** — every table from `src/app/types/index.ts` mapped to Prisma models, including bridge tables for the many-to-many relations (accounts ↔ offices, staff ↔ offices, clients ↔ offices). Soft-delete via `deletedAt` on `Client` and `Appointment`. Multi-tenant scoped by `tenantId` on every domain table.
- **Auth** — `POST /auth/login` returns a JWT, plus the JwtStrategy that re-checks the account exists and is not disabled on every request (no zombie tokens after a deactivation).
- **Email** — confirmation + cancellation templates with editorial styling matching the frontend (uppercase tracking eyebrow, tabular numerals, hairline dividers). Dry-run mode for local dev.
- **Appointments** — full CRUD, cross-office staff conflict detection (half-open interval overlap), owner/manager `override` flag, soft-delete + restore, fire-and-forget confirmation/cancellation emails.

## What's missing (Phase 1)

The remaining domain modules follow the same shape as `appointments/` and need to be added:

- `tenants/`        — settings, working hours
- `offices/`        — list/create/update
- `accounts/`       — invite, deactivate, role change
- `staff/`          — barbers, including office links
- `clients/`        — directory, soft-delete, history
- `services/`       — per-office catalog with categories
- `categories/`
- `shifts/`, `breaks/`, `absences/` — staff schedules

Once those land, the frontend swaps `src/app/lib/api.ts` from a localStorage shim to a thin axios client pointed at this server. React Query keys already include `officeId`, so the swap is fetcher-only.

## Project layout

```
server/
├── docker-compose.yml          # Postgres for local dev
├── prisma/
│   ├── schema.prisma           # Full domain schema
│   └── seed.ts                 # Demo data (1 tenant, 2 offices, today's bookings)
└── src/
    ├── main.ts                 # CORS, global pipe, /api/v1 prefix, Swagger
    ├── app.module.ts           # Root module — wires Throttler + global guard
    ├── prisma/                 # Global PrismaService
    ├── auth/                   # Login + JwtStrategy
    ├── email/                  # Resend wrapper, inline HTML templates
    └── appointments/           # First full domain module — pattern reference
```

## Conventions

- DTOs live next to the controller (`<module>/dto/`).
- Services receive `tenantId` as the first argument — no global state, easy to test.
- Email sends are fire-and-forget. Failure to deliver does NOT roll back the booking.
- Soft-deleted rows are excluded by default (`deletedAt: null` in every query). `restore` clears the timestamp.

## Testing

```bash
npm test            # vitest run
npm run test:watch
```

A separate test database is recommended once integration tests land. For now, unit coverage is the target.
